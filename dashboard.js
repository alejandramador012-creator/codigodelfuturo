/* ═══════════════════════════════════════════════
   DASHBOARD — Charts, Data, Interactions
═══════════════════════════════════════════════ */
'use strict';

/* ── Page routing ── */
const PAGE_TITLES = { home:'Dashboard', markets:'Mercados', calculator:'Calculadora', academy:'Academia', news:'Noticias', community:'Comunidad', allies:'Aliados' };

function showPage(id, triggerEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.getElementById('topbar-page-title').textContent = PAGE_TITLES[id] || id;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (triggerEl) triggerEl.classList.add('active');
  else document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  // Lazy-init chart on first visit
  if (id === 'calculator' && !calcChartInit) initCalcChart();
  if (id === 'markets' && !mktsChartInit) initMktsChart();
}

function handleLogout() {
  if (confirm('¿Cerrar sesión?')) {
    CDF_AUTH.logout();
    window.location.href = 'index.html';
  }
}

/* ── Toast ── */
function dashToast(msg, type = 'info') {
  const c = document.getElementById('dash-toast');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3000);
}

/* ── ApexCharts shared config ── */
const APEX_DEFAULTS = {
  chart: {
    background: 'transparent',
    toolbar: { show: false },
    animations: { enabled: true, speed: 600, animateGradually: { enabled: true, delay: 80 } },
    zoom: { enabled: false },
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  grid: {
    borderColor: 'rgba(255,255,255,0.05)',
    strokeDashArray: 3,
    padding: { left: 8, right: 8 },
  },
  tooltip: {
    theme: 'dark',
    style: { fontSize: '12px', fontFamily: 'Inter, sans-serif' },
    x: { show: false },
  },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: 'Inter, sans-serif' } },
  },
  yaxis: {
    labels: { style: { colors: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: 'Inter, sans-serif' }, formatter: v => '$' + v.toLocaleString('en', { maximumFractionDigits: 0 }) },
  },
};

/* ── Generate mock OHLC/line data ── */
function genLineData(base, vol, n = 60) {
  const data = [];
  let v = base;
  const now = Date.now();
  for (let i = n; i >= 0; i--) {
    v = Math.max(v * (1 + (Math.random() - 0.47) * vol), base * 0.7);
    data.push({ x: now - i * 3600 * 1000, y: +v.toFixed(2) });
  }
  return data;
}

const DATASETS = {
  gold: { label: 'Oro — XAU/USD',        data: genLineData(3180, 0.006),  color: '#c9a84c', base: 3180,  vol: 0.006  },
  btc:  { label: 'Bitcoin — BTC/USD',     data: genLineData(82000, 0.015), color: '#f7931a', base: 82000, vol: 0.015  },
  sp:   { label: 'S&P 500',              data: genLineData(5150, 0.004),  color: '#3b9eff', base: 5150,  vol: 0.004  },
  eth:  { label: 'Ethereum — ETH/USD',   data: genLineData(1950, 0.012),  color: '#627eea', base: 1950,  vol: 0.012  },
};

function makeAreaSeries(asset) {
  const ds = DATASETS[asset];
  return {
    series: [{ name: ds.label, data: ds.data }],
    colors: [ds.color],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.18,
        opacityTo: 0,
        stops: [0, 95],
        colorStops: [{ offset: 0, color: ds.color, opacity: 0.2 }, { offset: 100, color: ds.color, opacity: 0 }],
      },
    },
    stroke: { curve: 'smooth', width: 2, colors: [ds.color] },
  };
}

/* ── Main chart ── */
let mainChart = null;
function initMainChart() {
  mainChart = new ApexCharts(document.getElementById('apex-main-chart'), {
    ...APEX_DEFAULTS,
    chart: { ...APEX_DEFAULTS.chart, type: 'area', height: 220 },
    ...makeAreaSeries('gold'),
    xaxis: {
      ...APEX_DEFAULTS.xaxis,
      type: 'datetime',
      labels: { ...APEX_DEFAULTS.xaxis.labels, datetimeFormatter: { hour: 'HH:mm', day: 'dd MMM' } },
    },
    markers: { size: 0 },
    dataLabels: { enabled: false },
  });
  mainChart.render();
}
function setMainChart(asset, btn) {
  btn?.closest('.chart-tabs')?.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  btn?.classList.add('active');
  document.getElementById('main-chart-title').textContent = DATASETS[asset].label;
  mainChart?.updateSeries([{ name: DATASETS[asset].label, data: DATASETS[asset].data }]);
  mainChart?.updateOptions({ colors: [DATASETS[asset].color], stroke: { colors: [DATASETS[asset].color] } });
}

/* ── Markets chart ── */
let mktsChart = null, mktsChartInit = false;
let currentMktsAsset = 'gold', currentMktsRange = '1M';

// Generate data for different time ranges
function genRangeData(base, vol, range) {
  const configs = {
    '1D':  { n: 48,  interval: 30 * 60 * 1000,     v: vol * 0.3  },  // 48 × 30min
    '1S':  { n: 84,  interval: 2 * 3600 * 1000,     v: vol * 0.5  },  // 84 × 2h
    '1M':  { n: 60,  interval: 12 * 3600 * 1000,    v: vol        },  // 60 × 12h
    '3M':  { n: 90,  interval: 24 * 3600 * 1000,    v: vol * 1.2  },  // 90 × 1d
    '1A':  { n: 120, interval: 3 * 24 * 3600 * 1000, v: vol * 1.6 },  // 120 × 3d
  };
  const cfg = configs[range] || configs['1M'];
  const data = [];
  let v = base;
  const now = Date.now();
  for (let i = cfg.n; i >= 0; i--) {
    v = Math.max(v * (1 + (Math.random() - 0.47) * cfg.v), base * 0.65);
    data.push({ x: now - i * cfg.interval, y: +v.toFixed(2) });
  }
  return data;
}

function initMktsChart() {
  mktsChartInit = true;
  const asset = DATASETS['gold'];
  mktsChart = new ApexCharts(document.getElementById('apex-markets-chart'), {
    ...APEX_DEFAULTS,
    chart: { ...APEX_DEFAULTS.chart, type: 'area', height: 300 },
    series: [{ name: asset.label, data: genRangeData(asset.base, asset.vol, '1M') }],
    colors: [asset.color],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.15, opacityTo: 0, stops: [0, 95] } },
    stroke: { curve: 'smooth', width: 2, colors: [asset.color] },
    xaxis: { ...APEX_DEFAULTS.xaxis, type: 'datetime' },
    markers: { size: 0 },
    dataLabels: { enabled: false },
  });
  mktsChart.render();
}
function setMktsChart(asset, btn) {
  btn?.closest('.chart-tabs')?.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  btn?.classList.add('active');
  currentMktsAsset = asset;
  document.getElementById('mkts-chart-title').textContent = DATASETS[asset].label;
  const d = DATASETS[asset];
  mktsChart?.updateSeries([{ name: d.label, data: genRangeData(d.base, d.vol, currentMktsRange) }]);
  mktsChart?.updateOptions({ colors: [d.color], stroke: { colors: [d.color] }, fill: { type: 'gradient', gradient: { colorStops: [{ offset: 0, color: d.color, opacity: 0.15 }, { offset: 95, color: d.color, opacity: 0 }] } } });
}
function setTimeRange(range, btn) {
  btn?.closest('.time-range-tabs')?.querySelectorAll('.tr-btn').forEach(t => t.classList.remove('active'));
  btn?.classList.add('active');
  currentMktsRange = range;
  const d = DATASETS[currentMktsAsset];
  mktsChart?.updateSeries([{ name: d.label, data: genRangeData(d.base, d.vol, range) }]);
}

