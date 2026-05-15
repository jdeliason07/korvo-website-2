/* ── NAV scroll ────────────────────────────────── */
const nav = document.querySelector('nav');
const scrollTopBtn = document.querySelector('.scroll-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav?.classList.add('scrolled');
    scrollTopBtn?.classList.add('visible');
  } else {
    nav?.classList.remove('scrolled');
    scrollTopBtn?.classList.remove('visible');
  }
});

scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── Mobile hamburger ──────────────────────────── */
const hamburger = document.querySelector('.hamburger');
const mobileNav = document.querySelector('.mobile-nav');

hamburger?.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});

document.querySelectorAll('.mobile-nav a').forEach(a =>
  a.addEventListener('click', () => mobileNav.classList.remove('open'))
);

/* ── FAQ accordion ─────────────────────────────── */
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ── Contact / book form ───────────────────────── */
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = contactForm.querySelector('button[type="submit"]');
  const msg = document.getElementById('formMsg');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  msg.className = 'form-msg';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
    });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = data.message;
      msg.classList.add('success');
      contactForm.reset();
    } else {
      msg.textContent = data.error || 'Something went wrong.';
      msg.classList.add('error');
    }
  } catch {
    msg.textContent = 'Could not connect. Please email jack@korvo.ai directly.';
    msg.classList.add('error');
  }

  btn.disabled = false;
  btn.textContent = 'Send Message';
});

/* ── Newsletter form ───────────────────────────── */
document.querySelectorAll('.newsletter-form').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        btn.textContent = "You're in!";
        form.querySelector('input').value = '';
      } else {
        btn.textContent = 'Try again';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = 'Try again';
      btn.disabled = false;
    }
  });
});

/* ── Blog posts (story/index pages) ───────────── */
async function loadPosts(containerId, limit) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const res = await fetch('/api/posts');
    let posts = await res.json();
    if (limit) posts = posts.slice(0, limit);
    if (!posts.length) {
      el.innerHTML = '<p style="color:var(--text-muted)">No posts yet. Check back soon!</p>';
      return;
    }
    el.innerHTML = posts.map(p => `
      <article class="post-card">
        <div class="post-card-body">
          <div class="post-meta">${p.category} &middot; ${p.date}</div>
          <h3>${p.title}</h3>
          <p>${p.excerpt}</p>
        </div>
        <div class="post-card-footer">
          <a href="/post?slug=${p.slug}">Read more &rarr;</a>
        </div>
      </article>`).join('');
  } catch {
    el.innerHTML = '<p style="color:var(--text-muted)">Could not load posts.</p>';
  }
}

/* ── Single post ───────────────────────────────── */
async function loadPost() {
  const slug = new URLSearchParams(location.search).get('slug');
  const body = document.getElementById('postBody');
  const meta = document.getElementById('postMeta');
  const title = document.getElementById('postTitle');
  if (!body || !slug) return;
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    const post = posts.find(p => p.slug === slug);
    if (!post) { body.innerHTML = '<p>Post not found.</p>'; return; }
    document.title = `${post.title} — Korvo AI`;
    if (meta) meta.textContent = `${post.category} · ${post.date}`;
    if (title) title.textContent = post.title;
    body.innerHTML = post.body.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>');
  } catch {
    body.innerHTML = '<p>Could not load post.</p>';
  }
}
