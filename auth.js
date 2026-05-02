/* ═══════════════════════════════════════════════
   AUTH — Firebase Authentication + Firestore
   Loaded by: index.html (landing page)
═══════════════════════════════════════════════ */

/* ── Firebase init (guard against double-init from app.html) ── */
const _CDF_FB_CONFIG = {
  apiKey:            "AIzaSyB0WKpk5tkpCudYJsTJfXwiB0Q8B9vSlb0",
  authDomain:        "codigodelfuturoapp.firebaseapp.com",
  projectId:         "codigodelfuturoapp",
  storageBucket:     "codigodelfuturoapp.firebasestorage.app",
  messagingSenderId: "53195857184",
  appId:             "1:53195857184:web:8463d309ec457bf9d50b45",
  measurementId:     "G-ER1NHZJ1ZN"
};
if (!firebase.apps.length) firebase.initializeApp(_CDF_FB_CONFIG);

const _auth = firebase.auth();
const _db   = firebase.firestore();

/* ── Persist auth session across tabs & browser restarts ── */
_auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

/* ── Códigos de invitación válidos ── */
const VALID_INVITE_CODES = ['CF-SOFIA-001','CF-NICO-002','CF-DEMO-003','CF-2025-GOLD','CF-GENESIS'];

/* ── Mensajes de error Firebase en español ── */
function _fbErrMsg(code) {
  const map = {
    'auth/user-not-found':       'No existe cuenta con ese email.',
    'auth/wrong-password':       'Contraseña incorrecta.',
    'auth/invalid-credential':   'Email o contraseña incorrectos.',
    'auth/email-already-in-use': 'Este email ya tiene cuenta. Inicia sesión.',
    'auth/invalid-email':        'Email inválido.',
    'auth/weak-password':        'Contraseña muy débil (mínimo 8 caracteres).',
    'auth/too-many-requests':    'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Sin conexión. Verifica tu internet.',
    'auth/operation-not-allowed': 'Método de autenticación no habilitado.',
  };
  return map[code] || 'Error inesperado. Intenta de nuevo.';
}

/* ── Cache user profile en localStorage para acceso rápido ── */
function _cacheUser(uid, profile, email) {
  localStorage.setItem('cdf_user', JSON.stringify({
    uid,
    name:    profile.name    || email.split('@')[0],
    email:   profile.email   || email,
    role:    (profile.role   || 'MIEMBRO ACTIVO').toUpperCase(),
    refCode: profile.refCode || 'CF-GENESIS'
  }));
}

/* ════════════════════════════════════════
   MODAL HELPERS
════════════════════════════════════════ */
let _activeModal = null;

function openModal(name) {
  const overlay = document.getElementById('modal-overlay');
  const target  = document.getElementById('modal-' + name);
  if (!overlay || !target) return;
  overlay.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  target.classList.remove('hidden');
  overlay.classList.remove('hidden');
  _activeModal = name;
  document.body.style.overflow = 'hidden';
  setTimeout(() => target.querySelector('input')?.focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay')?.classList.add('hidden');
  document.body.style.overflow = '';
  _activeModal = null;
}

function switchModal(name) {
  document.getElementById('modal-overlay')
    ?.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-' + name)?.classList.remove('hidden');
  _activeModal = name;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ════════════════════════════════════════
   LOGIN
════════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl    = document.getElementById('login-err');
  const btnText  = document.getElementById('login-btn-text');
  const spinner  = document.getElementById('login-spinner');

  errEl.classList.remove('show'); errEl.textContent = '';
  btnText.classList.add('hidden'); spinner.classList.remove('hidden');

  try {
    const cred = await _auth.signInWithEmailAndPassword(email, password);

    // Intentar cargar perfil de Firestore — si falla, no bloquea el redirect
    try {
      const snap = await _db.collection('users').doc(cred.user.uid).get();
      const p    = snap.exists ? snap.data() : {};
      _cacheUser(cred.user.uid, p, email);
    } catch(firestoreErr) {
      console.warn('[CDF] Perfil no disponible, usando datos mínimos:', firestoreErr.message);
      _cacheUser(cred.user.uid, {}, email);
    }

    closeModal();
    window.location.href = 'app.html';
  } catch (err) {
    btnText.classList.remove('hidden'); spinner.classList.add('hidden');
    errEl.textContent = _fbErrMsg(err.code);
    errEl.classList.add('show');
  }
}

/* ════════════════════════════════════════
   REGISTRO
════════════════════════════════════════ */
async function handleRegister(e) {
  e.preventDefault();
  const code     = document.getElementById('reg-code').value.trim().toUpperCase();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-pass').value;
  const errEl    = document.getElementById('reg-err');
  const btnText  = document.getElementById('reg-btn-text');
  const spinner  = document.getElementById('reg-spinner');

  errEl.classList.remove('show'); errEl.textContent = '';

  // Validaciones client-side
  if (!VALID_INVITE_CODES.includes(code)) {
    errEl.textContent = 'Código de invitación inválido. Verifica con quien te invitó.';
    errEl.classList.add('show'); return;
  }
  if (password.length < 8) {
    errEl.textContent = 'La contraseña debe tener mínimo 8 caracteres.';
    errEl.classList.add('show'); return;
  }

  btnText.classList.add('hidden'); spinner.classList.remove('hidden');

  try {
    // Crear usuario en Firebase Auth
    const cred = await _auth.createUserWithEmailAndPassword(email, password);

    // Nombre visible en Firebase
    await cred.user.updateProfile({ displayName: name });

    // Generar refCode único
    const refCode = 'CF-' + name.split(' ')[0].toUpperCase().slice(0,6)
                  + '-' + Math.floor(Math.random()*900+100);

    // Guardar perfil en Firestore (no bloquea si falla)
    const profile = {
      name, email, role: 'Miembro Activo',
      refCode, inviteCode: code,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await _db.collection('users').doc(cred.user.uid).set(profile);
    } catch(fsErr) {
      console.warn('[CDF] Firestore write error:', fsErr.message);
    }

    // Cache local
    _cacheUser(cred.user.uid, profile, email);

    closeModal();
    await _sendToSheets(name, email, code);
  } catch (err) {
    btnText.classList.remove('hidden'); spinner.classList.add('hidden');
    errEl.textContent = _fbErrMsg(err.code);
    errEl.classList.add('show');
  }
}

/* ── Google Sheets lead capture (se mantiene) ── */
async function _sendToSheets(name, email, code) {
  const URL = "https://script.google.com/macros/s/AKfycbx7eW_-gNafi-P7HfSkPVrgmCLlNlQCVgDLT015UddhZ3MYUg8HHq6b7DK-LWrFAN-rew/exec";
  try {
    await fetch(URL, {
      method: 'POST', mode: 'no-cors', cache: 'no-cache',
      body: JSON.stringify({ nombre: name, correo: email, codigo: code, timestamp: new Date().toISOString() })
    });
  } catch (err) {
    console.warn('[CDF] Google Sheets error:', err);
  }
  window.location.href = 'app.html';
}

/* ════════════════════════════════════════
   AUTO-REDIRECT SI YA HAY SESIÓN (landing)
════════════════════════════════════════ */
(function () {
  const onLanding = ['', '/', 'index.html'].some(s => window.location.pathname.endsWith(s));
  if (!onLanding) return;

  _auth.onAuthStateChanged(user => {
    if (!user) return;
    function injectDashNav() {
      const navActions = document.querySelector('.nav-actions');
      if (!navActions) return;
      const firstName = (user.displayName || user.email).split(' ')[0];
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
  });
})();