/* ── Calculator ── */
let calcMode = 'defi', calcChart = null, calcChartInit = false;

function setCalcMode(m) {
  calcMode = m;
  document.getElementById('mode-cefi').classList.toggle('active', m === 'cefi');
  document.getElementById('mode-defi').classList.toggle('active', m === 'defi');
  calcUpdate();
}
function calcUpdate() {
  const capital = parseFloat(document.getElementById('calc-capital')?.value) || 10000;
  const months  = parseInt(document.getElementById('calc-time')?.value) || 12;
  const rate    = parseFloat(document.getElementById('calc-rate')?.value) / 100 || 0.04;
  document.getElementById('calc-capital-display').textContent = '$' + capital.toLocaleString('en');
  document.getElementById('calc-time-display').textContent    = months + (months === 1 ? ' mes' : ' meses');
  document.getElementById('calc-rate-display').textContent    = (rate * 100).toFixed(1) + '%';
  const finalVal = capital * Math.pow(1 + rate, months);
  const gains    = finalVal - capital;
  const roi      = (gains / capital * 100);
  document.getElementById('calc-result').textContent     = '$' + finalVal.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('calc-profit-sub').textContent = 'Ganancia estimada: +$' + gains.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('bd-initial').textContent      = '$' + capital.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('bd-gains').textContent        = '+$' + gains.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('bd-roi').textContent          = '+' + roi.toFixed(1) + '%';
  document.getElementById('bd-mode').textContent         = calcMode === 'defi' ? 'DeFi' : 'Base';
  // Update chart
  const projData = [];
  const now = Date.now();
  for (let i = 0; i <= months; i++) projData.push({ x: now + i * 30 * 86400000, y: +(capital * Math.pow(1 + rate, i)).toFixed(2) });
  if (calcChart) calcChart.updateSeries([{ name: 'Proyección', data: projData }]);
}
function initCalcChart() {
  calcChartInit = true;
  const capital = parseFloat(document.getElementById('calc-capital')?.value) || 10000;
  const rate = 0.04; const months = 12;
  const data = [];
  const now = Date.now();
  for (let i = 0; i <= months; i++) data.push({ x: now + i * 30 * 86400000, y: +(capital * Math.pow(1 + rate, i)).toFixed(2) });
  calcChart = new ApexCharts(document.getElementById('apex-calc-chart'), {
    ...APEX_DEFAULTS,
    chart: { ...APEX_DEFAULTS.chart, type: 'area', height: 180 },
    series: [{ name: 'Proyección', data }],
    colors: ['#c9a84c'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.18, opacityTo: 0, stops: [0, 95] } },
    stroke: { curve: 'smooth', width: 2, colors: ['#c9a84c'] },
    xaxis: { ...APEX_DEFAULTS.xaxis, type: 'datetime' },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    yaxis: { ...APEX_DEFAULTS.yaxis, labels: { ...APEX_DEFAULTS.yaxis.labels, formatter: v => '$' + (v/1000).toFixed(0) + 'K' } },
  });
  calcChart.render();
  calcUpdate();
}

/* ── Quick Calc ── */
function updateQuickCalc() {
  const cap = parseFloat(document.getElementById('quick-capital')?.value) || 10000;
  const result = cap * Math.pow(1.04, 12);
  const el = document.getElementById('quick-result');
  if (el) el.textContent = '$' + result.toLocaleString('en', { maximumFractionDigits: 0 });
}

