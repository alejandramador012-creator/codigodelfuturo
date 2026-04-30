/* ═══════════════════════════════════════════════
   LANDING — Cursor · Particles · Animations
═══════════════════════════════════════════════ */
'use strict';

/* ── Loading screen ── */
window.addEventListener('load', () => {
  const ls = document.getElementById('loading-screen');
  if (!ls) return;
  setTimeout(() => {
    ls.style.opacity = '0';
    ls.style.pointerEvents = 'none';
    setTimeout(() => ls.remove(), 700);
  }, 1800);
});

/* ══════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════ */
(function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0;   // mouse
  let rx = 0, ry = 0;   // ring (lerped)
  let raf;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
  });

  // Ring follows with smooth lag
  function lerp(a, b, t) { return a + (b - a) * t; }
  function loop() {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    raf = requestAnimationFrame(loop);
  }
  loop();

  // Hover effect on interactive elements
  const hoverTargets = 'a, button, .bento-card, .founder-card, .ally-card, input, [onclick]';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverTargets)) {
      dot.classList.add('hover');
      ring.classList.add('hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverTargets)) {
      dot.classList.remove('hover');
      ring.classList.remove('hover');
    }
  });

  // Click flash
  document.addEventListener('mousedown', () => {
    dot.classList.add('click'); ring.classList.add('click');
  });
  document.addEventListener('mouseup', () => {
    dot.classList.remove('click'); ring.classList.remove('click');
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0'; ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1'; ring.style.opacity = '1';
  });
})();

/* ══════════════════════════════════════════════
   LARGE CURSOR GLOW (SAEC-style ambient pointer)
══════════════════════════════════════════════ */
(function initCursorGlow() {
  const glow = document.getElementById('cursor-glow-large');
  if (!glow) return;
  const r = 300; // half of 600px
  document.addEventListener('mousemove', e => {
    glow.style.transform = `translate(${e.clientX - r}px, ${e.clientY - r}px)`;
  }, { passive: true });
})();

/* ══════════════════════════════════════════════
   PARTICLE SYSTEM
══════════════════════════════════════════════ */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [];

  const resize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const rnd = (a, b) => a + Math.random() * (b - a);
  // Gold + blue particles
  const colors = ['rgba(201,168,76,', 'rgba(59,158,255,', 'rgba(255,255,255,'];
  for (let i = 0; i < 65; i++) {
    pts.push({
      x: Math.random() * 3000,
      y: Math.random() * 2000,
      vx: rnd(-0.1, 0.1),
      vy: rnd(-0.07, 0.07),
      r: rnd(0.3, 1.2),
      o: rnd(0.04, 0.16),
      c: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c + p.o + ')';
      ctx.fill();
    });
    // Connections
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(201,168,76,${0.045 * (1 - d / 100)})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  };
  draw();
})();

/* ══════════════════════════════════════════════
   NAV SCROLL
══════════════════════════════════════════════ */
const nav = document.getElementById('main-nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

/* ── Nav buttons ── */
document.getElementById('btn-login')?.addEventListener('click',  () => openModal('login'));
document.getElementById('btn-access')?.addEventListener('click', () => openModal('register'));
document.getElementById('hero-cta-main')?.addEventListener('click', () => openModal('register'));

/* ── Access wrapper (hero pill input) ── */
function handleHeroAccess() {
  const code = document.getElementById('hero-access-code')?.value.trim();
  openModal('register');
  if (code) {
    setTimeout(() => {
      const codeInput = document.getElementById('reg-code');
      if (codeInput) codeInput.value = code.toUpperCase();
    }, 150);
  }
}
document.getElementById('hero-access-code')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleHeroAccess();
});

/* ══════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ══════════════════════════════════════════════
   HERO TITLE LINE ANIMATION
══════════════════════════════════════════════ */
(function animateHeroTitle() {
  const title = document.getElementById('hero-title');
  if (!title) return;
  // Animate lines (childNodes that are elements or non-empty text)
  // Instead of word-split (causes spacing bugs), we wrap full lines
  const lines = [];
  title.childNodes.forEach(node => {
    if (node.nodeType === 3 && node.textContent.trim()) {
      const span = document.createElement('span');
      span.style.display = 'block';
      span.style.overflow = 'hidden';
      const inner = document.createElement('span');
      inner.style.display = 'block';
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(100%)';
      inner.style.transition = 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)';
      inner.textContent = node.textContent;
      span.appendChild(inner);
      lines.push(inner);
      node.replaceWith(span);
    } else if (node.nodeType === 1 && node.tagName === 'EM') {
      // The gradient em element
      const wrap = document.createElement('span');
      wrap.style.display = 'block';
      wrap.style.overflow = 'hidden';
      node.style.display = 'block';
      node.style.opacity = '0';
      node.style.transform = 'translateY(100%)';
      node.style.transition = 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)';
      lines.push(node);
      node.parentNode.insertBefore(wrap, node);
      wrap.appendChild(node);
    }
  });
  // Stagger in
  lines.forEach((el, i) => {
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 400 + i * 120);
  });
})();

/* ══════════════════════════════════════════════
   ANIMATED COUNTER
══════════════════════════════════════════════ */
function animateCounter(el, target, suffix = '') {
  const duration = 2200, start = performance.now();
  const step = now => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const statEl = document.getElementById('anim-stat-1');
if (statEl) {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { animateCounter(statEl, 35, '+'); obs.disconnect(); }
  }, { threshold: 0.5 });
  obs.observe(statEl);
}

/* ══════════════════════════════════════════════
   LIVE MARKET TICKER
══════════════════════════════════════════════ */
const BASES = { gold: 3221, btc: 83450 };
function jitter(b, p) { return (b * (1 + (Math.random() - 0.5) * p * 2)); }
setInterval(() => {
  const gEl = document.getElementById('hv-gold');
  const bEl = document.getElementById('hv-btc');
  if (gEl) gEl.textContent = '$' + Number(jitter(BASES.gold, 0.0007).toFixed(0)).toLocaleString('en');
  if (bEl) bEl.textContent = '$' + Math.round(jitter(BASES.btc, 0.0012)).toLocaleString('en');
}, 3800);

/* ══════════════════════════════════════════════
   PARALLAX on founder images
══════════════════════════════════════════════ */
(function initParallax() {
  const right = document.querySelector('.hero-right');
  if (!right) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        if (sy < window.innerHeight * 1.2) {
          right.style.transform = `translateY(${sy * 0.06}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ══════════════════════════════════════════════
   MAGNETIC BUTTON EFFECT
══════════════════════════════════════════════ */
document.querySelectorAll('.btn-primary').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top  - r.height / 2;
    btn.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ══════════════════════════════════════════════
   TOAST helper
══════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3200);
}

/* ── Session check ── */
(function() {
  const session = CDF_AUTH.getSession();
  if (!session) return;
  const actions = document.querySelector('.nav-actions');
  if (actions) {
    actions.innerHTML = `
      <span style="font-size:12px;color:rgba(255,255,255,0.35)">Hola, ${session.name.split(' ')[0]}</span>
      <a href="app.html" class="btn btn-primary btn-sm">Ir al Dashboard →</a>
    `;
  }
})();
