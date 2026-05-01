/* ═══════════════════════════════════════════════════════════
   CDF · APP · LOGIC
═══════════════════════════════════════════════════════════ */

/* ───── User (read from localStorage — bridges cdf_session & cdf_user) ───── */
function getUser() {
  try {
    // Try new format (cdf_user) first
    const u = JSON.parse(localStorage.getItem('cdf_user') || 'null');
    if (u && u.name) return u;
    // Bridge from existing cdf_session (production auth.js format)
    const s = JSON.parse(localStorage.getItem('cdf_session') || 'null');
    if (s && s.name) return {
      name: s.name,
      initial: s.name.charAt(0).toUpperCase(),
      role: (s.role || 'FOUNDER').toUpperCase(),
      refCode: s.refCode || 'CF-GENESIS'
    };
  } catch(e){}
  return { name: 'Miembro CDF', initial: 'U', role: 'FOUNDER', refCode: 'CF-GENESIS' };
}
const USER = getUser();

/* ───── Page routing ───── */
function showPage(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = el || document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    home: ['Dashboard','DASHBOARD'],
    markets: ['Mercados','MERCADOS'],
    calculator: ['Calculadora','CALCULADORA'],
    academy: ['Academia','ACADEMIA'],
    news: ['Señal · Noticias','SEÑAL'],
    community: ['Comunidad','COMUNIDAD'],
    allies: ['Aliados','ALIADOS']
  };
  const t = titles[page] || ['CDF',''];
  document.getElementById('tb-title').textContent = t[0];
  document.getElementById('bc-page').textContent = t[1];
  window.scrollTo({top:0,behavior:'smooth'});
  localStorage.setItem('cdf_page', page);

  // Lazy init charts
  if (page === 'markets' && !window._mktsChartInit) { initMarketsPage(); window._mktsChartInit = true; }
  if (page === 'calculator' && !window._calcInit) { initCalculator(); window._calcInit = true; }
}

/* ───── Toast ───── */
function toast(msg, type='info') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 2400);
}

/* ───── Clock ───── */
function tickClock() {
  const n = new Date();
  const h = String(n.getHours()).padStart(2,'0');
  const m = String(n.getMinutes()).padStart(2,'0');
  const s = String(n.getSeconds()).padStart(2,'0');
  document.getElementById('tb-clock').textContent = `${h}:${m}:${s} COL`;
}
setInterval(tickClock, 1000); tickClock();

/* ───── Date welcome ───── */
function setDate() {
  const n = new Date();
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const el = document.getElementById('welcome-date');
  el.innerHTML = `${days[n.getDay()]} · ${n.getDate()} ${months[n.getMonth()]}<b>${n.getFullYear()}</b>`;
}
setDate();

/* ───── Countdown to next Wednesday 14:00 COL (UTC-5) ───── */
function nextWednesdayCOL() {
  const now = new Date();
  const colOffsetMin = -300; // -5:00
  const nowUtcMs = now.getTime();
  const nowColMs = nowUtcMs + (colOffsetMin - now.getTimezoneOffset()) * 60000;
  const nowCol = new Date(nowColMs);
  let daysAhead = (3 - nowCol.getDay() + 7) % 7;
  const target = new Date(nowColMs);
  target.setDate(nowCol.getDate() + daysAhead);
  target.setHours(14, 0, 0, 0);
  if (target.getTime() <= nowColMs) target.setDate(target.getDate() + 7);
  const targetUtc = target.getTime() - (colOffsetMin - now.getTimezoneOffset()) * 60000;
  return targetUtc;
}
function tickCountdown() {
  const target = nextWednesdayCOL();
  const diff = target - Date.now();
  if (diff < 0) return;
  const d = Math.floor(diff/86400000);
  const h = Math.floor((diff%86400000)/3600000);
  const m = Math.floor((diff%3600000)/60000);
  const s = Math.floor((diff%60000)/1000);
  document.getElementById('cd-d').textContent = String(d).padStart(2,'0');
  document.getElementById('cd-h').textContent = String(h).padStart(2,'0');
  document.getElementById('cd-m').textContent = String(m).padStart(2,'0');
  document.getElementById('cd-s').textContent = String(s).padStart(2,'0');
}
setInterval(tickCountdown, 1000); tickCountdown();

/* ───── User initials ───── */
function initUser() {
  const initial = (USER.name || 'U').charAt(0).toUpperCase();
  document.getElementById('sidebar-avatar').textContent = initial;
  const composeEl = document.getElementById('compose-avatar');
  if (composeEl) composeEl.textContent = initial;
  document.getElementById('sidebar-name').textContent = USER.name || 'Miembro CDF';
  document.getElementById('sidebar-role').textContent = USER.role || 'FOUNDER';
  const firstName = (USER.name || 'Miembro').split(' ')[0];
  document.getElementById('welcome-name').textContent = firstName;
  document.getElementById('ref-code').textContent = USER.refCode || 'CF-GENESIS';
  document.getElementById('ref-link').value = `codigodelfuturo.com/join?ref=${USER.refCode || 'CF-GENESIS'}`;

  // Dynamic time-based greeting
  const h = new Date().getHours();
  let greeting, sub;
  if (h >= 5 && h < 12) {
    greeting = `Buenos días, <b id="welcome-name">${firstName}</b>.`;
    const extras = ['Tu capital sigue trabajando', 'Empieza el día con claridad', 'El mercado ya está activo'];
    sub = extras[Math.floor(Math.random() * extras.length)];
  } else if (h >= 12 && h < 19) {
    greeting = `Buenas tardes, <b id="welcome-name">${firstName}</b>.`;
    const extras = ['Hoy hay nuevas oportunidades', 'Revisa tus movimientos', 'El sistema está operativo'];
    sub = extras[Math.floor(Math.random() * extras.length)];
  } else {
    greeting = `Buenas noches, <b id="welcome-name">${firstName}</b>.`;
    const extras = ['Tu capital nunca duerme', 'Revisa el resumen del día', 'El sistema sigue activo'];
    sub = extras[Math.floor(Math.random() * extras.length)];
  }
  const titleEl = document.getElementById('welcome-title');
  if (titleEl) titleEl.innerHTML = greeting + '<br>Tu <em>capital</em> te espera.';
  const subEl = document.getElementById('welcome-sub');
  if (subEl) subEl.textContent = sub + ' · Acceso completo al sistema';
}
initUser();

