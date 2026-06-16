require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const fs      = require('fs');
const { Resend } = require('resend');
const resend  = new Resend(process.env.RESEND_API_KEY);
const discoveryStore = require('./lib/discoveryStore');
const ADMIN_PASS = process.env.ADMIN_PASS || 'korvo2026';

// Simple admin auth — accepts the password via query (?adminKey=) or x-admin-key header.
function requireAdmin(req, res, next) {
  const key = req.query.adminKey || req.headers['x-admin-key'];
  if (key !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

const APPTS_FILE = path.join(__dirname, 'data', 'appointments.json');
function getAppts() {
  if (!fs.existsSync(APPTS_FILE)) return { appointments: [] };
  return JSON.parse(fs.readFileSync(APPTS_FILE, 'utf8'));
}
function saveAppts(d) { fs.writeFileSync(APPTS_FILE, JSON.stringify(d, null, 2)); }

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc:     ["'self'", "data:", "https:"],
      frameSrc:   ["https://forms.office.com"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Pages
app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/learn-more', (req, res) => res.sendFile(path.join(__dirname, 'public', 'learn-more.html')));
app.get('/about',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/pricing',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'pricing.html')));
app.get('/book',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'book.html')));
app.get('/admin',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
// Old separate intake URL now folds into the single admin page.
app.get('/admin/discovery', (req, res) => res.redirect('/admin'));

// API: Contact / booking form
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, service, preferred_time, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  try {
    await resend.emails.send({
      from: 'Korvo AI <onboarding@resend.dev>',
      to:   process.env.MAIL_TO,
      reply_to: email,
      subject: `New inquiry from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || 'not provided'}`,
        `Service: ${service || 'not specified'}`,
        `Preferred time: ${preferred_time || 'not specified'}`,
        ``,
        `Message:`,
        message,
      ].join('\n'),
    });
    try {
      const appts = getAppts();
      appts.appointments.unshift({
        id: Date.now().toString(),
        name, email,
        phone: phone || '',
        service: service || '',
        preferred_time: preferred_time || '',
        message,
        submitted: new Date().toISOString(),
      });
      saveAppts(appts);
    } catch (_) { /* don't block response */ }
    res.json({ success: true, message: "Thanks! We'll be in touch within one business day." });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ error: 'Could not send message. Please email hello@korvo.ai directly.' });
  }
});

// API: Appointments (admin)
app.get('/api/appointments', requireAdmin, (req, res) => {
  res.json(getAppts().appointments);
});

// API: Discovery calls (admin) — list / create / read / update / delete
app.get('/api/discovery', requireAdmin, async (req, res) => {
  try {
    res.json(await discoveryStore.list());
  } catch (err) {
    console.error('Discovery list error:', err.message);
    res.status(500).json({ error: 'Could not load discovery calls.' });
  }
});

app.get('/api/discovery/:id', requireAdmin, async (req, res) => {
  try {
    const rec = await discoveryStore.get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  } catch (err) {
    console.error('Discovery get error:', err.message);
    res.status(500).json({ error: 'Could not load that call.' });
  }
});

app.post('/api/discovery', requireAdmin, async (req, res) => {
  try {
    res.status(201).json(await discoveryStore.create(req.body || {}));
  } catch (err) {
    console.error('Discovery create error:', err.message);
    res.status(500).json({ error: 'Could not save call.' });
  }
});

app.put('/api/discovery/:id', requireAdmin, async (req, res) => {
  try {
    const rec = await discoveryStore.update(req.params.id, req.body || {});
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  } catch (err) {
    console.error('Discovery update error:', err.message);
    res.status(500).json({ error: 'Could not update call.' });
  }
});

app.delete('/api/discovery/:id', requireAdmin, async (req, res) => {
  try {
    const ok = await discoveryStore.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Discovery delete error:', err.message);
    res.status(500).json({ error: 'Could not delete call.' });
  }
});

discoveryStore.init()
  .then(() => console.log(`Discovery store ready (${discoveryStore.usingPostgres ? 'Postgres' : 'file'})`))
  .catch((err) => console.error('Discovery store init failed:', err.message));

app.listen(PORT, () => {
  console.log(`Korvo AI running at http://localhost:${PORT}`);
});