/* ── News data — con artículos completos ── */
const NEWS_DATA = [
  {
    cat: 'Oro & Metales', tag: 'Urgente', time: 'Hace 2h',
    headline: 'Oro supera los $3,200 ante incertidumbre geopolítica',
    excerpt: 'Los mercados reaccionan con compras masivas de activos refugio mientras las tensiones en Oriente Medio escalan.',
    author: 'Nicolás Moreno · Análisis CDF',
    body: `<p>El precio del oro superó hoy la barrera psicológica de los <strong>$3,200 por onza troy</strong>, alcanzando máximos históricos en medio de una escalada de tensiones geopolíticas en Oriente Medio que ha disparado la demanda de activos refugio a nivel global.</p>

<p>Los futuros del metal precioso en el mercado COMEX llegaron a cotizar en <strong>$3,224.80</strong>, un avance del 1.4% frente al cierre de la jornada anterior. El movimiento se produce mientras inversores institucionales y fondos soberanos buscan protección ante la incertidumbre generada por los conflictos regionales y la persistente volatilidad en los mercados de renta variable.</p>

<h4>¿Por qué sube el oro ahora?</h4>

<p>Tres factores convergen para impulsar esta ruptura al alza:</p>

<p><strong>1. Demanda de refugio:</strong> Las tensiones en Oriente Medio han generado un fly-to-safety masivo. Cuando la percepción de riesgo global se dispara, el capital fluye hacia el oro, los bonos del Tesoro de EE.UU. y el franco suizo de forma casi automática.</p>

<p><strong>2. Compras de bancos centrales:</strong> Según datos del Consejo Mundial del Oro, los bancos centrales —liderados por China, India y Turquía— han acumulado más de 1,000 toneladas de oro en los últimos doce meses, una tendencia que no muestra señales de desaceleración.</p>

<p><strong>3. Expectativas de política monetaria:</strong> Los mercados anticipan que la Reserva Federal comenzará a recortar tasas en los próximos meses. Un dólar más débil históricamente favorece al oro, que cotiza en dólares y se encarece en términos relativos cuando la moneda estadounidense se deprecia.</p>

<h4>Perspectiva CDF</h4>

<p>Desde El Código del Futuro Financiero hemos mantenido una posición estructuralmente alcista en oro desde los $1,900. La ruptura de $3,200 confirma nuestra tesis: el metal precioso no es solo un activo de crisis, sino una <strong>pieza fundamental en cualquier arquitectura de capital robusta</strong>.</p>

<p>Para los miembros que ya tienen exposición al oro —ya sea física, ETFs o tokens respaldados 1:1— esta es una validación de la estrategia. Para quienes aún no tienen posición, la pregunta no es si entrar, sino cuándo y con qué vehículo.</p>

<p>Debatiremos los niveles de entrada y las estrategias de cobertura en el <strong>Zoom del próximo miércoles a las 2pm Colombia.</strong></p>`
  },
  {
    cat: 'DeFi', tag: 'DeFi', time: 'Hace 4h',
    headline: 'Ethereum completa actualización clave: tarifas caen 40%',
    excerpt: 'La red principal experimenta su mayor mejora de eficiencia desde The Merge, abriendo nuevas oportunidades.',
    author: 'Equipo CDF · Análisis Técnico',
    body: `<p>La red Ethereum completó con éxito una actualización crítica de su protocolo que ha resultado en una <strong>reducción del 40% en las tarifas de gas</strong> para transacciones comunes, según datos de Etherscan. Este es el avance más significativo en la eficiencia de la red desde The Merge en septiembre de 2022.</p>

<p>Las tarifas promedio de transacción cayeron de aproximadamente <strong>$8-12 por operación</strong> a niveles de <strong>$4-6</strong>, lo que abre el protocolo a una base de usuarios significativamente más amplia y hace viables estrategias de DeFi que antes eran inaccesibles para inversores con capital moderado.</p>

<h4>Qué significa esto para DeFi</h4>

<p>La reducción de tarifas tiene implicaciones directas para las principales actividades en el ecosistema descentralizado:</p>

<p><strong>Yield Farming:</strong> Estrategias que antes requerían un capital mínimo de $10,000 para ser rentables con las tarifas antiguas ahora pueden ejecutarse desde $2,000-3,000, democratizando el acceso a rendimientos del 8-15% anual.</p>

<p><strong>Liquidity Providing:</strong> Los proveedores de liquidez en protocolos como Uniswap V3 y Curve ahora pueden rebalancear sus posiciones con mayor frecuencia sin que las tarifas erosionen los rendimientos, mejorando la eficiencia del capital.</p>

<p><strong>NFTs y Tokenización:</strong> La tokenización de activos reales, uno de los pilares de nuestra estrategia CeFi+DeFi, se vuelve más accesible. Mintear, transferir y gestionar activos tokenizados ahora tiene un costo de fricción significativamente menor.</p>

<h4>Oportunidades que estamos monitoreando</h4>

<p>Con tarifas más bajas, ciertos protocolos que habían perdido actividad por el alto costo operativo están experimentando un renacimiento. Estamos observando de cerca el flujo de capital hacia Aave V3, Compound y varios protocolos de yield optimizado.</p>

<p>Los miembros del Círculo CDF recibirán un análisis detallado de las oportunidades específicas en el <strong>próximo Zoom semanal</strong>.</p>`
  },
  {
    cat: 'Macro', tag: 'Análisis', time: 'Hace 6h',
    headline: 'Fed mantiene tasas: qué significa para tu portafolio',
    excerpt: 'Cómo la decisión de la Reserva Federal impacta estrategias DeFi y la demanda de oro en 2025.',
    author: 'Nicolás Moreno · Macro CDF',
    body: `<p>La Reserva Federal de Estados Unidos <strong>mantuvo su tasa de referencia sin cambios</strong> en el rango de 4.25%-4.50% durante su última reunión del Comité Federal de Mercado Abierto (FOMC), en línea con las expectativas del mercado. Sin embargo, las proyecciones actualizadas y los comentarios del presidente Jerome Powell generaron volatilidad significativa en los activos digitales y en los metales preciosos.</p>

<h4>La lectura correcta del comunicado</h4>

<p>El mercado tiende a sobre-reaccionar a las decisiones del FOMC. Lo que importa no es la decisión de hoy, sino las señales sobre el camino futuro. En esta reunión, Powell utilizó un lenguaje significativamente más dovish (favorable a la relajación) que en comunicados anteriores, mencionando específicamente que el comité está "listo para ajustar su postura si las condiciones lo justifican".</p>

<p>Esto es una señal de que los recortes de tasas —probablemente 2-3 en los próximos 12 meses— están sobre la mesa. Para un portafolio híbrido CeFi+DeFi, esto tiene implicaciones concretas:</p>

<h4>Impacto en oro</h4>

<p>Las tasas más bajas reducen el costo de oportunidad de mantener oro (que no genera rendimiento). Históricamente, cada ciclo de recortes de la Fed ha coincidido con períodos de apreciación sostenida del metal. Con la demanda de bancos centrales como piso, y la expectativa de tasas a la baja como catalizador, el perfil riesgo-retorno del oro sigue siendo muy favorable.</p>

<h4>Impacto en DeFi</h4>

<p>Un entorno de tasas bajas tiende a impulsar la búsqueda de rendimiento. Cuando los bonos del Tesoro ofrecen 4%+, los inversores institucionales no necesitan asumir riesgo de protocolo DeFi para obtener rentabilidad. Cuando las tasas bajan al 2-3%, los rendimientos del 8-12% en protocolos DeFi establecidos se vuelven comparativamente muy atractivos.</p>

<h4>Posicionamiento recomendado</h4>

<p>La arquitectura híbrida que defendemos desde CDF —combinando exposición a activos reales (oro, dólares tokenizados) con posiciones en protocolos DeFi de alta liquidez— está específicamente diseñada para este entorno. No apostamos todo a un único régimen de mercado. Diversificamos inteligentemente entre certeza y rendimiento.</p>`
  },
  {
    cat: 'Bitcoin', tag: 'Trading', time: 'Hace 8h',
    headline: 'BTC consolida sobre $80K — próximos niveles clave',
    excerpt: 'Los indicadores on-chain sugieren acumulación institucional. Niveles de soporte y resistencia.',
    author: 'Equipo CDF · On-Chain Analysis',
    body: `<p>Bitcoin continúa consolidando su posición por encima del nivel psicológico de los <strong>$80,000</strong>, con los indicadores on-chain pintando un cuadro de acumulación institucional sistemática que sugiere que el piso de este ciclo podría estar muy cerca, si no es que ya se estableció.</p>

<h4>Qué dicen los datos on-chain</h4>

<p><strong>MVRV Z-Score:</strong> El indicador que compara el precio de mercado con el precio realizado promedio de todos los Bitcoin se encuentra en zona neutra, lejos de los extremos que históricamente han marcado techos de ciclo. Esto sugiere que el mercado no está sobrecalentado.</p>

<p><strong>Exchange Outflows:</strong> Durante las últimas tres semanas, las salidas netas de Bitcoin desde los exchanges han superado las entradas en más de <strong>45,000 BTC</strong>. Cuando el Bitcoin sale de los exchanges, generalmente va hacia wallets de custodia propia o institucionales —señal de acumulación, no de venta.</p>

<p><strong>Accumulation Trend Score:</strong> Glassnode reporta un score de 0.85 sobre 1.0, indicando que las entidades grandes (ballenas) están en modo de acumulación activa, no de distribución.</p>

<h4>Niveles técnicos a monitorear</h4>

<p><strong>Soporte crítico:</strong> $78,500 — coincide con la media móvil de 200 días y con el VWAP desde el halving de abril 2024. Una ruptura por debajo de este nivel cambiaría el sesgo técnico a neutral-bajista.</p>

<p><strong>Resistencia inmediata:</strong> $86,200 — máximos de la última consolidación. La ruptura de este nivel con volumen confirmaría el reinicio del impulso alcista.</p>

<p><strong>Target próximo ciclo:</strong> Nuestra proyección para el pico de este ciclo sigue siendo el rango $120,000-$150,000, basado en el modelo de halvings y la entrada de capital institucional vía ETFs.</p>

<h4>Perspectiva CDF</h4>

<p>No vendemos en pánico ni compramos en euforia. Nuestra estrategia con Bitcoin es de largo plazo: acumular en correcciones, mantener una posición núcleo independientemente del ruido de corto plazo, y complementar con estrategias DeFi que generan rendimiento sobre los activos mientras esperamos el movimiento del ciclo.</p>`
  },
  {
    cat: 'LATAM', tag: 'Regulación', time: 'Hace 12h',
    headline: 'Colombia avanza en regulación de activos digitales',
    excerpt: 'Nuevas normativas abren puertas para vehículos de inversión institucionales en activos tokenizados.',
    author: 'Sofía Osorio · Ecosistema LATAM',
    body: `<p>Colombia está consolidando su posición como uno de los países más avanzados de América Latina en materia de regulación de activos digitales. La Superintendencia Financiera publicó una nueva circular que establece el marco legal para la <strong>oferta pública de tokens respaldados por activos reales</strong>, marcando un hito histórico para el ecosistema blockchain en el país.</p>

<h4>Qué cambia con la nueva circular</h4>

<p>La regulación distingue claramente entre tres categorías de activos digitales:</p>

<p><strong>Security Tokens:</strong> Representaciones digitales de valores mobiliarios tradicionales (acciones, bonos). Quedan sujetos a la supervisión de la SFC y deben cumplir los mismos requisitos de divulgación que los valores convencionales.</p>

<p><strong>Utility Tokens:</strong> Tokens que otorgan acceso a bienes o servicios específicos. Marco más liviano, con requisitos de registro simplificados.</p>

<p><strong>Asset-Backed Tokens:</strong> Esta es la categoría más relevante para nuestra estrategia. Los tokens respaldados por activos físicos —oro, inmuebles, commodities— ahora tienen un camino regulatorio claro para ofertarse públicamente a inversores colombianos.</p>

<h4>Por qué esto importa para la comunidad CDF</h4>

<p>La tokenización de activos reales es uno de los pilares de la arquitectura CeFi+DeFi que construimos. Cuando un gramo de oro físico puede representarse en blockchain, fraccionarse, transferirse y generar rendimiento adicional en protocolos DeFi, estamos hablando de una convergencia que multiplica las posibilidades de inversión.</p>

<p>Colombia es el mercado de origen de nuestra comunidad, y esta regulación abre puertas concretas para estructurar vehículos de inversión que antes estaban en un limbo legal. Esto no es abstracto —es una oportunidad real que estaremos explorando activamente en los próximos meses.</p>

<p>Profundizaremos en las implicaciones prácticas para los miembros del Círculo en el <strong>Zoom semanal del miércoles.</strong></p>`
  },
  {
    cat: 'Portafolio', tag: 'Exclusivo', time: 'Hace 1d',
    headline: 'Por qué el 15% en oro es la cobertura obligatoria 2025',
    excerpt: 'Análisis de Nicolás Moreno sobre la asignación óptima de activos refugio frente a la volatilidad macro.',
    author: 'Nicolás Moreno · Estrategia CDF',
    body: `<p>Cada año, la pregunta sobre la asignación óptima en activos refugio divide a los gestores de portafolio. En 2025, después de analizar los ciclos históricos, la estructura del mercado actual y los riesgos macro específicos del entorno, llegué a una conclusión clara: <strong>el 15% en oro no es un lujo, es el mínimo razonable.</strong></p>

<h4>El argumento histórico</h4>

<p>Los portafolios que incluyeron oro entre el 10% y el 20% de su asignación durante los últimos 30 años tuvieron un ratio de Sharpe (retorno ajustado por riesgo) consistentemente superior a los que no lo incluyeron. El oro no siempre sube cuando quieres. Pero casi siempre sube cuando más lo necesitas.</p>

<p>En las tres crisis mayores desde 2000 —el crash de las .com, 2008, y el COVID— el oro funcionó como amortiguador real. No eliminó las pérdidas, pero las redujo significativamente y dio tiempo al inversor para no tomar decisiones de pánico.</p>

<h4>El argumento 2025</h4>

<p>El entorno macro actual tiene características que hacen el caso por el oro más fuerte que en años anteriores:</p>

<p><strong>Deuda soberana sin precedentes:</strong> Estados Unidos supera los $34 billones en deuda. La sostenibilidad fiscal de las economías desarrolladas está siendo cuestionada por primera vez en décadas de forma seria. El oro es el único activo que no tiene contrapartida —no es la deuda de nadie.</p>

<p><strong>Desdolarización gradual:</strong> Países como China, Rusia, India y Brasil están reduciendo activamente su exposición al dólar en sus reservas. Esto no colapsa al dólar, pero sí crea demanda estructural sostenida para activos alternativos, especialmente el oro.</p>

<p><strong>Geopolítica multipolar:</strong> El mundo está transitando de una hegemonía unipolar a un sistema multipolar. Estos períodos históricamente han sido favorables para el oro.</p>

<h4>Cómo estructurarlo en un portafolio CeFi+DeFi</h4>

<p>El 15% en oro no tiene que ser todo físico. Una asignación eficiente podría estructurarse así:</p>

<p>• <strong>5%</strong> en oro físico (lingotes o monedas, custodia propia) — certeza absoluta, no hay contraparte<br>
• <strong>6%</strong> en tokens respaldados 1:1 por oro físico auditado — liquidez instantánea, fraccionable<br>
• <strong>4%</strong> en estrategias DeFi sobre gold tokens — genera rendimiento adicional del 3-6% anual</p>

<p>Esta estructura te da el refugio del oro físico, la liquidez del oro digital, y el rendimiento del ecosistema DeFi. Eso es exactamente lo que significa construir con arquitectura híbrida.</p>`
  },
];