/* ───── Cargar contenido real desde Firestore (con fallback estático) ───── */
async function loadFirestoreContent() {
  if (typeof firebase === 'undefined' || !firebase.apps.length) return;
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    // ── Notificaciones ──
    const notifSnap = await db.collection('notifications')
      .orderBy('createdAt', 'desc').limit(10).get();
    if (!notifSnap.empty) {
      NOTIFICATIONS.length = 0;
      notifSnap.forEach(doc => {
        const d = doc.data();
        NOTIFICATIONS.push({
          id:     doc.id,
          type:   d.type   || 'blue',
          msg:    d.msg    || d.title || '',
          time:   d.time   || '',
          unread: d.unread !== false,
          page:   d.page   || 'home'
        });
      });
      renderNotifications();
    }
  } catch(e) { console.warn('[CDF] Notifications fallback:', e.message); }

  try {
    // ── Noticias ──
    const newsSnap = await db.collection('news')
      .orderBy('date', 'desc').limit(20).get();
    if (!newsSnap.empty) {
      NEWS.length = 0;
      newsSnap.forEach(doc => {
        const d = doc.data();
        NEWS.push({
          id:      doc.id,
          cat:     d.cat     || 'CDF',
          catCls:  d.catCls  || 'volt',
          title:   d.title   || '',
          summary: d.summary || '',
          date:    d.date    || '',
          source:  d.source  || 'CDF',
          impact:  d.impact  || 'neutral',
          excerpt: d.excerpt || d.summary || '',
          body:    d.body    || `<p>${d.summary}</p>`
        });
      });
      renderNews();
    }
  } catch(e) { console.warn('[CDF] News fallback:', e.message); }
}
loadFirestoreContent();

function handleLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  const doLogout = () => {
    localStorage.removeItem('cdf_user');
    localStorage.removeItem('cdf_session');
    window.location.href = 'index.html';
  };
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut().then(doLogout).catch(doLogout);
  } else {
    doLogout();
  }
}

/* ═══════════════════════════════════════════════════════════
   APEX SHARED STYLE
═══════════════════════════════════════════════════════════ */
const CHART_COMMON = {
  chart:{ background:'transparent', foreColor:'rgba(255,255,255,0.48)', toolbar:{show:false}, zoom:{enabled:false}, animations:{enabled:true, easing:'easeinout', speed:600} },
  grid:{ borderColor:'rgba(255,255,255,0.05)', strokeDashArray:3, padding:{left:4,right:4,top:0,bottom:0} },
  tooltip:{ theme:'dark', style:{fontFamily:'JetBrains Mono, monospace', fontSize:'11px'} },
  dataLabels:{ enabled:false },
  xaxis:{ axisBorder:{show:false}, axisTicks:{show:false}, labels:{style:{fontFamily:'JetBrains Mono, monospace', fontSize:'10px', colors:'rgba(255,255,255,0.32)'}} },
  yaxis:{ labels:{style:{fontFamily:'JetBrains Mono, monospace', fontSize:'10px', colors:'rgba(255,255,255,0.32)'}} }
};

