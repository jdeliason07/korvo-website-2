require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const fs      = require('fs');
const { Resend } = require('resend');
const resend  = new Resend(process.env.RESEND_API_KEY);
const ADMIN_PASS = process.env.ADMIN_PASS || 'korvo2026';

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
    res.status(500).json({ error: 'Could not send message. Please email jack@korvo.ai directly.' });
  }
});

// API: Appointments (admin)
app.get('/api/appointments', (req, res) => {
  const { adminKey } = req.query;
  if (adminKey !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  res.json(getAppts().appointments);
});

// API: Newsletter
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  console.log('Newsletter signup:', email);
  res.json({ success: true, message: "You're subscribed!" });
});

app.listen(PORT, () => {
  console.log(`Korvo AI running at http://localhost:${PORT}`);
});
