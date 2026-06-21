/* ═══════════════════════════════════════
   SecurePass — Login Logic
   Flow: Details Form → OTP → Success
═══════════════════════════════════════ */

let generatedOTP  = '';
let timerInterval = null;
let userData      = {};

// ── Set max DOB to today ──────────────
window.onload = () => {
  // Already logged in? Skip to features
  const u = JSON.parse(localStorage.getItem('spUser') || '{}');
  if (u.loggedIn) { window.location.href = 'features.html'; return; }

  // Max date = today (can't be born in future)
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dobInput').setAttribute('max', today);

  // Request notification permission early
  requestNotifPermission();
};

// ═══════════════════════════════════════
//  STEP 1 → Validate & go to OTP
// ═══════════════════════════════════════
function goToOTP() {
  const name  = document.getElementById('nameInput').value.trim();
  const dob   = document.getElementById('dobInput').value;
  const email = document.getElementById('emailInput').value.trim();
  const phone = document.getElementById('phoneInput').value.trim();

  let valid = true;

  // Name
  if (!name || name.length < 2) {
    setErr('nameErr', 'Please enter your full name (min 2 characters).');
    document.getElementById('nameInput').classList.add('error-field');
    valid = false;
  } else {
    setErr('nameErr', '');
    document.getElementById('nameInput').classList.remove('error-field');
  }

  // DOB
  if (!dob) {
    setErr('dobErr', 'Please select your date of birth.');
    document.getElementById('dobInput').classList.add('error-field');
    valid = false;
  } else {
    const age = getAge(dob);
    if (age < 6) {
      setErr('dobErr', 'Age must be at least 6 years.');
      document.getElementById('dobInput').classList.add('error-field');
      valid = false;
    } else {
      setErr('dobErr', '');
      document.getElementById('dobInput').classList.remove('error-field');
    }
  }

  // Email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setErr('emailErr', 'Please enter a valid email address.');
    document.getElementById('emailInput').classList.add('error-field');
    valid = false;
  } else {
    setErr('emailErr', '');
    document.getElementById('emailInput').classList.remove('error-field');
  }

  // Phone
  if (!/^[6-9]\d{9}$/.test(phone)) {
    setErr('phoneErr', 'Enter a valid 10-digit Indian mobile number.');
    valid = false;
  } else {
    setErr('phoneErr', '');
  }

  if (!valid) return;

  // Store user data
  userData = { name, dob, email, phone };

  // Generate OTP
  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`%c🔐 OTP for ${name} (+91${phone}): ${generatedOTP}`,
    'background:#7c3aed;color:#fff;padding:5px 10px;border-radius:6px;font-size:14px;');

  // Show OTP on screen (demo mode)
  document.getElementById('otpDisplay').textContent = generatedOTP;

  // Fill user summary
  document.getElementById('userSummary').innerHTML = `
    <div class="us-row">
      <span class="us-key">👤 Name</span>
      <span class="us-val">${escHtml(name)}</span>
    </div>
    <div class="us-row">
      <span class="us-key">🎂 DOB</span>
      <span class="us-val">${formatDOB(dob)} (Age ${getAge(dob)})</span>
    </div>
    <div class="us-row">
      <span class="us-key">✉️ Email</span>
      <span class="us-val">${escHtml(email)}</span>
    </div>
    <div class="us-row">
      <span class="us-key">📱 Phone</span>
      <span class="us-val">+91 ${phone.slice(0,5)}XXXXX</span>
    </div>
  `;

  // Switch step
  switchStep(2);
  clearOTPBoxes();
  document.getElementById('o1').focus();
  startTimer(60);

  // Send real notification: OTP sent
  sendNotification(
    '🔐 SecurePass — OTP Sent',
    `Hello ${name}! Your OTP is: ${generatedOTP}\n(This is a demo — no real SMS sent)`
  );
}

// ═══════════════════════════════════════
//  STEP 2 → Verify OTP
// ═══════════════════════════════════════
function verifyOTP() {
  const entered = ['o1','o2','o3','o4','o5','o6']
    .map(id => document.getElementById(id).value)
    .join('');

  if (entered.length < 6) {
    setErr('otpErr', 'Please enter all 6 digits.');
    return;
  }

  if (entered !== generatedOTP) {
    setErr('otpErr', 'Incorrect OTP. Please try again.');
    document.querySelector('.otp-grid').classList.add('shake');
    setTimeout(() => document.querySelector('.otp-grid').classList.remove('shake'), 450);
    return;
  }

  // ✅ OTP correct
  setErr('otpErr', '');
  clearInterval(timerInterval);

  // Save session
  localStorage.setItem('spUser', JSON.stringify({
    loggedIn : true,
    name     : userData.name,
    dob      : userData.dob,
    email    : userData.email,
    phone    : userData.phone,
    joinedAt : new Date().toLocaleString()
  }));

  // Show success step
  switchStep(3);
  document.getElementById('successMsg').textContent =
    `Welcome, ${userData.name}! Redirecting...`;

  // Real notification — login success
  sendNotification(
    '✅ SecurePass — Login Successful',
    `Welcome back, ${userData.name}! You are now logged in securely.`
  );

  // Redirect after 2s
  setTimeout(() => { window.location.href = 'features.html'; }, 2000);
}

