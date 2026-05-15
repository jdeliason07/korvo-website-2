let ADMIN_KEY = '';

function adminLogin() {
  const key = document.getElementById('adminKeyInput').value.trim();
  if (!key) return;
  ADMIN_KEY = key;
  verifyAndLoad();
}

document.getElementById('adminKeyInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') adminLogin();
});

async function verifyAndLoad() {
  try {
    const res = await fetch(`/api/appointments?adminKey=${encodeURIComponent(ADMIN_KEY)}`);
    if (res.status === 401) {
      document.getElementById('loginError').style.display = 'block';
      ADMIN_KEY = '';
      return;
    }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('postDate').value = today;

    loadPosts();
    loadAppointments();
  } catch {
    document.getElementById('loginError').textContent = 'Could not connect.';
    document.getElementById('loginError').style.display = 'block';
  }
}

function adminLogout() {
  ADMIN_KEY = '';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('adminKeyInput').value = '';
}

async function loadPosts() {
  const list = document.getElementById('postsList');
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    if (!posts.length) {
      list.innerHTML = '<li style="color:var(--text-muted);font-size:.9rem;">No posts yet.</li>';
      return;
    }
    list.innerHTML = posts.map(p => `
      <li class="admin-post-item">
        <div>
          <h4>${p.title}</h4>
          <div class="admin-post-meta">${p.category} &middot; ${p.date}</div>
        </div>
        <button class="btn-delete" onclick="deletePost('${p.id}')">Delete</button>
      </li>`).join('');
  } catch {
    list.innerHTML = '<li style="color:#dc3545;">Could not load posts.</li>';
  }
}

async function createPost() {
  const msg = document.getElementById('postMsg');
  msg.className = 'form-msg';

  const title = document.getElementById('postTitle').value.trim();
  const body  = document.getElementById('postBody').value.trim();
  if (!title || !body) {
    msg.textContent = 'Title and body are required.';
    msg.classList.add('error');
    return;
  }

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        title,
        body,
        category: document.getElementById('postCategory').value,
        date: document.getElementById('postDate').value,
        excerpt: document.getElementById('postExcerpt').value.trim(),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      msg.textContent = 'Post published!';
      msg.classList.add('success');
      document.getElementById('postTitle').value = '';
      document.getElementById('postBody').value = '';
      document.getElementById('postExcerpt').value = '';
      loadPosts();
    } else {
      msg.textContent = data.error || 'Something went wrong.';
      msg.classList.add('error');
    }
  } catch {
    msg.textContent = 'Network error.';
    msg.classList.add('error');
  }
}

async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/posts/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: ADMIN_KEY }),
    });
    if (res.ok) loadPosts();
    else alert('Could not delete post.');
  } catch {
    alert('Network error.');
  }
}

async function loadAppointments() {
  const tbody = document.getElementById('apptBody');
  try {
    const res = await fetch(`/api/appointments?adminKey=${encodeURIComponent(ADMIN_KEY)}`);
    const appts = await res.json();
    if (!appts.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted);">No consultation requests yet.</td></tr>';
      return;
    }
    tbody.innerHTML = appts.map(a => `
      <tr>
        <td>${new Date(a.submitted).toLocaleDateString()}</td>
        <td>${a.name}</td>
        <td><a href="mailto:${a.email}" style="color:var(--green-dark);">${a.email}</a></td>
        <td>${a.phone || '—'}</td>
        <td>${a.service || '—'}</td>
        <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${a.message}">${a.message}</td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#dc3545;">Could not load requests.</td></tr>';
  }
}