function renderNews() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;
  grid.innerHTML = NEWS_DATA.map((n, i) => `
    <div class="news-card glass" onclick="openArticle(${i})" style="cursor:pointer">
      <div class="news-cat">${n.cat}</div>
      <div class="news-headline">${n.headline}</div>
      <div class="news-excerpt">${n.excerpt}</div>
      <div class="news-footer">
        <span>${n.time}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="news-pill">${n.tag}</span>
          <span style="font-size:10px;color:var(--text-tertiary);letter-spacing:0.05em">Leer artículo →</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ── Article modal ── */
function openArticle(idx) {
  const n = NEWS_DATA[idx];
  if (!n) return;
  document.getElementById('modal-cat').textContent      = n.cat + ' · ' + n.tag;
  document.getElementById('modal-headline').textContent = n.headline;
  document.getElementById('modal-meta').textContent     = n.author + '  ·  ' + n.time;
  document.getElementById('modal-body').innerHTML       = n.body;
  const overlay = document.getElementById('article-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeArticleModal() {
  document.getElementById('article-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function closeArticle(e) {
  if (e.target === document.getElementById('article-overlay')) closeArticleModal();
}
function renderQuickNews() {
  const el = document.getElementById('quick-news-list');
  if (!el) return;
  el.innerHTML = NEWS_DATA.slice(0, 4).map(n => `
    <div style="padding:12px 0;border-bottom:0.5px solid var(--border);cursor:pointer" onclick="showPage('news',null)">
      <div style="font-size:10px;color:var(--gold-300);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">${n.cat}</div>
      <div style="font-size:var(--text-sm);font-weight:500;line-height:1.4">${n.headline}</div>
      <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:4px">${n.time}</div>
    </div>
  `).join('');
}

/* ── Academy — Real YouTube videos + Books ── */
const ACADEMY_DATA = [
  /* ── Macro & Economía ── */
  {
    cat: 'cefi', catLabel: 'Macro Global', lang: '🇺🇸',
    title: '¿Cómo Funciona la Economía?',
    desc: 'Ray Dalio explica de forma visual la máquina económica. El video de finanzas más visto del mundo — 35M+ vistas.',
    channel: 'Principles by Ray Dalio',
    color: '#c9a84c',
    url: 'https://youtu.be/PHe0bXAIuk0'
  },
  {
    cat: 'strategy', catLabel: 'Macro Global', lang: '🇺🇸',
    title: 'El Nuevo Orden Mundial — Ray Dalio',
    desc: 'El ciclo de las grandes potencias, el rol del oro y el dólar, y dónde posicionar capital para la próxima década.',
    channel: 'Principles by Ray Dalio',
    color: '#7c3aed',
    url: 'https://youtu.be/xguam0TKMw8'
  },
  /* ── DeFi ── */
  {
    cat: 'defi', catLabel: 'DeFi Básico', lang: '🇺🇸',
    title: 'DeFi Explained — The Full Guide',
    desc: 'La guía definitiva de finanzas descentralizadas: protocolos, rendimientos reales, riesgos y cómo empezar en DeFi.',
    channel: 'Finematics',
    color: '#3b9eff',
    url: 'https://youtu.be/k9HYC0EJU6E'
  },
  {
    cat: 'defi', catLabel: 'DeFi en Español', lang: '🇪🇸',
    title: '¿Qué es DeFi? Finanzas Descentralizadas',
    desc: 'Explicación completa de DeFi en español: smart contracts, liquidez, yield farming. Paso a paso desde cero.',
    channel: 'Bit2Me Academy',
    color: '#3b9eff',
    url: 'https://youtu.be/17QRFlml4pA'
  },
  {
    cat: 'defi', catLabel: 'Yield Farming', lang: '🇺🇸',
    title: 'Yield Farming & Liquidity Mining',
    desc: 'Estrategias de liquidity provision, cómo calcular APY real vs inflado y gestión de riesgo en DeFi.',
    channel: 'Finematics',
    color: '#00d68f',
    url: 'https://youtu.be/ClnnLI1SClA'
  },
  /* ── Bitcoin & Crypto ── */
  {
    cat: 'cefi', catLabel: 'Bitcoin', lang: '🇺🇸',
    title: 'Michael Saylor & Lex Fridman: Bitcoin',
    desc: 'Conversación profunda entre Lex Fridman y Michael Saylor: por qué Bitcoin es el activo más importante del siglo XXI y cómo proteger tu riqueza.',
    channel: 'Lex Fridman Podcast',
    color: '#f7931a',
    url: 'https://youtu.be/mC43pZkpTec'
  },
  {
    cat: 'cefi', catLabel: 'Crypto en Español', lang: '🇪🇸',
    title: '¿Cómo Funciona Bitcoin? (3Blue1Brown)',
    desc: 'La explicación más clara y visual de cómo funciona Bitcoin por dentro: criptografía, blockchain y minería. Subtítulos en español disponibles.',
    channel: '3Blue1Brown',
    color: '#f7931a',
    url: 'https://youtu.be/bBC-nXj3Ng4'
  },
  /* ── Estrategia ── */
  {
    cat: 'strategy', catLabel: 'Portafolios', lang: '🇺🇸',
    title: 'Bitcoin vs Oro — El Gran Debate',
    desc: 'Michael Saylor y Frank Giustra debaten face-to-face: ¿Bitcoin o Oro como reserva de valor? Los argumentos más sólidos de ambos lados.',
    channel: 'Stansberry Research',
    color: '#a78bfa',
    url: 'https://youtu.be/coHC_9ApBdg'
  },
  /* ── Libros ── */
  {
    cat: 'books', catLabel: '📚 Libro', lang: '🇪🇸',
    title: 'Padre Rico, Padre Pobre — Resumen',
    desc: 'El libro de finanzas más vendido del mundo. Kiyosaki sobre activos, pasivos y por qué la escuela no te enseña sobre el dinero.',
    channel: 'Aprende y Mejora',
    color: '#c9a84c',
    url: 'https://youtu.be/GKQkzUvF6RY'
  },
  {
    cat: 'books', catLabel: '📚 Libro', lang: '🇺🇸',
    title: 'El Estándar Bitcoin — Saifedean Ammous',
    desc: 'Saifedean Ammous con Jordan Peterson: Bitcoin vs el estándar fiat. Por qué Bitcoin es el dinero más sólido jamás creado y cómo cambia todo.',
    channel: 'Jordan B. Peterson',
    color: '#f7931a',
    url: 'https://youtu.be/FXvQcuIb5rU'
  },
  {
    cat: 'books', catLabel: '📚 Libro', lang: '🇪🇸',
    title: 'El Inversor Inteligente — Benjamin Graham',
    desc: '7 lecciones del libro de inversión más importante de la historia. Los principios que Buffett aplica y que todo inversor debe dominar.',
    channel: 'Cobas Asset Management',
    color: '#7c3aed',
    url: 'https://youtu.be/TjNoU4xrZew'
  },
  {
    cat: 'books', catLabel: '📚 Libro', lang: '🇪🇸',
    title: 'Pensar Rápido, Pensar Despacio',
    desc: 'Daniel Kahneman sobre los dos sistemas del pensamiento y cómo los sesgos cognitivos destruyen decisiones de inversión.',
    channel: 'Resumen Animado',
    color: '#3b9eff',
    url: 'https://youtu.be/CjVQJdIrDJ0'
  },
];

/* ── Academy — grouped sections ── */
const ACADEMY_SECTIONS = [
  { id: 'cefi',     label: 'Macro & Bitcoin', icon: '₿' },
  { id: 'defi',     label: 'DeFi',            icon: '⛓️' },
  { id: 'strategy', label: 'Estrategia',      icon: '📊' },
  { id: 'books',    label: 'Libros',          icon: '📚' },
];

function academyCardHTML(a) {
  return `
    <div class="academy-card glass" onclick="window.open('${a.url}','_blank','noopener')" style="cursor:pointer">
      <div class="academy-thumb" style="background:linear-gradient(135deg,${a.color}22,${a.color}08)">
        <div class="yt-play-btn" style="border-color:${a.color}44">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${a.color}"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="academy-thumb-overlay"></div>
        <div class="yt-channel-badge">${a.lang} ${a.channel}</div>
      </div>
      <div class="academy-body">
        <div class="academy-cat" style="color:${a.color}">${a.catLabel}</div>
        <div class="academy-title">${a.title}</div>
        <div class="academy-desc">${a.desc}</div>
        <div class="academy-meta">
          <span style="color:${a.color};font-weight:600">▶ Ver en YouTube</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </div>
      </div>
    </div>`;
}

function renderAcademy(filter = 'all') {
  const container = document.getElementById('academy-content');
  if (!container) return;

  // Update folder active states
  document.querySelectorAll('.academy-folder').forEach(f => f.classList.remove('active'));
  const activeFolder = document.getElementById('folder-' + filter);
  if (activeFolder) activeFolder.classList.add('active');

  // Update folder counts
  ACADEMY_SECTIONS.forEach(s => {
    const count = ACADEMY_DATA.filter(a => a.cat === s.id).length;
    const el = document.getElementById('count-' + s.id);
    if (el) el.textContent = count + (s.id === 'books' ? ' libros' : ' videos');
  });

  if (filter === 'all') {
    // Grouped sections view
    container.innerHTML = ACADEMY_SECTIONS.map(s => {
      const items = ACADEMY_DATA.filter(a => a.cat === s.id);
      if (!items.length) return '';
      return `
        <div class="academy-section">
          <div class="academy-section-header">
            <span class="acs-icon">${s.icon}</span>
            <span class="acs-label">${s.label}</span>
            <span class="acs-count">${items.length} recurso${items.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="academy-grid">${items.map(academyCardHTML).join('')}</div>
        </div>`;
    }).join('');
  } else {
    const items = ACADEMY_DATA.filter(a => a.cat === filter);
    const sec = ACADEMY_SECTIONS.find(s => s.id === filter);
    container.innerHTML = `
      <div class="academy-section">
        <div class="academy-section-header">
          <span class="acs-icon">${sec?.icon || ''}</span>
          <span class="acs-label">${sec?.label || filter}</span>
          <span class="acs-count">${items.length} recurso${items.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="academy-grid">${items.map(academyCardHTML).join('')}</div>
      </div>`;
  }
}

function filterAcademy(f) {
  renderAcademy(f);
}

/* ── Community ── */
const POSTS = [
  { name: 'Nicolás Moreno', avatar: 'N', text: 'El oro rompió $3,200. Si están en posición larga desde el análisis de la semana pasada — excelente. Próximo soporte a monitorear: $3,150.', time: 'Hace 1h', likes: 12 },
  { name: 'Sofía Osorio', avatar: 'S', text: 'Nueva formación disponible en la Academia: Tokenización de Activos Reales. Es el futuro del capital en LATAM. No se la pierdan.', time: 'Hace 3h', likes: 18 },
  { name: 'Carlos Rivera', avatar: 'C', text: 'Alguien más vio el movimiento de BTC en las últimas 6 horas? Esa consolidación sobre $83K se ve muy sólida.', time: 'Hace 5h', likes: 7 },
];
const MEMBERS = [
  { name: 'Sofía Osorio', role: 'Co-Fundadora', online: true },
  { name: 'Nicolás Moreno', role: 'Co-Fundador', online: true },
  { name: 'Carlos Rivera', role: 'Inversor', online: true },
  { name: 'María González', role: 'Inversora', online: false },
  { name: 'Juan Pérez', role: 'Inversor', online: true },
];
function renderCommunity() {
  const list = document.getElementById('posts-list');
  const mlist = document.getElementById('members-list');
  if (list) list.innerHTML = POSTS.map(p => `
    <div class="post-card glass">
      <div class="post-header">
        <div class="post-avatar">${p.avatar}</div>
        <div>
          <div class="post-author">${p.name}</div>
          <div class="post-time">${p.time}</div>
        </div>
      </div>
      <div class="post-body">${p.text}</div>
      <div class="post-actions">
        <span class="post-action">❤ ${p.likes}</span>
        <span class="post-action">💬 Responder</span>
      </div>
    </div>
  `).join('');
  if (mlist) mlist.innerHTML = MEMBERS.map(m => `
    <div class="member-row">
      <div class="member-avatar-sm">
        ${m.name.charAt(0)}
        <div class="online-dot" style="background:${m.online ? 'var(--green)' : 'rgba(255,255,255,0.2)'}"></div>
      </div>
      <div>
        <div class="member-name">${m.name}</div>
        <div class="member-role">${m.role}</div>
      </div>
    </div>
  `).join('');
  // Set compose avatar
  const session = window.__CDF_SESSION__;
  if (session) document.getElementById('compose-avatar').textContent = session.name.charAt(0).toUpperCase();
}
function submitPost() {
  const input = document.getElementById('post-input');
  const text = input?.value.trim();
  if (!text) return;
  const session = window.__CDF_SESSION__;
  POSTS.unshift({ name: session?.name || 'Usuario', avatar: session?.name?.charAt(0) || 'U', text, time: 'Ahora', likes: 0 });
  renderCommunity();
  if (input) input.value = '';
  dashToast('Publicado en la comunidad 🟢', 'success');
}
function copyRef() {
  const input = document.getElementById('user-ref-link');
  if (!input) return;
  navigator.clipboard?.writeText(input.value);
  dashToast('Enlace de referido copiado', 'success');
}

/* ── Live Countdown — Every Wednesday 2pm Colombia (UTC−5 = 19:00 UTC) ── */
const ZOOM_URL = 'https://us05web.zoom.us/j/88923673732?pwd=OfXhdAPHeCj65aSgkVwTxnRRXYjOjz.1';

function getNextWednesday19UTC() {
  const now = new Date();
  const next = new Date(now);
  // Advance to the next Wednesday (UTC day = 3)
  const currentUTCDay = now.getUTCDay(); // 0=Sun…6=Sat
  let daysAhead = (3 - currentUTCDay + 7) % 7;
  // If it's Wednesday but already past 19:00 UTC → next week
  if (daysAhead === 0 && now.getUTCHours() >= 19) daysAhead = 7;
  // If daysAhead===0 and we haven't passed 19:00 yet, session is today
  next.setUTCDate(now.getUTCDate() + daysAhead);
  next.setUTCHours(19, 0, 0, 0);
  return next;
}

function updateCountdown() {
  const now  = new Date();
  const next = getNextWednesday19UTC();
  const diff = next - now;
  if (diff <= 0) return;

  const fmt  = n => String(n).padStart(2, '0');
  const totalHours = Math.floor(diff / 3600000);
  const days  = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  const cdH = document.getElementById('cd-h');
  const cdM = document.getElementById('cd-m');
  const cdS = document.getElementById('cd-s');
  const cdD = document.getElementById('cd-d');

  if (cdD) cdD.textContent = fmt(days);
  if (cdH) cdH.textContent = fmt(hours);
  if (cdM) cdM.textContent = fmt(mins);
  if (cdS) cdS.textContent = fmt(secs);
}

/* ── Zoom timezone display ── */
function renderZoomTimezones() {
  const container = document.getElementById('zoom-timezones');
  if (!container) return;

  // Session: Wednesday 19:00 UTC (2pm Colombia UTC-5)
  // Use a reference Wednesday date (not critical, only time matters)
  const ref = getNextWednesday19UTC();

  const zones = [
    { flag: '🇨🇴', name: 'Colombia',  tz: 'America/Bogota'    },
    { flag: '🇲🇽', name: 'México',    tz: 'America/Mexico_City'},
    { flag: '🇦🇷', name: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
    { flag: '🇪🇸', name: 'España',    tz: 'Europe/Madrid'      },
    { flag: '🇺🇸', name: 'Nueva York',tz: 'America/New_York'   },
    { flag: '🇺🇸', name: 'Los Ángeles',tz:'America/Los_Angeles' },
  ];

  container.innerHTML = zones.map(z => {
    const time = ref.toLocaleTimeString('es-CO', {
      timeZone: z.tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `<div class="tz-item"><span class="tz-flag">${z.flag}</span><span class="tz-name">${z.name}</span><strong class="tz-time">${time}</strong></div>`;
  }).join('');
}

setInterval(updateCountdown, 1000);
updateCountdown();

/* ── Live market fluctuation ── */
const bases = { gold: 3221.5, btc: 83450, sp: 5204, eur: 1.0892 };
function fluctuate(base, pct) { return (base * (1 + (Math.random() - 0.5) * pct * 2)); }
setInterval(() => {
  const g = document.getElementById('m-gold');
  const b = document.getElementById('m-btc');
  if (g) g.textContent = '$' + fluctuate(bases.gold, 0.0006).toFixed(2);
  if (b) b.textContent = '$' + Math.round(fluctuate(bases.btc, 0.001)).toLocaleString('en');
}, 3500);

/* ══════════════════════════════════════════════
   PERSONALIZED GREETING SYSTEM
══════════════════════════════════════════════ */
const GREETINGS = {
  morning: [
    (n) => `Buenos días, ${n} ☀️`,
    (n) => `Que arranque fuerte el día, ${n}.`,
    (n) => `Mañana de capital, ${n}.`,
    (n) => `El mercado madruga, ${n}. Tú también.`,
    (n) => `Amanecer inteligente, ${n}.`,
  ],
  afternoon: [
    (n) => `Buenas tardes, ${n}.`,
    (n) => `La tarde te espera, ${n}.`,
    (n) => `Análisis de tarde, ${n}.`,
    (n) => `El capital no descansa, ${n}.`,
    (n) => `Revisando los mercados, ${n}.`,
  ],
  evening: [
    (n) => `Buenas noches, ${n}.`,
    (n) => `Cierre del día, ${n}.`,
    (n) => `El sistema sigue activo, ${n}.`,
    (n) => `Revisión nocturna, ${n}.`,
    (n) => `Tarde de análisis, ${n}.`,
  ],
  night: [
    (n) => `Los mercados no duermen, ${n}.`,
    (n) => `Noche de estrategia, ${n}.`,
    (n) => `Trasnochando con el mercado, ${n}.`,
    (n) => `Madrugada de capital, ${n}.`,
  ],
  return_same_day: [
    (n) => `De vuelta al tablero, ${n}.`,
    (n) => `Otra vez aquí, ${n}. Bien.`,
    (n) => `El movimiento nunca para, ${n}.`,
    (n) => `Siguiendo el mercado, ${n}.`,
  ],
  return_next_day: [
    (n) => `¿Has vuelto, ${n}?`,
    (n) => `Te esperábamos, ${n}.`,
    (n) => `Un día más, un paso más, ${n}.`,
    (n) => `Bienvenido de vuelta, ${n}.`,
    (n) => `El Círculo te recibe, ${n}.`,
  ],
  return_long: [
    (n) => `Llevas tiempo fuera, ${n}. Bienvenido.`,
    (n) => `El sistema siguió sin ti, ${n}. Ponte al día.`,
    (n) => `Mucho ha pasado, ${n}. Estás aquí — eso es lo que importa.`,
    (n) => `El mercado no esperó, ${n}. Pero tú regresaste.`,
  ],
};

function getGreetingPool(name) {
  const now   = new Date();
  const hour  = now.getHours();
  const today = now.toDateString();

  const lastVisit   = localStorage.getItem('cdf_last_visit');
  const visitCount  = parseInt(localStorage.getItem('cdf_visit_count') || '0');

  // Update visit tracking
  localStorage.setItem('cdf_last_visit', today);
  localStorage.setItem('cdf_visit_count', visitCount + 1);

  // Determine pool based on return status first, then time
  if (lastVisit) {
    const daysSince = Math.floor((now - new Date(lastVisit)) / 86400000);
    if (daysSince === 0) return GREETINGS.return_same_day;
    if (daysSince === 1) return GREETINGS.return_next_day;
    if (daysSince >= 3)  return GREETINGS.return_long;
  }

  // First visit — time-based
  if (hour >= 6  && hour < 12) return GREETINGS.morning;
  if (hour >= 12 && hour < 18) return GREETINGS.afternoon;
  if (hour >= 18 && hour < 22) return GREETINGS.evening;
  return GREETINGS.night;
}

function getSubGreeting() {
  const hour = new Date().getHours();
  const subs = [
    'Tu capital te espera.',
    'Los mercados están abiertos.',
    'Revisa los movimientos del día.',
    'Mantén el foco. Mantén la estrategia.',
    'El Círculo sigue activo.',
    'Analiza. Decide. Actúa.',
  ];
  // Slightly deterministic based on hour so it doesn't change on reload
  return subs[hour % subs.length];
}

function renderGreeting() {
  const session = window.__CDF_SESSION__;
  if (!session) return;

  const firstName = session.name.split(' ')[0];
  const pool = getGreetingPool(firstName);
  const idx  = Math.floor(Math.random() * pool.length);
  const text = pool[idx](firstName);

  // Topbar greeting (small)
  const topbar = document.getElementById('topbar-greeting');
  if (topbar) topbar.textContent = text;

  // Home welcome block (large)
  const welcomeEl = document.getElementById('welcome-greeting');
  const subEl     = document.getElementById('welcome-sub');
  const dateEl    = document.getElementById('welcome-date');
  if (welcomeEl) welcomeEl.textContent = text;
  if (subEl)     subEl.textContent     = getSubGreeting();
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }
}

/* ══════════════════════════════════════════════
   CALCULATOR — TAB SWITCHING
══════════════════════════════════════════════ */
let dcaChart = null, dcaChartInit = false;
let compareChart = null, compareChartInit = false;

function setCalcTab(tab, btn) {
  // Switch button states
  document.querySelectorAll('.cmt-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  // Switch pane visibility
  document.querySelectorAll('.calc-tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('ctab-' + tab)?.classList.add('active');

  // Also trigger chart init + first render when tab first opened
  if (tab === 'simple' && !calcChartInit) initCalcChart();
  if (tab === 'dca') {
    if (!dcaChartInit) { dcaChartInit = true; initDcaChart(); } else { dcaUpdate(); }
  }
  if (tab === 'compare') {
    if (!compareChartInit) { compareChartInit = true; initCompareChart(); } else { compareUpdate(); }
  }
}

/* ── DCA Calculator ── */
function dcaUpdate() {
  const capital = parseFloat(document.getElementById('dca-capital')?.value) || 5000;
  const monthly = parseFloat(document.getElementById('dca-monthly')?.value) || 500;
  const months  = parseInt(document.getElementById('dca-time')?.value) || 24;
  const rate    = parseFloat(document.getElementById('dca-rate')?.value) / 100 || 0.04;

  // Display labels
  document.getElementById('dca-capital-display').textContent = '$' + capital.toLocaleString('en');
  document.getElementById('dca-monthly-display').textContent = '$' + monthly.toLocaleString('en');
  document.getElementById('dca-time-display').textContent    = months + (months === 1 ? ' mes' : ' meses');
  document.getElementById('dca-rate-display').textContent    = (rate * 100).toFixed(1) + '%';

  // Future value of lump sum
  const fvLump = capital * Math.pow(1 + rate, months);
  // Future value of annuity (monthly deposits at end of period)
  const fvAnn  = monthly * ((Math.pow(1 + rate, months) - 1) / rate);
  const total  = fvLump + fvAnn;
  const totalContributed = capital + monthly * months;
  const gains  = total - totalContributed;
  const mult   = (total / totalContributed).toFixed(2);

  document.getElementById('dca-result').textContent     = '$' + total.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('dca-sub').textContent        = 'Total invertido: $' + totalContributed.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('dca-bd-initial').textContent = '$' + capital.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('dca-bd-total').textContent   = '$' + (monthly * months).toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('dca-bd-gains').textContent   = '+$' + gains.toLocaleString('en', { maximumFractionDigits: 0 });
  document.getElementById('dca-bd-mult').textContent    = '×' + mult;

  // Build chart series: lump-sum-only vs lump+DCA
  const now = Date.now();
  const lumpData = [], dcaData = [];
  let lumpRunning = capital, dcaRunning = capital;
  lumpData.push({ x: now, y: capital });
  dcaData.push({ x: now, y: capital });
  for (let i = 1; i <= months; i++) {
    lumpRunning = lumpRunning * (1 + rate);
    dcaRunning  = dcaRunning  * (1 + rate) + monthly;
    const t = now + i * 30 * 86400000;
    lumpData.push({ x: t, y: +lumpRunning.toFixed(2) });
    dcaData.push({  x: t, y: +dcaRunning.toFixed(2)  });
  }

  if (dcaChart) {
    dcaChart.updateSeries([
      { name: 'Solo capital inicial', data: lumpData },
      { name: 'Con aportaciones DCA', data: dcaData  },
    ]);
  }
}

function initDcaChart() {
  const capital = 5000, monthly = 500, months = 24, rate = 0.04;
  const now = Date.now();
  const lumpData = [], dcaData = [];
  let lumpR = capital, dcaR = capital;
  lumpData.push({ x: now, y: capital });
  dcaData.push({  x: now, y: capital });
  for (let i = 1; i <= months; i++) {
    lumpR = lumpR * (1 + rate);
    dcaR  = dcaR  * (1 + rate) + monthly;
    const t = now + i * 30 * 86400000;
    lumpData.push({ x: t, y: +lumpR.toFixed(2) });
    dcaData.push({  x: t, y: +dcaR.toFixed(2)  });
  }
  dcaChart = new ApexCharts(document.getElementById('apex-dca-chart'), {
    ...APEX_DEFAULTS,
    chart: { ...APEX_DEFAULTS.chart, type: 'area', height: 200 },
    series: [
      { name: 'Solo capital inicial', data: lumpData },
      { name: 'Con aportaciones DCA', data: dcaData  },
    ],
    colors: ['rgba(255,255,255,0.25)', '#c9a84c'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.12, opacityTo: 0, stops: [0, 90] } },
    stroke: { curve: 'smooth', width: [1.5, 2], colors: ['rgba(255,255,255,0.25)', '#c9a84c'], dashArray: [4, 0] },
    xaxis: { ...APEX_DEFAULTS.xaxis, type: 'datetime' },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      labels: { colors: ['rgba(255,255,255,0.4)', '#c9a84c'] },
      fontSize: '11px',
    },
  });
  dcaChart.render();
  dcaUpdate();
}

/* ── Strategy Comparison Calculator ── */
const STRATEGIES = [
  {
    id: 'cefi',
    name: 'CeFi',
    icon: '🏦',
    monthlyMin: 0.8, monthlyMax: 1.8,
    detail: 'Plataformas reguladas, acceso a intereses sobre stablecoins y metales tokenizados. Bajo riesgo, liquidez moderada.',
    color: '#c9a84c',
  },
  {
    id: 'defi',
    name: 'DeFi',
    icon: '⚡',
    monthlyMin: 2.5, monthlyMax: 6.0,
    detail: 'Yield farming, liquidity providing, protocolos sobre Ethereum / L2s. Mayor rendimiento, mayor gestión activa.',
    color: '#7c3aed',
  },
  {
    id: 'hybrid',
    name: 'Híbrido CDF',
    icon: '🌐',
    monthlyMin: 1.8, monthlyMax: 4.0,
    detail: 'Arquitectura CeFi + DeFi balanceada. El modelo que construimos en El Código del Futuro.',
    color: '#3b9eff',
    best: true,
  },
];

function compareUpdate() {
  const capital = parseFloat(document.getElementById('cmp-capital')?.value) || 10000;
  const months  = parseInt(document.getElementById('cmp-time')?.value) || 24;

  document.getElementById('cmp-capital-display').textContent = '$' + capital.toLocaleString('en');
  document.getElementById('cmp-time-display').textContent    = months + ' meses';

  const grid = document.getElementById('compare-grid');
  if (!grid) return;

  const now = Date.now();
  const seriesData = [];

  grid.innerHTML = STRATEGIES.map(s => {
    // Use midpoint rate for display
    const midRate  = ((s.monthlyMin + s.monthlyMax) / 2) / 100;
    const finalVal = capital * Math.pow(1 + midRate, months);
    const gains    = finalVal - capital;
    const gainPct  = (gains / capital * 100).toFixed(1);

    // Build series point-by-point
    const pts = [];
    for (let i = 0; i <= months; i++) {
      pts.push({ x: now + i * 30 * 86400000, y: +(capital * Math.pow(1 + midRate, i)).toFixed(2) });
    }
    seriesData.push({ name: s.name, data: pts });

    return `
      <div class="compare-card${s.best ? ' best' : ''}">
        <div class="cc-header">
          <span class="cc-icon">${s.icon}</span>
          <span class="cc-name">${s.name}</span>
          ${s.best ? '<span class="cc-badge">✦ CDF Rec.</span>' : ''}
        </div>
        <div class="cc-result ${s.id === 'cefi' ? 'text-gradient-gold' : s.id === 'hybrid' ? 'text-gradient-blue' : ''}" style="${s.id === 'defi' ? 'color:#a78bfa' : ''}">
          $${finalVal.toLocaleString('en', { maximumFractionDigits: 0 })}
        </div>
        <div class="cc-gain">+${gainPct}% en ${months} meses</div>
        <div class="cc-rate">${s.monthlyMin}–${s.monthlyMax}% mensual estimado</div>
        <div class="cc-detail">${s.detail}</div>
      </div>`;
  }).join('');

  if (compareChart) {
    compareChart.updateSeries(seriesData);
  }
}

function initCompareChart() {
  const capital = 10000, months = 24;
  const now = Date.now();
  const series = STRATEGIES.map(s => {
    const midRate = ((s.monthlyMin + s.monthlyMax) / 2) / 100;
    const data = [];
    for (let i = 0; i <= months; i++) {
      data.push({ x: now + i * 30 * 86400000, y: +(capital * Math.pow(1 + midRate, i)).toFixed(2) });
    }
    return { name: s.name, data };
  });

  compareChart = new ApexCharts(document.getElementById('apex-compare-chart'), {
    ...APEX_DEFAULTS,
    chart: { ...APEX_DEFAULTS.chart, type: 'line', height: 260 },
    series,
    colors: STRATEGIES.map(s => s.color),
    stroke: { curve: 'smooth', width: [2, 2, 3] },
    xaxis: { ...APEX_DEFAULTS.xaxis, type: 'datetime' },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      labels: { colors: STRATEGIES.map(s => s.color) },
      fontSize: '11px',
    },
  });
  compareChart.render();
  compareUpdate();
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  initMainChart();
  renderGreeting();
  renderNews();
  renderQuickNews();
  renderAcademy();
  renderCommunity();
  updateQuickCalc();
  renderZoomTimezones();
});
