let ADMIN_KEY = '';

function adminLogin() {
  const key = document.getElementById('adminKeyInput').value.trim();
  const btn = document.querySelector('#loginScreen button');
  const err = document.getElementById('loginError');
  err.style.display = 'none';
  if (!key) {
    err.textContent = 'Please enter your password.';
    err.style.display = 'block';
    return;
  }
  ADMIN_KEY = key;
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  verifyAndLoad().finally(() => {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  });
}

document.getElementById('adminKeyInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') adminLogin();
});

async function verifyAndLoad() {
  const err = document.getElementById('loginError');
  try {
    const res = await fetch(`/api/appointments?adminKey=${encodeURIComponent(ADMIN_KEY)}`);
    if (res.status === 401) {
      err.textContent = 'Incorrect password.';
      err.style.display = 'block';
      ADMIN_KEY = '';
      return;
    }
    if (!res.ok) {
      err.textContent = `Server error (${res.status}). Try again.`;
      err.style.display = 'block';
      ADMIN_KEY = '';
      return;
    }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';

    loadAppointments();
  } catch (e) {
    err.textContent = 'Could not connect to server. Is the site up?';
    err.style.display = 'block';
    ADMIN_KEY = '';
  }
}

function adminLogout() {
  ADMIN_KEY = '';
  window.location.href = '/';
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
