require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const fs      = require('fs');
const { Resend } = require('resend');
const resend  = new Resend(process.env.RESEND_API_KEY);

const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');
function getPosts()   { return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')); }
function savePosts(d) { fs.writeFileSync(POSTS_FILE, JSON.stringify(d, null, 2)); }
function makeSlug(t)  { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

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
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc:     ["'self'", "data:", "https:"],
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
app.get('/story',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'story.html')));
app.get('/post',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'post.html')));
app.get('/admin',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// API: Blog posts
app.get('/api/posts', (req, res) => {
  res.json(getPosts().posts);
});

app.post('/api/posts', (req, res) => {
  const { adminKey, title, category, excerpt, body, date } = req.body;
  if (adminKey !== process.env.ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });
  const data = getPosts();
  const slug = makeSlug(title);
  const post = {
    id: Date.now().toString(),
    slug,
    title,
    category: category || 'Korvo Updates',
    date: date || new Date().toISOString().split('T')[0],
    excerpt: excerpt || body.substring(0, 180).trim() + '…',
    body,
  };
  data.posts.unshift(post);
  savePosts(data);
  res.json({ success: true, post });
});

app.post('/api/posts/:id/delete', (req, res) => {
  const { adminKey } = req.body;
  if (adminKey !== process.env.ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const data = getPosts();
  data.posts = data.posts.filter(p => p.id !== req.params.id);
  savePosts(data);
  res.json({ success: true });
});

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
  if (adminKey !== process.env.ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
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
