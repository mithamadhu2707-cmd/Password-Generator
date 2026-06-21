// ===========================
//  Auth Guard
// ===========================
window.onload = () => {
  const user = JSON.parse(localStorage.getItem('spUser') || '{}');
  if (!user.loggedIn) { window.location.href = 'login.html'; return; }

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  loadQuickHistory();
  document.getElementById('lengthSlider').addEventListener('input', () => {
    document.getElementById('lengthDisplay').textContent =
      document.getElementById('lengthSlider').value;
  });
};

function logout() {
  localStorage.removeItem('spUser');
  window.location.href = 'login.html';
}

// ===========================
//  Character Sets
// ===========================
const CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

let currentPassword = '';

// ===========================
//  Generate
// ===========================
function generatePassword() {
  const length = parseInt(document.getElementById('lengthSlider').value);
  const uc = document.getElementById('uppercase').checked;
  const lc = document.getElementById('lowercase').checked;
  const nb = document.getElementById('numbers').checked;
  const sy = document.getElementById('symbols').checked;

  let charset = '';
  const guaranteed = [];

  if (uc) { charset += CHARS.uppercase; guaranteed.push(randomChar(CHARS.uppercase)); }
  if (lc) { charset += CHARS.lowercase; guaranteed.push(randomChar(CHARS.lowercase)); }
  if (nb) { charset += CHARS.numbers;   guaranteed.push(randomChar(CHARS.numbers));   }
  if (sy) { charset += CHARS.symbols;   guaranteed.push(randomChar(CHARS.symbols));   }

  if (!charset) {
    showOutput('⚠ Select at least one character type', true);
    return;
  }

  let pwd = [...guaranteed];
  for (let i = pwd.length; i < length; i++) pwd.push(randomChar(charset));
  pwd = shuffle(pwd);
  currentPassword = pwd.join('');

  showOutput(currentPassword, false);
  updateStrength(currentPassword);
  resetActionBtns();

  // Browser Notification
  sendNotification(currentPassword);
}

function showOutput(text, isWarning) {
  const el = document.getElementById('passwordOutput');
  el.textContent = text;
  if (isWarning) {
    el.className = 'password-text placeholder';
    document.getElementById('strengthContainer').style.opacity = '0';
  } else {
    el.className = 'password-text';
  }
}

// ===========================
//  Real Browser Notification
// ===========================
function sendNotification(password) {
  if (!('Notification' in window)) return;

  const user  = JSON.parse(localStorage.getItem('spUser') || '{}');
  const label = document.getElementById('labelInput').value.trim() || 'New Password';
  const strength = document.getElementById('strengthLabel').textContent || '';

  const title = '🔐 SecurePass — Password Generated!';
  const body  = `${label}\n${password.slice(0,6)}••••••  |  Strength: ${strength}\n— ${user.name || 'SecurePass'}`;

  const fire = () => {
    try {
      const n = new Notification(title, {
        body,
        icon : 'https://cdn-icons-png.flaticon.com/512/295/295128.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/295/295128.png',
        tag  : 'securepass-gen',
        requireInteraction: false
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) {
      console.warn('Notification error:', e);
    }
  };

  if (Notification.permission === 'granted') {
    fire();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') fire(); });
  }
}

// ===========================
//  Copy
// ===========================
function copyPassword() {
  if (!currentPassword) return;

  navigator.clipboard.writeText(currentPassword).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = currentPassword;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }).finally(() => {
    const btn = document.getElementById('copyBtn');
    btn.classList.add('copied');
    document.getElementById('copyIcon').textContent = '✅';
    document.getElementById('copyText').textContent = 'Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      document.getElementById('copyIcon').textContent = '📋';
      document.getElementById('copyText').textContent = 'Copy';
    }, 2000);
  });
}

// ===========================
//  Save to History
// ===========================
function savePassword() {
  if (!currentPassword) return;

  const label = document.getElementById('labelInput').value.trim() || 'Untitled';
  const history = JSON.parse(localStorage.getItem('spHistory') || '[]');

  history.unshift({
    id: Date.now(),
    label,
    password: currentPassword,
    strength: document.getElementById('strengthLabel').textContent,
    date: new Date().toLocaleString()
  });

  // Keep max 50 entries
  if (history.length > 50) history.pop();
  localStorage.setItem('spHistory', JSON.stringify(history));

  const btn = document.getElementById('saveText');
  document.getElementById('saveIcon').textContent = '✅';
  btn.textContent = 'Saved!';
  document.querySelector('.btn-save').classList.add('saved');

  setTimeout(() => {
    document.getElementById('saveIcon').textContent = '💾';
    btn.textContent = 'Save';
    document.querySelector('.btn-save').classList.remove('saved');
  }, 2000);

  loadQuickHistory();
}

// ===========================
//  Quick History Preview
// ===========================
function loadQuickHistory() {
  const history = JSON.parse(localStorage.getItem('spHistory') || '[]');
  const el = document.getElementById('quickHistory');

  if (!history.length) { el.innerHTML = ''; return; }

  const recent = history.slice(0, 3);
  el.innerHTML = `
    <div class="qh-header">
      <span>Recent Saves</span>
      <a href="history.html" class="link-btn">View All →</a>
    </div>
    ${recent.map(h => `
      <div class="qh-item">
        <div class="qh-info">
          <span class="qh-label">${h.label}</span>
          <span class="qh-pass">${maskPassword(h.password)}</span>
        </div>
        <span class="qh-strength ${h.strength ? h.strength.toLowerCase() : ''}">${h.strength || ''}</span>
      </div>
    `).join('')}
  `;
}

function maskPassword(pwd) {
  return pwd.slice(0, 4) + '••••' + pwd.slice(-2);
}

// ===========================
//  Strength
// ===========================
function updateStrength(password) {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (password.length >= 24) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let level, label, width;
  if      (score <= 2) { level='weak';   label='Weak';   width='25%'; }
  else if (score <= 4) { level='fair';   label='Fair';   width='50%'; }
  else if (score <= 6) { level='good';   label='Good';   width='75%'; }
  else                 { level='strong'; label='Strong'; width='100%'; }

  const fill  = document.getElementById('strengthFill');
  const lbl   = document.getElementById('strengthLabel');
  const cont  = document.getElementById('strengthContainer');

  fill.className  = `strength-fill ${level}`;
  lbl.className   = `strength-label ${level}`;
  fill.style.width = width;
  lbl.textContent  = label;
  cont.style.opacity = '1';
}

// ===========================
//  Helpers
// ===========================
function randomChar(str) {
  return str[Math.floor(Math.random() * str.length)];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resetActionBtns() {
  document.getElementById('copyIcon').textContent = '📋';
  document.getElementById('copyText').textContent = 'Copy';
  document.getElementById('saveIcon').textContent = '💾';
  document.getElementById('saveText').textContent = 'Save';
  document.querySelector('.btn-copy').classList.remove('copied');
  document.querySelector('.btn-save').classList.remove('saved');
}
