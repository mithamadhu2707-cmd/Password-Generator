// ===========================
//  Auth Guard
// ===========================
window.onload = () => {
  const user = JSON.parse(localStorage.getItem('spUser') || '{}');
  if (!user.loggedIn) { window.location.href = 'login.html'; return; }
  renderHistory();
};

// ===========================
//  Render
// ===========================
function renderHistory() {
  const query   = (document.getElementById('searchInput').value || '').toLowerCase();
  let history   = JSON.parse(localStorage.getItem('spHistory') || '[]');
  const listEl  = document.getElementById('historyList');
  const emptyEl = document.getElementById('emptyState');
  const statsEl = document.getElementById('statsRow');

  // Stats
  if (history.length) {
    const strong = history.filter(h => h.strength === 'Strong').length;
    statsEl.innerHTML = `
      <div class="stat-pill">📦 ${history.length} Saved</div>
      <div class="stat-pill green">💪 ${strong} Strong</div>
      <div class="stat-pill purple">📅 Latest: ${history[0]?.date?.split(',')[0] || '-'}</div>
    `;
  } else {
    statsEl.innerHTML = '';
  }

  // Filter
  const filtered = query
    ? history.filter(h =>
        h.label.toLowerCase().includes(query) ||
        h.password.toLowerCase().includes(query)
      )
    : history;

  if (!filtered.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  listEl.innerHTML = filtered.map(h => `
    <div class="history-card" id="card-${h.id}">
      <div class="hc-top">
        <div class="hc-label-row">
          <span class="hc-label">${h.label}</span>
          <span class="hc-badge ${(h.strength || '').toLowerCase()}">${h.strength || ''}</span>
        </div>
        <div class="hc-actions">
          <button class="icon-btn" title="Copy" onclick="copyPass('${escHtml(h.password)}', this)">📋</button>
          <button class="icon-btn" title="Toggle show" onclick="togglePass(${h.id})">👁️</button>
          <button class="icon-btn danger" title="Delete" onclick="deleteEntry(${h.id})">🗑️</button>
        </div>
      </div>
      <div class="hc-password hidden" id="pass-${h.id}">
        <span class="mono">${escHtml(h.password)}</span>
      </div>
      <div class="hc-masked" id="masked-${h.id}">
        <span class="mono muted">${maskPass(h.password)}</span>
      </div>
      <div class="hc-date">${h.date}</div>
    </div>
  `).join('');
}

// ===========================
//  Actions
// ===========================
function togglePass(id) {
  const passEl   = document.getElementById(`pass-${id}`);
  const maskedEl = document.getElementById(`masked-${id}`);
  const isHidden = passEl.classList.contains('hidden');
  passEl.classList.toggle('hidden', !isHidden);
  maskedEl.classList.toggle('hidden', isHidden);
}

function copyPass(password, btn) {
  navigator.clipboard.writeText(password).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = password;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }).finally(() => {
    const orig = btn.textContent;
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

function deleteEntry(id) {
  let history = JSON.parse(localStorage.getItem('spHistory') || '[]');
  history = history.filter(h => h.id !== id);
  localStorage.setItem('spHistory', JSON.stringify(history));

  const card = document.getElementById(`card-${id}`);
  card.style.transition = 'opacity 0.3s, transform 0.3s';
  card.style.opacity = '0';
  card.style.transform = 'translateX(20px)';
  setTimeout(() => renderHistory(), 300);
}

function clearAll() {
  if (!confirm('Delete all saved passwords? This cannot be undone.')) return;
  localStorage.removeItem('spHistory');
  renderHistory();
}

// ===========================
//  Helpers
// ===========================
function maskPass(pwd) {
  return pwd.slice(0, 3) + '•••••••' + pwd.slice(-2);
}

function escHtml(str) {
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