/* ═══════════════════════════════════════════════════════════
   MARKETS DATA (mock, deterministic)
═══════════════════════════════════════════════════════════ */
function seedRandom(seed) { let s = seed; return () => { s = (s*9301+49297)%233280; return s/233280; }; }
function makeSeries(seed, start, vol=0.02, days=90, drift=0.0005) {
  const rnd = seedRandom(seed);
  const arr = [];
  let p = start;
  for (let i=0; i<days; i++) {
    p = p * (1 + drift + (rnd()-0.5)*vol);
    arr.push(+p.toFixed(2));
  }
  return arr;
}
const ASSETS = {
  gold: { name:'Oro · XAU/USD', symbol:'XAU', icon:'Au', color:'#D6B061', price:3221.50, series:makeSeries(101, 3100, 0.012, 90, 0.001) },
  btc:  { name:'Bitcoin · BTC', symbol:'BTC', icon:'₿', color:'#F7931A', price:67480, series:makeSeries(202, 62000, 0.025, 90, 0.0015) },
  sp:   { name:'S&P 500', symbol:'SPX', icon:'S&P', color:'#5B8BFF', price:5844.13, series:makeSeries(303, 5600, 0.008, 90, 0.0008) },
  eth:  { name:'Ethereum · ETH', symbol:'ETH', icon:'Ξ', color:'#627EEA', price:3428.20, series:makeSeries(404, 3200, 0.028, 90, 0.0012) },
  nasdaq:{name:'Nasdaq · IXIC', symbol:'IXIC', icon:'NQ', color:'#00E5FF', price:18672.30, series:makeSeries(505, 17800, 0.009, 90, 0.0009) },
  dxy:  { name:'Dollar Index', symbol:'DXY', icon:'$', color:'#00FF9C', price:106.84, series:makeSeries(606, 108, 0.004, 90, -0.0002) }
};
function lastDelta(series) {
  const last = series[series.length-1];
  const prev = series[series.length-2];
  const pct = ((last-prev)/prev)*100;
  return pct;
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD · MAIN CHART
═══════════════════════════════════════════════════════════ */
let mainChart = null;
function mainChartOptions(key) {
  const a = ASSETS[key];
  const cats = Array.from({length:a.series.length}, (_,i)=>`D${i+1}`);
  return {
    ...CHART_COMMON,
    series:[{name:a.name, data:a.series}],
    chart:{...CHART_COMMON.chart, type:'area', height:340},
    colors:[a.color],
    stroke:{curve:'smooth', width:2.5},
    fill:{type:'gradient', gradient:{shade:'dark', opacityFrom:0.4, opacityTo:0.02, stops:[0,90]}},
    xaxis:{...CHART_COMMON.xaxis, categories:cats, labels:{...CHART_COMMON.xaxis.labels, show:false}},
    yaxis:{...CHART_COMMON.yaxis, labels:{...CHART_COMMON.yaxis.labels, formatter:(v)=>'$'+v.toLocaleString('en-US',{maximumFractionDigits:0})}}
  };
}
function initMainChart() {
  const k = localStorage.getItem('cdf_main_chart') || 'gold';
  mainChart = new ApexCharts(document.getElementById('apex-main-chart'), mainChartOptions(k));
  mainChart.render();
  document.getElementById('main-chart-title').textContent = ASSETS[k].name;
}
function setMainChart(k, btn) {
  mainChart.updateOptions(mainChartOptions(k));
  document.getElementById('main-chart-title').textContent = ASSETS[k].name;
  document.querySelectorAll('#page-home .chart-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  localStorage.setItem('cdf_main_chart', k);
}

/* ═══════════════════════════════════════════════════════════
   MARKETS PAGE
═══════════════════════════════════════════════════════════ */
function sparkOptions(key) {
  const a = ASSETS[key];
  const trimmed = a.series.slice(-30);
  return {
    chart:{type:'line', height:36, sparkline:{enabled:true}, animations:{enabled:false}},
    series:[{data:trimmed}],
    colors:[a.color],
    stroke:{curve:'smooth', width:1.8},
    tooltip:{enabled:false}
  };
}
function initMarketsPage() {
  const grid = document.getElementById('markets-grid');
  grid.innerHTML = '';
  Object.entries(ASSETS).forEach(([k,a], idx) => {
    const delta = lastDelta(a.series);
    const up = delta >= 0;
    const card = document.createElement('div');
    card.className = 'mkt-card';
    card.innerHTML = `
      <div class="mkt-card-top">
        <div class="mkt-symbol">${a.symbol}</div>
        <div class="mkt-icon" style="background:${a.color}22;color:${a.color};border:1px solid ${a.color}44">${a.icon}</div>
      </div>
      <div class="mkt-value">$${a.price.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
      <div class="mkt-delta ${up?'up':'down'}">${up?'▲':'▼'} ${delta.toFixed(2)}% · 24h</div>
      <div class="mkt-spark" id="spark-${k}"></div>
    `;
    card.onclick = () => setMktsChart(k, null);
    grid.appendChild(card);
    new ApexCharts(card.querySelector(`#spark-${k}`), sparkOptions(k)).render();
  });
  if (!window._mktsMainChart) {
    window._mktsMainChart = new ApexCharts(document.getElementById('apex-markets-chart'), mainChartOptions('gold'));
    window._mktsMainChart.render();
  }
}
function setMktsChart(k, btn) {
  if (!window._mktsMainChart) return;
  window._mktsMainChart.updateOptions(mainChartOptions(k));
  document.getElementById('mkts-chart-title').textContent = ASSETS[k].name;
  document.querySelectorAll('#page-markets .chart-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  localStorage.setItem('cdf_mkts_chart', k);
}
function setRange(r, btn) {
  document.querySelectorAll('.range-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (window._mktsMainChart) {
    window._mktsMainChart.updateOptions({chart:{animations:{enabled:true, speed:400}}});
  }
  toast(`Rango ${r} aplicado`);
}

/* ═══════════════════════════════════════════════════════════
   QUICK CALC (dashboard)
═══════════════════════════════════════════════════════════ */
function updateQuickCalc() {
  const cap = parseFloat(document.getElementById('quick-capital').value) || 0;
  const result = cap * Math.pow(1 + 0.04, 12);
  document.getElementById('quick-result').textContent = '$' + Math.round(result).toLocaleString('en-US');
}
updateQuickCalc();

/* ═══════════════════════════════════════════════════════════
   CALCULATOR — SIMPLE
═══════════════════════════════════════════════════════════ */
let simpleMode = 'defi';
let simpleChart = null;

function setCalcTab(tab, btn) {
  document.querySelectorAll('.calc-tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('pane-' + tab).classList.add('active');
  document.querySelectorAll('.calc-mode-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  setTimeout(() => {
    if (tab==='simple' && simpleChart) simpleChart.render();
    if (tab==='dca' && dcaChart) dcaChart.render();
    if (tab==='compare' && compareChart) compareChart.render();
  }, 50);
}

function setSMode(mode) {
  simpleMode = mode;
  document.getElementById('s-mode-cefi').classList.toggle('active', mode==='cefi');
  document.getElementById('s-mode-defi').classList.toggle('active', mode==='defi');
  sUpdate();
}

function setRangeFill(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--v', pct + '%');
}

function sUpdate() {
  const cap = parseFloat(document.getElementById('s-cap').value) || 0;
  const time = parseInt(document.getElementById('s-time').value);
  const rate = parseFloat(document.getElementById('s-rate').value);
  const mode = simpleMode;
  const effective = mode === 'defi' ? rate * 1.25 : rate;
  const final = cap * Math.pow(1 + effective/100, time);
  const gain = final - cap;
  const roi = cap > 0 ? (gain/cap)*100 : 0;

  document.getElementById('s-cap-disp').textContent = '$' + cap.toLocaleString('en-US');
  document.getElementById('s-time-disp').textContent = time + (time===1?' mes':' meses');
  document.getElementById('s-rate-disp').textContent = rate + '%';
  document.getElementById('s-result').textContent = '$' + Math.round(final).toLocaleString('en-US');
  document.getElementById('s-sub').textContent = 'Ganancia estimada: $' + Math.round(gain).toLocaleString('en-US');
  document.getElementById('s-bd-cap').textContent = '$' + cap.toLocaleString('en-US');
  document.getElementById('s-bd-gain').textContent = '+$' + Math.round(gain).toLocaleString('en-US');
  document.getElementById('s-bd-roi').textContent = roi.toFixed(1) + '%';
  document.getElementById('s-bd-mode').textContent = mode==='defi'?'Híbrido · DeFi':'Base · CeFi';

  setRangeFill('s-time'); setRangeFill('s-rate');

  const cats = [], data = [];
  for (let i=0; i<=time; i++) {
    cats.push('M'+i);
    data.push(+(cap * Math.pow(1 + effective/100, i)).toFixed(0));
  }
  const opts = {
    ...CHART_COMMON,
    series:[{name:'Capital', data}],
    chart:{...CHART_COMMON.chart, type:'area', height:260},
    colors:[mode==='defi'?'#D6B061':'#5B8BFF'],
    stroke:{curve:'smooth', width:2.5},
    fill:{type:'gradient', gradient:{shade:'dark', opacityFrom:0.5, opacityTo:0.02}},
    xaxis:{...CHART_COMMON.xaxis, categories:cats},
    yaxis:{...CHART_COMMON.yaxis, labels:{...CHART_COMMON.yaxis.labels, formatter:(v)=>'$'+(v/1000).toFixed(0)+'k'}}
  };
  if (!simpleChart) {
    simpleChart = new ApexCharts(document.getElementById('apex-simple-chart'), opts);
    simpleChart.render();
  } else simpleChart.updateOptions(opts);
}

/* ═══════════════════════════════════════════════════════════
   CALCULATOR — DCA
═══════════════════════════════════════════════════════════ */
let dcaChart = null;
function dUpdate() {
  const cap = parseFloat(document.getElementById('d-cap').value) || 0;
  const mo = parseFloat(document.getElementById('d-mo').value) || 0;
  const time = parseInt(document.getElementById('d-time').value);
  const rate = parseFloat(document.getElementById('d-rate').value);
  const r = rate/100;

  let bal = cap;
  const data = [bal], cats = ['M0'];
  for (let i=1; i<=time; i++) {
    bal = bal*(1+r) + mo;
    data.push(Math.round(bal));
    cats.push('M'+i);
  }
  const totalAdded = mo * time;
  const invested = cap + totalAdded;
  const gain = bal - invested;
  const mult = invested > 0 ? bal/invested : 0;

  document.getElementById('d-cap-disp').textContent = '$' + cap.toLocaleString('en-US');
  document.getElementById('d-mo-disp').textContent = '$' + mo.toLocaleString('en-US');
  document.getElementById('d-time-disp').textContent = time + (time===1?' mes':' meses');
  document.getElementById('d-rate-disp').textContent = rate + '%';
  document.getElementById('d-result').textContent = '$' + Math.round(bal).toLocaleString('en-US');
  document.getElementById('d-sub').textContent = 'Total invertido: $' + Math.round(invested).toLocaleString('en-US');
  document.getElementById('d-bd-cap').textContent = '$' + cap.toLocaleString('en-US');
  document.getElementById('d-bd-total').textContent = '$' + Math.round(invested).toLocaleString('en-US');
  document.getElementById('d-bd-gain').textContent = '+$' + Math.round(gain).toLocaleString('en-US');
  document.getElementById('d-bd-mult').textContent = '×' + mult.toFixed(2);

  setRangeFill('d-time'); setRangeFill('d-rate');

  const opts = {
    ...CHART_COMMON,
    series:[
      {name:'Capital', data},
      {name:'Aportado', data: data.map((_,i)=> cap + mo*i)}
    ],
    chart:{...CHART_COMMON.chart, type:'area', height:260},
    colors:['#D6B061','#5B8BFF'],
    stroke:{curve:'smooth', width:[2.5, 2]},
    fill:{type:'gradient', gradient:{shade:'dark', opacityFrom:0.4, opacityTo:0.02}},
    xaxis:{...CHART_COMMON.xaxis, categories:cats},
    yaxis:{...CHART_COMMON.yaxis, labels:{...CHART_COMMON.yaxis.labels, formatter:(v)=>'$'+(v/1000).toFixed(0)+'k'}},
    legend:{labels:{colors:'rgba(255,255,255,0.6)'}, fontFamily:'JetBrains Mono', fontSize:'11px', position:'top', horizontalAlign:'right'}
  };
  if (!dcaChart) {
    dcaChart = new ApexCharts(document.getElementById('apex-dca-chart'), opts);
    dcaChart.render();
  } else dcaChart.updateOptions(opts);
}

/* ═══════════════════════════════════════════════════════════
   CALCULATOR — COMPARE
═══════════════════════════════════════════════════════════ */
let compareChart = null;
const STRATS = [
  { name:'Banco tradicional', type:'Ahorro', rate:0.3, color:'#FF4D6A', winner:false },
  { name:'Sistema Base · CeFi', type:'CeFi', rate:4, color:'#5B8BFF', winner:false },
  { name:'Sistema Híbrido · DeFi', type:'CDF', rate:6, color:'#D6B061', winner:true }
];
function cUpdate() {
  const cap = parseFloat(document.getElementById('c-cap').value) || 0;
  const time = parseInt(document.getElementById('c-time').value);
  document.getElementById('c-cap-disp').textContent = '$' + cap.toLocaleString('en-US');
  document.getElementById('c-time-disp').textContent = time + ' meses';
  setRangeFill('c-time');

  const grid = document.getElementById('compare-grid');
  grid.innerHTML = '';
  const series = [];
  STRATS.forEach(s => {
    const final = cap * Math.pow(1 + s.rate/100, time);
    const roi = cap > 0 ? ((final-cap)/cap)*100 : 0;
    const card = document.createElement('div');
    card.className = 'glass compare-card' + (s.winner ? ' winner' : '');
    card.innerHTML = `
      <div class="compare-type">${s.type}</div>
      <div class="compare-title">${s.name}</div>
      <div class="compare-result" style="color:${s.color}">$${Math.round(final).toLocaleString('en-US')}</div>
      <div class="compare-rate">${s.rate}% mensual</div>
      <div class="compare-roi">▲ ROI ${roi.toFixed(1)}% en ${time}m</div>
    `;
    grid.appendChild(card);
    const data = [];
    for (let i=0; i<=time; i++) data.push(+(cap * Math.pow(1 + s.rate/100, i)).toFixed(0));
    series.push({name:s.name, data});
  });

  const cats = Array.from({length:time+1}, (_,i)=>'M'+i);
  const opts = {
    ...CHART_COMMON,
    series,
    chart:{...CHART_COMMON.chart, type:'line', height:300},
    colors: STRATS.map(s=>s.color),
    stroke:{curve:'smooth', width:[2,2,3]},
    xaxis:{...CHART_COMMON.xaxis, categories:cats},
    yaxis:{...CHART_COMMON.yaxis, labels:{...CHART_COMMON.yaxis.labels, formatter:(v)=>'$'+(v/1000).toFixed(0)+'k'}},
    legend:{labels:{colors:'rgba(255,255,255,0.6)'}, fontFamily:'JetBrains Mono', fontSize:'11px', position:'top', horizontalAlign:'right'}
  };
  if (!compareChart) {
    compareChart = new ApexCharts(document.getElementById('apex-compare-chart'), opts);
    compareChart.render();
  } else compareChart.updateOptions(opts);
}

function initCalculator() {
  setRangeFill('s-time'); setRangeFill('s-rate');
  setRangeFill('d-time'); setRangeFill('d-rate');
  setRangeFill('c-time');
  sUpdate(); dUpdate(); cUpdate();
  ['s-time','s-rate','d-time','d-rate','c-time'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ()=>setRangeFill(id));
  });
}

/* ═══════════════════════════════════════════════════════════
   ACADEMY
═══════════════════════════════════════════════════════════ */
const LESSONS = [
  { id:'l1', cat:'cefi',     cls:'macro',    title:'Bitcoin · principio de escasez',              duration:'18 min', date:'12 Oct', ytId:'PHe0bXAIuk0' },
  { id:'l2', cat:'cefi',     cls:'macro',    title:'Macro 2025 · ciclo de liquidez',              duration:'24 min', date:'08 Oct', ytId:'rFV7wC7ElW4' },
  { id:'l3', cat:'cefi',     cls:'macro',    title:'Oro · el activo que nadie emite',             duration:'15 min', date:'03 Oct', ytId:'UtbRmjCBvqk' },
  { id:'l4', cat:'defi',     cls:'defi',     title:'DeFi 101 · qué es farming real',              duration:'22 min', date:'28 Sep', ytId:'k9HYC0EJU6E' },
  { id:'l5', cat:'defi',     cls:'defi',     title:'Smart contracts para no-devs',                duration:'19 min', date:'22 Sep', ytId:'ZE2HxTmxfrI' },
  { id:'l6', cat:'defi',     cls:'defi',     title:'Stablecoins · el dólar programable',          duration:'16 min', date:'15 Sep', ytId:'pGzfexGmuVw' },
  { id:'l7', cat:'strategy', cls:'strategy', title:'Asignación 60/40 modernizada',                duration:'25 min', date:'10 Sep', ytId:'gvkqT_Uoahw' },
  { id:'l8', cat:'strategy', cls:'strategy', title:'DCA · la disciplina que multiplica',          duration:'17 min', date:'05 Sep', ytId:'DpIppW0GGKE' },
  { id:'l9', cat:'strategy', cls:'strategy', title:'Gestión del riesgo · posición por posición',  duration:'21 min', date:'01 Sep', ytId:'VEp8jTIwrV0' },
  { id:'l10',cat:'books',    cls:'book',     title:'El patrón bitcoin · Saifedean Ammous',        duration:'PDF · resumen', date:'Libro', ytId:'IIiMM2hJ-bk' },
  { id:'l11',cat:'books',    cls:'book',     title:'Padre rico, padre pobre · Kiyosaki',          duration:'PDF · resumen', date:'Libro', ytId:'azq3m16TLAI' },
  { id:'l12',cat:'books',    cls:'book',     title:'El inversor inteligente · Graham',            duration:'PDF · resumen', date:'Libro', ytId:'WsZhANApK4g' }
];

const CAT_LABELS = {
  cefi:     'Macro · Bitcoin',
  defi:     'DeFi',
  strategy: 'Estrategia',
  books:    'Libros'
};

function renderAcademy(filter='all') {
  const content = document.getElementById('academy-content');
  content.innerHTML = '';
  document.querySelectorAll('.af-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.af-card[onclick*="'${filter}'"]`)?.classList.add('active');

  if (filter === 'all') {
    ['cefi','defi','strategy','books'].forEach(cat => {
      const items = LESSONS.filter(l => l.cat === cat);
      if (!items.length) return;
      const row = document.createElement('div');
      row.className = 'academy-row';
      row.innerHTML = `
        <div class="academy-row-title">${CAT_LABELS[cat]}</div>
        <div class="academy-grid">
          ${items.map(lessonCardHtml).join('')}
        </div>
      `;
      content.appendChild(row);
    });
  } else {
    const items = LESSONS.filter(l => l.cat === filter);
    const row = document.createElement('div');
    row.className = 'academy-row';
    row.innerHTML = `
      <div class="academy-row-title">${CAT_LABELS[filter]}</div>
      <div class="academy-grid">${items.map(lessonCardHtml).join('')}</div>
    `;
    content.appendChild(row);
  }
}
function lessonCardHtml(l) {
  const thumb = l.ytId
    ? `<img src="https://img.youtube.com/vi/${l.ytId}/mqdefault.jpg" alt="${l.title}" loading="lazy" onerror="this.parentElement.classList.add('thumb-error');this.style.display='none'"/>`
    : '';
  return `
    <div class="lesson-card" onclick="openLesson('${l.id}')">
      <div class="lesson-thumb ${l.cls}">
        ${thumb}
        <div class="lesson-thumb-fallback">
          <div class="lesson-play">▶</div>
        </div>
        <div class="lesson-duration">${l.duration}</div>
      </div>
      <div class="lesson-body">
        <div class="lesson-cat">${CAT_LABELS[l.cat]}</div>
        <div class="lesson-title">${l.title}</div>
        <div class="lesson-meta">${l.date}</div>
      </div>
    </div>
  `;
}
function openLesson(id) {
  const l = LESSONS.find(x => x.id === id);
  if (!l) return;
  toast(`Abriendo: ${l.title}`);
}
function filterAcademy(cat) { renderAcademy(cat); }

function updateAcademyCounts() {
  document.getElementById('af-c-all').textContent = LESSONS.length + ' piezas';
  ['cefi','defi','strategy','books'].forEach(c => {
    const count = LESSONS.filter(l => l.cat === c).length;
    const el = document.getElementById('af-c-' + c);
    if (el) el.textContent = count + (count===1?' pieza':' piezas');
  });
}

/* ═══════════════════════════════════════════════════════════
   NEWS
═══════════════════════════════════════════════════════════ */
const NEWS = [
  {
    id:'n1', cat: 'DeFi', catCls: 'volt',
    title: 'DeFi supera $100B en TVL por primera vez en 2026',
    summary: 'El valor total bloqueado en protocolos DeFi alcanzó un nuevo máximo histórico, impulsado por la tokenización de activos reales.',
    date: '23 Abr 2026', source: 'DeFiLlama',
    impact: 'up',
    excerpt: 'El valor total bloqueado en protocolos DeFi alcanzó un nuevo máximo histórico, impulsado por la tokenización de activos reales.',
    body: `<p>El ecosistema DeFi ha superado los $100B en valor total bloqueado (TVL) por primera vez en este ciclo, marcando un hito en la adopción institucional de las finanzas descentralizadas.</p>
    <p><strong>¿Qué significa para inversores?</strong> Los protocolos con mayor TVL históricamente ofrecen mayor seguridad y liquidez. Este crecimiento sugiere que los grandes capitales están regresando al ecosistema con mayor confianza.</p>
    <p><strong>Recomendación CDF:</strong> Momento favorable para revisar exposición a protocolos de liquidez. Nuestros aliados verificados ya están capturando este momento.</p>`
  },
  {
    id:'n2', cat: 'Oro', catCls: 'gold',
    title: 'XAU/USD consolida por encima de $3,200 — señal macro bullish',
    summary: 'El oro físico mantiene zona clave de soporte ante tensión geopolítica y debilitamiento del dólar.',
    date: '22 Abr 2026', source: 'Bloomberg',
    impact: 'up',
    excerpt: 'El oro físico mantiene zona clave de soporte ante tensión geopolítica y debilitamiento del dólar.',
    body: `<p>El precio del oro ha consolidado firmemente por encima de los $3,200 por onza, un nivel técnico clave que analistas institucionales identifican como confirmación de tendencia alcista de largo plazo.</p>
    <p><strong>¿Qué significa para inversores?</strong> El respaldo en oro a través de Minttora (tokenización 1:1) captura directamente este movimiento. Si tienes exposición al sistema CeFi, tu portafolio se beneficia automáticamente.</p>
    <p><strong>Contexto geopolítico:</strong> Tensiones en Europa del Este y política monetaria de la Fed siguen siendo el motor principal de demanda institucional.</p>`
  },
  {
    id:'n3', cat: 'Bitcoin', catCls: 'volt',
    title: 'BTC supera resistencia histórica — ciclo post-halving en fase 2',
    summary: 'Bitcoin rompe nivel clave de resistencia, analistas proyectan continuación alcista en los próximos 90 días.',
    date: '21 Abr 2026', source: 'CoinDesk',
    impact: 'up',
    excerpt: 'Bitcoin rompe nivel clave de resistencia, analistas proyectan continuación alcista en los próximos 90 días.',
    body: `<p>Bitcoin ha roto su resistencia histórica más relevante del ciclo actual, marcando el inicio de la fase 2 del ciclo post-halving — históricamente la más explosiva en términos de rendimiento.</p>
    <p><strong>¿Qué significa para inversores?</strong> Los ciclos anteriores muestran que los 90-180 días posteriores a una ruptura de este tipo suelen ser los de mayor retorno. La asignación táctica a BTC en portafolios diversificados es clave ahora.</p>`
  },
  {
    id:'n4', cat: 'Regulación', catCls: '',
    title: 'UE aprueba marco MiCA extendido — claridad para proyectos DeFi',
    summary: 'El nuevo marco regulatorio europeo da certeza jurídica a proyectos de tokenización y finanzas descentralizadas.',
    date: '20 Abr 2026', source: 'Reuters',
    impact: 'neutral',
    excerpt: 'El nuevo marco regulatorio europeo da certeza jurídica a proyectos de tokenización y finanzas descentralizadas.',
    body: `<p>La Unión Europea ha aprobado la extensión del reglamento MiCA, brindando por primera vez un marco legal claro para proyectos DeFi y tokenización de activos reales operando en Europa.</p>
    <p><strong>¿Qué significa para inversores?</strong> Reduce el riesgo regulatorio en proyectos europeos. Para el ecosistema CDF, que opera dentro de marcos legales verificados, esto es una señal positiva de madurez del mercado.</p>`
  },
  {
    id:'n5', cat: 'Macro', catCls: 'gold',
    title: 'Fed pausa ciclo de tasas — capital fluye hacia activos alternativos',
    summary: 'La Reserva Federal confirma pausa en su ciclo de subida de tasas, favoreciendo activos de riesgo y alternativos.',
    date: '19 Abr 2026', source: 'WSJ',
    impact: 'up',
    excerpt: 'La Reserva Federal confirma pausa en su ciclo de subida de tasas, favoreciendo activos de riesgo y alternativos.',
    body: `<p>La Reserva Federal de Estados Unidos ha confirmado una pausa en su ciclo de política monetaria, manteniendo las tasas sin cambios por segunda reunión consecutiva.</p>
    <p><strong>Impacto histórico:</strong> Las pausas de la Fed han sido históricamente bullish para BTC, oro y activos DeFi. El capital institucional busca rendimientos superiores al 4-5% que ofrecen los bonos.</p>
    <p><strong>Recomendación CDF:</strong> Este entorno macro favorable respalda la tesis híbrida CeFi + DeFi que ejecutamos. Momento de consolidar posiciones estratégicas.</p>`
  },
  {
    id:'n6', cat: 'DeFi', catCls: 'volt',
    title: 'Nuevos protocolos de yield: APR del 8-15% verificados sin riesgo de estafa',
    summary: 'Nuestro equipo verificó tres nuevos protocolos de yield que ofrecen rendimientos sostenibles respaldados por auditorías.',
    date: '18 Abr 2026', source: 'CDF Research',
    impact: 'up',
    excerpt: 'Nuestro equipo verificó tres nuevos protocolos de yield que ofrecen rendimientos sostenibles respaldados por auditorías.',
    body: `<p>El equipo de investigación de CDF ha completado la auditoría de tres nuevos protocolos de yield con rendimientos anualizados entre el 8% y 15%, todos con auditorías de seguridad verificadas.</p>
    <p><strong>Metodología CDF:</strong> Verificamos liquidez, historial del equipo, auditorías de smart contracts y sostenibilidad del yield antes de presentar cualquier oportunidad a los miembros.</p>
    <p><strong>Acción disponible:</strong> Los miembros activos pueden acceder a los detalles completos en la sección de Aliados.</p>`
  }
];
function renderNews() {
  const grid = document.getElementById('news-grid');
  grid.innerHTML = NEWS.map(n => `
    <article class="news-card" onclick="openArticle('${n.id}')">
      <div class="news-cat ${n.catCls}">${n.cat}</div>
      <div class="news-impact ${n.impact === 'up' ? 'up' : n.impact === 'down' ? 'down' : 'neutral'}">${n.impact === 'up' ? '▲ POSITIVO' : n.impact === 'down' ? '▼ NEGATIVO' : '● NEUTRO'}</div>
      <h3 class="news-title">${n.title}</h3>
      <div class="news-summary">${n.summary}</div>
      <div class="news-source">${n.source} · ${n.date}</div>
    </article>
  `).join('');
}
function renderQuickNews() {
  const container = document.getElementById('quick-news-list');
  container.innerHTML = NEWS.slice(0,4).map(n => `
    <div class="qn-item" onclick="openArticle('${n.id}')">
      <span class="qn-tag ${n.catCls}">${n.cat}</span>
      <div class="qn-body">
        <div class="qn-title">${n.title}</div>
        <div class="qn-meta">${n.source} · ${n.date}</div>
      </div>
    </div>
  `).join('');
}
function openArticle(id) {
  const n = NEWS.find(x => x.id === id);
  if (!n) return;
  document.getElementById('art-cat').textContent = n.cat;
  document.getElementById('art-head').textContent = n.title;
  document.getElementById('art-meta').textContent = `${n.source} · ${n.date}`;
  document.getElementById('art-body').innerHTML = n.body || `<p>${n.summary || n.excerpt}</p>`;
  document.getElementById('article-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeArticle(e) {
  if (e && e.target.id !== 'article-overlay' && !e.target.classList.contains('article-close')) return;
  document.getElementById('article-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════
   COMMUNITY
═══════════════════════════════════════════════════════════ */
const DEFAULT_POSTS = [
  { id:'p1', name:'Camila R.', initial:'C', color:'#D6B061', meta:'FOUNDER · hace 2h', body:'El análisis de oro de esta semana fue oro puro (pun intended). Me ayudó a rebalancear mi portafolio al 40%. Gracias Sofi!', likes:12, comments:3 },
  { id:'p2', name:'Daniel M.', initial:'D', color:'#5B8BFF', meta:'MIEMBRO · hace 5h', body:'¿Alguien del Círculo ya probó MINTTORA? Tengo dudas sobre la liquidez en fines de semana. Cualquier experiencia me ayuda.', likes:5, comments:7 },
  { id:'p3', name:'Valentina F.', initial:'V', color:'#00E5FF', meta:'FOUNDER · ayer', body:'Completé mi primer mes con DCA automatizado — $500 mensuales al Sistema Híbrido. Ya veo la diferencia vs. mi antiguo ahorro bancario.', likes:24, comments:5 }
];
let POSTS = [];
function loadPosts() {
  try {
    const stored = JSON.parse(localStorage.getItem('cdf_posts') || 'null');
    POSTS = stored || DEFAULT_POSTS.slice();
  } catch { POSTS = DEFAULT_POSTS.slice(); }
}
function savePosts() { localStorage.setItem('cdf_posts', JSON.stringify(POSTS)); }

function renderPosts() {
  const el = document.getElementById('posts-list');
  el.innerHTML = POSTS.map(p => `
    <article class="glass post">
      <div class="post-head">
        <div class="post-avatar" style="background:linear-gradient(135deg,${p.color},${p.color}99)">${p.initial}</div>
        <div class="post-author">
          <div class="post-author-name">${p.name}</div>
          <div class="post-author-meta">${p.meta}</div>
        </div>
      </div>
      <div class="post-body">${p.body}</div>
      <div class="post-actions">
        <div class="post-action" onclick="likePost('${p.id}')">♥ <span>${p.likes}</span></div>
        <div class="post-action">◌ ${p.comments} comentarios</div>
        <div class="post-action">⇧ Compartir</div>
      </div>
    </article>
  `).join('');
}
function submitPost() {
  const input = document.getElementById('post-input');
  const body = input.value.trim();
  if (!body) return;
  const initial = USER.name.charAt(0).toUpperCase();
  POSTS.unshift({
    id: 'p' + Date.now(),
    name: USER.name,
    initial,
    color: '#D6B061',
    meta: (USER.role || 'FOUNDER') + ' · ahora',
    body,
    likes: 0,
    comments: 0
  });
  savePosts();
  renderPosts();
  input.value = '';
  toast('Publicado en el círculo', 'success');
}
function likePost(id) {
  const p = POSTS.find(x => x.id === id);
  if (p) { p.likes++; savePosts(); renderPosts(); }
}

const MEMBERS = [
  { name:'Sofía Mora',  tier:'CORE · LEAD',    color:'#D6B061', init:'S', online:true },
  { name:'Nicolás M.',  tier:'CORE · LEAD',    color:'#5B8BFF', init:'N', online:true },
  { name:'Camila R.',   tier:'FOUNDER',        color:'#D6B061', init:'C', online:true },
  { name:'Daniel M.',   tier:'MIEMBRO',        color:'#5B8BFF', init:'D', online:false },
  { name:'Valentina F.',tier:'FOUNDER',        color:'#00E5FF', init:'V', online:true },
  { name:'Andrés G.',   tier:'MIEMBRO',        color:'#00FF9C', init:'A', online:false }
];
function renderMembers() {
  const el = document.getElementById('members-list');
  el.innerHTML = MEMBERS.map(m => `
    <div class="member-row">
      <div class="member-avatar" style="background:linear-gradient(135deg,${m.color},${m.color}80);color:#fff">${m.init}</div>
      <div class="member-info">
        <div class="member-name">${m.name}</div>
        <div class="member-tier">${m.tier}</div>
      </div>
      ${m.online ? '<div class="member-online"></div>' : ''}
    </div>
  `).join('');
}

function copyRef() {
  navigator.clipboard.writeText(document.getElementById('ref-link').value);
  toast('Enlace copiado', 'success');
}

/* ───── Notification System ───── */
const NOTIFICATIONS = [
  { id: 1, type: 'green', msg: 'Nueva oportunidad: DeFi APR supera 10% en protocolo curado', time: 'Hace 5 min', unread: true, page: 'news' },
  { id: 2, type: 'blue', msg: 'Nueva masterclass subida: "Tokenización de Activos Reales 2026"', time: 'Hace 2 h', unread: true, page: 'academy' },
  { id: 3, type: 'red', msg: 'Importante: Actualización en estrategia de portafolios CeFi', time: 'Hace 4 h', unread: true, page: 'news' },
  { id: 4, type: 'blue', msg: 'Nuevo análisis publicado: "BTC y el ciclo de halving"', time: 'Ayer', unread: false, page: 'news' },
  { id: 5, type: 'green', msg: 'Nicolás respondió en el foro: "Re: estrategia DCA"', time: 'Ayer', unread: false, page: 'community' }
];

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;
  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = unreadCount;
    badge.className = unreadCount > 0 ? 'notif-badge' : 'notif-badge hidden';
  }
  list.innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="handleNotifClick(${n.id})">
      <div class="notif-dot ${n.type}"></div>
      <div class="notif-body">
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
}

function handleNotifClick(id) {
  const n = NOTIFICATIONS.find(x => x.id === id);
  if (n) {
    n.unread = false;
    renderNotifications();
    closeNotifications();
    if (n.page) showPage(n.page, null);
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.classList.toggle('open');
}

function closeNotifications() {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.remove('open');
}

function markAllRead() {
  NOTIFICATIONS.forEach(n => n.unread = false);
  renderNotifications();
}

// Close when clicking outside
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('notif-wrapper');
  if (wrapper && !wrapper.contains(e.target)) closeNotifications();
});

renderNotifications();

/* ═══════════════════════════════════════════════════════════
   SCROLL PROGRESS
═══════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const el = document.getElementById('scroll-progress');
  if (!el) return;
  const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  el.style.width = pct + '%';
});

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  initMainChart();
  renderQuickNews();
  renderNews();
  renderAcademy('all');
  updateAcademyCounts();
  loadPosts();
  renderPosts();
  renderMembers();

  // Restore last page
  const saved = localStorage.getItem('cdf_page');
  if (saved && saved !== 'home') {
    const nav = document.querySelector(`.nav-item[data-page="${saved}"]`);
    if (nav) showPage(saved, nav);
  }
});
