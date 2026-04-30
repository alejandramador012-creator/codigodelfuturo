/* ═══════════════════════════════════════════════
   AUTH — Session management (LocalStorage)
   Architecture ready for Supabase/Firebase swap
═══════════════════════════════════════════════ */

const CDF_AUTH = (() => {
  const SESSION_KEY = 'cdf_session';
  const USERS_KEY   = 'cdf_users';

  // ── Seed demo users (first run only) ──────────
  const DEMO_USERS = [
    { id: 'u_sofia',   email: 'sofia@cdf.com',   password: 'sofia1234',   name: 'Sofía Osorio',   role: 'Fundadora',     refCode: 'CF-SOFIA-001' },
    { id: 'u_nicolas', email: 'nicolas@cdf.com', password: 'nicolas1234', name: 'Nicolás Moreno', role: 'Fundador',      refCode: 'CF-NICO-002'  },
    { id: 'u_demo',    email: 'demo@cdf.com',    password: 'demo1234',    name: 'Demo Usuario',   role: 'Miembro Activo', refCode: 'CF-DEMO-003'  },
  ];
  const VALID_INVITE_CODES = ['CF-SOFIA-001','CF-NICO-002','CF-DEMO-003','CF-2025-GOLD','CF-GENESIS'];

  function _getUsers() {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : DEMO_USERS;
    } catch { return DEMO_USERS; }
  }
  function _saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function _hashish(str) {
    // Simple deterministic hash (NOT for production — swap with bcrypt on backend)
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h.toString(36);
  }

  // Ensure demo users exist
  if (!localStorage.getItem(USERS_KEY)) _saveUsers(DEMO_USERS);

  return {
    // ── Login ─────────────────────────────────
    login(email, password) {
      const users = _getUsers();
      const user = users.find(u =>
        u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!user) return { ok: false, error: 'Credenciales incorrectas. Verifica e intenta de nuevo.' };
      const session = { userId: user.id, name: user.name, email: user.email, role: user.role, refCode: user.refCode, ts: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true, user: session };
    },

    // ── Register ──────────────────────────────
    register(inviteCode, name, email, password) {
      const code = inviteCode.trim().toUpperCase();
      if (!VALID_INVITE_CODES.includes(code))
        return { ok: false, error: 'Código de invitación inválido. Verifica con quien te invitó.' };

      const users = _getUsers();
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
        return { ok: false, error: 'Este email ya tiene una cuenta. Inicia sesión.' };

      if (password.length < 8)
        return { ok: false, error: 'La contraseña debe tener mínimo 8 caracteres.' };

      const newUser = {
        id: 'u_' + Date.now(),
        email: email.toLowerCase(),
        password,          // NOTE: In production → hashed on server
        name: name.trim(),
        role: 'Miembro Activo',
        refCode: 'CF-' + name.trim().split(' ')[0].toUpperCase().slice(0,6) + '-' + Math.floor(Math.random()*900+100),
      };
      users.push(newUser);
      _saveUsers(users);

      const session = { userId: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, refCode: newUser.refCode, ts: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true, user: session };
    },

    // ── Get session ───────────────────────────
    getSession() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        // Expire after 30 days
        if (Date.now() - session.ts > 30 * 86400 * 1000) {
          localStorage.removeItem(SESSION_KEY);
          return null;
        }
        return session;
      } catch { return null; }
    },

    // ── Logout ────────────────────────────────
    logout() {
      localStorage.removeItem(SESSION_KEY);
    },

    // ── Valid invite codes (for reference display) ──
    getValidCodes() { return VALID_INVITE_CODES; },
  };
})();

/* ── Global modal helpers ── */
let _activeModal = null;

function openModal(name) {
  const overlay = document.getElementById('modal-overlay');
  const target  = document.getElementById('modal-' + name);
  if (!overlay || !target) return;
  // Hide all modals first
  overlay.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  target.classList.remove('hidden');
  overlay.classList.remove('hidden');
  _activeModal = name;
  document.body.style.overflow = 'hidden';
  // Focus first input
  setTimeout(() => { target.querySelector('input')?.focus(); }, 100);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
  _activeModal = null;
}

function switchModal(name) {
  const overlay = document.getElementById('modal-overlay');
  overlay?.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-' + name)?.classList.remove('hidden');
  _activeModal = name;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ── Login handler ── */
async function handleLogin(e) {
  e.preventDefault();
  const email     = document.getElementById('login-email').value.trim();
  const password  = document.getElementById('login-pass').value;
  const errEl     = document.getElementById('login-err');
  const btnText   = document.getElementById('login-btn-text');
  const spinner   = document.getElementById('login-spinner');

  errEl.classList.remove('show'); errEl.textContent = '';
  btnText.classList.add('hidden'); spinner.classList.remove('hidden');

  // Simulate async (replace with real API call)
  await new Promise(r => setTimeout(r, 600));

  const result = CDF_AUTH.login(email, password);
  btnText.classList.remove('hidden'); spinner.classList.add('hidden');

  if (!result.ok) {
    errEl.textContent = result.error;
    errEl.classList.add('show');
    return;
  }
  closeModal();
  window.location.href = 'app.html';
}

/* ── Google Sheets integration ── */
async function sendToGoogleSheets(name, email, code) {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7eW_-gNafi-P7HfSkPVrgmCLlNlQCVgDLT015UddhZ3MYUg8HHq6b7DK-LWrFAN-rew/exec";
  const payload = {
    nombre: name, correo: email, codigo: code,
    timestamp: new Date().toISOString()
  };
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST', mode: 'no-cors', cache: 'no-cache',
      body: JSON.stringify(payload)
    });
    window.location.href = 'app.html';
  } catch (error) {
    console.error("Error al guardar datos:", error);
    alert("Hubo un problema con el registro, pero tu código es válido. Entrando...");
    window.location.href = 'app.html';
  }
}

/* ── Register handler ── */
async function handleRegister(e) {
  e.preventDefault();
  const code     = document.getElementById('reg-code').value;
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pass').value;
  const errEl    = document.getElementById('reg-err');
  const btnText  = document.getElementById('reg-btn-text');
  const spinner  = document.getElementById('reg-spinner');

  errEl.classList.remove('show'); errEl.textContent = '';
  btnText.classList.add('hidden'); spinner.classList.remove('hidden');

  await new Promise(r => setTimeout(r, 800));

  const result = CDF_AUTH.register(code, name, email, password);
  btnText.classList.remove('hidden'); spinner.classList.add('hidden');

  if (!result.ok) {
    errEl.textContent = result.error;
    errEl.classList.add('show');
    return;
  }
  closeModal();
  await sendToGoogleSheets(name, email, code);
}

/* ── Auto-redirect if already logged in ── */
(function checkSession() {
  const onLanding = window.location.pathname.endsWith('index.html')
    || window.location.pathname === '/'
    || window.location.pathname.endsWith('/');
  if (!onLanding) return;

  const session = CDF_AUTH.getSession();
  if (!session) return;

  console.log('[CDF] Session active:', session.name);

  // Inject "Ir al Dashboard" button + greeting into nav on DOM ready
  function injectDashNav() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;
    const firstName = session.name.split(' ')[0];
    navActions.innerHTML = `
      <span class="nav-greeting">Hola, ${firstName} 👋</span>
      <a href="app.html" class="btn btn-primary nav-dashboard-btn">Ir al Dashboard →</a>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDashNav);
  } else {
    injectDashNav();
  }
})();