// ═══════════════════════════════════════
//  Resend OTP
// ═══════════════════════════════════════
function resendOTP() {
  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById('otpDisplay').textContent = generatedOTP;
  clearOTPBoxes();
  setErr('otpErr', '');
  document.getElementById('o1').focus();
  startTimer(60);
  console.log(`%c🔄 New OTP: ${generatedOTP}`,
    'background:#059669;color:#fff;padding:4px 8px;border-radius:4px;font-size:13px;');

  sendNotification(
    '🔄 SecurePass — New OTP',
    `Your new OTP is: ${generatedOTP}`
  );
}

function backToDetails() {
  clearInterval(timerInterval);
  switchStep(1);
}

// ═══════════════════════════════════════
//  OTP Box Navigation
// ═══════════════════════════════════════
function otpMove(current, nextId) {
  // Only allow digits
  current.value = current.value.replace(/[^0-9]/g, '');
  if (current.value && nextId) {
    document.getElementById(nextId).focus();
  }
  // Auto verify when last box filled
  if (!nextId && current.value) {
    setTimeout(verifyOTP, 200);
  }
}

function otpBack(e, current, prevId) {
  if (e.key === 'Backspace' && !current.value && prevId !== current.id) {
    document.getElementById(prevId).focus();
  }
}

function clearOTPBoxes() {
  ['o1','o2','o3','o4','o5','o6'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

// ═══════════════════════════════════════
//  Timer
// ═══════════════════════════════════════
function startTimer(seconds) {
  clearInterval(timerInterval);
  const resendBtn = document.getElementById('resendBtn');
  const timerEl   = document.getElementById('otpTimer');
  resendBtn.disabled = true;
  let remaining = seconds;

  timerEl.textContent = `Expires in ${remaining}s`;

  timerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = 'OTP expired.';
      resendBtn.disabled = false;
    } else {
      timerEl.textContent = `Expires in ${remaining}s`;
    }
  }, 1000);
}

// ═══════════════════════════════════════
//  Step Switcher
// ═══════════════════════════════════════
function switchStep(step) {
  document.getElementById('detailsStep').classList.toggle('hidden', step !== 1);
  document.getElementById('otpStep').classList.toggle('hidden', step !== 2);
  document.getElementById('successStep').classList.toggle('hidden', step !== 3);

  // Step dots
  const dots   = [document.getElementById('dot1'), document.getElementById('dot2')];
  const labels = ['<span>Step 1</span> — Your Details', '<span>Step 2</span> — OTP Verification'];

  if (step === 1) {
    dots[0].className = 'step-dot active';
    dots[1].className = 'step-dot';
    document.getElementById('stepLabel').innerHTML = labels[0];
    document.getElementById('stepDots').style.display = 'flex';
  } else if (step === 2) {
    dots[0].className = 'step-dot done';
    dots[1].className = 'step-dot active';
    document.getElementById('stepLabel').innerHTML = labels[1];
    document.getElementById('stepDots').style.display = 'flex';
  } else {
    document.getElementById('stepDots').style.display = 'none';
    document.getElementById('stepLabel').textContent = '';
  }
}

// ═══════════════════════════════════════
//  Real Browser Notification
// ═══════════════════════════════════════
function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if (!('Notification' in window)) return;

  const fire = () => {
    try {
      const n = new Notification(title, {
        body,
        icon : 'https://cdn-icons-png.flaticon.com/512/295/295128.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/295/295128.png',
        tag  : 'securepass-login',
        requireInteraction: false
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch(e) {
      console.warn('Notification failed:', e);
    }
  };

  if (Notification.permission === 'granted') {
    fire();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') fire(); });
  }
}

// ═══════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════
function setErr(id, msg) {
  document.getElementById(id).textContent = msg;
}

function getAge(dob) {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDOB(dob) {
  const d = new Date(dob);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function escHtml(str) {
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
