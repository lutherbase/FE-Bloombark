// Canvas APIs (gradients, fillStyle, etc.) can't parse CSS custom properties
// directly — resolves e.g. 'var(--accent-green)' to its actual computed color.
function _resolveCssVar(value) {
  if (typeof value !== 'string' || !value.startsWith('var(')) return value;
  const name = value.slice(4, -1).trim();
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || value;
}

/* ─── Blockies avatar (deterministic identicon from a seed, e.g. wallet address) ─
   Classic "blockies" algorithm (the same style MetaMask used) — pure vanilla
   JS + <canvas>, no dependency/bundler needed. Same seed always renders the
   same pattern, so it works as a free default avatar. */
function _blockieRand(seed) {
  const rs = [0, 0, 0, 0];
  for (let i = 0; i < seed.length; i++) rs[i % 4] = ((rs[i % 4] << 5) - rs[i % 4]) + seed.charCodeAt(i);
  return function() {
    const t = rs[0] ^ (rs[0] << 11);
    rs[0] = rs[1]; rs[1] = rs[2]; rs[2] = rs[3];
    rs[3] = rs[3] ^ (rs[3] >>> 19) ^ t ^ (t >>> 8);
    return (rs[3] >>> 0) / 4294967296;
  };
}
function _blockieColor(rand) {
  return `hsl(${Math.floor(rand() * 360)},${Math.floor(rand() * 60 + 40)}%,${Math.floor((rand()+rand()+rand()+rand()) * 25)}%)`;
}
function _blockiePattern(rand, size) {
  const dataW = Math.ceil(size / 2);
  const mirrorW = size - dataW;
  const data = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < dataW; x++) row[x] = Math.floor(rand() * 2.3);
    data.push(...row, ...row.slice(0, mirrorW).reverse());
  }
  return data;
}
function blockieDataUrl(seed, size = 8, scale = 6) {
  seed = String(seed || 'anon').toLowerCase();
  const rand      = _blockieRand(seed);
  const color     = _blockieColor(rand);
  const bgColor   = _blockieColor(rand);
  const spotColor = _blockieColor(rand);
  const pattern   = _blockiePattern(rand, size);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  pattern.forEach((val, i) => {
    if (!val) return;
    ctx.fillStyle = val === 1 ? color : spotColor;
    ctx.fillRect((i % size) * scale, Math.floor(i / size) * scale, scale, scale);
  });
  return canvas.toDataURL();
}

/* ─── Toast ───────────────────────────────────────────────────────────────── */
function showWipModal() {
  const existing = document.getElementById('wipModal');
  if (existing) return;
  const overlay = document.createElement('div');
  overlay.id = 'wipModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);z-index:9998;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#161822;border:1px solid #1e2235;border-radius:16px;padding:32px 28px;width:320px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
      <div style="font-size:32px;margin-bottom:16px">🚧</div>
      <div style="font-size:14px;font-weight:800;color:#e2e8f0;margin-bottom:8px">Under Development</div>
      <div style="font-size:12px;color:#6b7280;line-height:1.6;margin-bottom:24px">This feature is currently under development.<br>Stay tuned for updates!</div>
      <button onclick="document.getElementById('wipModal').remove()" style="background:var(--accent-green);border:none;border-radius:10px;color:#000;font-size:12px;font-weight:700;padding:10px 28px;cursor:pointer;letter-spacing:0.5px">Got it</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// In-app confirm dialog (Bloombark-styled) — replaces window.confirm(), which
// renders as an ugly native browser alert instead of matching the app's UI.
// Usage: bloombarkConfirm('Delete this message?', () => { ...on confirm... });
function bloombarkConfirm(message, onConfirm, opts = {}) {
  const existing = document.getElementById('bbConfirmModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'bbConfirmModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);z-index:10000;display:flex;align-items:center;justify-content:center';
  const danger = opts.danger !== false;
  overlay.innerHTML = `
    <div style="background:#161822;border:1px solid #1e2235;border-radius:16px;padding:26px 24px;width:320px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
      <div style="font-size:13px;font-weight:700;color:#e2e8f0;line-height:1.6;margin-bottom:22px">${message}</div>
      <div style="display:flex;gap:8px">
        <button id="bbConfirmCancel" style="flex:1;background:#1e2235;border:1px solid #2d3748;border-radius:10px;color:#8b92a8;font-size:12px;font-weight:700;padding:10px;cursor:pointer">${opts.cancelLabel || 'Cancel'}</button>
        <button id="bbConfirmOk" style="flex:1;background:${danger ? 'var(--red-12)' : 'var(--green-15)'};border:1px solid ${danger ? 'var(--red-44)' : 'var(--green-40)'};border-radius:10px;color:${danger ? '#ff6b6b' : 'var(--accent-green)'};font-size:12px;font-weight:700;padding:10px;cursor:pointer">${opts.confirmLabel || 'Confirm'}</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  overlay.querySelector('#bbConfirmCancel').onclick = () => overlay.remove();
  overlay.querySelector('#bbConfirmOk').onclick = () => { overlay.remove(); onConfirm(); };
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'app-toast';
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(20px);
    background:${type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'};
    color:#000; font-size:12px; font-weight:600; letter-spacing:.04em;
    padding:8px 18px; border-radius:6px; z-index:9999;
    opacity:0; transition:opacity .2s, transform .2s; pointer-events:none;
  `;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => t.remove(), 200);
  }, 2000);
}

/* ─── Action sound effect ─────────────────────────────────────────────────── */
// A short synthesized two-layer "confirm" chime (Web Audio API — no audio
// file needed) played when the user kicks off a scan/load/track action, so
// there's audible feedback the moment the click registers.
let _sfxCtx = null;
function _getSfxCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!_sfxCtx) _sfxCtx = new Ctx();
  if (_sfxCtx.state === 'suspended') _sfxCtx.resume();
  return _sfxCtx;
}
function playActionSound() {
  try {
    const ctx = _getSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Main tone: quick upward sweep (520Hz → 1040Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.09);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);

    // Shimmer layer: a brief high overtone for a techy sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1560, now + 0.05);
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.26);
  } catch (e) {}
}

// A bright single "tiing" bell tone — played when a new Alerts notification
// shows up, distinct in character from playActionSound()'s ascending chime.
function playNotificationSound() {
  try {
    const ctx = _getSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now); // A6 — bright "ting"
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);

    // Fifth-above harmonic layer for a bell-like shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2637, now); // E7
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.09, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.36);
  } catch (e) {}
}

// A short, subtle "mouse click" tick — used for sidebar nav clicks, kept
// deliberately plain/percussive so it reads as UI feedback rather than a
// melodic sound like playActionSound()/playNotificationSound().
function playClickSound() {
  try {
    const ctx = _getSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const dur = 0.02;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur);
  } catch (e) {}
}

// A soft "ssshhh" whoosh — used for refresh actions (Market Overview tabs,
// Trade Holdings). Filtered noise with a swell-in/fade-out envelope and a
// rising bandpass sweep, distinct from the percussive nav click.
function playRefreshSound() {
  try {
    const ctx = _getSfxCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.35;

    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur);
  } catch (e) {}
}

/* ─── Browser tab title badge ────────────────────────────────────────────── */
// Shows "Bloombark Terminal Apps (N)" where N = unread Alerts + unread
// Community messages combined, so a pending notification is visible even
// when the tab isn't focused. Falls back to the plain title when N is 0.
const _BASE_TITLE = document.title;
let _titleAlertsUnread    = 0;
let _titleCommunityUnread = 0;
function _updateTabTitle() {
  const total = _titleAlertsUnread + _titleCommunityUnread;
  document.title = total > 0 ? `${_BASE_TITLE} (${total})` : _BASE_TITLE;
}

/* ─── Config ──────────────────────────────────────────────────────────────── */
// Backend origin. Override at runtime via `window.BLOOMBARK_API_ORIGIN` (e.g. an
// injected <script>). In dev (localhost/127.0.0.1) this points at the local
// backend (backend/.env PORT, default 3002) so local testing never touches
// production data. Frontend (Vercel) and backend (Render) are different
// origins in production, so that case stays a hardcoded absolute URL —
// `location.origin` would point back at the frontend itself, which has no API.
const _isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const PORT = 3000;
const API_ORIGIN = window.BLOOMBARK_API_ORIGIN || (_isLocal ? 'http://localhost:3002' : 'https://be-bloombark.onrender.com');
const API_BASE = API_ORIGIN + '/api';
const WS_URL   = API_ORIGIN.replace(/^http/, 'ws');

/* ─── State ───────────────────────────────────────────────────────────────── */
let _prevActivePage = 'landing'; // last successfully-entered page, for bouncing back (e.g. Community without a wallet)
let _pendingCommunityEntry = false; // true while we hold the user on the username prompt before letting them into Community

// Revert a blocked nav click back to the previously-entered page. Never bounce
// back into Community itself (the page we're being blocked from) — fall to landing.
function _bounceToPrevPage(clickedNavEl) {
  clickedNavEl?.classList.remove('active');
  document.querySelector('.page.active')?.classList.remove('active');
  const dest = (_prevActivePage && _prevActivePage !== 'community') ? _prevActivePage : 'landing';
  (document.querySelector(`.nav-item[data-page="${dest}"]`) || document.querySelector('.nav-item[data-page="landing"]'))?.classList.add('active');
  document.getElementById('page-' + dest)?.classList.add('active');
}
let selectedChain  = 'auto'; // 'auto' | 'ethereum' | 'base' | 'robinhood'
let currentData    = null;
let _cachedCA      = null;
let priceChart     = null;
let distChart      = null;
let holderChart    = null;
let volumeChart    = null;
let ws             = null;
let lastUpdate     = Date.now();
let activeInterval = '5m'; // current chart timeframe

/* ─── Utils ───────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = {
  usd: v => {
    v = parseFloat(v) || 0;
    if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v/1e3).toFixed(1) + 'K';
    if (v > 0)    return '$' + v.toFixed(2);
    return '$0';
  },
  price: v => {
    v = parseFloat(v) || 0;
    if (v === 0)      return '$0.00';
    if (v >= 1000)    return '$' + v.toLocaleString('en', { minimumFractionDigits:2, maximumFractionDigits:2 });
    if (v >= 1)       return '$' + v.toFixed(4);
    if (v >= 0.01)    return '$' + v.toFixed(6);
    // For very small prices: count leading zeros after decimal and show enough sig-figs
    const str = v.toFixed(20);
    const match = str.match(/^0\.(0*)/);
    const leadZeros = match ? match[1].length : 0;
    const decimals  = leadZeros + 4;          // show 4 significant digits
    return '$' + v.toFixed(Math.min(decimals, 18));
  },
  num: v => {
    v = parseFloat(v) || 0;
    if (v >= 1e9) return (v/1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v/1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v/1e3).toFixed(1) + 'K';
    return Math.round(v).toLocaleString();
  },
  pct: v => {
    v = parseFloat(v) || 0;
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  },
  usdOrZero: v => {
    v = parseFloat(v) || 0;
    if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v/1e3).toFixed(1) + 'K';
    if (v > 0)    return '$' + v.toFixed(2);
    return '$0';
  },
  token: (v, sym) => {
    v = parseFloat(v) || 0;
    if (v >= 1e9) return (v/1e9).toFixed(2) + 'B ' + (sym||'');
    if (v >= 1e6) return (v/1e6).toFixed(2) + 'M ' + (sym||'');
    if (v >= 1e3) return (v/1e3).toFixed(1) + 'K ' + (sym||'');
    return Math.round(v).toLocaleString() + ' ' + (sym||'');
  },
};

/* ─── Navigation ──────────────────────────────────────────────────────────── */
// ── Mobile off-canvas sidebar drawer ─────────────────────────────────────────
// toggleSidebar()      → flip open/closed
// toggleSidebar(true)  → force open   |  toggleSidebar(false) → force closed
window.toggleSidebar = function(force) {
  const app = document.querySelector('.app');
  if (!app) return;
  const open = typeof force === 'boolean' ? force : !app.classList.contains('nav-open');
  app.classList.toggle('nav-open', open);
};

// Page id -> URL path (and back). Only pages that actually activate (not the
// "coming soon" WIP ones, which never navigate anywhere) get a route.
const PAGE_ROUTES = {
  'landing':        '/home',
  'ai-analyzer':    '/aianalyzer',
  'trade':          '/trade',
  'dashboard':      '/marketoverview',
  'wallet-tracker': '/wallettracker',
  'narrative':      '/narrative',
  'community':      '/community',
  'sniper':         '/sniper',
  'track-record':   '/track-record',
  'trending-bloombark': '/trending',
  'alerts':         '/alerts',
  'watchlist':      '/watchlist',
};
const ROUTE_TO_PAGE = Object.fromEntries(Object.entries(PAGE_ROUTES).map(([p, r]) => [r, p]));
// Community additionally supports a room sub-route (/community/general etc.)
// — treat any path under it as the community page; the specific room is
// resolved separately by _communityRoomFromPath once CHAT_ROOMS exists.
const _pageFromPath = path =>
  (path === PAGE_ROUTES.community || path.startsWith(PAGE_ROUTES.community + '/'))
    ? 'community'
    : (ROUTE_TO_PAGE[path] || null);

// Activates a page: swaps the visible .page / active nav-item, sets the
// header, runs the page's load function, and (unless told not to) pushes the
// matching URL. Shared by nav clicks, popstate (back/forward), and the
// initial load-time route parse below — so all three stay in sync.
function _activatePage(page, { navEl = null, pushUrl = true } = {}) {
  const el = navEl || document.querySelector(`.nav-item[data-page="${page}"]`);
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  const titles = {
    'dashboard':    ['MARKET OVERVIEW',  'Real-time market data across chains'],
    'ai-analyzer':  ['AI ANALYZER',     'Analyze token risk, insider activity & wallet behavior from contract address'],
    'trade':        ['TRADE',           'Bloombark native swap — best route via KyberSwap (EVM)'],
    'wallet-tracker':['WALLET TRACKER', 'Track and monitor specific wallets in real-time'],
    'smart-money':  ['SMART MONEY',     'Follow smart money wallets and their moves'],
    'insider-scan': ['INSIDER SCAN',    'Detect insider wallets, team allocation, hidden connections & suspicious activity'],
    'narrative':    ['NARRATIVE',       'Track trending narratives and market sectors'],
    'community':    ['BLOOMBARK COMMUNITY', 'Chat, shill, and connect with other traders'],
    'ai-trading':   ['AI TRADING AGENT','Automated trading signals powered by AI models'],
    'auto-research':['AUTO RESEARCH',   'Automated token research and report generation'],
    'sniper':       ['SNIPER ASSISTANCE', 'Newly-created pools on Robinhood chain, detected on-chain in real time'],
    'track-record': ['AI TRACK RECORD', 'Every directional AI Prediction, checked ~24h later against the real price move'],
    'trending-bloombark': ['TRENDING ON BLOOMBARK', 'Most scanned, discussed, and traded tokens on Bloombark in the last 24 hours'],
    'alerts':       ['ALERTS',          'Your configured alerts and notifications'],
    'watchlist':    ['WATCHLIST & COMPARISON',       'Your saved tokens, plus side-by-side comparison'],
    'portfolio':    ['PORTFOLIO',       'Your portfolio performance and holdings'],
    'leaderboard':  ['LEADERBOARD',     'Top traders and wallets by performance'],
    'settings':     ['SETTINGS',        'Configure your Bloombark Terminal preferences'],
    'docs':         ['DOCUMENTATION',   'API docs, guides, and reference'],
    'landing':      ['HOME',    'About Bloombark Terminal'],
  };
  const _wip = ['smart-money','insider-scan','ai-trading','auto-research','portfolio','leaderboard'];
  if (_wip.includes(page)) {
    el?.classList.remove('active');
    showWipModal();
    return;
  }

  // Community entry guards. Both bounce the user back to the previous page
  // (they never actually land in Community until the requirement is met).
  if (page === 'community') {
    // 1. Must have a connected wallet.
    if (!window._privyWallet) {
      _bounceToPrevPage(el);
      showToast('Connect your wallet to join the Community');
      openWalletModal();
      return;
    }
    // 2. Must have picked a real username (not the default 0xAB…CD12 form).
    //    Prompt for one and only enter Community after it's saved.
    if (!_hasCustomUsername()) {
      _bounceToPrevPage(el);
      _pendingCommunityEntry = true;
      _openUsernamePrompt();
      return;
    }
  }
  _prevActivePage = page;

  const [title, sub] = titles[page] || ['BLOOMBARK TERMINAL', ''];
  $('pageTitle').textContent    = title;
  $('pageSubtitle').textContent = sub;

  const isAnalyzer = page === 'ai-analyzer';
  $('networkSelector').style.display = isAnalyzer ? '' : 'none';
  $('exportBtn').style.display       = isAnalyzer ? '' : 'none';

  if (page === 'dashboard') loadDashboard();
  if (page === 'watchlist') renderWatchlistPage();
  if (page === 'alerts') renderAlertsPage();
  if (page === 'sniper') initSniperPage();
  if (page === 'track-record') loadTrackRecord(true);
  if (page === 'trending-bloombark') loadTrendingBloombark(true);
  if (page === 'landing') loadLandingCA();
  if (page === 'narrative') loadNarrative();
  if (page === 'community') initCommunity();
  if (page === 'trade') initTradePage();

  if (pushUrl && PAGE_ROUTES[page] && location.pathname !== PAGE_ROUTES[page]) {
    history.pushState({ page }, '', PAGE_ROUTES[page]);
  }
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    playClickSound();
    // On mobile, selecting a destination closes the drawer.
    toggleSidebar(false);
    _activatePage(el.dataset.page, { navEl: el, pushUrl: true });
  });
});

// Every other clickable element in the app gets the same subtle click sound
// as the sidebar, except actions that already have their own distinct sound
// (scan/load/track/predict → playActionSound, refresh buttons →
// playRefreshSound) and most of Community/Alerts, which have their own
// click/bell semantics and would get noisy under a blanket rule — with two
// carve-outs that DO get the click sound despite living in those pages:
// switching channels in Community, and clicking a non-token-movement Alerts
// notification (Bloombark update / mute notice) to open its detail popup.
const _CLICK_SOUND_EXCLUDE_IDS = new Set(['scanBtn', 'wtScanBtn', 'marketTabRefreshBtn']);
const _CLICK_SOUND_EXCLUDE_ONCLICK = [
  'tradeLoadToken(', 'runPrediction(', 'refreshMarketTab(', 'playRefreshSound(',
  'openAlertModal(', 'openAnalyzerAlertModal(', 'playClickSound(', 'playActionSound(',
];
const _CLICK_SOUND_ALLOW_ONCLICK = ['switchChatRoom(', 'openAlertDetailPopup('];
// Capture phase, deliberately — some click handlers (e.g. switchChatRoom)
// re-render their own container on click to update active-state highlighting,
// which detaches the clicked element from the DOM before a bubble-phase
// listener would run, silently breaking the closest()-based exclusion checks
// below. Capture fires before the target's own onclick, so it always sees
// the DOM as it was at the moment of the actual click.
document.addEventListener('click', e => {
  const el = e.target.closest('button, [onclick], [role="button"]');
  if (!el || el.classList.contains('nav-item')) return;
  const onclickAttr = el.getAttribute('onclick') || '';
  const allowed = _CLICK_SOUND_ALLOW_ONCLICK.some(fn => onclickAttr.includes(fn));
  if (!allowed && el.closest('#page-community, #page-alerts, #alertModal, #alertDetailModal')) return;
  if (_CLICK_SOUND_EXCLUDE_IDS.has(el.id)) return;
  if (_CLICK_SOUND_EXCLUDE_ONCLICK.some(fn => onclickAttr.includes(fn))) return;
  playClickSound();
}, true);

// Back/forward browser navigation — re-activate without pushing a new entry.
window.addEventListener('popstate', () => {
  const page = _pageFromPath(location.pathname) || 'landing';
  _activatePage(page, { pushUrl: false });
});

// Initial load: always land on Home, regardless of what path was in the
// address bar — a hard refresh (or a bookmark/shared link to any other
// page) resets to Home rather than resuming wherever the user last was.
// In-app nav (clicking sidebar items) still pushes real URLs via
// _activatePage/popstate below; this only governs the very first
// activation on load.
const _routedInitialPage = 'landing';
(function _initRouteFromUrl() {
  if (location.pathname !== PAGE_ROUTES.landing) {
    history.replaceState({ page: 'landing' }, '', PAGE_ROUTES.landing);
  }
})();

// Initial setup — always default to landing (Home) page.
if (!_routedInitialPage || _routedInitialPage === 'landing') {
  $('networkSelector').style.display = 'none';
  $('exportBtn').style.display       = 'none';
  $('pageTitle').textContent    = 'HOME';
  $('pageSubtitle').textContent = 'About Bloombark Terminal';
  loadLandingCA();
}

/* ─── Live Clock ──────────────────────────────────────────────────────────── */
setInterval(() => {
  const secs = Math.floor((Date.now() - lastUpdate) / 1000);
  $('updateTime').textContent = `Updated ${secs}s ago`;
}, 1000);

/* ─── Chain Detection ────────────────────────────────────────────────────── */
const CHAIN_META = {
  auto:      { icon: '🌐', label: 'Auto' },
  ethereum:  { icon: '⟠',  label: 'Ethereum' },
  base:      { icon: '🔵', label: 'Base' },
  robinhood: { icon: '🟢', label: 'Robinhood' },
};

function detectChain(addr) {
  if (!addr) return 'unsupported';
  // Tron: starts with T, 34 chars, base58
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) return 'tron';
  // EVM (Ethereum, Base, Arbitrum, Robinhood): 0x + 40 hex chars
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) return 'ethereum';
  return 'unsupported'; // Solana-style base58 addresses are no longer supported
}


// Address format validators per chain group
const ADDR_VALIDATORS = {
  tron:     addr => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr),
  evm:      addr => /^0x[0-9a-fA-F]{40}$/.test(addr),
};
const EVM_CHAINS = ['ethereum', 'base', 'arbitrum', 'robinhood'];

function validateChainAddress(chain, addr) {
  if (chain === 'auto') return null;
  if (EVM_CHAINS.includes(chain)) {
    if (!ADDR_VALIDATORS.evm(addr)) {
      const detected = detectChain(addr);
      if (detected === 'unsupported') {
        return `Invalid address format for ${CHAIN_META[chain].label}. EVM addresses must start with 0x followed by 40 hex characters. Solana is no longer supported.`;
      }
      const detectedLabel = CHAIN_META[detected]?.label || detected;
      return `Invalid address format for ${CHAIN_META[chain].label}. Detected as ${detectedLabel} — switch to the correct network or use Auto Detect.`;
    }
    return null;
  }
  if (chain === 'tron') {
    if (!ADDR_VALIDATORS.tron(addr)) {
      const detected = detectChain(addr);
      const detectedLabel = CHAIN_META[detected]?.label || detected;
      return `Invalid address format for Tron. ` +
             `Detected as ${detectedLabel} — switch to ${detectedLabel} or use Auto Detect.`;
    }
    return null;
  }
  return null;
}

/* ─── Scan Button ─────────────────────────────────────────────────────────── */
function requireWallet(action) {
  if (_privyUser) { action(); return; }
  openWalletModal();
  // after connect, re-run action once
  const _orig = _setWalletConnected;
  const oneShot = (user) => {
    _setWalletConnected = _orig;
    _orig(user);
    if (user) setTimeout(action, 300);
  };
  _setWalletConnected = oneShot;
}

$('scanBtn').addEventListener('click', () => {
  const addr = $('contractInput').value.trim();
  if (!addr) {
    $('contractInput').style.borderColor = 'var(--accent-red)';
    setTimeout(() => ($('contractInput').style.borderColor = ''), 1200);
    return;
  }
  playActionSound();
  requireWallet(() => scanToken(addr));
});
$('contractInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('scanBtn').click(); });
$('copyBtn').addEventListener('click', (e) => {
  e.currentTarget.blur(); // avoid :focus-within on .search-bar making its glow border look like it "thickened"
  const val = $('contractInput').value;
  if (val) navigator.clipboard.writeText(val).then(() => {
    $('copyBtn').style.color = 'var(--accent-green)';
    setTimeout(() => ($('copyBtn').style.color = ''), 1000);
    showToast('Contract address copied to clipboard');
  });
});
$('tradeCopyBtn')?.addEventListener('click', (e) => {
  e.currentTarget.blur();
  const val = $('tradeTokenInput').value;
  if (val) navigator.clipboard.writeText(val).then(() => {
    $('tradeCopyBtn').style.color = 'var(--accent-green)';
    setTimeout(() => ($('tradeCopyBtn').style.color = ''), 1000);
    showToast('Contract address copied to clipboard');
  });
});

/* ─── Loading Steps ───────────────────────────────────────────────────────── */
let _defaultLoadingStepsHTML = null;

// customSteps: optional array of step labels (defaults to the AI Analyzer steps)
function runLoadingSteps(cb, customSteps) {
  const container = $('loadingSteps');
  if (_defaultLoadingStepsHTML === null) _defaultLoadingStepsHTML = container.innerHTML;
  container.innerHTML = customSteps
    ? customSteps.map((s, i) => `<div class="loading-step${i === 0 ? ' active' : ''}">${s}</div>`).join('')
    : _defaultLoadingStepsHTML;

  const steps = document.querySelectorAll('.loading-step');
  steps.forEach(s => s.classList.remove('active', 'done'));
  $('loadingOverlay').style.display = 'flex';
  let i = 0;
  const next = () => {
    if (i > 0) steps[i-1].classList.replace('active', 'done');
    if (i < steps.length) { steps[i].classList.add('active'); i++; setTimeout(next, 380 + Math.random()*250); }
    else cb();
  };
  next();
}

/* ─── Main Scan ───────────────────────────────────────────────────────────── */
async function scanToken(address) {
  // Clear candle cache on new scan so a different contract doesn't reuse stale data
  Object.keys(_candleCache).forEach(k => delete _candleCache[k]);
  runLoadingSteps(async () => {
    try {
      const res  = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: address, chain: 'auto' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'API error');
      currentData = json.data;
      lastUpdate  = Date.now();
$('loadingOverlay').style.display = 'none';
      renderAll(currentData);
      connectWebSocket(address, currentData.price);
    } catch (err) {
      $('loadingOverlay').style.display = 'none';
      showError(err.message);
    }
  });
}

function showError(msg) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2000;background:var(--accent-red);color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
  el.textContent = '⚠ ' + msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

/* ─── Render All ──────────────────────────────────────────────────────────── */
function renderAll(d) {
  $('emptyState').style.display   = 'none';
  $('tokenHeader').style.display  = 'flex';
  $('analysisGrid').style.display = 'flex';

  _currentTokenData = d;
  renderTokenHeader(d);
  // Refresh watchlist state so heart button reflects current status
  _loadWatchlist();
  renderRiskScore(d);
  renderAlerts(d);
  renderPriceChart(d); // async, runs in background — chart appears after candles load
  renderWalletMap(d);
  renderActivity(d);
  try { renderDistribution(d); } catch(e) { console.warn('renderDistribution:', e); }
  try { renderAllocation(d); } catch(e) { console.warn('renderAllocation:', e); }
  try { renderLaunchPattern(d); } catch(e) { console.warn('renderLaunchPattern:', e); }
  try { renderWalletsTable(d); } catch(e) { console.warn('renderWalletsTable:', e); }
  try { renderAISummary(d); } catch(e) { console.warn('renderAISummary:', e); }
  try { renderHolderStats(d); } catch(e) { console.warn('renderHolderStats:', e); }
  try { renderVolumeChart(d); } catch(e) { console.warn('renderVolumeChart:', e); }
  try { renderSocial(d); } catch(e) { console.warn('renderSocial:', e); }
  resetPrediction();
}

// Reset the AI Token Prediction card back to its idle state whenever a new
// token is scanned — otherwise the previous token's verdict stays on screen.
function resetPrediction() {
  const content = $('predictionContent');
  const btn     = $('predictionBtn');
  if (content) content.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:40px 0">Click ANALYZE to generate AI prediction for this token</div>';
  if (btn) { btn.disabled = false; btn.textContent = '▶ ANALYZE'; btn.style.opacity = ''; btn.style.pointerEvents = ''; }
}

// Jump from AI Analyzer straight into the Trade page with the scanned token preloaded
function goToTrade() {
  const d = _currentTokenData;
  if (!d?.address) return showToast('Scan a token first');
  if (!/^0x[0-9a-fA-F]{40}$/.test(d.address)) return showToast('Trade only supports EVM tokens — Solana is not tradeable here');

  document.querySelector('.nav-item[data-page="trade"]')?.click();

  const inp = $('tradeTokenInput');
  if (inp) inp.value = d.address;
  tradeLoadToken();
}

/* ─── Token Header ────────────────────────────────────────────────────────── */
function renderTokenHeader(d) {
  $('tokenName').textContent   = d.name || 'Unknown Token';
  const chainLabel = d.network || 'Unknown';
  $('tokenSymbol').textContent = (d.symbol || '?') + (d.quoteSymbol ? ' / ' + d.quoteSymbol : '');
  $('tokenNetworkLabel').textContent = chainLabel;
  const _dotColor = { ethereum:'#A78BFA', base:'#0052FF', arbitrum:'#28A0F0', tron:'#FF0013', polygon:'#8247E5', robinhood:'#00C805' }[(d.chain||'').toLowerCase()] || '#A78BFA';
  const _dotSvg = $('tokenNetwork')?.querySelector('svg');
  if (_dotSvg) _dotSvg.style.fill = _dotColor;
  _updateWatchlistBtn(d.address);

  // Token logo — real image or letter fallback
  const logo = $('tokenLogo');
  if (d.imageUrl) {
    logo.innerHTML = `<img src="${d.imageUrl}" alt="${d.symbol}"
      style="width:100%;height:100%;border-radius:50%;object-fit:cover;"
      onerror="this.parentElement.textContent='${(d.symbol||'?').charAt(0)}'">`;
    logo.style.background = 'transparent';
  } else {
    logo.textContent = (d.symbol || '?').charAt(0);
    logo.style.background = '';
  }

  // Market cap
  const ch24 = d.priceChange24h || 0;
  $('marketCap').textContent = fmt.usdOrZero(d.marketCap);
  $('mcChange').textContent  = fmt.pct(ch24);
  $('mcChange').className    = 'stat-change ' + (ch24 >= 0 ? 'positive' : 'negative');

  // Liquidity — always show a value, never N/A
  const liqVal = d.liquidity || 0;
  $('liquidity').textContent = liqVal > 0 ? fmt.usd(liqVal) : '$0';
  // Liquidity lock status
  if (liqVal === 0) {
    $('liqLock').textContent = 'No Liquidity';
    $('liqLock').className   = 'stat-change negative';
  } else {
    $('liqLock').textContent = 'Unverified';
    $('liqLock').className   = 'stat-change neutral';
  }

  // Volume 24h — always show a value
  $('volume24h').textContent = fmt.usdOrZero(d.volume24h);
  if (d.buys24h > 0 || d.sells24h > 0) {
    $('volChange').textContent = `B:${fmt.num(d.buys24h)} S:${fmt.num(d.sells24h)}`;
    $('volChange').className   = 'stat-change ' + (d.buys24h >= d.sells24h ? 'positive' : 'negative');
  } else {
    $('volChange').textContent = fmt.pct(ch24 * 0.8);
    $('volChange').className   = 'stat-change ' + (ch24 >= 0 ? 'positive' : 'negative');
  }

  // Holders — always show a value
  const holdersVal = d.holderStats?.total || d.holders || 0;
  $('holders').textContent       = holdersVal > 0 ? fmt.num(holdersVal) : '—';
  $('holdersChange').textContent = fmt.pct(d.priceChange1h || 0) + ' (1h)';
  $('holdersChange').className   = 'stat-change ' + ((d.priceChange1h||0) >= 0 ? 'positive' : 'negative');

  // Created
  $('created').textContent = d.created || 'Unknown';

  // Price display
  $('currentPrice').textContent = d.price > 0 ? fmt.price(d.price) : '$0.00';
  $('priceChange').textContent  = fmt.pct(ch24);
  $('priceChange').className    = 'price-change ' + (ch24 >= 0 ? 'up' : 'down');
}

/* ─── Risk Gauge ──────────────────────────────────────────────────────────── */
function renderRiskScore(d) {
  const canvas = $('riskGauge');
  const ctx = canvas.getContext('2d');
  const score = d.riskScore || 0;
  ctx.clearRect(0, 0, 200, 120);

  const cx = 100, cy = 105, r = 80;
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2*Math.PI);
  ctx.strokeStyle = '#1e2230'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();

  const grad = ctx.createLinearGradient(cx-r, cy, cx+r, cy);
  grad.addColorStop(0,   _resolveCssVar('var(--accent-green)'));
  grad.addColorStop(0.4, '#F5A623');
  grad.addColorStop(0.7, '#FF6B35');
  grad.addColorStop(1,   _resolveCssVar('var(--accent-red)'));

  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + (score/100)*Math.PI);
  ctx.strokeStyle = grad; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();

  for (let i = 0; i <= 10; i++) {
    const ang = Math.PI + (i/10)*Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx+(r-22)*Math.cos(ang), cy+(r-22)*Math.sin(ang));
    ctx.lineTo(cx+(r-14)*Math.cos(ang), cy+(r-14)*Math.sin(ang));
    ctx.strokeStyle = '#0a0b0d'; ctx.lineWidth = 2; ctx.stroke();
  }

  const color = score >= 75 ? 'var(--risk-vhigh)' : score >= 55 ? 'var(--risk-high)' : score >= 35 ? 'var(--risk-medium)' : 'var(--risk-low)';
  $('riskNumber').textContent = score;
  $('riskNumber').style.color = color;

  const lbl = $('riskLabel');
  lbl.textContent = d.riskLevel || 'UNKNOWN';
  lbl.className   = 'risk-label ' + (score >= 75 ? 'vhigh' : score >= 55 ? 'high' : score >= 35 ? 'medium' : 'low');

  $('confidence').textContent  = Math.round(d.confidence || 0);
  $('confBarFill').style.width = (d.confidence || 0) + '%';
}

/* ─── Alerts ──────────────────────────────────────────────────────────────── */
const ALERT_EMOJI = { team:'👥', insider:'🕵️', stealth:'🚀', liquidity:'⚠️', distribution:'📊' };
function renderAlerts(d) {
  const SEV_COLOR = { critical:_resolveCssVar('var(--accent-red)'), high:'#FF6B35', medium:'#F5A623', low:_resolveCssVar('var(--accent-green)') };
  const SEV_LABEL = { critical:'CRITICAL', high:'HIGH', medium:'MEDIUM', low:'LOW' };
  const ALERT_ICON = {
    team:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    insider:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    stealth:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    liquidity:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
    distribution: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  };

  const alerts = d.alerts || [];
  if (!alerts.length) {
    $('alertsGrid').innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px">No alerts detected</div>';
    return;
  }

  $('alertsGrid').innerHTML = alerts.map((a, idx) => {
    const color = SEV_COLOR[a.severity] || SEV_COLOR.medium;
    const sevLabel = SEV_LABEL[a.severity] || 'INFO';
    const icon = ALERT_ICON[a.type] || ALERT_ICON.distribution;
    return `
    <div class="alert-item alert-sev-${a.severity}" onclick="toggleAlertDetail(${idx})" style="cursor:pointer">
      <div class="alert-icon-wrap ${a.type}" style="color:${color};border-color:${color}22;background:${color}11">${icon}</div>
      <div class="alert-body">
        <div class="alert-title-row">
          <span class="alert-label">${a.label}</span>
          <span class="alert-sev-badge" style="background:${color}22;color:${color}">${sevLabel}</span>
        </div>
        <span class="alert-desc">${a.desc}</span>
        <div class="alert-detail" id="alert-detail-${idx}" style="display:none">
          <div class="alert-detail-text">${a.detail || ''}</div>
          ${a.action ? `<div class="alert-action">→ ${a.action}</div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

window.toggleAlertDetail = function(idx) {
  const el = $(`alert-detail-${idx}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

/* ─── Price Chart ─────────────────────────────────────────────────────────── */
// Interval → candle duration in seconds (for WebSocket live-tick logic)
const INTERVAL_SECS = { '5m': 300, '15m': 900, '1h': 3600, '4h': 14400 };

window.captureChart = function() {
  if (!priceChart) return;
  const btn = document.getElementById('chartScreenshot');
  try {
    const canvas = priceChart.takeScreenshot();
    canvas.toBlob(blob => {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(() => {
          if (btn) { const t = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = t, 1500); }
        })
        .catch(() => {
          if (btn) { const t = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = t, 1500); }
        });
    }, 'image/png');
  } catch(e) { console.error('Copy chart failed', e); }
};

function buildChart(samplePrice) {
  const container = $('priceChart');
  container.innerHTML = '';
  if (priceChart) { try { priceChart.remove(); } catch(_){} priceChart = null; }

  const chart = LightweightCharts.createChart(container, {
    width:  container.clientWidth || 400,
    height: 180,
    layout: { background:{ color:'transparent' }, textColor:'#8b92a8' },
    grid:   { vertLines:{ visible: false }, horzLines:{ visible: false } },
    crosshair: { horzLine: { visible: false, labelVisible: false }, vertLine: { visible: false, labelVisible: false } },
    rightPriceScale: { visible: false },
    timeScale:       { borderColor:'#1e2230', timeVisible:true },
  });

  let minMove = 0.01;
  if (samplePrice < 0.000001)    minMove = 0.0000000001;
  else if (samplePrice < 0.0001) minMove = 0.00000001;
  else if (samplePrice < 0.01)   minMove = 0.000001;
  else if (samplePrice < 1)      minMove = 0.0001;
  else if (samplePrice < 100)    minMove = 0.01;

  const series = chart.addCandlestickSeries({
    upColor:        _resolveCssVar('var(--accent-green)'), downColor:       _resolveCssVar('var(--accent-red)'),
    borderUpColor:  _resolveCssVar('var(--accent-green)'), borderDownColor: _resolveCssVar('var(--accent-red)'),
    wickUpColor:    _resolveCssVar('var(--accent-green)'), wickDownColor:   _resolveCssVar('var(--accent-red)'),
    priceFormat: { type:'custom', formatter: p => fmt.price(p), minMove },
    lastValueVisible: false,
    priceLineVisible: false,
  });


  priceChart           = chart;
  window._candleSeries = series;
  return { chart, series };
}

// Best interval for a given token age in seconds
function bestIntervalForAge(ageMs) {
  const mins = ageMs / 60000;
  if (mins < 60)    return '5m';
  if (mins < 240)   return '15m';
  if (mins < 1440)  return '1h';
  return '4h';
}

function applyCandles(candles, createdAtMs, currentPrice) {
  if (!window._candleSeries || !candles || candles.length === 0) return;

  const minTime = createdAtMs ? Math.floor(createdAtMs / 1000) : 0;

  const seen = new Set();
  const clean = candles
    .filter(c => c.time && c.open > 0 && c.close > 0 && c.high > 0 && c.low > 0 && c.low <= c.high)
    .filter(c => !minTime || c.time >= minTime)
    .sort((a,b) => a.time - b.time)
    .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; });

  if (clean.length === 0) return;

  window._candleSeries.setData(clean);
  priceChart.timeScale().fitContent();
  // Store the last historical candle; WebSocket ticks will build the live candle on top
  window._lastCandle = clean[clean.length - 1];
}

const _candleCache = {};

async function loadCandleInterval(contract, interval, price, createdAtMs) {
  $('priceChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b92a8;font-size:12px;">Loading ' + interval + ' candles…</div>';
  priceChart = null; window._candleSeries = null; window._lastCandle = null; window._liveCandle = null;

  try {
    const cacheKey = `${contract}:${interval}`;
    let candles = _candleCache[cacheKey];
    if (!candles) {
      const caParam    = createdAtMs ? `&createdAt=${createdAtMs}` : '';
      const chainParam = selectedChain && selectedChain !== 'auto' ? `&chain=${selectedChain}` : '';
      const res  = await fetch(`${API_BASE}/candles/${contract}?interval=${interval}${caParam}${chainParam}`);
      const json = await res.json();
      candles = json.data || [];
      if (candles.length > 0) _candleCache[cacheKey] = candles;
    }
    buildChart(price);
    applyCandles(candles, createdAtMs, price);
  } catch(e) {
    buildChart(price);
  }
}

async function renderPriceChart(d) {
  const ageMs = d.pairCreatedAt ? Date.now() - d.pairCreatedAt : null;
  if (ageMs !== null) {
    const candleDur = INTERVAL_SECS[activeInterval] || 300;
    if (ageMs < candleDur * 1000) activeInterval = bestIntervalForAge(ageMs);
  }

  document.querySelectorAll('.chart-interval').forEach(b => {
    b.classList.toggle('active', b.dataset.interval === activeInterval);
  });

  await loadCandleInterval(d.contract, activeInterval, d.price, d.pairCreatedAt);
}

/* ─── WebSocket Live Price ────────────────────────────────────────────────── */
function connectWebSocket(contract, seedPrice) {
  if (ws) { try { ws.close(); } catch(_){} }
  try {
    ws = new WebSocket(WS_URL);
    const realPrice = seedPrice || 0.000001;
    ws.onopen = () => ws.send(JSON.stringify({ type:'subscribe', contract, price: realPrice }));
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type !== 'tick') return;
      lastUpdate = Date.now();

      // Sanity-check: ignore ticks that are wildly off (>50% from real price)
      const tickPrice = parseFloat(msg.price);
      if (!tickPrice || tickPrice <= 0) return;
      if (realPrice > 0 && (tickPrice / realPrice > 2 || tickPrice / realPrice < 0.1)) return;

      $('currentPrice').textContent = fmt.price(tickPrice);
      const sign = msg.change >= 0 ? '+' : '';
      $('priceChange').textContent = sign + msg.change.toFixed(3) + '%';
      $('priceChange').className   = 'price-change ' + (msg.change >= 0 ? 'up' : 'down');

      // Real-time price is displayed in the header above the chart.
      // No live candle is drawn — DexScreener chart data and WS prices can be on
      // different scales, causing a visible gap at the last candle.
    };
  } catch(_) {}
}

/* ─── Wallet Map (real holder addresses) ─────────────────────────────────── */
function renderWalletMap(d) { renderHolderConcentration(d); renderWalletRelMap(d); }

async function renderWalletRelMap(d) {
  const canvas  = document.getElementById('walletRelMap');
  const empty   = document.getElementById('walletRelMapEmpty');
  const tooltip = document.getElementById('walletRelMapTooltip');
  const stats   = document.getElementById('wrmStats');
  if (!canvas) return;

  // Show loading state
  canvas.style.display = 'block';
  if (empty) empty.style.display = 'none';
  const ctx0 = canvas.getContext('2d');
  const W0 = canvas.parentElement.clientWidth || 380, H0 = 300;
  canvas.width = W0 * devicePixelRatio; canvas.height = H0 * devicePixelRatio;
  canvas.style.width = W0 + 'px'; canvas.style.height = H0 + 'px';
  ctx0.scale(devicePixelRatio, devicePixelRatio);
  ctx0.fillStyle = '#6b7280'; ctx0.font = '11px monospace'; ctx0.textAlign = 'center';
  ctx0.fillText('Loading wallet data…', W0/2, H0/2);

  // Fetch real holder data
  let wallets = [], edges = [];
  const tokenAddr = d.address || document.getElementById('contractInput')?.value?.trim();
  if (tokenAddr) {
    try {
      const chain = d.chain || 'ethereum';
      const res = await fetch(`${API_BASE}/wallet-map/${encodeURIComponent(tokenAddr)}?chain=${chain}`);
      const json = await res.json();
      if (json.success && json.holders?.length) {
        wallets = json.holders;
        edges = json.edges || [];
        if (stats) stats.dataset.liveEdges = json.liveEdges ? '1' : '0';
      }
    } catch(_) {}
  }

  // Fallback to potentialWallets if API failed
  if (!wallets.length) {
    wallets = (d.potentialWallets || []).filter(w => w.address).slice(0, 20).map((w, i) => ({
      ...w, rank: i + 1,
    }));
  }

  if (!wallets.length) {
    canvas.style.display = 'none';
    if (empty) { empty.style.display = 'flex'; }
    return;
  }
  canvas.style.display = 'block';
  if (empty) empty.style.display = 'none';

  const W = canvas.parentElement.clientWidth  || 380;
  const H = 240;
  canvas.width  = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Node color by type
  const nodeColor = (w) => {
    const t = (w.type || '').toLowerCase();
    if (t === 'creator' || t === 'owner') return '#e86c3a';
    if (t === 'program' || w.isPumpFun) return '#a855f7';    // purple for PumpFun/programs
    if (t === 'whale') return '#f5a623';
    if (t.includes('insider') || t.includes('team')) return '#ff6b8a';
    if (t.includes('lp') || t.includes('dex') || t.includes('pool') || t.includes('liquidity')) return _resolveCssVar('var(--accent-green)');
    if (t === 'trader') return '#60a5fa';
    if (w.supplyPct > 1) return '#f5a623';
    return '#4a90d9';
  };

  // Build nodes — spread in circle initially for stable layout
  const nodes = wallets.map((w, i) => {
    const angle = (i / wallets.length) * Math.PI * 2;
    const spread = Math.min(W, H) * 0.3;
    return {
      x: W/2 + Math.cos(angle) * spread * (0.5 + Math.random() * 0.5),
      y: H/2 + Math.sin(angle) * spread * (0.5 + Math.random() * 0.5),
      vx: 0, vy: 0,
      px: 0, py: 0, // pulse phase
      w,
      r: Math.max(6, Math.min(18, 6 + (w.supplyPct || 0) * 1.8)),
      color: nodeColor(w),
      phase: Math.random() * Math.PI * 2, // for breathing animation
    };
  });

  // Fallback edges if backend returned none
  if (!edges.length) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].w, b = nodes[j].w;
        if ((a.type || '') === (b.type || '') && a.type) edges.push([i, j]);
        else if (a.supplyPct > 0.5 && b.supplyPct > 0.5) edges.push([i, j]);
      }
    }
  }

  // Cancel any previous animation loop on this canvas
  if (canvas._wrmAnimId) cancelAnimationFrame(canvas._wrmAnimId);

  // Each node gets its own slow drift target (Lissajous-style float)
  nodes.forEach((n, i) => {
    n.driftAx  = 0.7 + Math.random() * 0.6;   // drift amplitude x
    n.driftAy  = 0.7 + Math.random() * 0.6;   // drift amplitude y
    n.driftFx  = 0.0018 + Math.random() * 0.002; // frequency x (slower)
    n.driftFy  = 0.0015 + Math.random() * 0.002; // frequency y (slower)
    n.driftOx  = Math.random() * Math.PI * 2;  // phase offset x
    n.driftOy  = Math.random() * Math.PI * 2;  // phase offset y
    n.homeX    = n.x; // set after warm-up
    n.homeY    = n.y;
  });

  const REPULSION = 1800, EDGE_LEN = 160, GRAVITY = 0.012, DAMPING = 0.82;
  function tick(frame) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
        const d2 = dx*dx + dy*dy || 1, d = Math.sqrt(d2);
        const minDist = nodes[i].r + nodes[j].r + 20;
        const f = d < minDist ? REPULSION * 4 / d2 : REPULSION / d2;
        const fx = f * dx / d, fy = f * dy / d;
        nodes[i].vx -= fx; nodes[i].vy -= fy;
        nodes[j].vx += fx; nodes[j].vy += fy;
      }
    }
    edges.forEach(([i, j]) => {
      if (!nodes[i] || !nodes[j]) return;
      const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;
      const f = (d - EDGE_LEN) * 0.04;
      const fx = f * dx / d, fy = f * dy / d;
      nodes[i].vx += fx; nodes[i].vy += fy;
      nodes[j].vx -= fx; nodes[j].vy -= fy;
    });
    nodes.forEach(n => {
      // Soft gravity toward home + sinusoidal drift = continuous organic float
      const tx = n.homeX + Math.sin(frame * n.driftFx + n.driftOx) * n.driftAx * 55;
      const ty = n.homeY + Math.sin(frame * n.driftFy + n.driftOy) * n.driftAy * 45;
      n.vx += (tx - n.x) * 0.008;
      n.vy += (ty - n.y) * 0.008;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(n.r + 6, Math.min(W - n.r - 6, n.x));
      n.y = Math.max(n.r + 6, Math.min(H - n.r - 6, n.y));
    });
  }
  // Warm-up without drift to settle positions
  for (let i = 0; i < 200; i++) {
    nodes.forEach(n => {
      n.vx += (W/2 - n.x) * GRAVITY; n.vy += (H/2 - n.y) * GRAVITY;
      n.vx *= 0.75; n.vy *= 0.75;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(n.r+6, Math.min(W-n.r-6, n.x));
      n.y = Math.max(n.r+6, Math.min(H-n.r-6, n.y));
    });
    // repulsion during warmup
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i+1; j < nodes.length; j++) {
        const dx = nodes[j].x-nodes[i].x, dy = nodes[j].y-nodes[i].y;
        const d2 = dx*dx+dy*dy||1, d = Math.sqrt(d2);
        const minD = nodes[i].r+nodes[j].r+20;
        const f = d < minD ? REPULSION*4/d2 : REPULSION/d2;
        nodes[i].vx -= f*dx/d; nodes[i].vy -= f*dy/d;
        nodes[j].vx += f*dx/d; nodes[j].vy += f*dy/d;
      }
    }
  }
  // Lock home positions after settling
  nodes.forEach(n => { n.homeX = n.x; n.homeY = n.y; n.vx = 0; n.vy = 0; });

  let t = 0, frame = 0;
  function draw() {
    t += 0.018;
    frame++;
    tick(frame);

    ctx.clearRect(0, 0, W, H);

    // Edges with animated gradient dash and glow
    edges.forEach(([i, j, eType]) => {
      if (!nodes[i] || !nodes[j]) return;
      const nx = nodes[i], ny = nodes[j];
      const dx = ny.x - nx.x, dy = ny.y - nx.y;
      const d = Math.sqrt(dx*dx + dy*dy) || 1;

      // Glow line
      ctx.beginPath();
      ctx.moveTo(nx.x, nx.y);
      ctx.lineTo(ny.x, ny.y);
      const alpha = eType === 'traded' ? 0.35 : eType === 'created' ? 0.25 : 0.15;
      // Re-resolved every frame (cheap) so this picks up a colorblind-mode
      // toggle immediately, without needing to restart the whole simulation.
      const edgeColor = eType === 'traded' ? _resolveCssVar('var(--accent-green)') : eType === 'created' ? '#e86c3a' : '#ffffff';
      ctx.strokeStyle = edgeColor + Math.round(alpha * 255).toString(16).padStart(2,'0');
      ctx.lineWidth = eType === 'traded' ? 1.5 : 1;
      ctx.stroke();

      // Animated particle travelling along the edge
      const progress = ((t * 0.6 + (nodes[i].phase || 0)) % 1);
      const px = nx.x + dx * progress, py = nx.y + dy * progress;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = edgeColor + 'cc';
      ctx.fill();
    });

    // Nodes with breathing glow
    nodes.forEach(n => {
      n.color = nodeColor(n.w); // re-resolved every frame — picks up colorblind toggle live
      const breathe = Math.sin(t * 1.4 + n.phase) * 0.5 + 0.5; // 0..1
      const glowR = n.r + 4 + breathe * 5;
      const pulseAlpha = 0.08 + breathe * 0.12;

      // Outer glow ring
      const grd = ctx.createRadialGradient(n.x, n.y, n.r * 0.5, n.x, n.y, glowR);
      grd.addColorStop(0, n.color + Math.round(pulseAlpha * 255).toString(16).padStart(2,'0'));
      grd.addColorStop(1, n.color + '00');
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Inner filled circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      const inner = ctx.createRadialGradient(n.x - n.r*0.3, n.y - n.r*0.3, 1, n.x, n.y, n.r);
      inner.addColorStop(0, n.color + 'ff');
      inner.addColorStop(1, n.color + 'aa');
      ctx.fillStyle = inner;
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label for large nodes
      if (n.r >= 9) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(n.r * 0.7)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = (n.w.tag || n.w.type || '').slice(0, 4);
        ctx.fillText(label, n.x, n.y);
      }
    });

    canvas._wrmAnimId = requestAnimationFrame(draw);
  }

  // Stop animation when canvas leaves viewport (perf)
  const _wrmObserver = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && canvas._wrmAnimId) {
      cancelAnimationFrame(canvas._wrmAnimId);
      canvas._wrmAnimId = null;
    } else if (entries[0].isIntersecting && !canvas._wrmAnimId) {
      draw();
    }
  });
  _wrmObserver.observe(canvas);

  draw();

  // Stats
  const insiders = wallets.filter(w => (w.type||'').toLowerCase().includes('insider')).length;
  const whales   = wallets.filter(w => w.supplyPct > 1).length;
  const isReal = wallets[0]?.isRealData;
  if (stats) stats.innerHTML = `
    <span>${wallets.length} wallets mapped</span>
    <span style="color:#2d3144">·</span>
    <span style="color:#ff6b8a">${insiders} insider${insiders!==1?'s':''}</span>
    <span style="color:#2d3144">·</span>
    <span style="color:#f5a623">${whales} whale${whales!==1?'s':''}</span>
    <span style="color:#2d3144">·</span>
    <span>${edges.length} connection${edges.length!==1?'s':''}</span>
    <span style="color:#2d3144">·</span>
    <span style="color:${stats?.dataset?.liveEdges==='1'?'var(--accent-green)':'#6b7280'}">${stats?.dataset?.liveEdges==='1'?'● Live trades':'○ Estimated'}</span>
  `;

  // Tooltip on hover
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = nodes.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 4);
    if (hit) {
      const w = hit.w;
      tooltip.style.display = 'block';
      tooltip.style.left = (mx + 12) + 'px';
      tooltip.style.top  = (my - 8) + 'px';
      tooltip.innerHTML = `
        <div style="color:${hit.color};font-weight:700;margin-bottom:2px">${w.tag || w.type || 'Holder'}</div>
        <div style="color:#9ca3af;font-family:monospace;font-size:10px">${(w.address||'').slice(0,10)}…${(w.address||'').slice(-6)}</div>
        ${w.supplyPct > 0 ? `<div style="margin-top:3px">Supply: <b>${w.supplyPct?.toFixed(2)}%</b></div>` : ''}
        ${w.liqUsd ? `<div>Liquidity: <b>$${(w.liqUsd/1e6).toFixed(2)}M</b></div>` : ''}
        ${w.vol24h ? `<div>Vol 24h: <b>$${(w.vol24h/1e6).toFixed(2)}M</b></div>` : ''}
        ${w.buys || w.sells ? `<div style="color:var(--accent-green)">B:${w.buys||0} <span style="color:#ff6b8a">S:${w.sells||0}</span></div>` : ''}
      `;
    } else {
      tooltip.style.display = 'none';
    }
  };
  canvas.onmouseleave = () => { if (tooltip) tooltip.style.display = 'none'; };
}

function renderHolderConcentration(d) {
  const container = $('holderConcentrationContainer');
  const badge     = $('holderConcentrationBadge');
  if (!container) return;

  const dist  = d.holderDistribution || {};
  const stats = d.holderStats        || {};

  if (dist.top10 == null && !stats.total) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:40px;color:#4a5068;font-size:12px">No holder data available</div>`;
    return;
  }

  if (badge) badge.textContent = stats.total ? `${Number(stats.total).toLocaleString()} holders` : '';

  const top10      = dist.top10 ?? 0;
  const riskColor  = top10 >= 80 ? 'var(--accent-red)' : top10 >= 50 ? '#F5A623' : 'var(--accent-green)';
  const riskLabel  = top10 >= 80 ? 'HIGH CONCENTRATION' : top10 >= 50 ? 'MODERATE' : 'HEALTHY';
  const hasGTDist  = dist.top10 != null && dist.p11_20 != null;

  // bar only renders if value is not null
  const bar = (label, pct, color, sub = '') => {
    if (pct == null) return '';
    const w = Math.min(100, Math.max(0, parseFloat(pct)));
    return `
      <div style="padding:10px 16px;border-bottom:1px solid var(--border-light)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:11px;color:var(--text-muted)">${label}</span>
          <div style="text-align:right">
            <span style="font-size:12px;font-weight:700;color:${color}">${parseFloat(pct).toFixed(2)}%</span>
            ${sub ? `<div style="font-size:9px;color:var(--text-muted)">${sub}</div>` : ''}
          </div>
        </div>
        <div style="height:4px;background:var(--border-light);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${w}%;background:${color};border-radius:2px;transition:width .6s ease"></div>
        </div>
      </div>`;
  };

  const stat = (label, value, color = 'var(--text-primary)') => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border-light)">
      <span style="font-size:11px;color:var(--text-muted)">${label}</span>
      <span style="font-size:11px;font-weight:600;color:${color}">${value}</span>
    </div>`;

  const src = hasGTDist ? 'GeckoTerminal' : 'DexScreener';

  container.innerHTML = `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px 6px;border-bottom:1px solid var(--border-light)">
        <span style="font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase">Holder Tier Distribution · ${src}</span>
        <span style="font-size:10px;font-weight:700;color:${riskColor}">${riskLabel}</span>
      </div>

      ${bar('Top 10 Wallets',    dist.top10,  top10 >= 50 ? 'var(--accent-red)' : '#F5A623', 'Source: ' + src)}
      ${bar('Wallets #11–20',    dist.p11_20, '#8B5CF6', '')}
      ${bar('Wallets #21–40',    dist.p21_40, '#4a90d9', '')}
      ${bar('Remaining Holders', dist.rest,   'var(--accent-green)', 'Public float')}
      ${!hasGTDist ? `<div style="padding:8px 16px;font-size:10px;color:var(--text-muted)">Wallet #11–40 breakdown not available — GeckoTerminal data missing for this token.</div>` : ''}

      ${dist.liquidity != null ? `
      <div style="padding:6px 16px;font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border-light);margin-top:4px">Liquidity</div>
      ${bar('LP Pool Holdings', dist.liquidity, 'var(--accent-green)', 'From DexScreener liquidityBase / totalSupply')}
      ` : ''}

      <div style="padding:6px 16px;font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border-light);margin-top:4px">Holder Stats</div>
      ${stat('Total Holders',   stats.total ? Number(stats.total).toLocaleString() : '—')}
      ${stats.whales != null ? stat('Whale Wallets (>1%)', stats.whales, stats.whales > 10 ? 'var(--accent-red)' : '#F5A623') : ''}
      ${stats.concentration != null ? stat('Top 10 Concentration', `${stats.concentration.toFixed(2)}%`, stats.concentration > 60 ? 'var(--accent-red)' : 'var(--accent-green)') : ''}
    </div>`;
}


/* ─── Activity ────────────────────────────────────────────────────────────── */
const ACTIVITY_SVG = {
  sell:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  cluster:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  liquidity: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  send:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  transfer:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
};
const SEV_DOT = { high:'var(--accent-red)', medium:'#F5A623', low:'var(--accent-green)' };
let _activityFilter = 'All Activity';

function renderActivity(d) {
  const all = d.recentActivity || [];
  // Wire up filter buttons
  const filterSel = document.querySelector('.activity-filter');
  if (filterSel && !filterSel._wired) {
    filterSel._wired = true;
    filterSel.addEventListener('change', () => {
      _activityFilter = filterSel.value;
      renderActivityList(all);
    });
  }
  renderActivityList(all);
}

function renderActivityList(all) {
  const filtered = _activityFilter === 'All Activity'
    ? all
    : all.filter(a => a.type === _activityFilter);

  if (!filtered.length) {
    $('activityList').innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No ${_activityFilter.toLowerCase()} activity found</div>`;
    return;
  }

  $('activityList').innerHTML = filtered.map(a => {
    const iconHtml = ACTIVITY_SVG[a.icon] || ACTIVITY_SVG.transfer;
    const iconColor = _resolveCssVar(a.negative ? 'var(--accent-red)' : 'var(--accent-green)');
    const dotColor  = SEV_DOT[a.severity] || SEV_DOT.low;
    const fullAddr = a.walletFull || '';
    const isValidAddr = /^0x[0-9a-fA-F]{40}$/.test(fullAddr);
    const walletHtml = a.wallet
      ? (isValidAddr
          ? `<a href="https://etherscan.io/address/${fullAddr}" target="_blank"
               style="color:var(--accent-blue);font-size:10px;text-decoration:none"
               onclick="event.stopPropagation()">${a.wallet}</a>`
          : `<span style="color:var(--text-muted);font-size:10px">${a.wallet}</span>`)
      : '';
    return `
    <div class="activity-item">
      <div class="activity-icon ${a.icon}" style="color:${iconColor};border-color:${iconColor}22;background:${iconColor}11">${iconHtml}</div>
      <div class="activity-body">
        <div class="activity-desc">
          <span class="activity-sev-dot" style="background:${dotColor}"></span>
          ${a.desc}
        </div>
        <div class="activity-sub">${a.sub}</div>
      </div>
      <div class="activity-meta">
        <span class="activity-time">${a.time}</span>
        <div class="activity-amount ${a.negative?'negative':'positive'}">${a.amount}</div>
        ${a.usd ? `<div class="activity-usd">${a.usd}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ─── Token Distribution (real data) ─────────────────────────────────────── */
function renderDistribution(d) {
  if (distChart) { distChart.destroy(); distChart = null; }

  const hd     = d.holderDistribution || {};
  const hs     = d.holderStats || {};
  // top10: prefer GT holderDist, fallback to holderStats concentration
  const top10  = parseFloat(hd.top10 || hs.concentration || 0);
  // team/insider: use teamInsider from hd, or estimate from creator if present
  const team   = parseFloat(hd.teamInsider || hd.p11_20 || 0);
  const liq    = parseFloat(hd.liquidity || 0);
  // public: rest tier or remainder
  const rawRest = parseFloat(hd.public || hd.rest || 0);
  const pub    = rawRest || Math.max(0, parseFloat((100 - top10 - team - liq).toFixed(2)));
  const cex    = parseFloat(hd.cexMaker || 0);

  const labels = ['Top 10 Wallets','Team / Insider','Liquidity','Public','CEX / Market Maker'];
  const values = [top10, team, liq, pub, cex];
  const colors = [_resolveCssVar('var(--accent-red)'),'#FF8C42','#4A90E2',_resolveCssVar('var(--accent-green)'),'#9B59B6'];

  distChart = new Chart(document.getElementById('distributionChart'), {
    type: 'doughnut',
    data: { labels, datasets:[{ data: values, backgroundColor: colors, borderWidth:0, hoverOffset:4 }] },
    options: {
      responsive:false, cutout:'65%',
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${parseFloat(ctx.parsed).toFixed(2)}%` } } },
      animation:{ duration:800 },
    },
  });

  $('donutSymbol').textContent = d.symbol || '?';
  $('distLegend').innerHTML = labels.map((l,i) => `
    <div class="dist-item">
      <span class="dist-dot" style="background:${colors[i]}"></span>
      <span class="dist-label">${l}</span>
      <span class="dist-pct" style="color:${colors[i]}">${values[i].toFixed(2)}%</span>
    </div>`).join('');

  // Warn if real concentration is high
  if (top10 > 30 || team > 20) {
    $('distWarning').style.display = 'flex';
    $('distWarning').querySelector ? null : null;
    const w = $('distWarning');
    if (w) w.style.display = 'flex';
  }
}

/* ─── Team/Insider Allocation (real data) ────────────────────────────────── */
function renderAllocation(d) {
  renderSecurity(d);
}

function renderSecurity(d) {
  const el     = $('securityDetails');
  const badge  = $('securityBadge');
  if (!el) return;

  const sec = d.security;
  console.log('[renderSecurity] sec=', sec, 'from d.security');
  if (!sec) {
    el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No security data available</div>`;
    return;
  }

  const isSolana = (d.geckoNetwork || 'eth') === 'solana';

  // Determine overall security level
  const risks = [sec.isHoneypot, sec.cannotBuy, sec.isMintable, sec.isProxy, !sec.isOpenSource].filter(Boolean).length;
  const overallColor = risks === 0 ? 'var(--accent-green)' : risks <= 1 ? '#F5A623' : 'var(--accent-red)';
  const overallLabel = risks === 0 ? 'SAFE' : risks <= 1 ? 'CAUTION' : 'RISKY';
  if (badge) { badge.textContent = overallLabel; badge.style.color = overallColor; badge.style.fontWeight = '700'; }

  const row = (label, value, color = 'var(--text-primary)', sub = '') => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;border-bottom:1px solid var(--border-light)">
      <span style="font-size:11px;color:var(--text-muted)">${label}</span>
      <div style="text-align:right">
        <span style="font-size:11px;color:${color};font-weight:600">${value}</span>
        ${sub ? `<div style="font-size:9px;color:var(--text-muted);margin-top:1px">${sub}</div>` : ''}
      </div>
    </div>`;

  const bool = (v, trueLabel = 'YES', falseLabel = 'NO', trueIsBad = true) => {
    const isTrue = !!v;
    const color  = isTrue === trueIsBad ? 'var(--accent-red)' : 'var(--accent-green)';
    return `<span style="color:${color};font-weight:700">${isTrue ? trueLabel : falseLabel}</span>`;
  };

  const pct = v => `${parseFloat(v || 0).toFixed(2)}%`;
  const explorerBase = { ethereum:'https://etherscan.io/address/', eth:'https://etherscan.io/address/', base:'https://basescan.org/address/', arbitrum:'https://arbiscan.io/address/', robinhood:'https://robinhoodchain.blockscout.com/address/' }[sec.chain || 'ethereum'] || 'https://etherscan.io/address/';

  const lpRows = (sec.lpHolders || []).map((h, i) => {
    const short = h.address ? h.address.slice(0,6)+'…'+h.address.slice(-4) : '—';
    const lockColor = h.locked ? 'var(--accent-green)' : '#F5A623';
    const lockLabel = h.locked ? '🔒 Locked' : 'Unlocked';
    return row(
      `LP Holder #${i+1}`,
      `${pct(h.pct)} ${h.tag ? `<span style="color:var(--text-muted);font-weight:400">(${h.tag})</span>` : ''}`,
      lockColor,
      `<a href="${explorerBase}${h.address}" target="_blank" style="color:var(--accent-blue);text-decoration:none;font-family:monospace">${short}</a> · ${lockLabel}`
    );
  }).join('');

  el.innerHTML = `
    <div>
      ${row('Honeypot',       bool(sec.isHoneypot, 'YES ⚠', 'NO'))}
      ${!isSolana ? row('Open Source',    bool(!sec.isOpenSource, 'NO ⚠', 'YES', true)) : ''}
      ${!isSolana ? row('Proxy Contract', bool(sec.isProxy, 'YES ⚠', 'NO')) : ''}
      ${!isSolana ? row('Cannot Buy',     bool(sec.cannotBuy, 'YES ⚠', 'NO')) : ''}
      ${row('Mintable',       bool(sec.isMintable, 'YES ⚠', 'NO'))}
      ${isSolana  ? row('Freezable',      bool(sec.isFreezable, 'YES ⚠', 'NO')) : ''}
      ${isSolana  ? row('Metadata Mutable', bool(sec.metadataMutable, 'YES ⚠', 'NO')) : ''}
      <div style="padding:6px 16px;font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border-light);margin-top:4px">Tax</div>
      ${row('Buy Tax',  pct(sec.buyTax),  sec.buyTax  > 5 ? 'var(--accent-red)' : 'var(--accent-green)')}
      ${row('Sell Tax', pct(sec.sellTax), sec.sellTax > 5 ? 'var(--accent-red)' : 'var(--accent-green)')}
      ${!isSolana && sec.transferTax ? row('Transfer Tax', pct(sec.transferTax), sec.transferTax > 0 ? '#F5A623' : 'var(--accent-green)') : ''}
      <div style="padding:6px 16px;font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border-light);margin-top:4px">Liquidity</div>
      ${lpRows || row('LP Holders', 'No data', 'var(--text-muted)')}
      ${!isSolana ? row('LP Holder Count', sec.lpHolderCount || '—', 'var(--text-primary)') : ''}
      ${!isSolana && sec.isInCex ? row('Listed on CEX', sec.cexList?.join(', ') || 'Yes', 'var(--accent-green)') : ''}
      <div style="padding:6px 16px;font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border-light);margin-top:4px">Creator</div>
      ${sec.creatorAddress ? row('Creator Address',
          `<a href="${explorerBase}${sec.creatorAddress}" target="_blank" style="color:var(--accent-blue);text-decoration:none;font-family:monospace;font-size:10px">${sec.creatorAddress.slice(0,8)}…${sec.creatorAddress.slice(-6)}</a>`,
          'var(--text-primary)',
          sec.creatorMalicious ? '⚠ Flagged as malicious' : (sec.creatorPercent > 0 ? `Holds ${pct(sec.creatorPercent)} of supply` : '')
        ) : row('Creator', '—', 'var(--text-muted)')}
      <div style="padding:6px 16px 4px;font-size:9px;color:var(--text-muted)">Source: GoPlus Security API</div>
    </div>`;
}

/* ─── Launch Pattern (real data) ─────────────────────────────────────────── */
function renderLaunchPattern(d) {
  const ageDays = d.pairCreatedAt ? (Date.now() - d.pairCreatedAt) / 86400000 : null;
  const liqRatio = d.marketCap > 0 ? (d.liquidity / d.marketCap * 100).toFixed(2) + '%' : 'N/A';
  const dexName = (d.dexId||'').charAt(0).toUpperCase() + (d.dexId||'').slice(1);
  const buyRatio = d.txns?.buyRatio24h || '50.0';
  const sellRatio = (100 - parseFloat(buyRatio)).toFixed(1);

  const rows = [
    ['Launch Type',          d.launchType || 'Unknown',         d.launchType==='Stealth Launch'?'danger':'green'],
    ['DEX / Platform',       dexName || 'Unknown',              'green'],
    ['Liquidity / MCap',     liqRatio,                          parseFloat(liqRatio)<5?'danger':'warn'],
    ['Buy / Sell Ratio',     `${buyRatio}% / ${sellRatio}%`,   parseFloat(sellRatio)>60?'danger':'warn'],
    ['Active Pairs',         `${d.allPairs||1} pair(s)`,        d.allPairs>1?'green':'warn'],
    ['Token Age',            ageDays!=null ? `${ageDays.toFixed(1)}d`:'Unknown', ageDays!=null&&ageDays<7?'danger':ageDays!=null&&ageDays<30?'warn':'green'],
    ['Risk Level',           d.riskLevel||'?',                  d.riskLevel==='VERY HIGH'?'danger':d.riskLevel==='HIGH'?'warn':'green'],
  ];

  $('launchTable').innerHTML = rows.map(([k,v,c]) => `
    <div class="launch-row">
      <span class="launch-key">${k}</span>
      <span class="launch-val ${c}">${v}</span>
    </div>`).join('');
}

/* ─── Potential Wallets Table ─────────────────────────────────────────────── */
let _walletFilter = 'all';
let _walletData   = [];
let _walletSymbol = '';

function renderWalletsTable(d) {
  _walletData   = d.potentialWallets || [];
  _walletSymbol = d.symbol || '';
  _walletFilter = 'all'; // reset filter on new token scan

  // Re-wire filter button (remove old listener by replacing the node)
  const filterBtn = document.querySelector('.filter-btn');
  if (filterBtn) {
    const newBtn = filterBtn.cloneNode(true);
    filterBtn.parentNode.replaceChild(newBtn, filterBtn);
    newBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Filter`;
    newBtn.addEventListener('click', () => {
      const types = ['all','Top Holder','Holder','Whale','Liquidity'];
      _walletFilter = types[(types.indexOf(_walletFilter)+1) % types.length];
      newBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> ${_walletFilter === 'all' ? 'Filter' : _walletFilter}`;
      renderWalletRows(_walletData, _walletSymbol);
    });
  }

  renderWalletRows(_walletData, _walletSymbol);
  const vaw = $('viewAllWallets'); if (vaw) vaw.style.display = 'none';
}

function renderWalletRows(wallets, symbol) {
  const filtered = _walletFilter === 'all' ? wallets : wallets.filter(w => w.type === _walletFilter);
  if (!filtered.length) {
    $('walletsTable').innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No ${_walletFilter} wallets found</div>`;
    return;
  }

  const TYPE_COLOR = { Team:'var(--accent-red)', Insider:'#FF8C42', 'Early Buyer':'#FF8C42', Cluster:'#F5A623', Liquidity:'#4A90E2', Whale:'#8B5CF6', Holder:'var(--accent-green)', 'Top Holder':'var(--accent-green)', Trader:'#4A90E2', Other:'#8b92a8' };

  $('walletsTable').innerHTML = filtered.slice(0, 50).map((w, idx) => {
    const riskColor  = _resolveCssVar(w.riskScore >= 70 ? 'var(--accent-red)' : w.riskScore >= 45 ? '#F5A623' : 'var(--accent-green)');
    const riskLabel  = w.riskScore >= 70 ? 'HIGH' : w.riskScore >= 45 ? 'MED' : 'LOW';
    const typeColor  = _resolveCssVar(TYPE_COLOR[w.type] || TYPE_COLOR.Other);
    const bars = (w.activity||[]).map(v => {
      const h = Math.max(3, Math.abs(v) * 16);
      return `<div class="mini-bar" style="height:${h}px;background:${v>=0?'var(--accent-green)':'var(--accent-red)'}"></div>`;
    }).join('');
    const fullAddr   = w.address || '';
    const isSolAddr  = fullAddr.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(fullAddr);
    const isEVMAddr  = /^0x[0-9a-fA-F]{40}$/.test(fullAddr);
    const validAddr  = isSolAddr || isEVMAddr;
    const _walletChain = _currentTokenData?.chain || _currentTokenData?.networkId || 'ethereum';
    const _explorerMap = { ethereum:'https://etherscan.io/address/', eth:'https://etherscan.io/address/', base:'https://basescan.org/address/', arbitrum:'https://arbiscan.io/address/', robinhood:'https://robinhoodchain.blockscout.com/address/' };
    const solscanUrl = validAddr ? (_explorerMap[_walletChain] || 'https://etherscan.io/address/') + fullAddr : null;
    const isReal    = w.isRealData === true;
    const isLiqPool = w.isLiqPool === true;
    const fmtUsd    = v => v >= 1000000 ? `$${(v/1000000).toFixed(2)}M` : v >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${Math.round(v)}`;

    // Allocation column: liq pool shows Liq + Vol; trader shows B/S vol
    let allocLine1, allocLine2;
    if (isLiqPool) {
      allocLine1 = `<span style="color:#4A90E2">Liq: ${fmtUsd(w.liqUsd||0)}</span>`;
      allocLine2 = `Vol: ${fmtUsd(w.vol24h||0)} (${(w.volPct||0).toFixed(0)}%)`;
    } else if (w.buyVol != null) {
      allocLine1 = `<span style="color:var(--accent-green)">B:${fmtUsd(w.buyVol||0)}</span> <span style="color:var(--accent-red)">S:${fmtUsd(w.sellVol||0)}</span>`;
      allocLine2 = `Vol: ${fmtUsd((w.buyVol||0)+(w.sellVol||0))}`;
    } else {
      const estMark = w.isEstimated ? '~' : '';
      allocLine1 = w.allocation > 0 ? `${estMark}${fmt.token(w.allocation||0, symbol)}` : `<span style="color:#6b7280">—</span>`;
      allocLine2 = w.supplyPct > 0 ? `${estMark}${(w.supplyPct||0).toFixed(2)}%` : `<span style="color:#6b7280">${w.txCount7d ? w.txCount7d+' txns' : '—'}</span>`;
    }

    // Buy/Sell ratio for liq pools
    const buyVolNum  = w.buyVol || 0;
    const sellVolNum = w.sellVol || 0;
    const volTotal   = buyVolNum + sellVolNum;
    const buySellBar = isLiqPool && volTotal > 0
      ? `<div style="display:flex;gap:2px;margin-top:3px;height:3px;border-radius:2px;overflow:hidden;width:60px">
           <div style="background:var(--accent-green);flex:${buyVolNum}"></div>
           <div style="background:var(--accent-red);flex:${sellVolNum}"></div>
         </div>`
      : '';

    // DEX label for liq pools
    const dexLabel = isLiqPool && w.dexId
      ? `<span style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${w.dexId}</span>`
      : '';

    // Address display
    const addrDisplay = validAddr
      ? `<span class="wallet-full-addr">${fullAddr.slice(0,22)}<wbr>${fullAddr.slice(22)}</span>`
      : `<span class="wallet-full-addr" style="color:var(--text-muted)">Estimated</span>`;

    const txFmt       = w.txCount7d != null ? `${w.txCount7d} txns` : '<span style="color:var(--text-muted)">—</span>';
    const firstBuyFmt = w.firstBuy  || '<span style="color:var(--text-muted)">—</span>';
    const lastActFmt  = w.lastActive || '<span style="color:var(--text-muted)">—</span>';

    const dataBadge = isReal
      ? `<span class="wallet-data-badge real" title="Real on-chain data">● Live</span>`
      : `<span class="wallet-data-badge est" title="Estimated">~ Est.</span>`;

    return `
      <div class="wallet-row-v2" id="wrow_${idx}">
        <div class="wallet-col-addr">
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <span class="wallet-risk-dot" style="background:${riskColor};flex-shrink:0"></span>
            <div style="min-width:0;flex:1">
              ${solscanUrl
                ? `<a href="${solscanUrl}" target="_blank" class="wallet-addr-full" title="${fullAddr}">${addrDisplay}</a>`
                : addrDisplay}
              <div style="display:flex;align-items:center;gap:4px;margin-top:2px">
                ${dataBadge}
                ${dexLabel}
                ${validAddr ? `<button class="wallet-copy-btn" onclick="(function(e){e.stopPropagation();navigator.clipboard.writeText('${fullAddr}').then(()=>showToast('Wallet address copied'));})( event)" title="Copy address">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>` : ''}
              </div>
            </div>
          </div>
        </div>
        <div class="wallet-col-type">
          <span class="wallet-type-badge-v2" style="background:${typeColor}22;color:${typeColor};border:1px solid ${typeColor}44">${w.type||'Other'}</span>
        </div>
        <div class="wallet-col-alloc">
          <div class="wallet-alloc-val" style="font-size:10px">${allocLine1}</div>
          <div class="wallet-alloc-pct">${allocLine2}</div>
          ${buySellBar}
        </div>
        <div class="wallet-col-activity">
          <div class="mini-chart">${bars}</div>
          <div class="wallet-tx-count">${txFmt}</div>
        </div>
        <div class="wallet-col-meta">
          <div class="wallet-first-buy">Entry: ${firstBuyFmt}</div>
          <div class="wallet-last-active">Active: ${lastActFmt}</div>
        </div>
        <div class="wallet-col-risk">
          <span class="risk-badge-v2" style="background:${riskColor}22;color:${riskColor};border:1px solid ${riskColor}44">${w.riskScore||'?'}</span>
          <span class="risk-label-sm" style="color:${riskColor}">${riskLabel}</span>
        </div>
      </div>`;
  }).join('');
}

/* ─── AI Summary ──────────────────────────────────────────────────────────── */
function renderAISummary(d) {
  const ai = d.aiSummary || {};
  if ($('aiConfidence')) $('aiConfidence').textContent = Math.round(ai.confidence || d.confidence || 0);
  if ($('aiVerdict'))    $('aiVerdict').textContent    = ai.verdict || 'Analysis unavailable.';
  if ($('findingsList')) $('findingsList').innerHTML   = (ai.findings || []).map(f => `<li>${f}</li>`).join('');
}

/* ─── AI Price Prediction ─────────────────────────────────────────────────── */
async function runPrediction() {
  const d = _currentTokenData;
  if (!d?.address) return showToast('Scan a token first');

  playActionSound();
  const btn = $('predictionBtn');
  const content = $('predictionContent');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analyzing…'; }

  const steps = [
    { icon: '🔍', text: 'Fetching on-chain data…' },
    { icon: '📊', text: 'Analyzing price momentum…' },
    { icon: '🐋', text: 'Scanning whale activity…' },
    { icon: '🔒', text: 'Running security checks…' },
    { icon: '🤖', text: 'Generating prediction…' },
  ];
  let stepIdx = 0;
  content.innerHTML = `
    <div style="padding:32px 0;display:flex;flex-direction:column;align-items:center;gap:16px">
      <div id="predStepIcon" style="font-size:28px;transition:opacity .3s">${steps[0].icon}</div>
      <div id="predStepText" style="font-size:12px;color:var(--text-muted);font-weight:600;letter-spacing:.5px;transition:opacity .3s">${steps[0].text}</div>
      <div style="width:260px;height:4px;background:var(--border-light);border-radius:2px;overflow:hidden">
        <div id="predProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--accent-green),#4a90e2);border-radius:2px;transition:width .4s ease"></div>
      </div>
      <div id="predPct" style="font-size:10px;color:var(--text-muted)">0%</div>
    </div>`;

  const _stepInterval = setInterval(() => {
    stepIdx = Math.min(stepIdx + 1, steps.length - 1);
    const pct = Math.round((stepIdx / (steps.length - 1)) * 85);
    const icon = $('predStepIcon'); const txt = $('predStepText'); const bar = $('predProgressBar'); const pctEl = $('predPct');
    if (icon) { icon.style.opacity = '0'; setTimeout(() => { if ($('predStepIcon')) { $('predStepIcon').textContent = steps[stepIdx].icon; $('predStepIcon').style.opacity = '1'; } }, 150); }
    if (txt)  { txt.style.opacity  = '0'; setTimeout(() => { if ($('predStepText'))  { $('predStepText').textContent  = steps[stepIdx].text;  $('predStepText').style.opacity  = '1'; } }, 150); }
    if (bar)  bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  }, 600);

  try {
    const [res] = await Promise.all([
      fetch(`${API_BASE}/predict`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ address: d.address, chain: d.chain || d.networkId || 'ethereum' }),
      }),
      new Promise(r => setTimeout(r, 3000)), // minimum 3s so all steps show
    ]);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    clearInterval(_stepInterval);
    // Complete progress bar briefly before showing result
    const bar = $('predProgressBar'); const pctEl = $('predPct'); const txt = $('predStepText'); const icon = $('predStepIcon');
    if (bar) bar.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    if (icon) icon.textContent = '✅';
    if (txt) txt.textContent = 'Prediction ready!';
    await new Promise(r => setTimeout(r, 500));

    const sigColor = { bullish:_resolveCssVar('var(--accent-green)'), bearish:_resolveCssVar('var(--accent-red)'), neutral:'#F5A623' };
    const sigIcon  = { bullish:'▲', bearish:'▼', neutral:'◆' };
    const sigLabel = { bullish:'BULLISH', bearish:'BEARISH', neutral:'NEUTRAL' };
    const c = sigColor[data.signal] || '#F5A623';

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <!-- Verdict -->
        <div class="trend-panel" style="background:${c}0d;border:1px solid ${c}40;border-top:3px solid ${c};border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:30px;height:30px;border-radius:9px;background:${c}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;color:${c}">${sigIcon[data.signal]}</div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:.5px">PREDICTION</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:${c}">${sigLabel[data.signal]}</div>
          <div style="font-size:11px;color:var(--text-muted)">${data.timeframe}</div>
        </div>
        <!-- Confidence -->
        <div class="trend-panel" style="background:var(--bg-card);border:1px solid var(--border-light);border-top:3px solid #4A90E2;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:30px;height:30px;border-radius:9px;background:#4a90e222;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:.5px">CONFIDENCE</div>
          </div>
          <div style="font-size:26px;font-weight:800;color:var(--text-primary)">${data.confidence}%</div>
          <div style="height:6px;background:var(--border-light);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${data.confidence}%;background:${c};border-radius:3px;transition:width .6s ease"></div>
          </div>
        </div>
      </div>
      <!-- Bull/Bear score bar -->
      <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:10px;padding:12px 14px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:6px">
          <span style="color:var(--accent-green)">🟢 Bull Score: ${data.bullScore}</span><span style="color:var(--accent-red)">Bear Score: ${data.bearScore} 🔴</span>
        </div>
        <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--border-light)">
          <div style="flex:${data.bullScore};background:var(--accent-green);transition:flex .5s ease"></div>
          <div style="flex:${data.bearScore};background:var(--accent-red);transition:flex .5s ease"></div>
        </div>
      </div>
      <!-- Summary -->
      <div style="background:var(--bg-card);border:1px solid var(--border-light);border-left:3px solid ${c};border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:var(--text-secondary);line-height:1.6">
        ${data.summary}
      </div>
      <!-- Signals -->
      <div style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;margin-bottom:8px">SIGNAL BREAKDOWN</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${(data.signals || []).map((s, i) => {
          const sc = sigColor[s.verdict] || '#F5A623';
          return `
          <div class="tr-row" style="animation-delay:${(i * 0.04).toFixed(2)}s;display:grid;grid-template-columns:140px 70px 1fr;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-card);border:1px solid var(--border-light);border-left:3px solid ${sc};border-radius:8px;font-size:11px">
            <span style="font-weight:600;color:var(--text-primary)">${s.label}</span>
            <span style="color:${sc};font-weight:700;font-size:10px">${sigIcon[s.verdict]||'◆'} ${(s.verdict||'').toUpperCase()}</span>
            <span style="color:var(--text-muted)">${s.detail}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:12px;font-size:9px;color:var(--text-muted);text-align:center;font-style:italic">
        ⚠ This is not financial advice. Generated ${new Date(data.generatedAt).toLocaleTimeString()} · Rule-based engine
      </div>`;
  } catch(e) {
    clearInterval(_stepInterval);
    content.innerHTML = `<div style="text-align:center;padding:30px;color:var(--accent-red);font-size:12px">⚠ ${e.message}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶ ANALYZE'; }
  }
}

/* ─── Holder Stats ────────────────────────────────────────────────────────── */
function renderHolderStats(d) {
  const hs  = d.holderStats || {};
  const sym = d.symbol || '';

  const stats = [
    ['Total Holders',    hs.total > 0 ? fmt.num(hs.total) : 'N/A', fmt.pct(d.priceChange24h||0)],
    ['Whale Wallets',    hs.whales > 0 ? fmt.num(hs.whales) : 'N/A', '>1% supply'],
    ['Retail Wallets',   hs.retail > 0 ? fmt.num(hs.retail) : 'N/A', '<1% supply'],
    ['Avg. Holding',     hs.avgHolding > 0 ? fmt.token(hs.avgHolding, sym) : 'N/A', 'per wallet'],
    ['Concentration',   (hs.concentration||0).toFixed(2) + '%', 'top 10'],
    ['Price 24h',        fmt.pct(d.priceChange24h||0), 'change'],
  ];

  $('holderStatsGrid').innerHTML = stats.map(([l,v,c]) => `
    <div class="holder-stat">
      <div class="holder-stat-label">${l}</div>
      <div class="holder-stat-value">${v}</div>
      <div class="holder-stat-change" style="color:var(--text-muted);font-size:10px">${c}</div>
    </div>`).join('');

  if (holderChart) { holderChart.destroy(); holderChart = null; }

  // Build holder distribution from real wallet data. Whale/Large/Medium come
  // from actual per-wallet supply % (potentialWallets); we don't have that
  // granularity for the remaining holders, so they're one honest "Retail"
  // bucket rather than a fabricated Small/Micro split.
  const wallets = d.potentialWallets || [];
  const total   = hs.total || 0;
  const whaleCnt  = wallets.filter(w => w.supplyPct > 1).length;
  const largeCnt  = wallets.filter(w => w.supplyPct > 0.1 && w.supplyPct <= 1).length;
  const medCnt    = wallets.filter(w => w.supplyPct > 0.01 && w.supplyPct <= 0.1).length;
  const retailCnt = Math.max(0, total - whaleCnt - largeCnt - medCnt);

  holderChart = new Chart($('holderChart'), {
    type: 'bar',
    data: {
      labels: ['Whales\n>1%','Large\n0.1-1%','Medium\n0.01-0.1%','Retail'],
      datasets: [{
        data: [whaleCnt, largeCnt, medCnt, retailCnt],
        backgroundColor: [_resolveCssVar('var(--accent-red)'),'#FF8C42','#F5A623',_resolveCssVar('var(--accent-green)')],
        borderRadius: 3, borderSkipped: false,
      }],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales: {
        x:{ ticks:{ color:'#8b92a8', font:{ size:9 } }, grid:{ color:'#1e2230' } },
        y:{ ticks:{ color:'#8b92a8', font:{ size:9 } }, grid:{ color:'#1e2230' } },
      },
    },
  });
}

/* ─── Social Sentiment ────────────────────────────────────────────────────── */
function renderSocial(d) {
  const socials  = d.socials  || [];
  const websites = d.websites || [];

  const buys  = d.txns?.buys24h  || d.buys24h  || 0;
  const sells = d.txns?.sells24h || d.sells24h || 0;
  const total = buys + sells;
  const bullPct = total > 0 ? Math.round((buys / total) * 100) : 50;
  const bearPct = 100 - bullPct;
  const sentLabel = bullPct >= 60 ? 'Bullish' : bullPct <= 40 ? 'Bearish' : 'Neutral';
  const sentColor = bullPct >= 60 ? 'var(--accent-green)' : bullPct <= 40 ? '#ef4444' : '#f59e0b';

  const iconMap = {
    twitter:  { svg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`, label: 'X' },
    telegram: { svg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`, label: 'TG' },
    discord:  { svg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`, label: 'DC' },
    website:  { svg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`, label: 'Web' },
  };

  // Each website can carry its own label from the source (e.g. "Website" vs
  // "Docs") — fall back to a numbered "Web 2", "Web 3"… only when the site
  // genuinely has no label, so multiple links never render as identical,
  // indistinguishable "Web" pills.
  const links = [];
  let webCount = 0;
  for (const w of websites) {
    const url = typeof w === 'string' ? w : w?.url;
    const srcLabel = typeof w === 'object' ? w?.label : null;
    if (!url) continue;
    webCount++;
    links.push({ type: 'website', url, label: srcLabel || (webCount > 1 ? `Web ${webCount}` : null) });
  }
  for (const s of socials) links.push({ type: s.type?.toLowerCase() || 'website', url: s.url });

  // ── Render into token header ──
  const sentItem   = $('headerSocialItem');
  const linksItem  = $('headerSocialLinks');
  const extrasWrap = $('headerExtrasGroup');
  if (extrasWrap && (sentItem || (linksItem && links.length))) extrasWrap.style.display = 'flex';
  if (sentItem) {
    $('headerSentimentLabel').textContent = sentLabel;
    $('headerSentimentLabel').style.color = sentColor;
    $('headerBullBar').style.width = bullPct + '%';
    $('headerBearBar').style.width = bearPct + '%';
    $('headerSentimentSub').textContent = `${bullPct}% buys · ${total.toLocaleString()} txns`;
    sentItem.style.display = 'flex';
  }
  if (linksItem && links.length) {
    $('headerLinksRow').innerHTML = links.map(l => {
      const ico = iconMap[l.type] || iconMap.website;
      return `<a href="${l.url}" target="_blank" rel="noopener"
        title="${l.url}"
        style="display:flex;align-items:center;gap:4px;padding:3px 8px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:5px;color:var(--text-muted);text-decoration:none;font-size:10px;font-weight:600;transition:color .15s,border-color .15s"
        onmouseover="this.style.color='var(--text-primary)';this.style.borderColor='var(--accent)'"
        onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border-light)'">
        ${ico.svg}${l.label || ico.label}
      </a>`;
    }).join('');
    linksItem.style.display = 'flex';
  }
}

/* ─── Volume Profile (real 24h period data) ──────────────────────────────── */
function renderVolumeChart(d) {
  if (volumeChart) { volumeChart.destroy(); volumeChart = null; }
  const vp = d.volumeProfile || [];
  if (!vp.length) return;

  volumeChart = new Chart($('volumeChart'), {
    type: 'bar',
    data: {
      labels: vp.map(v => v.hour + 'h'),
      datasets: [
        { label:'Buys',  data: vp.map(v => v.buys  || 0), backgroundColor:_resolveCssVar('var(--accent-green)')+'b3', stack:'v' },
        { label:'Sells', data: vp.map(v => -(v.sells||0)),backgroundColor:_resolveCssVar('var(--accent-red)')+'b3',  stack:'v' },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#8b92a8', font:{ size:10 } } },
        tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${Math.abs(ctx.parsed.y)}` } } },
      scales: {
        x:{ stacked:true, ticks:{ color:'#8b92a8', font:{ size:9 }, maxTicksLimit:12 }, grid:{ color:'#1e2230' } },
        y:{ stacked:true, ticks:{ color:'#8b92a8', font:{ size:9 } }, grid:{ color:'#1e2230' } },
      },
    },
  });
}

/* ─── Chart interval buttons ──────────────────────────────────────────────── */
document.querySelectorAll('.chart-interval').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.chart-interval').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (!currentData) return;
    activeInterval = btn.dataset.interval || btn.textContent.trim().toLowerCase();
    await loadCandleInterval(currentData.contract, activeInterval, currentData.price, currentData.pairCreatedAt);
  });
});

/* ─── Export Report ───────────────────────────────────────────────────────── */
function buildReport() {
  if (!currentData) return null;
  const d = currentData;
  return `
BLOOMBARK TERMINAL APPS — AI INSIDER REPORT
============================================
Generated : ${new Date().toLocaleString()}
Contract  : ${d.contract}
Token     : ${d.name} (${d.symbol}) on ${d.network || 'EVM'}
DEX       : ${d.dexId || 'N/A'} | Pairs: ${d.allPairs || 1}
Source    : DexScreener + GeckoTerminal

PRICE DATA  (LIVE)
──────────────────
Price      : ${fmt.price(d.price)}
Change 5m  : ${fmt.pct(d.priceChange5m||0)}
Change 1h  : ${fmt.pct(d.priceChange1h||0)}
Change 24h : ${fmt.pct(d.priceChange24h||0)}

MARKET DATA  (DEXSCREENER)
───────────────────────────
Market Cap  : ${fmt.usd(d.marketCap)}
FDV         : ${fmt.usd(d.fdv)}
Liquidity   : ${fmt.usd(d.liquidity)}
Volume 24h  : ${fmt.usd(d.volume24h)}
Volume 1h   : ${fmt.usd(d.volume?.h1||0)}
Buys 24h    : ${fmt.num(d.buys24h)}
Sells 24h   : ${fmt.num(d.sells24h)}
Buy Ratio   : ${d.buyRatio || d.txns?.buyRatio24h || 'N/A'}%
Token Age   : ${d.created}

HOLDER DATA  (ON-CHAIN)
──────────────────────────
Top 10 Hold : ${(d.top10Pct||0).toFixed(2)}% of supply
Total Supply: ${fmt.token(d.totalSupply, d.symbol)}

TOP WALLETS:
${(d.potentialWallets||[]).slice(0,10).map((w,i) =>
  `  ${i+1}. ${w.shortAddr||w.address} | ${w.type} | ${(w.supplyPct||0).toFixed(4)}% | Risk: ${w.riskScore}`
).join('\n')}

RISK ANALYSIS  (AI)
────────────────────
Risk Score  : ${d.riskScore}/100 — ${d.riskLevel}
Confidence  : ${d.confidence}%

Risk Factors:
${(d.riskFactors||[]).map(f => '  • ' + f).join('\n')}

AI VERDICT:
${d.aiSummary?.verdict || 'N/A'}

Key Findings:
${(d.aiSummary?.findings||[]).map(f => '  ✗ ' + f).join('\n')}

ALERTS:
${(d.alerts||[]).map(a => `  ⚠ ${a.label}: ${a.desc}`).join('\n')}

────────────────────────────────────────────
Bloombark Terminal Apps  |  Data: DexScreener + GeckoTerminal
`.trim();
}

$('exportBtn').addEventListener('click', () => {
  const report = buildReport();
  if (!report) return showError('Scan a token first.');
  const blob = new Blob([report], { type:'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `bloomberg-${currentData.symbol}-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(a.href);
});
$('generateReportBtn')?.addEventListener('click', () => $('exportBtn').click());

/* ─── Trending ────────────────────────────────────────────────────────────── */
async function loadTrending() {
  try {
    const res  = await fetch(`${API_BASE}/trending`);
    const json = await res.json();
    renderTrending(json.data || []);
  } catch(_) {
    renderTrending([
      { symbol:'TOESCOIN', name:'TOES',      address:'6ehEcTMCc85aNF4x9CWx8HuvWGhxQtvKdhKVf2HDpump', risk:71, change:67.3 },
      { symbol:'WIF',      name:'dogwifhat', address:'EKpQGSJsJvxGKhnqtpeRSMU3wJWPRBmEJFjBUfAD8M7e',  risk:38, change:5.2  },
      { symbol:'BONK',     name:'Bonk',      address:'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',  risk:42, change:12.5 },
    ]);
  }
}

/* ─── Wallet Tracker ──────────────────────────────────────────────────────── */
(function initWalletTracker() {
  const inp        = () => $('wtInput');
  const scanBtn    = () => $('wtScanBtn');
  const copyBtn    = () => $('wtCopyBtn');
  const chainSel   = () => $('wtChainSelect');
  const chainWrap  = () => $('wtChainSelectWrap');
  const detectEl   = () => $('wtChainDetect');
  const content    = () => $('wtContent');
  const empty      = () => $('wtEmpty');
  const loading    = () => $('wtLoading');
  const loadingMsg = () => $('wtLoadingMsg');

  function isEvm(addr)    { return /^0x[0-9a-fA-F]{40}$/.test(addr); }

  function onInput() {
    const val = (inp()?.value || '').trim();
    if (isEvm(val)) {
      detectEl().textContent = '⬡ EVM address detected — select chain below';
      detectEl().style.color = '#4a90d9';
      if (chainWrap()) chainWrap().style.display = 'flex';
    } else {
      detectEl().textContent = val.length > 5 ? '⚠ Unrecognized address format — EVM wallets only (0x…)' : '';
      detectEl().style.color = '#F5A623';
      if (chainWrap()) chainWrap().style.display = 'none';
    }
  }

  function show(id) {
    ['wtContent','wtEmpty','wtLoading'].forEach(i => { const el = $(i); if (el) el.style.display = 'none'; });
    const el = $(id);
    if (el) el.style.display = id === 'wtContent' ? 'block' : 'flex';
  }

  const fmtUsd = v => !v ? '$0' : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${v.toFixed(2)}`;
  const fmtNum = v => !v ? '0' : v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K` : parseFloat(v).toFixed(4);
  const timeAgo = ts => { const s=(Date.now()-ts)/1000; return s<60?`${Math.round(s)}s ago`:s<3600?`${Math.round(s/60)}m ago`:s<86400?`${Math.round(s/3600)}h ago`:`${Math.round(s/86400)}d ago`; };

  function renderSummary(data) {
    const el = $('wtSummary');
    if (!el) return;
    const chain = (data.evmChain||'EVM').charAt(0).toUpperCase()+(data.evmChain||'evm').slice(1);
    const chainColor = '#4a90d9';
    el.innerHTML = [
      { label:'Total Value',  value: fmtUsd(data.totalUsd), color:'var(--accent-green)' },
      { label:'Network',      value: chain,                  color: chainColor },
      { label:'Tokens',       value: data.tokens?.length || 0, color:'var(--text-primary)' },
      { label:'Transactions', value: data.txs?.length || 0,    color:'var(--text-primary)' },
    ].map(s => `
      <div class="card" style="padding:14px 16px">
        <div style="font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px">${s.label}</div>
        <div style="font-size:18px;font-weight:700;color:${s.color}">${s.value}</div>
      </div>`).join('');
  }

  function renderHoldings(tokens, chain) {
    const el = $('wtHoldings');
    if (!el) return;
    if ($('wtHoldingCount')) $('wtHoldingCount').textContent = `${tokens.length} tokens`;
    if (!tokens.length) { el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No token holdings found</div>`; return; }

    const explorerBase = { ethereum:'https://etherscan.io/token/', base:'https://basescan.org/token/', robinhood:'https://robinhoodchain.blockscout.com/token/' }[chain] || 'https://etherscan.io/token/';
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 80px 90px 80px;padding:6px 12px;font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;border-bottom:1px solid var(--border-light)">
        <span>TOKEN</span><span style="text-align:right">BALANCE</span><span style="text-align:right">PRICE</span><span style="text-align:right">VALUE</span>
      </div>
      ${tokens.map(t => {
        const pct = tokens[0]?.valueUsd > 0 ? (t.valueUsd / tokens.reduce((s,x)=>s+x.valueUsd,0)*100) : 0;
        const addr = t.mint || t.address || '';
        return `
        <div style="display:grid;grid-template-columns:1fr 80px 90px 80px;padding:8px 12px;border-bottom:1px solid var(--border-light);align-items:center">
          <div>
            <div style="font-size:11px;font-weight:600;color:var(--text-primary)">${t.symbol}</div>
            <div style="font-size:9px;color:var(--text-muted)">${t.name}</div>
            <div style="height:2px;background:var(--border-light);border-radius:1px;margin-top:3px;width:60px">
              <div style="height:100%;width:${Math.min(100,pct)}%;background:var(--accent-green);border-radius:1px"></div>
            </div>
          </div>
          <span style="text-align:right;font-size:10px;color:var(--text-primary)">${fmtNum(t.balance)}</span>
          <span style="text-align:right;font-size:10px;color:var(--text-muted)">${t.priceUsd>0?'$'+t.priceUsd.toFixed(t.priceUsd<0.001?8:t.priceUsd<1?6:4):'—'}</span>
          <span style="text-align:right;font-size:11px;font-weight:600;color:${t.valueUsd>0?'var(--accent-green)':'var(--text-muted)'}">${fmtUsd(t.valueUsd)}</span>
        </div>`;
      }).join('')}`;
  }

  let _allTxs = [], _txChain = 'ethereum', _txNextCursor = null, _txAddress = '';

  function renderTxHistory(txs, chain, nextCursor = null, address = '') {
    _allTxs = txs; _txChain = chain; _txNextCursor = nextCursor; _txAddress = address;
    _renderTxRows();
  }

  function _txRow(tx) {
    const txBase = { ethereum:'https://etherscan.io/tx/', base:'https://basescan.org/tx/', arbitrum:'https://arbiscan.io/tx/', robinhood:'https://robinhoodchain.blockscout.com/tx/' };
    const explorer = txBase[_txChain] || txBase.ethereum;
    const TYPE_COLOR = { Send:'var(--accent-red)', Receive:'var(--accent-green)', Swap:'#F5A623', Transfer:'#4a90d9' };
    const hash   = tx.signature || tx.hash || '';
    const color  = TYPE_COLOR[tx.type] || '#8b92a8';
    const valStr = tx.value > 0 ? fmtUsd(tx.value * 3000) : (tx.amtOut > 0 ? fmtNum(tx.amtOut) : '—');
    const detail = tx.type === 'Swap'
      ? `${fmtNum(tx.amtOut)} → ${fmtNum(tx.amtIn)}`
      : (tx.to ? tx.to.slice(0,6)+'…'+tx.to.slice(-4) : tx.short || '—');
    return `<div style="display:grid;grid-template-columns:60px 1fr 80px 70px 36px;padding:7px 12px;border-bottom:1px solid var(--border-light);align-items:center">
      <span style="font-size:10px;font-weight:700;color:${color}">${tx.type}</span>
      <span style="font-size:9px;color:var(--text-muted);font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${detail}</span>
      <span style="text-align:right;font-size:10px;color:var(--text-primary)">${valStr}</span>
      <span style="text-align:right;font-size:9px;color:var(--text-muted)">${timeAgo(tx.timestamp)}</span>
      <span style="text-align:right">${hash ? `<a href="${explorer}${hash}" target="_blank" style="color:var(--text-muted);font-size:10px;text-decoration:none">↗</a>` : ''}</span>
    </div>`;
  }

  function _renderTxRows() {
    const el = $('wtTxList');
    if (!el) return;
    if ($('wtTxCount')) $('wtTxCount').textContent = 'Top 10';
    const top10 = _allTxs.slice(0, 10);
    if (!top10.length) {
      el.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No transactions found</div>`;
      return;
    }
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:60px 1fr 80px 70px 36px;padding:6px 12px;font-size:9px;color:var(--text-muted);font-weight:700;letter-spacing:.5px;border-bottom:1px solid var(--border-light)">
        <span>TYPE</span><span>DETAILS</span><span style="text-align:right">VALUE</span><span style="text-align:right">TIME</span><span></span>
      </div>
      ${top10.map(_txRow).join('')}`;
  }

  async function doTrack() {
    const address  = (inp()?.value || '').trim();
    const evmChain = chainSel()?.value || 'ethereum';
    if (!address) return;
    if (!_privyUser) { openWalletModal(); return; }

    playActionSound();
    show('wtLoading');
    if (loadingMsg()) loadingMsg().textContent = `Fetching ${evmChain} wallet data…`;

    try {
      const res  = await fetch(`${API_BASE}/wallet-tracker`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ address, evmChain }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');

      show('wtContent');
      renderSummary(data);
      renderHoldings(data.tokens || [], evmChain);
      renderTxHistory(data.txs || [], evmChain, data.nextCursor || null, address);
    } catch (e) {
      show('wtEmpty');
      if (detectEl()) { detectEl().textContent = '⚠ ' + e.message; detectEl().style.color = 'var(--accent-red)'; }
    }
  }

  // Wire up after DOM ready
  const wire = () => {
    inp()?.addEventListener('input', onInput);
    scanBtn()?.addEventListener('click', doTrack);
    inp()?.addEventListener('keydown', e => e.key === 'Enter' && doTrack());
    copyBtn()?.addEventListener('click', (e) => {
      e.currentTarget.blur();
      const addr = inp()?.value?.trim();
      if (!addr) return;
      navigator.clipboard.writeText(addr).then(() => {
        const btn = copyBtn();
        btn.style.color = 'var(--accent-green)';
        setTimeout(() => { btn.style.color = ''; }, 1000);
        showToast('Wallet address copied to clipboard');
      });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

/* ─── Trending ────────────────────────────────────────────────────────────── */
function renderTrending(tokens) {
  const trendEl = $('trendingList');
  if (!trendEl) return;
  trendEl.innerHTML = tokens.map(t => {
    const riskClass = t.risk >= 70 ? 'high' : t.risk >= 45 ? 'med' : 'low';
    const chgClass  = t.change >= 0 ? 'up' : 'down';
    const img = t.imageUrl ? `<img src="${t.imageUrl}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">` : '';
    return `
      <button class="trending-item" onclick="document.getElementById('contractInput').value='${t.address}'; document.getElementById('scanBtn').click();">
        ${img}
        <span class="trending-symbol">${t.symbol}</span>
        <span class="trending-name">${t.name}</span>
        <span class="trending-risk ${riskClass}">Risk: ${t.risk}</span>
        <span class="trending-change ${chgClass}">${t.change>=0?'+':''}${parseFloat(t.change||0).toFixed(1)}%</span>
      </button>`;
  }).join('');
}

loadTrending();

window.addEventListener('resize', () => {
  if (priceChart) priceChart.applyOptions({ width: $('priceChart').clientWidth });
});

/* ─── Dashboard ───────────────────────────────────────────────────────────── */

const CHAIN_COLOR = {
  ethereum:'#627EEA', base:'#0052FF',
  arbitrum:'#28A0F0', tron:'#FF0013', polygon:'#8247E5', avalanche:'#E84142',
  optimism:'#FF0420', linea:'#61DFFF', scroll:'#FFDBB5', mantle:'#60CF8B',
  zksync:'#8C8DFC', robinhood:'#00C805',
};

function dashFmtPrice(v) {
  v = parseFloat(v) || 0;
  if (v === 0) return '$0';
  if (v >= 1000)  return '$' + v.toFixed(2);
  if (v >= 1)     return '$' + v.toFixed(4);
  if (v >= 0.001) return '$' + v.toFixed(6);
  // Very small numbers — avoid scientific notation, show 3 sig figs after leading zeros
  const decimals = Math.max(2, Math.ceil(-Math.log10(v)) + 2);
  return '$' + v.toFixed(Math.min(decimals, 10)).replace(/0+$/, '').replace(/\.$/, '');
}

function dashFmtVol(v) {
  v = parseFloat(v) || 0;
  if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v/1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

function dashAge(isoStr) {
  if (!isoStr) return '';
  const ms = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function openInAnalyzer(address, networkId) {
  if (!address) return;
  requireWallet(() => {
    document.getElementById('contractInput').value = address;
    document.querySelector('[data-page="ai-analyzer"]').click();
    document.getElementById('scanBtn').click();
  });
}

// Token logo for a dashboard row. Prefer a backend-provided imageUrl; otherwise
// build DexScreener's CDN URL from chain + address (browser follows the 301 to
// the real logo; onerror falls back to the colored initial).
function dashLogoUrl(t) {
  if (t.imageUrl) return t.imageUrl;
  if (t.networkId && t.address) return `https://dd.dexscreener.com/ds-data/tokens/${t.networkId}/${t.address}.png`;
  return '';
}

const DASH_HEADER = `
  <div class="dash-vol-header">
    <span>#</span><span style="padding-left:33px">TOKEN / PAIR</span><span style="text-align:right">PRICE</span>
    <span style="text-align:right">24H CHANGE</span><span style="text-align:right">24H VOLUME</span>
    <span style="text-align:right">MCAP</span><span style="text-align:right">LIQ</span>
    <span style="text-align:right">AGE</span><span style="text-align:right">BUYS</span><span style="text-align:right">SELLS</span>
  </div>`;

function _dashRowHtml(t, i) {
  const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const chg = t.priceChange24h || 0;
  const chgStr = (chg >= 0 ? '+' : '') + chg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const chgColor = chg >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const chainColor = CHAIN_COLOR[t.networkId] || '#8b92a8';
  const logo = dashLogoUrl(t);
  const initial = (t.name || '?').trim().charAt(0).toUpperCase();
  const addr = t.address || '';
  const caLine = addr
    ? `<span class="dash-vol-ca" title="Copy contract address" onclick="event.stopPropagation();navigator.clipboard.writeText('${addr}').then(()=>showToast('Contract address copied'))">${addr}</span>`
    : '';
  return `<div class="dash-vol-row" onclick="openInAnalyzer('${addr}','${t.networkId}')">
    <span class="dash-vol-rank ${rankClass}">${i+1}</span>
    <div class="dash-vol-token">
      <span class="dash-vol-logo" style="background:${chainColor}22;color:${chainColor}">${initial}${logo ? `<img src="${logo}" alt="" loading="lazy" onload="this.style.opacity=1" onerror="this.remove()">` : ''}</span>
      <div class="dash-vol-info">
        <span class="dash-vol-name">${t.name}</span>
        <span class="dash-vol-pair">
          <span class="dash-chain-badge" style="background:${chainColor}22;color:${chainColor}">${t.network}</span>
        </span>
        ${caLine}
      </div>
    </div>
    <span class="dash-vol-price">${dashFmtPrice(t.price)}</span>
    <span class="dash-vol-change" style="color:${chgColor}">${chgStr}</span>
    <span class="dash-vol-volume">${dashFmtVol(t.volume24h)}</span>
    <span class="dash-vol-liq">${dashFmtVol(t.fdv)}</span>
    <span class="dash-vol-liq">${dashFmtVol(t.liquidity)}</span>
    <span class="dash-vol-liq" style="color:var(--accent-blue)">${dashAge(t.createdAt) || '-'}</span>
    <span class="dash-vol-liq" style="color:var(--accent-green)">${(t.buys24h || 0).toLocaleString('en-US')}</span>
    <span class="dash-vol-liq" style="color:var(--accent-red)">${(t.sells24h || 0).toLocaleString('en-US')}</span>
  </div>`;
}

// Market Overview tabs (Robinhood-chain launch view): Pools, Trending, Top
// Gainers, New Pools — all sourced from /api/market/:tab (GeckoTerminal).
let _marketTab = 'pools';
let _marketTabBarInit = false;
const MARKET_TAB_LABEL = { pools: '💧 POOLS', trending: '🔥 TRENDING', gainers: '📈 TOP GAINERS', 'new-pools': '🆕 NEW POOLS' };

function renderMarketTabList(items) {
  const el = $('marketTabGrid');
  if (!el) return;
  if (!items.length) { el.innerHTML = '<div class="dash-loading">No data available</div>'; return; }
  el.innerHTML = DASH_HEADER + items.map(_dashRowHtml).join('');
}

// Switching tabs just shows whatever's already stored on the backend —
// instant, no live GeckoTerminal call. Pass refresh:true (from the Refresh
// button) to force a fresh fetch instead.
async function fetchMarketTab(tab, { refresh = false } = {}) {
  _marketTab = tab;
  if ($('marketTabTitle')) $('marketTabTitle').textContent = MARKET_TAB_LABEL[tab] || tab.toUpperCase();
  const el = $('marketTabGrid');
  const btn = $('marketTabRefreshBtn');
  if (refresh && btn) { btn.disabled = true; btn.textContent = '↻ Refreshing…'; }
  if (el && !refresh) el.innerHTML = '<div class="dash-loading">Loading…</div>';
  try {
    const res  = await fetch(`${API_BASE}/market/${tab}${refresh ? '?refresh=1' : ''}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    const chainLabel = json.chain || 'robinhood';
    if ($('marketTabSub')) $('marketTabSub').textContent = chainLabel.charAt(0).toUpperCase() + chainLabel.slice(1) + ' Chain';
    if ($('marketTabUpdated')) $('marketTabUpdated').textContent = json.lastUpdated ? `Updated ${_relTime(json.lastUpdated)}` : '';
    renderMarketTabList(json.data || []);
  } catch (e) {
    if (el) el.innerHTML = '<div class="dash-loading" style="color:var(--accent-red)">Failed to load data</div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Refresh'; }
  }
}

function refreshMarketTab() {
  playRefreshSound();
  fetchMarketTab(_marketTab, { refresh: true });
}

function _relTime(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function _initMarketTabBar() {
  if (_marketTabBarInit) return;
  _marketTabBarInit = true;
  const bar = $('marketTabBar');
  if (!bar) return;
  bar.querySelectorAll('.dash-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === _marketTab) return;
      bar.querySelectorAll('.dash-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      fetchMarketTab(btn.dataset.tab);
    });
  });
}

// Chain Volumes, Chain Transactions, and the one-line summary sentence all
// need the SAME two endpoints — without this they'd each fire their own
// fetch, doubling every request to /chain-volumes and /chain-transactions
// on every Market Overview load for no reason (both are already server-side
// cached for minutes, so the duplicate calls buy nothing but extra load).
let _chainOverviewCache = { volumes: null, tx: null, at: 0 };
let _chainOverviewInFlight = null; // dedupes concurrent callers (all 3 loaders fire in the same tick)
const CHAIN_OVERVIEW_CLIENT_TTL_MS = 30000;

async function _getChainOverviewData() {
  if (_chainOverviewCache.volumes && Date.now() - _chainOverviewCache.at < CHAIN_OVERVIEW_CLIENT_TTL_MS) {
    return _chainOverviewCache;
  }
  if (_chainOverviewInFlight) return _chainOverviewInFlight;

  _chainOverviewInFlight = (async () => {
    const [volumes, tx] = await Promise.all([
      fetch(`${API_BASE}/chain-volumes`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/chain-transactions`).then(r => r.json()).catch(() => null),
    ]);
    _chainOverviewCache = { volumes, tx, at: Date.now() };
    _chainOverviewInFlight = null;
    return _chainOverviewCache;
  })();
  return _chainOverviewInFlight;
}

async function loadChainVolumes() {
  const el = $('chainVolumeGrid');
  if (!el) return;
  const LABELS = { ethereum: 'Ethereum', base: 'Base', robinhood: 'Robinhood' };
  try {
    const { volumes: json } = await _getChainOverviewData();
    if (!json || !json.success) throw new Error(json?.error || 'Failed');
    const keys = Object.keys(json.data || {});
    if (!keys.length) { el.innerHTML = '<div class="dash-loading">No chain volume data available</div>'; return; }
    el.innerHTML = keys.map(key => {
      const c = json.data[key];
      const label = LABELS[key] || key;
      const vol = dashFmtVol(c.volume24h);
      const chg = typeof c.change24h === 'number'
        ? `<span style="color:${c.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};font-size:11px;font-weight:700">${c.change24h >= 0 ? '+' : ''}${c.change24h.toFixed(2)}%</span>`
        : '';
      const dot = CHAIN_COLOR[key] || '#8b92a8';
      return `
        <div class="dash-mini-card" style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px">
          <span style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.5px;display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:${dot};flex-shrink:0"></span>${label.toUpperCase()}</span>
          <span style="font-size:20px;font-weight:800;color:var(--text-primary)">${vol}</span>
          ${chg}
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div class="dash-loading" style="color:var(--accent-red)">Failed to load chain volume</div>`;
  }
}

async function loadChainTransactions() {
  const el = $('chainTxGrid');
  if (!el) return;
  const LABELS = { ethereum: 'Ethereum', base: 'Base', robinhood: 'Robinhood' };
  try {
    const { tx: json } = await _getChainOverviewData();
    if (!json || !json.success) throw new Error(json?.error || 'Failed');
    const keys = Object.keys(json.data || {});
    if (!keys.length) { el.innerHTML = '<div class="dash-loading">No chain transaction data available</div>'; return; }
    el.innerHTML = keys.map(key => {
      const c = json.data[key];
      const label = LABELS[key] || key;
      const gas = c.gasPriceGwei;
      const gasLine = gas
        ? `<span style="font-size:10px;color:var(--accent-green)">⛽ ${gas.average != null ? gas.average.toFixed(gas.average < 1 ? 3 : 2) : '—'} Gwei <span style="color:var(--text-muted)">(avg)</span></span>`
        : '';
      const dot = CHAIN_COLOR[key] || '#8b92a8';
      return `
        <div class="dash-mini-card" style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px">
          <span style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.5px;display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:${dot};flex-shrink:0"></span>${label.toUpperCase()}</span>
          <span style="font-size:20px;font-weight:800;color:var(--text-primary)">${(c.transactionsToday || 0).toLocaleString('en-US')}</span>
          <span style="font-size:10px;color:var(--text-muted)">${(c.totalTransactions || 0).toLocaleString('en-US')} all-time</span>
          ${gasLine}
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div class="dash-loading" style="color:var(--accent-red)">Failed to load chain transactions</div>`;
  }
}

// A Bloombark version of GeckoTerminal's own summary line (e.g. "The number
// of transactions in the last 24 hours on Robinhood is 2.83M with a trading
// volume of $347.54M, a -5.74% change as compared to yesterday.") — built
// from our own two sources (Blockscout tx count + DefiLlama volume) rather
// than GeckoTerminal's private/undocumented API.
async function loadChainSummary() {
  const el = $('chainSummaryText');
  if (!el) return;
  const LABELS = { ethereum: 'Ethereum', base: 'Base', robinhood: 'Robinhood' };
  try {
    const { volumes: volRes, tx: txRes } = await _getChainOverviewData();
    if (!txRes) { el.innerHTML = ''; return; }
    const chains = Object.keys(txRes.data || {});
    if (!chains.length) { el.innerHTML = ''; return; }
    el.innerHTML = chains.map(key => {
      const tx    = txRes.data[key];
      const vol   = volRes.data?.[key];
      const label = LABELS[key] || key;
      const txCount = (tx.transactionsToday || 0).toLocaleString('en-US');
      const volStr  = vol ? dashFmtVol(vol.volume24h) : 'N/A';
      const chgStr  = vol && typeof vol.change24h === 'number'
        ? ` in trading volume, a <b style="color:${vol.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${vol.change24h >= 0 ? '+' : ''}${vol.change24h.toFixed(2)}%</b> ${vol.change24h >= 0 ? 'increase' : 'decline'} from the previous day`
        : '';
      return `<div>During the last 24 hours, <b style="color:var(--text-primary)">${label}</b> handled <b style="color:var(--text-primary)">${txCount}</b> transactions, totaling <b style="color:var(--text-primary)">${volStr}</b>${chgStr}.</div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '';
  }
}

async function loadDashboard() {
  _initMarketTabBar();
  loadChainVolumes();
  loadChainTransactions();
  loadChainSummary();
  await fetchMarketTab(_marketTab);
}

/* ─── Privy Wallet Connect ─────────────────────────────────────────────────── */
let _privyUser = null;
let _watchlist = new Set(); // set of lowercase token addresses in watchlist
let _currentTokenData = null; // last scanned token data

function openWalletModal() {
  const modal = document.getElementById('walletModal');
  if (!modal) return;
  if (_privyUser) {
    // Already connected — show profile (view only) + disconnect
    const addr = _privyUser._displayAddress || _privyUser.wallet?.address || _privyUser.linked_accounts?.find(a => a.type === 'wallet')?.address || _privyUser.email?.address || _privyUser.linked_accounts?.find(a => a.type === 'email')?.address || '';
    const displayName = _userProfile?.displayName || _chatName || '';
    const avatarSrc = _userProfile?.avatar || blockieDataUrl(addr || displayName || 'anon');
    const avatarHtml = `<div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid var(--green-55);margin:0 auto 10px"><img src="${avatarSrc}" style="width:100%;height:100%;object-fit:cover"></div>`;
    const nameHtml = displayName
      ? `<div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px">${displayName}</div>`
      : '';
    document.getElementById('walletModalBody').innerHTML = `
      <div style="text-align:center;padding:10px 0 16px">
        ${avatarHtml}
        ${nameHtml}
        <div style="display:inline-flex;align-items:center;gap:5px;background:var(--green-15);border:1px solid var(--green-30);border-radius:20px;padding:3px 12px;margin-bottom:10px">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-green);display:inline-block;flex-shrink:0"></span>
          <span style="font-size:10px;color:var(--accent-green);font-weight:600">CONNECTED</span>
        </div>
        <div style="background:var(--green-10);border:1px solid var(--green-30);border-radius:10px;padding:8px 12px;text-align:center">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent-green);margin-right:6px;vertical-align:middle;flex-shrink:0"></span><span style="font-size:10px;font-family:monospace;color:var(--accent-green);font-weight:600;word-break:break-all;line-height:1.6">${addr}</span>
        </div>
      </div>
      <div style="padding:0 0 10px">
        <button onclick="navigator.clipboard.writeText('${addr}').then(()=>showToast('Wallet address copied!'))" style="width:100%;background:#1e2235;border:1px solid #2d3748;border-radius:10px;color:#e2e8f0;font-size:12px;font-weight:700;padding:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.5px;margin-bottom:8px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Address
        </button>
        <button onclick="privyLogout()" style="width:100%;background:var(--red-12);border:1px solid var(--red-44);border-radius:10px;padding:10px;cursor:pointer;color:#ff6b6b;font-size:12px;font-weight:700;letter-spacing:0.5px">DISCONNECT</button>
      </div>
      <div style="text-align:center;font-size:10px;color:#4b5563">EVM wallets · MetaMask</div>`;
  } else {
    // Mobile browser with no injected wallet → offer the MetaMask app hand-off
    // instead of an extension button that can never find window.ethereum there.
    const needsAppHandoff = _isMobileDevice() && !window.ethereum;
    const subtitle = needsAppHandoff
      ? 'Open in the MetaMask app'
      : (_isInMetaMaskApp() ? 'Connected via MetaMask app browser' : 'Browser extension wallet');
    document.getElementById('walletModalBody').innerHTML = `
      <button id="mmBtn" onclick="privyConnectMM()" style="width:100%;display:flex;align-items:center;gap:12px;background:#13161d;border:1px solid #2d3144;border-radius:10px;padding:14px 16px;cursor:pointer;margin-bottom:10px;transition:border-color 0.15s">
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="28" height="28"/>
        <div style="text-align:left">
          <div style="font-size:12px;font-weight:700;color:#e2e8f0;font-family:monospace">MetaMask</div>
          <div style="font-size:10px;color:#8b92a8">${subtitle}</div>
        </div>
      </button>
      ${needsAppHandoff ? `<div style="text-align:center;font-size:10px;color:#6b7280;padding:0 4px 10px">Tap above to continue in the MetaMask app — it'll reopen this page inside its browser so you can connect.</div>` : ''}
      <div style="text-align:center;font-size:10px;color:#8b92a8;padding-top:10px">EVM wallets · MetaMask</div>`;
  }
  modal.style.display = 'flex';
}

function closeWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) modal.style.display = 'none';
}

// Close modal on backdrop click
document.getElementById('walletModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeWalletModal();
});

function _setWalletConnected(user) {
  _privyUser = user;
  // Expose wallet for chat (and clear it on disconnect — was previously left stale)
  const prevWallet = window._privyWallet;
  if (user) {
    window._privyWallet = user._displayAddress || user.wallet?.address
      || user.linked_accounts?.find(a => a.type === 'wallet')?.address || null;
  } else {
    window._privyWallet = null;
  }
  // Chat identity (username) is cached per-wallet. When the wallet changes —
  // including disconnect, or connecting a DIFFERENT wallet on the same device —
  // load THAT wallet's own cached name (or none), so we neither keep the old
  // wallet's name nor wipe the current wallet's name on a page refresh.
  const newWallet = window._privyWallet;
  if ((newWallet || null) !== (prevWallet || null)) {
    if (newWallet) _loadChatIdentityForWallet(newWallet);
    else { _chatName = null; _chatNameEdits = 0; _userProfile = null; }
  }
  if (user) setTimeout(_loadWatchlist, 200);
  else { _watchlist = new Set(); if (_currentTokenData?.address) _updateWatchlistBtn(_currentTokenData.address); }
  const btn   = document.getElementById('connectWalletBtn');
  const label = document.getElementById('connectWalletLabel');
  if (btn && label) {
    if (user) {
      const display = user._displayAddress
        || user.wallet?.address
        || user.linked_accounts?.find(a => a.type === 'wallet')?.address
        || '';
      const email = user.email?.address || user.linked_accounts?.find(a => a.type === 'email')?.address || '';
      const short = display ? display.slice(0,6)+'…'+display.slice(-4) : email ? email.split('@')[0]+'@…' : 'Connected';
      label.textContent = short;
      btn.classList.add('connected');
    } else {
      label.textContent = 'Connect Wallet';
      btn.classList.remove('connected');
    }
  }
  _updateSidebarProfile(user);
  // Sync trade panel wallet status
  if (typeof _tradeWalletStatus === 'function') {
    _tradeWalletStatus();
    if (_tradeToken) _loadPayBalance();
    _holdingsLoaded = false;
    if (document.getElementById('page-trade')?.classList.contains('active')) tradeLoadHoldings(true);
  }
  // Re-check community token-gates for the new/cleared wallet
  if (typeof checkChatGates === 'function') checkChatGates();
  // Hide/show the username section in the profile popup to match wallet state
  if (typeof _chatNameRenderState === 'function') _chatNameRenderState();
  // If the chat socket is already open, re-join under the new identity so the
  // server's user map + online list reflect the current wallet (it re-loads the
  // saved display name from that wallet's profile).
  if ((newWallet || null) !== (prevWallet || null)) _rejoinChatWithCurrentIdentity();
}

// Per-wallet localStorage keys for the cached username + edit count.
function _chatNameKey(w)  { return 'bloomChatName:'      + String(w || '').toLowerCase(); }
function _chatEditsKey(w) { return 'bloomChatNameEdits:' + String(w || '').toLowerCase(); }

// Load the cached chat identity for a specific wallet (or clear it if that
// wallet has none saved). Server profile fetch (loadUserProfile) may still
// refine _chatName afterwards.
function _loadChatIdentityForWallet(wallet) {
  _userProfile = null;
  try {
    _chatName      = localStorage.getItem(_chatNameKey(wallet)) || null;
    _chatNameEdits = parseInt(localStorage.getItem(_chatEditsKey(wallet)) || '0', 10);
  } catch (_) { _chatName = null; _chatNameEdits = 0; }
}

// Re-announce ourselves on the live chat socket (server derives the name from
// the new wallet's saved profile).
function _rejoinChatWithCurrentIdentity() {
  if (!_chatWs || _chatWs.readyState !== WebSocket.OPEN) return;
  _chatWs.send(JSON.stringify({
    type: 'chat_join',
    wallet: window._privyWallet || null,
    displayName: _chatName || null,
    avatar: _userProfile?.avatar || null,
  }));
}

// ── Cached profile for current wallet ────────────────────────────────────────
let _userProfile = null; // { displayName, avatar }

function _setAvatarEl(el, avatar, seed) {
  if (!el) return;
  const src = avatar || (seed ? blockieDataUrl(seed) : null);
  el.innerHTML = src
    ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : 'P';
}

function _updateSidebarUsername() {
  const el = document.getElementById('sidebarUsername');
  const badgeEl = document.getElementById('sidebarBadge');
  const avatarEl = document.getElementById('sidebarAvatar');
  if (avatarEl) {
    // Same ring convention as the chat message avatars: gold for admin, cyan
    // (diamond) for holder — takes priority over admin if somehow both.
    // The pulsing glow itself is driven by the CSS animation classes (the
    // animation keyframes own box-shadow, so only a static outline is set
    // inline here to keep the ring visible between pulse cycles).
    const isAdmin = window._privyWallet && _alertsIsAdmin;
    const isHolder = window._privyWallet && _myIsHolder;
    avatarEl.classList.remove('avatar-ring-admin', 'avatar-ring-holder');
    if (isAdmin) {
      avatarEl.style.boxShadow = '0 0 0 2px #f5a623';
      avatarEl.classList.add('avatar-ring-admin');
    } else if (isHolder) {
      avatarEl.style.boxShadow = '0 0 0 2px #6ec6ff';
      avatarEl.classList.add('avatar-ring-holder');
    } else {
      avatarEl.style.boxShadow = 'none';
    }
  }
  if (!el) return;
  const name = _userProfile?.displayName || _chatName || '';
  if (name && window._privyWallet) {
    el.textContent = name;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
  if (badgeEl) {
    // Same badge convention as chat messages: 👑 admin (orange), 💎 holder (blue).
    if (name && window._privyWallet && _alertsIsAdmin) {
      badgeEl.innerHTML = '👑 ADMIN';
      badgeEl.style.color = '#f5a623';
      badgeEl.style.display = '';
    } else if (name && window._privyWallet && _myIsHolder) {
      badgeEl.innerHTML = '💎 HOLDER';
      badgeEl.style.color = '#6ec6ff';
      badgeEl.style.display = '';
    } else {
      badgeEl.style.display = 'none';
    }
  }
}

function _applyProfile(profile) {
  _userProfile = profile;
  const seed = window._privyWallet || null;
  // Profile popup avatar
  const popupAvatar = document.getElementById('popupAvatar');
  _setAvatarEl(popupAvatar, profile?.avatar, seed);
  // Sidebar avatar
  const avatarEl = document.getElementById('sidebarAvatar');
  _setAvatarEl(avatarEl, profile?.avatar, seed);
  // Wallet button top-right
  const walletBtnAvatar = document.getElementById('walletBtnAvatar');
  const walletBtnIcon   = document.getElementById('walletBtnIcon');
  const label = document.getElementById('connectWalletLabel');
  if (walletBtnAvatar && walletBtnIcon && label && window._privyWallet) {
    // Always show an avatar once connected — custom photo, else a blockie
    // generated from the wallet address (never the plain wallet-icon SVG).
    _setAvatarEl(walletBtnAvatar, profile?.avatar, seed);
    walletBtnAvatar.style.display = 'flex';
    walletBtnIcon.style.display   = 'none';
    if (profile?.displayName) label.textContent = profile.displayName;
  }
  // Pre-fill chat name input — adopt the wallet's saved server name if we don't
  // have a local one yet, and cache it under this wallet's key.
  const inp = document.getElementById('chatNameInput');
  if (profile?.displayName && !_chatName) {
    _chatName = profile.displayName;
    const w = window._privyWallet;
    if (w) { try { localStorage.setItem(_chatNameKey(w), _chatName); } catch (_) {} }
  }
  _updateSidebarUsername();
}

async function loadUserProfile(wallet) {
  if (!wallet) return;
  try {
    const r = await fetch(`${API_BASE}/profile/${encodeURIComponent(wallet)}`);
    const d = await r.json();
    if (d.found) _applyProfile({ displayName: d.displayName, avatar: d.avatar });
    else _applyProfile(null);
  } catch (_) {}
}

async function saveProfile() {
  const wallet = window._privyWallet;
  if (!wallet) return showToast('Connect wallet first');
  const name   = (document.getElementById('chatNameInput')?.value || '').trim();
  const avatar = _pendingProfileAvatar || _userProfile?.avatar || null;
  const body   = { wallet, displayName: name || _userProfile?.displayName || null, avatar };
  try {
    await fetch(`${API_BASE}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    _applyProfile({ displayName: body.displayName, avatar: body.avatar });
    _pendingProfileAvatar = null;
    _refreshMyMessages();
    const st = document.getElementById('profileAvatarStatus');
    if (st) st.textContent = 'Profile saved!';
    setTimeout(() => { if (st) st.textContent = 'Click to choose an avatar'; }, 2500);
  } catch (_) { showToast('Failed to save profile'); }
}

let _pendingProfileAvatar = null;

// ── Preset avatars (custom SVG, Robin-Hood/outlaw + crypto character set) ─────
// 20 hand-authored flat SVG characters drawn over a customizable colored circle.
// Pure inline SVG → identical on every device (no OS emoji fonts), tiny, and
// stored/rendered exactly like an uploaded photo (data URI in the avatar field).
const AVATAR_SVGS = [
  // 0 Hooded outlaw
  "<path d='M50 20c-16 0-27 13-27 30v22h12V53c0-9 6-16 15-16s15 7 15 16v19h12V50c0-17-11-30-27-30z' fill='#fff'/><path d='M38 49c0-7 5-12 12-12s12 5 12 12v4a12 14 0 0 1-24 0z' fill='rgba(0,0,0,.3)'/><circle cx='45' cy='50' r='2.3' fill='#fff'/><circle cx='55' cy='50' r='2.3' fill='#fff'/>",
  // 1 Fox
  "<path d='M25 33l12 5 13-3 13 3 12-5-2 14 4 7-9 13-18 6-18-6-9-13 4-7z' fill='#fff'/><path d='M34 43l8 4 8-2 8 2 8-4-2 9-14 8-14-8z' fill='rgba(0,0,0,.16)'/><circle cx='43' cy='50' r='2.5' fill='#111'/><circle cx='57' cy='50' r='2.5' fill='#111'/><path d='M47 59h6l-3 4z' fill='#111'/>",
  // 2 Feather cap (Robin Hood hat)
  "<circle cx='50' cy='58' r='19' fill='#fff'/><circle cx='43' cy='57' r='2.3' fill='#111'/><circle cx='57' cy='57' r='2.3' fill='#111'/><path d='M44 64q6 5 12 0' stroke='#111' stroke-width='2' fill='none' stroke-linecap='round'/><path d='M27 45c3-10 12-17 23-17s20 7 23 17z' fill='rgba(0,0,0,.28)'/><path d='M73 29c-10 1-16 7-19 14l21 1z' fill='#fff'/>",
  // 3 Bandit mask
  "<circle cx='50' cy='52' r='22' fill='#fff'/><path d='M28 45h44v8a22 22 0 0 1-44 0z' fill='rgba(0,0,0,.32)'/><circle cx='42' cy='50' r='3' fill='#fff'/><circle cx='58' cy='50' r='3' fill='#fff'/><path d='M44 62q6 4 12 0' stroke='#111' stroke-width='2' fill='none' stroke-linecap='round'/>",
  // 4 Robot
  "<rect x='30' y='34' width='40' height='36' rx='9' fill='#fff'/><rect x='38' y='44' width='10' height='10' rx='3' fill='#111'/><rect x='52' y='44' width='10' height='10' rx='3' fill='#111'/><rect x='40' y='60' width='20' height='4' rx='2' fill='#111'/><rect x='47' y='24' width='6' height='9' rx='2' fill='#fff'/><circle cx='50' cy='22' r='4' fill='#fff'/>",
  // 5 Ninja
  "<circle cx='50' cy='50' r='22' fill='#fff'/><path d='M28 44a22 22 0 0 1 44 0v3H28z' fill='rgba(0,0,0,.3)'/><path d='M28 56h44a22 22 0 0 1-44 0z' fill='rgba(0,0,0,.3)'/><rect x='37' y='47' width='26' height='8' rx='4' fill='#fff'/><circle cx='44' cy='51' r='2' fill='#111'/><circle cx='56' cy='51' r='2' fill='#111'/>",
  // 6 Knight helm
  "<path d='M35 30h30a5 5 0 0 1 5 5v25a20 20 0 0 1-40 0V35a5 5 0 0 1 5-5z' fill='#fff'/><rect x='46' y='38' width='8' height='27' rx='4' fill='#111'/><path d='M50 20c-3 0-4 4-4 9h8c0-5-1-9-4-9z' fill='#f5a623'/>",
  // 7 Wizard
  "<circle cx='50' cy='59' r='15' fill='#fff'/><circle cx='45' cy='57' r='2' fill='#111'/><circle cx='55' cy='57' r='2' fill='#111'/><path d='M50 20l15 27H35z' fill='#fff'/><path d='M50 30l2 5 5 1-4 4 1 5-4-3-4 3 1-5-4-4 5-1z' fill='#f5d76e'/>",
  // 8 Alien
  "<path d='M50 28c14 0 22 10 22 22 0 13-10 24-22 24S28 63 28 50c0-12 8-22 22-22z' fill='#fff'/><ellipse cx='42' cy='50' rx='4' ry='7' fill='#111' transform='rotate(-18 42 50)'/><ellipse cx='58' cy='50' rx='4' ry='7' fill='#111' transform='rotate(18 58 50)'/>",
  // 9 Skull
  "<path d='M50 26c-13 0-22 9-22 22 0 8 4 14 9 17v6a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4v-6c5-3 9-9 9-17 0-13-9-22-22-22z' fill='#fff'/><circle cx='42' cy='48' r='5' fill='#111'/><circle cx='58' cy='48' r='5' fill='#111'/><path d='M50 56l-3 7h6z' fill='#111'/><rect x='44' y='68' width='2.5' height='7' fill='#111'/><rect x='49' y='68' width='2.5' height='7' fill='#111'/><rect x='54' y='68' width='2.5' height='7' fill='#111'/>",
  // 10 Owl
  "<path d='M50 30c-14 0-24 10-24 24s10 20 24 20 24-6 24-20-10-24-24-24z' fill='#fff'/><circle cx='41' cy='48' r='8' fill='#111'/><circle cx='59' cy='48' r='8' fill='#111'/><circle cx='41' cy='48' r='3' fill='#fff'/><circle cx='59' cy='48' r='3' fill='#fff'/><path d='M50 55l-4 6h8z' fill='#f5a623'/><path d='M29 31l9 8-11 2z' fill='#fff'/><path d='M71 31l-9 8 11 2z' fill='#fff'/>",
  // 11 Wolf
  "<path d='M30 34l6 10 14-3 14 3 6-10 2 16-6 6 4 8-20 8-20-8 4-8-6-6z' fill='#fff'/><circle cx='43' cy='49' r='2.4' fill='#111'/><circle cx='57' cy='49' r='2.4' fill='#111'/><path d='M46 58h8l-4 5z' fill='#111'/>",
  // 12 King crown
  "<path d='M32 30l6 13 12-15 12 15 6-13 3 22H29z' fill='#f5d76e'/><circle cx='50' cy='61' r='13' fill='#fff'/><circle cx='45' cy='60' r='2' fill='#111'/><circle cx='55' cy='60' r='2' fill='#111'/>",
  // 13 Cat
  "<path d='M32 34l6 12h24l6-12 2 18-6 6 3 6-17 8-17-8 3-6-6-6z' fill='#fff'/><path d='M40 49q4 4 8 0M52 49q4 4 8 0' stroke='#111' stroke-width='2' fill='none' stroke-linecap='round'/><path d='M48 58h4l-2 3z' fill='#f5a623'/><path d='M28 55h10M62 55h10' stroke='#fff' stroke-width='1.6'/>",
  // 14 Astronaut
  "<circle cx='50' cy='50' r='22' fill='#fff'/><path d='M35 45a17 17 0 0 1 30 0v8a17 17 0 0 1-30 0z' fill='#111'/><path d='M40 46a10 10 0 0 1 13 0z' fill='rgba(255,255,255,.45)'/>",
  // 15 Ghost
  "<path d='M30 50a20 20 0 0 1 40 0v22l-6-5-7 5-7-5-7 5-6-5z' fill='#fff'/><circle cx='43' cy='48' r='3.5' fill='#111'/><circle cx='57' cy='48' r='3.5' fill='#111'/>",
  // 16 Dragon
  "<path d='M32 38l4 8 14-4 14 4 4-8 2 14-6 8 4 8-18 6-18-6 4-8-6-8z' fill='#fff'/><path d='M37 29l4 11-9-2zM63 29l-4 11 9-2z' fill='var(--accent-green)'/><circle cx='44' cy='49' r='2.4' fill='#111'/><circle cx='56' cy='49' r='2.4' fill='#111'/><path d='M42 60h16l-3 4h-10z' fill='#111'/>",
  // 17 Eagle
  "<circle cx='50' cy='52' r='20' fill='#fff'/><circle cx='43' cy='48' r='3' fill='#111'/><circle cx='57' cy='48' r='3' fill='#111'/><path d='M44 55h12l-6 9z' fill='#f5a623'/><path d='M50 28c-4 0-6 4-6 8h12c0-4-2-8-6-8z' fill='#fff'/>",
  // 18 Diamond
  "<path d='M35 40h30l10 12-25 26-25-26z' fill='#fff'/><path d='M35 40l7 12h16l7-12M25 52h50M42 52l8 26M58 52l-8 26' stroke='rgba(0,0,0,.22)' stroke-width='2' fill='none'/>",
  // 19 Rocket
  "<path d='M50 24c8 6 12 16 12 28l-4 10H42l-4-10c0-12 4-22 12-28z' fill='#fff'/><circle cx='50' cy='44' r='5' fill='#111'/><path d='M42 58l-8 8 8-2zM58 58l8 8-8-2z' fill='#fff'/><path d='M45 68h10l-5 10z' fill='#f5a623'/>",
];
const AVATAR_BG_COLORS = ['var(--accent-green)','#4a90e2','#f5a623','#ff6b8a','#9b59b6','#e86c3a','#00b8d9','var(--accent-red)','#2ecc71','#34495e','#e84393','#1abc9c'];
let _avatarPickIdx   = 0;
let _avatarPickColor = AVATAR_BG_COLORS[0];

function buildSvgAvatar(idx, bgColor) {
  const inner = AVATAR_SVGS[idx] || AVATAR_SVGS[0];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='${bgColor}'/>${inner}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// Curated Robinhood-themed mascot avatars — served as static compressed JPEGs
// (~10KB each) rather than embedding image bytes in the DB. The `avatar`
// column just stores this short path string, same as it stores a data: URI
// for the SVG picker above, but far lighter.
const AVATAR_IMAGES = Array.from({ length: 20 }, (_, i) => `/assets/avatars/avatar-${String(i + 1).padStart(2, '0')}.jpg`);

window.profileAvatarClick = function() {
  if (!window._privyWallet) { showToast('Connect your wallet first'); return; }
  openAvatarPicker();
};

function _renderAvatarPickerBody() {
  const preview = document.getElementById('avatarPickPreview');
  const src = AVATAR_IMAGES[_avatarPickIdx] || AVATAR_IMAGES[0];
  if (preview) preview.style.backgroundImage = `url("${src}")`;
  document.querySelectorAll('#avatarPickerModal .ap-avatar').forEach(b => {
    const i = parseInt(b.dataset.idx);
    b.style.borderColor = i === _avatarPickIdx ? 'var(--accent-green)' : '#2d3748';
  });
}

window.openAvatarPicker = function() {
  if (!window._privyWallet) { showToast('Connect your wallet first'); return; }
  const existing = document.getElementById('avatarPickerModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'avatarPickerModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(3px);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `
    <div style="background:#161822;border:1px solid #1e2235;border-radius:16px;padding:22px 20px;width:340px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <span style="font-size:13px;font-weight:800;letter-spacing:1px;color:#e2e8f0">CHOOSE AVATAR</span>
        <button onclick="document.getElementById('avatarPickerModal').remove()" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:16px;line-height:1">✕</button>
      </div>
      <div id="avatarPickPreview" style="width:80px;height:80px;border-radius:50%;margin:0 auto 16px;background-size:cover;background-position:center;border:2px solid var(--green-55)"></div>
      <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#6b7280;margin-bottom:8px">CHARACTER</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:20px">
        ${AVATAR_IMAGES.map((src, i) => `<button class="ap-avatar" data-idx="${i}" style="aspect-ratio:1;border:2px solid #2d3748;border-radius:10px;background-image:url('${src}');background-size:cover;background-position:center;cursor:pointer"></button>`).join('')}
      </div>
      <button id="avatarPickSave" style="width:100%;background:var(--accent-green);border:none;border-radius:10px;color:#000;font-size:12px;font-weight:800;padding:11px;cursor:pointer;letter-spacing:0.5px">Save Avatar</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.ap-avatar').forEach(b => b.onclick = () => { _avatarPickIdx = parseInt(b.dataset.idx); _renderAvatarPickerBody(); });
  overlay.querySelector('#avatarPickSave').onclick = () => {
    _pendingProfileAvatar = AVATAR_IMAGES[_avatarPickIdx] || AVATAR_IMAGES[0];
    _setAvatarEl(document.getElementById('popupAvatar'), _pendingProfileAvatar, null);
    const st = document.getElementById('profileAvatarStatus');
    if (st) st.textContent = 'Saving…';
    saveProfile();
    overlay.remove();
  };
  _renderAvatarPickerBody();
};

function _setAvatarEditEnabled(enabled) {
  const wrap = document.getElementById('profileAvatarWrap');
  const dot  = document.getElementById('profileAvatarEditDot');
  const st   = document.getElementById('profileAvatarStatus');
  if (wrap) { wrap.style.cursor = enabled ? 'pointer' : 'not-allowed'; wrap.style.opacity = enabled ? '1' : '0.5'; }
  if (dot)  dot.style.display = enabled ? 'flex' : 'none';
  if (st)   st.textContent = enabled ? 'Click to choose an avatar' : 'Connect wallet to choose an avatar';
}

function _updateSidebarProfile(user) {
  const walletEl  = document.getElementById('sidebarWallet');
  const popupFull = document.getElementById('popupWalletFull');
  const statusDot  = document.getElementById('popupStatusDot');
  const statusText = document.getElementById('popupStatusText');
  const statusBadge = document.getElementById('popupStatusBadge');
  const walletBox   = document.getElementById('popupWalletBox');
  if (!walletEl) return;
  if (user) {
    const addr = user._displayAddress
      || user.wallet?.address
      || user.linked_accounts?.find(a => a.type === 'wallet')?.address
      || '';
    const email = user.email?.address || user.linked_accounts?.find(a => a.type === 'email')?.address || '';
    const display = addr || email || '';
    const short = display ? (addr ? addr.slice(0,6)+'…'+addr.slice(-4) : email) : 'Connected';
    walletEl.textContent = short;
    const popupAvatar = document.getElementById('popupAvatar');
    _setAvatarEl(popupAvatar, _userProfile?.avatar, display);
    const avatarEl = document.getElementById('sidebarAvatar');
    _setAvatarEl(avatarEl, _userProfile?.avatar, display);
    // Show the wallet-button avatar immediately too (don't wait on the async
    // profile fetch below) — same blockie fallback as everywhere else.
    const walletBtnAvatar = document.getElementById('walletBtnAvatar');
    const walletBtnIcon   = document.getElementById('walletBtnIcon');
    if (walletBtnAvatar && walletBtnIcon) {
      _setAvatarEl(walletBtnAvatar, _userProfile?.avatar, display);
      walletBtnAvatar.style.display = 'flex';
      walletBtnIcon.style.display   = 'none';
    }
    if (popupFull) popupFull.textContent = display || '—';
    if (statusText)  statusText.textContent = 'CONNECTED';
    if (statusDot)   statusDot.style.background = 'var(--accent-green)';
    if (statusBadge) { statusBadge.style.background = 'var(--green-15)'; statusBadge.style.borderColor = 'var(--green-30)'; statusText.style.color = 'var(--accent-green)'; }
    if (walletBox)   walletBox.style.display = '';
    _setAvatarEditEnabled(true);
    _updateSidebarUsername();
    // Load profile from server
    loadUserProfile(window._privyWallet);
    _checkAlertsAdmin();
  } else {
    _alertsIsAdmin = null;
    _myIsHolder = null;
    walletEl.textContent = 'Not connected';
    _updateSidebarUsername();
    const avatarEl = document.getElementById('sidebarAvatar');
    if (avatarEl) avatarEl.innerHTML = 'P';
    const popupAvatar = document.getElementById('popupAvatar');
    if (popupAvatar) popupAvatar.innerHTML = 'P';
    if (popupFull) popupFull.textContent = '—';
    if (statusText)  statusText.textContent = 'NOT CONNECTED';
    if (statusDot)   statusDot.style.background = '#6b7280';
    if (statusBadge) { statusBadge.style.background = '#6b728015'; statusBadge.style.borderColor = '#6b728030'; statusText.style.color = '#8b92a8'; }
    if (walletBox)   walletBox.style.display = 'none';
    _setAvatarEditEnabled(false);
    _userProfile = null;
    // Reset wallet button
    const walletBtnAvatar = document.getElementById('walletBtnAvatar');
    const walletBtnIcon   = document.getElementById('walletBtnIcon');
    if (walletBtnAvatar) walletBtnAvatar.style.display = 'none';
    if (walletBtnIcon)   walletBtnIcon.style.display   = '';
  }
}

window.toggleProfilePopup = () => {
  const popup   = document.getElementById('profilePopup');
  const overlay = document.getElementById('profileModalOverlay');
  if (!popup) return;
  const open = popup.style.display === 'none';
  popup.style.display   = open ? 'block' : 'none';
  if (overlay) overlay.style.display = open ? 'block' : 'none';
  if (open) {
    const inp = document.getElementById('chatNameInput');
    if (inp) { inp.value = ''; inp.placeholder = _chatName || 'Set your chat name…'; }
    _setAvatarEditEnabled(!!window._privyWallet);
    _chatNameRenderState();
  } else {
    // Closing the popup without saving cancels a pending Community entry —
    // the user stays on the page they were bounced back to.
    _pendingCommunityEntry = false;
  }
};
window.__profileCopy = () => {
  const addr = document.getElementById('popupWalletFull')?.textContent;
  if (!addr || addr === '—') return showToast('No wallet connected');
  navigator.clipboard.writeText(addr).then(() => showToast('Wallet address copied!'));
};
window.__profileDisconnect = async () => {
  document.getElementById('profilePopup').style.display = 'none';
  await privyLogout();
};

/* ─── Watchlist helpers ───────────────────────────────────────────────────── */
function _authHeaders() {
  const t = localStorage.getItem('bb_jwt');
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// The AI Analyzer alert bell only becomes usable once the token is actually
// saved to the watchlist (mirrors how alerts work everywhere else in the
// app — always attached to a watchlist entry). Its look matches the bell
// used in the Watchlist rows exactly: outline + muted grey when there's no
// alert yet, filled + green once one is actually set (not just "settable").
function _setAnalyzerAlertBtnState(enabled, hasAlert = false) {
  const btn  = $('analyzerAlertBtn');
  const bell = $('analyzerAlertBell');
  if (!btn || !bell) return;
  btn.disabled = !enabled;
  btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  btn.style.opacity = !enabled ? '0.25' : (hasAlert ? '1' : '0.7');
  btn.title = !enabled ? 'Save to watchlist first to set an alert' : (hasAlert ? 'Alert set — click to edit' : 'Set alert');
  bell.setAttribute('stroke', hasAlert ? 'var(--accent-green)' : (enabled ? '#8b92a8' : '#8b92a8'));
  bell.setAttribute('fill', hasAlert ? 'var(--accent-green)' : 'none');
}

async function _refreshAnalyzerAlertBtn(address, inWatchlist) {
  if (!inWatchlist) { _setAnalyzerAlertBtnState(false, false); return; }
  let hasAlert = false;
  if (localStorage.getItem('bb_jwt')) {
    try {
      const res = await fetch(`${API_BASE}/alerts`, { credentials: 'include', headers: _authHeaders() });
      if (res.ok) {
        const { items } = await res.json();
        hasAlert = !!items?.some(a => a.address.toLowerCase() === address.toLowerCase());
      }
    } catch(_) {}
  }
  _setAnalyzerAlertBtnState(true, hasAlert);
}

async function _updateWatchlistBtn(address) {
  const btn   = $('watchlistBtn');
  const heart = $('watchlistHeart');
  if (!btn || !heart || !address) return;
  const addr = address.toLowerCase();
  // First render from memory, then confirm from DB
  const memInList = _watchlist.has(addr);
  heart.setAttribute('fill', memInList ? '#ff6b8a' : 'none');
  btn.style.opacity = memInList ? '1' : '0.6';
  btn.title = memInList ? 'Remove from watchlist' : 'Add to watchlist';
  _refreshAnalyzerAlertBtn(addr, memInList);
  // Always confirm from DB if logged in
  if (!localStorage.getItem('bb_jwt')) return;
  try {
    const res = await fetch(`${API_BASE}/watchlist/check/${encodeURIComponent(addr)}`, { credentials: 'include', headers: _authHeaders() });
    if (!res.ok) return;
    const { inWatchlist } = await res.json();
    if (inWatchlist) _watchlist.add(addr); else _watchlist.delete(addr);
    heart.setAttribute('fill', inWatchlist ? '#ff6b8a' : 'none');
    btn.style.opacity = inWatchlist ? '1' : '0.6';
    btn.title = inWatchlist ? 'Remove from watchlist' : 'Add to watchlist';
    _refreshAnalyzerAlertBtn(addr, inWatchlist);
  } catch(_) {}
}

function openAnalyzerAlertModal() {
  const d = _currentTokenData;
  const addr = d?.address;
  if (!addr || !_watchlist.has(addr.toLowerCase())) {
    return showToast('Save this token to your watchlist first');
  }
  openAlertModal(addr, d.chain, d.symbol, d.name);
}

async function _loadWatchlist() {
  if (!_privyUser && !localStorage.getItem('bb_jwt')) return;
  try {
    const res = await fetch(`${API_BASE}/watchlist`, { credentials: 'include', headers: _authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    _watchlist = new Set((data.items || []).map(i => i.address.toLowerCase()));
    if (_currentTokenData?.address) _updateWatchlistBtn(_currentTokenData.address);
  } catch(_) {}
}

// Watchlist row — same market-stat fields/layout as Market Overview's
// dash-vol-row (price, 24h change, volume, mcap, liq, age, buys, sells),
// with a trailing actions column for the alert bell + remove-heart button.
function _watchRowHtml(t, i, hasAlert) {
  const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  const chg = t.priceChange24h || 0;
  const chgStr = (chg >= 0 ? '+' : '') + chg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const chgColor = chg >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const chainColor = CHAIN_COLOR[t.networkId] || '#8b92a8';
  const logo = dashLogoUrl(t);
  const initial = (t.name || '?').trim().charAt(0).toUpperCase();
  const addr = t.address || '';
  const symEsc = (t.symbol || '').replace(/'/g, "\\'");
  const nameEsc = (t.name || '').replace(/'/g, "\\'");
  const caLine = addr
    ? `<span class="dash-vol-ca" title="Copy contract address" onclick="event.stopPropagation();navigator.clipboard.writeText('${addr}').then(()=>showToast('Contract address copied'))">${addr}</span>`
    : '';
  return `<div class="dash-vol-row watch-vol-row" onclick="openInAnalyzer('${addr}','${t.networkId}')">
    <span class="dash-vol-rank ${rankClass}">${i+1}</span>
    <div class="dash-vol-token">
      <span class="dash-vol-logo" style="background:${chainColor}22;color:${chainColor}">${initial}${logo ? `<img src="${logo}" alt="" loading="lazy" onload="this.style.opacity=1" onerror="this.remove()">` : ''}</span>
      <div class="dash-vol-info">
        <span class="dash-vol-name">${t.name}</span>
        <span class="dash-vol-pair">
          <span class="dash-chain-badge" style="background:${chainColor}22;color:${chainColor}">${t.network}</span>
        </span>
        ${caLine}
      </div>
    </div>
    <span class="dash-vol-price">${dashFmtPrice(t.price)}</span>
    <span class="dash-vol-change" style="color:${chgColor}">${chgStr}</span>
    <span class="dash-vol-volume">${dashFmtVol(t.volume24h)}</span>
    <span class="dash-vol-liq">${dashFmtVol(t.fdv)}</span>
    <span class="dash-vol-liq">${dashFmtVol(t.liquidity)}</span>
    <span class="dash-vol-liq" style="color:var(--accent-blue)">${dashAge(t.createdAt) || '-'}</span>
    <span class="dash-vol-liq" style="color:var(--accent-green)">${(t.buys24h || 0).toLocaleString('en-US')}</span>
    <span class="dash-vol-liq" style="color:var(--accent-red)">${(t.sells24h || 0).toLocaleString('en-US')}</span>
    <span class="watch-vol-actions">
      <button onclick="event.stopPropagation();openAlertModal('${addr}','${t.chain||''}','${symEsc}','${nameEsc}')" title="${hasAlert ? 'Alert set — click to edit' : 'Set alert'}"
        style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center;color:${hasAlert ? 'var(--accent-green)' : 'var(--text-muted)'};opacity:${hasAlert ? '1' : '0.7'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${hasAlert ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>
      <button onclick="event.stopPropagation();removeFromWatchlist('${addr}')" title="Remove"
        style="background:none;border:none;cursor:pointer;padding:2px;color:#ff6b8a;font-size:14px;opacity:0.7">♥</button>
    </span>
  </div>`;
}

async function renderWatchlistPage() {
  const el = document.getElementById('watchlistContent');
  if (!el) return;
  if (!_privyUser && !localStorage.getItem('bb_jwt')) {
    el.innerHTML = `<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">
      <div style="font-size:28px;margin-bottom:12px">♡</div>
      Connect wallet to see your watchlist
      <br><button onclick="openWalletModal()" style="margin-top:16px;background:var(--accent-green);border:none;border-radius:8px;color:#000;padding:8px 20px;cursor:pointer;font-size:13px;font-weight:600">Connect Wallet</button>
    </div>`;
    return;
  }
  el.innerHTML = `<div style="text-align:center;padding:40px 0;color:#6b7280;font-size:13px">Loading…</div>`;
  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const [res, alertsRes] = await Promise.all([
      fetch(`${API_BASE}/watchlist`, { credentials: 'include', headers }),
      fetch(`${API_BASE}/alerts`, { credentials: 'include', headers }).catch(() => null),
    ]);
    const data = await res.json();
    const items = data.items || [];
    let alertAddrs = new Set();
    if (alertsRes) {
      try { alertAddrs = new Set((await alertsRes.json()).items?.map(a => a.address.toLowerCase()) || []); } catch(e) {}
    }
    if (items.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">
        <div style="font-size:28px;margin-bottom:12px">♡</div>
        No tokens in watchlist yet.<br>
        <span style="color:#9ca3af">Scan a token and click the ♡ to save it.</span>
      </div>`;
      return;
    }

    // Pull live market stats (price/volume/mcap/liq/age/buys/sells) per token
    // from DexScreener — same source used by Market Overview — so the fields
    // shown here match exactly.
    const rows = await Promise.all(items.map(async item => {
      const base = {
        address: item.address, chain: item.chain, networkId: item.chain,
        network: (item.chain || '').charAt(0).toUpperCase() + (item.chain || '').slice(1),
        name: item.name || item.symbol || 'Unknown', symbol: item.symbol || '',
        imageUrl: item.imageUrl || item.image_url,
        price: 0, priceChange24h: 0, volume24h: 0, fdv: 0, liquidity: 0, createdAt: null, buys24h: 0, sells24h: 0,
      };
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${item.address}`);
        const j = await r.json();
        const pairs = (j.pairs || []).filter(p => p.chainId === item.chain)
          .sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0));
        if (pairs.length) {
          const p = pairs[0];
          base.price = parseFloat(p.priceUsd || 0);
          base.priceChange24h = parseFloat(p.priceChange?.h24 || 0);
          base.volume24h = parseFloat(p.volume?.h24 || 0);
          base.fdv = parseFloat(p.fdv || p.marketCap || 0);
          base.liquidity = parseFloat(p.liquidity?.usd || 0);
          base.createdAt = p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : null;
          base.buys24h = p.txns?.h24?.buys || 0;
          base.sells24h = p.txns?.h24?.sells || 0;
        }
      } catch(e) {}
      return base;
    }));

    _watchlistRows = rows;
    _watchlistAlertAddrs = alertAddrs;
    _watchlistPage = 1;
    _renderWatchlistTable();
  } catch(e) {
    el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--accent-red);font-size:13px">Error loading watchlist</div>`;
  }
}

const WATCHLIST_PAGE_SIZE = 10;
let _watchlistRows = [];
let _watchlistAlertAddrs = new Set();
let _watchlistPage = 1;

function _renderWatchlistTable() {
  const el = document.getElementById('watchlistContent');
  if (!el) return;
  const rows = _watchlistRows;
  const totalPages = Math.max(1, Math.ceil(rows.length / WATCHLIST_PAGE_SIZE));
  if (_watchlistPage > totalPages) _watchlistPage = totalPages;
  const start = (_watchlistPage - 1) * WATCHLIST_PAGE_SIZE;
  const pageRows = rows.slice(start, start + WATCHLIST_PAGE_SIZE);

  el.innerHTML = `<div class="dash-vol-wrap"><div class="dash-volume-grid">` +
    `<div class="dash-vol-header watch-vol-header"><span>#</span><span style="padding-left:33px">TOKEN / PAIR</span><span style="text-align:right">PRICE</span>` +
    `<span style="text-align:right">24H CHANGE</span><span style="text-align:right">24H VOLUME</span>` +
    `<span style="text-align:right">MCAP</span><span style="text-align:right">LIQ</span>` +
    `<span style="text-align:right">AGE</span><span style="text-align:right">BUYS</span><span style="text-align:right">SELLS</span><span></span></div>` +
    pageRows.map((t, i) => _watchRowHtml(t, start + i, _watchlistAlertAddrs.has(t.address.toLowerCase()))).join('') +
    `</div></div>` +
    _watchlistPaginationHtml(totalPages);
}

function _watchlistPaginationHtml(totalPages) {
  if (totalPages <= 1) return '';
  const p = _watchlistPage;
  const btn = (label, page, disabled, active) =>
    `<button ${disabled ? 'disabled' : `onclick="watchlistGoToPage(${page})"`}
      style="min-width:28px;height:28px;padding:0 8px;border-radius:6px;border:1px solid ${active ? 'var(--accent-green)' : '#232838'};background:${active ? 'var(--green-15)' : 'transparent'};color:${disabled ? '#4b5262' : active ? 'var(--accent-green)' : '#9ca3af'};font-size:12px;cursor:${disabled ? 'default' : 'pointer'}">${label}</button>`;
  let pages = '';
  for (let i = 1; i <= totalPages; i++) pages += btn(i, i, false, i === p);
  return `<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:16px 0 4px">` +
    btn('‹ Prev', p - 1, p === 1, false) + pages + btn('Next ›', p + 1, p === totalPages, false) +
    `</div>`;
}

function watchlistGoToPage(page) {
  _watchlistPage = page;
  _renderWatchlistTable();
}

async function removeFromWatchlist(address) {
  const addr = address.toLowerCase();
  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    await fetch(`${API_BASE}/watchlist/${addr}`, { method: 'DELETE', credentials: 'include', headers });
    _watchlist.delete(addr);
    // Alerts are always tied to a watchlist entry — remove it too.
    fetch(`${API_BASE}/alerts/token/${addr}`, { method: 'DELETE', credentials: 'include', headers }).catch(() => {});
    if (_currentTokenData?.address?.toLowerCase() === addr) _updateWatchlistBtn(addr);
    renderWatchlistPage();
    showToast('Removed from watchlist');
  } catch(e) { showToast('Error: ' + e.message); }
}

/* ─── Token Alerts (per-watchlist-token MCAP/Volume % move alerts) ────────── */
async function openAlertModal(address, chain, symbol, name) {
  const existing = document.getElementById('alertModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'alertModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);z-index:9998;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#161822;border:1px solid #1e2235;border-radius:16px;padding:24px;width:340px;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
      <div style="font-size:14px;font-weight:800;color:#e2e8f0;margin-bottom:4px">Set Alert — ${symbol || name || 'Token'}</div>
      <div id="alertModalStatus" style="font-size:11px;color:#6b7280;margin-bottom:16px">Loading current market data…</div>
      <div id="alertModalBody" style="display:none">
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button id="alertMetricMcap" class="alert-metric-btn" style="flex:1;padding:9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Market Cap</button>
          <button id="alertMetricVolume" class="alert-metric-btn" style="flex:1;padding:9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Volume (24h)</button>
          <button id="alertMetricPrice" class="alert-metric-btn" style="flex:1;padding:9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Price</button>
        </div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:14px">Existing: <span id="alertBaselineDisplay" style="color:#e2e8f0;font-weight:700"></span></div>
        <div style="font-size:11px;color:#8b92a8;margin-bottom:6px">Alert direction</div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button id="alertDirUp" class="alert-dir-btn" style="flex:1;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">▲ Up</button>
          <button id="alertDirDown" class="alert-dir-btn" style="flex:1;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">▼ Down</button>
          <button id="alertDirBoth" class="alert-dir-btn" style="flex:1;padding:8px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">↕ Both</button>
        </div>
        <div id="alertThresholdLabel" style="font-size:11px;color:#8b92a8;margin-bottom:6px">Threshold %</div>
        <input id="alertThresholdInput" type="number" min="0.1" step="0.1" placeholder="e.g. 10" value="10"
          style="width:100%;background:#0d0f18;border:1px solid #2d3748;border-radius:8px;color:#e2e8f0;font-size:13px;padding:10px 12px;margin-bottom:18px;box-sizing:border-box">
        <div style="display:flex;gap:8px">
          <button id="alertRemoveBtn" style="display:none;flex:1;background:var(--red-12);border:1px solid var(--red-44);border-radius:10px;color:#ff6b6b;font-size:12px;font-weight:700;padding:10px;cursor:pointer">Remove Alert</button>
          <button id="alertCancelBtn" style="flex:1;background:#1e2235;border:1px solid #2d3748;border-radius:10px;color:#8b92a8;font-size:12px;font-weight:700;padding:10px;cursor:pointer">Cancel</button>
          <button id="alertSaveBtn" style="flex:1;background:var(--accent-green);border:none;border-radius:10px;color:#000;font-size:12px;font-weight:700;padding:10px;cursor:pointer">Save Alert</button>
        </div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  overlay.querySelector('#alertCancelBtn').onclick = () => overlay.remove();

  let metric = 'mcap';
  let direction = 'both';
  let mine = null; // existing saved alert for this token, if any (frozen baseline lives here)
  let liveData = null; // {mcap, volume} fetched once on first switch to a non-saved metric, then cached

  function fmtUsd(v) { return '$' + Number(v || 0).toLocaleString(); }

  async function ensureLiveData() {
    if (liveData) return liveData;
    const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const dexJson = await dexRes.json();
    const pairs = (dexJson.pairs || []).filter(p => p.chainId === chain)
      .sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0));
    if (!pairs.length) throw new Error('Could not fetch current market data for this token');
    const p = pairs[0];
    liveData = { mcap: parseFloat(p.fdv || p.marketCap || 0), volume: parseFloat(p.volume?.h24 || 0), price: parseFloat(p.priceUsd || 0) };
    return liveData;
  }

  function fmtPriceUsd(v) {
    const n = Number(v || 0);
    return '$' + (n < 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 8 }) : n.toLocaleString('en-US', { maximumFractionDigits: 4 }));
  }

  function styleMetricBtns() {
    ['Mcap','Volume','Price'].forEach(k => {
      const btn = overlay.querySelector(`#alertMetric${k}`);
      const active = (k === 'Mcap' && metric === 'mcap') || (k === 'Volume' && metric === 'volume') || (k === 'Price' && metric === 'price');
      btn.style.background = active ? 'var(--green-15)' : '#1e2235';
      btn.style.border = active ? '1px solid var(--green-40)' : '1px solid #2d3748';
      btn.style.color = active ? 'var(--accent-green)' : '#8b92a8';
    });
    const thresholdLabel = overlay.querySelector('#alertThresholdLabel');
    const thresholdInput = overlay.querySelector('#alertThresholdInput');
    if (metric === 'price') {
      thresholdLabel.textContent = 'Target Price ($)';
      thresholdInput.step = 'any';
      thresholdInput.min = '0';
      thresholdInput.placeholder = 'e.g. 0.0042';
    } else {
      thresholdLabel.textContent = 'Threshold %';
      thresholdInput.step = '0.1';
      thresholdInput.min = '0.1';
      thresholdInput.placeholder = 'e.g. 10';
    }
  }

  // Baseline shown here is the FROZEN value captured when the alert was last
  // saved for this exact metric — switching back to the originally-saved
  // metric always shows that frozen value again. Switching to the OTHER
  // metric resets and fetches the current value for it right away (not
  // deferred to save time) — that fresh value is what gets used on Save.
  async function refreshBaselineDisplay() {
    const display = overlay.querySelector('#alertBaselineDisplay');
    if (mine && mine.metric === metric) {
      display.textContent = (metric === 'price' ? fmtPriceUsd(mine.baseline_value) : fmtUsd(mine.baseline_value)) + ' (saved target)';
      return;
    }
    const metricLabel = metric === 'mcap' ? 'market cap' : metric === 'volume' ? 'volume' : 'price';
    display.textContent = `Fetching current ${metricLabel}…`;
    try {
      const d = await ensureLiveData();
      const current = metric === 'mcap' ? d.mcap : metric === 'volume' ? d.volume : d.price;
      display.textContent = (metric === 'price' ? fmtPriceUsd(current) : fmtUsd(current)) + ' (current)';
      // For a fresh price alert, prefill the target field with the current
      // price so the user only has to nudge it up/down instead of typing
      // a whole price from scratch.
      if (metric === 'price' && !(mine && mine.metric === 'price')) {
        overlay.querySelector('#alertThresholdInput').value = current;
      }
    } catch(e) {
      display.textContent = 'Error fetching current data';
    }
  }
  function styleDirBtns() {
    [['Up','up'],['Down','down'],['Both','both']].forEach(([k,v]) => {
      const btn = overlay.querySelector(`#alertDir${k}`);
      const active = direction === v;
      btn.style.background = active ? 'var(--green-15)' : '#1e2235';
      btn.style.border = active ? '1px solid var(--green-40)' : '1px solid #2d3748';
      btn.style.color = active ? 'var(--accent-green)' : '#8b92a8';
    });
  }

  overlay.querySelector('#alertMetricMcap').onclick = () => { metric = 'mcap'; styleMetricBtns(); refreshBaselineDisplay(); };
  overlay.querySelector('#alertMetricVolume').onclick = () => { metric = 'volume'; styleMetricBtns(); refreshBaselineDisplay(); };
  overlay.querySelector('#alertMetricPrice').onclick = () => { metric = 'price'; styleMetricBtns(); refreshBaselineDisplay(); };
  overlay.querySelector('#alertDirUp').onclick = () => { direction = 'up'; styleDirBtns(); };
  overlay.querySelector('#alertDirDown').onclick = () => { direction = 'down'; styleDirBtns(); };
  overlay.querySelector('#alertDirBoth').onclick = () => { direction = 'both'; styleDirBtns(); };

  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const existingAlerts = await fetch(`${API_BASE}/alerts`, { credentials: 'include', headers })
      .then(r => r.json()).then(j => j.items || []).catch(() => []);
    mine = existingAlerts.find(a => a.address.toLowerCase() === address.toLowerCase()) || null;
    if (mine) {
      metric = mine.metric;
      direction = mine.direction;
      overlay.querySelector('#alertThresholdInput').value = mine.metric === 'price' ? mine.baseline_value : mine.threshold_pct;
      overlay.querySelector('#alertRemoveBtn').style.display = 'block';
    }

    overlay.querySelector('#alertModalStatus').style.display = 'none';
    overlay.querySelector('#alertModalBody').style.display = 'block';
    styleMetricBtns();
    styleDirBtns();
    refreshBaselineDisplay();
  } catch(e) {
    overlay.querySelector('#alertModalStatus').textContent = 'Error: ' + e.message;
    overlay.querySelector('#alertModalStatus').style.color = '#ff6b6b';
    return;
  }

  overlay.querySelector('#alertRemoveBtn').onclick = async () => {
    try {
      const token = localStorage.getItem('bb_jwt');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      await fetch(`${API_BASE}/alerts/token/${address}`, { method: 'DELETE', credentials: 'include', headers });
      overlay.remove();
      showToast('Alert removed');
      renderWatchlistPage();
      if (_currentTokenData?.address?.toLowerCase() === address.toLowerCase()) _refreshAnalyzerAlertBtn(address, true);
    } catch(e) { showToast('Error: ' + e.message); }
  };

  overlay.querySelector('#alertSaveBtn').onclick = async () => {
    const inputVal = parseFloat(overlay.querySelector('#alertThresholdInput').value);
    if (metric === 'price') {
      if (!(inputVal > 0)) return showToast('Enter a valid target price');
    } else {
      if (!(inputVal > 0)) return showToast('Enter a valid threshold %');
    }
    const saveBtn = overlay.querySelector('#alertSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      // For price alerts, the input IS the target price — send it directly
      // as the baseline (the checker compares live price against it, not a
      // % move). For mcap/volume, baseline is the frozen/current metric
      // value and the input is a separate % threshold.
      let baselineValue, thresholdPct;
      if (metric === 'price') {
        baselineValue = inputVal;
        thresholdPct = 0;
      } else {
        thresholdPct = inputVal;
        if (mine && mine.metric === metric) {
          baselineValue = mine.baseline_value;
        } else {
          const d = await ensureLiveData();
          baselineValue = metric === 'mcap' ? d.mcap : d.volume;
        }
      }
      if (!(baselineValue > 0)) throw new Error('No current market data available for this metric');

      const token = localStorage.getItem('bb_jwt');
      const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/alerts`, {
        method: 'POST', credentials: 'include', headers,
        body: JSON.stringify({ address, chain, name, symbol, metric, baselineValue, thresholdPct, direction }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save alert');
      overlay.remove();
      showToast('Alert set');
      renderWatchlistPage();
      if (_currentTokenData?.address?.toLowerCase() === address.toLowerCase()) _refreshAnalyzerAlertBtn(address, true);
    } catch(e) {
      showToast('Error: ' + e.message);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Alert';
    }
  };
}

/* ─── Alerts page: notifications list (token moves / Bloombark updates /
   mute notices) + admin-only Blast tab ─────────────────────────────────── */
let _alertsTab = 'notifications';
let _alertsById = new Map();   // id -> notification, for the detail popup lookup
let _alertsSelected = new Set();
let _alertsIsAdmin = null;     // cached tri-state: null=unchecked, true/false once known

// Background poll for new alerts (any page, not just while Alerts is open) —
// plays the bell sound every time the unread COUNT on the sidebar badge goes
// up (0→1, 1→2, …), not just once regardless of how many arrived.
let _alertsLastUnreadCount = parseInt(localStorage.getItem('bb_alerts_last_unread') ?? '-1', 10);
function _updateAlertsBadge(unread) {
  const badge = $('alertsNavBadge');
  if (badge) {
    if (unread > 0) { badge.textContent = unread; badge.style.display = ''; }
    else badge.style.display = 'none';
  }
  if (_alertsLastUnreadCount !== -1 && unread > _alertsLastUnreadCount) {
    playNotificationSound();
  }
  _alertsLastUnreadCount = unread;
  localStorage.setItem('bb_alerts_last_unread', String(unread));
  _titleAlertsUnread = unread;
  _updateTabTitle();
}
// Popup preview for newly-fired alerts — separate from the generic
// bottom-center showToast() since this needs a title/subtitle layout, an
// icon, click-to-open-Alerts, and independently-stacked/dismissed cards.
let _alertsLastSeenId = parseInt(localStorage.getItem('bb_alerts_last_seen_id') ?? '-1', 10);
function _showAlertPreviewPopup(n) {
  let stack = document.getElementById('alertPreviewStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'alertPreviewStack';
    stack.style.cssText = 'position:fixed;top:70px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:10px;max-width:340px';
    document.body.appendChild(stack);
  }
  const card = document.createElement('div');
  const label = n.metric === 'mcap' ? 'Market Cap' : n.metric === 'price' ? 'Price' : n.metric === 'volume' ? 'Volume' : 'Alert';
  card.style.cssText = 'background:#161822;border:1px solid var(--green-40);border-left:3px solid var(--accent-green);border-radius:10px;padding:12px 14px;box-shadow:0 12px 32px rgba(0,0,0,0.5);cursor:pointer;opacity:0;transform:translateX(20px);transition:opacity .25s ease,transform .25s ease';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5" style="flex-shrink:0"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--accent-green)">${label.toUpperCase()} ALERT</span>
    </div>
    <div style="font-size:12px;color:#e2e8f0;line-height:1.5">${n.message || ''}</div>`;
  card.onclick = () => {
    document.querySelector('.nav-item[data-page="alerts"]')?.click();
    card.remove();
  };
  stack.appendChild(card);
  requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => card.remove(), 260);
  }, 7000);
}

async function _pollAlertsForSound() {
  const token = localStorage.getItem('bb_jwt');
  if (!token && !_privyUser) return;
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/alerts/notifications`, { credentials: 'include', headers });
    const data = await res.json();
    _updateAlertsBadge(data.unread || 0);

    const items = data.items || [];
    if (items.length) {
      const maxId = Math.max(...items.map(n => n.id));
      if (_alertsLastSeenId !== -1) {
        // Preview newest-first, oldest-first on screen (cap at 3 to avoid a
        // flood if several alerts fired while the tab was closed/idle).
        const fresh = items.filter(n => n.id > _alertsLastSeenId).sort((a, b) => a.id - b.id);
        fresh.slice(-3).forEach(_showAlertPreviewPopup);
      }
      _alertsLastSeenId = maxId;
      localStorage.setItem('bb_alerts_last_seen_id', String(maxId));
    }
  } catch (e) {}
}
setTimeout(_pollAlertsForSound, 5000);
setInterval(_pollAlertsForSound, 30000);

function switchAlertsTab(tab) {
  _alertsTab = tab;
  document.querySelectorAll('.alerts-tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.style.background = active ? 'var(--green-15)' : '#1e2235';
    btn.style.border = active ? '1px solid var(--green-40)' : '1px solid #2d3748';
    btn.style.color = active ? 'var(--accent-green)' : '#8b92a8';
  });
  $('alertsTabNotifications').style.display = tab === 'notifications' ? 'block' : 'none';
  $('alertsTabBlast').style.display = tab === 'blast' ? 'block' : 'none';
}

let _myIsHolder = null; // same tri-state pattern as _alertsIsAdmin, shares the /auth/me round-trip

async function _checkAlertsAdmin() {
  if (_alertsIsAdmin !== null) return _alertsIsAdmin;
  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include', headers });
    const data = await res.json();
    _alertsIsAdmin = !!data.isAdmin;
    _myIsHolder = !!data.isDiamondHolder;
    _updateSidebarUsername();
  } catch(e) { _alertsIsAdmin = false; _myIsHolder = false; }
  return _alertsIsAdmin;
}

// Category → icon/label used in the collapsed list row.
const ALERT_CATEGORY_META = {
  token_movement:   { icon: '📊', label: 'Token Movement' },
  bloombark_update: { icon: '<img src="/assets/brand/logo.png" style="width:20px;height:20px;border-radius:6px;object-fit:cover">', label: 'Bloombark Update' },
  muted:            { icon: '🔇', label: 'Channel Notice' },
};

function _alertRowHtml(n) {
  const when = new Date(Number(n.ts)).toLocaleString();
  const unread = !n.is_read;
  const checked = _alertsSelected.has(n.id);
  const checkbox = `<input type="checkbox" onclick="event.stopPropagation()" onchange="toggleAlertSelect(${n.id}, this.checked)" ${checked ? 'checked' : ''} style="margin-right:2px;cursor:pointer">`;

  if (n.category === 'token_movement') {
    const up = n.direction === 'up';
    const label = n.metric === 'mcap' ? 'Market Cap' : n.metric === 'price' ? 'Price' : 'Volume';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;background:#12141e;border:1px solid ${unread ? 'var(--green-40)' : '#1e2235'};border-radius:10px;padding:12px 16px;cursor:pointer"
           onclick="openInAnalyzer('${n.address}')">
        <div style="display:flex;align-items:center;gap:12px">
          ${checkbox}
          <div style="width:36px;height:36px;border-radius:50%;background:${up ? 'var(--green-15)' : 'var(--red-15)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
            ${up ? '📈' : '📉'}
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;color:#e2e8f0">${n.symbol || n.name || 'Token'} — ${label} ${up ? 'Up' : 'Down'} ${Math.abs(n.change_pct).toFixed(1)}%</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">${(n.chain||'').toUpperCase()} · ${when}</div>
          </div>
        </div>
        <div style="color:${up ? 'var(--accent-green)' : '#ff6b8a'};font-size:13px;font-weight:700">${up ? '+' : ''}${n.change_pct.toFixed(1)}%</div>
      </div>`;
  }

  // Non-token-movement categories: list shows Title + Sub Title only —
  // full Description is revealed in a popup on click.
  const meta = ALERT_CATEGORY_META[n.category] || { icon: '🔔', label: 'Notice' };
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;background:#12141e;border:1px solid ${unread ? 'var(--green-40)' : '#1e2235'};border-radius:10px;padding:12px 16px;cursor:pointer"
         onclick="openAlertDetailPopup(${n.id})">
      <div style="display:flex;align-items:center;gap:12px;min-width:0">
        ${checkbox}
        <div style="width:36px;height:36px;border-radius:50%;background:#8b92a815;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
          ${meta.icon}
        </div>
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.title || meta.label}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.subtitle || ''}${n.subtitle ? ' · ' : ''}${when}</div>
        </div>
      </div>
      <div style="color:#6b7280;font-size:11px;flex-shrink:0;margin-left:10px">${meta.label}</div>
    </div>`;
}

function openAlertDetailPopup(id) {
  const n = _alertsById.get(id);
  if (!n) return;
  const existing = document.getElementById('alertDetailModal');
  if (existing) existing.remove();
  const meta = ALERT_CATEGORY_META[n.category] || { icon: '🔔', label: 'Notice' };
  const when = new Date(Number(n.ts)).toLocaleString();
  const overlay = document.createElement('div');
  overlay.id = 'alertDetailModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);z-index:9998;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#161822;border:1px solid #1e2235;border-radius:16px;padding:24px;width:360px;max-height:80vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
      <div style="font-size:20px;margin-bottom:10px">${meta.icon}</div>
      <div style="font-size:15px;font-weight:800;color:#e2e8f0;margin-bottom:4px">${n.title || meta.label}</div>
      ${n.subtitle ? `<div style="font-size:12px;color:#9ca3af;margin-bottom:12px">${n.subtitle}</div>` : ''}
      <div style="font-size:13px;color:#c5cad6;line-height:1.6;white-space:pre-wrap;margin-bottom:16px">${n.detail || 'No further details.'}</div>
      <div style="font-size:10px;color:#4b5563;margin-bottom:18px">${when}</div>
      <button onclick="document.getElementById('alertDetailModal').remove()" style="width:100%;background:#1e2235;border:1px solid #2d3748;border-radius:10px;color:#8b92a8;font-size:12px;font-weight:700;padding:10px;cursor:pointer">Close</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function toggleAlertSelect(id, checked) {
  if (checked) _alertsSelected.add(id); else _alertsSelected.delete(id);
  const count = $('alertsSelectedCount');
  if (count) count.textContent = `${_alertsSelected.size} selected`;
  const selectAll = $('alertsSelectAll');
  if (selectAll) selectAll.checked = _alertsSelected.size > 0 && _alertsSelected.size === _alertsById.size;
}

function toggleSelectAllAlerts(checked) {
  _alertsSelected = checked ? new Set(_alertsById.keys()) : new Set();
  renderAlertsPage();
}

async function deleteSelectedAlerts() {
  if (!_alertsSelected.size) return showToast('Nothing selected');
  const ids = Array.from(_alertsSelected);
  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    await fetch(`${API_BASE}/alerts/notifications/delete`, { method: 'POST', credentials: 'include', headers, body: JSON.stringify({ ids }) });
    _alertsSelected = new Set();
    showToast('Deleted');
    renderAlertsPage();
  } catch(e) { showToast('Error: ' + e.message); }
}

function deleteAllAlerts() {
  bloombarkConfirm('Delete all alerts? This cannot be undone.', async () => {
    try {
      const token = localStorage.getItem('bb_jwt');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      await fetch(`${API_BASE}/alerts/notifications/delete-all`, { method: 'POST', credentials: 'include', headers });
      _alertsSelected = new Set();
      showToast('All alerts deleted');
      renderAlertsPage();
    } catch(e) { showToast('Error: ' + e.message); }
  });
}

async function sendAlertBlast() {
  const title = $('blastTitleInput')?.value?.trim();
  const subtitle = $('blastSubtitleInput')?.value?.trim();
  const detail = $('blastDescInput')?.value?.trim();
  if (!title) return showToast('Title is required');
  const btn = $('blastSendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    const res = await fetch(`${API_BASE}/admin/alerts/blast`, {
      method: 'POST', credentials: 'include', headers,
      body: JSON.stringify({ title, subtitle, detail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send');
    showToast(`Sent to ${data.sent} user${data.sent === 1 ? '' : 's'}`);
    $('blastTitleInput').value = '';
    $('blastSubtitleInput').value = '';
    $('blastDescInput').value = '';
  } catch(e) { showToast('Error: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = 'Send to All Users'; }
}

/* ─── Sniper Assistance ───────────────────────────────────────────────────
   Newly-created pools on Robinhood chain, detected on-chain (not sourced
   from GeckoTerminal/DexScreener) — see backend's _scanNewPools. Purely
   informational/detection: clicking a row jumps to Trade with the token
   pre-loaded, same as everywhere else in the app — the user still confirms
   every swap themselves in MetaMask, no auto-buy. */
let _sniperTimer = null;
let _sniperLastCount = -1;

function initSniperPage() {
  loadSniperPools(true);
  clearInterval(_sniperTimer);
  _sniperTimer = setInterval(() => {
    if (document.getElementById('page-sniper')?.classList.contains('active')) loadSniperPools(false);
  }, 5000);
}

function sniperGoToTrade(address) {
  document.querySelector('.nav-item[data-page="trade"]')?.click();
  const inp = $('tradeTokenInput');
  if (inp) inp.value = address;
  tradeLoadToken();
}

async function loadSniperPools(showLoadingState) {
  const el = $('sniperContent');
  if (!el) return;
  if (showLoadingState) el.innerHTML = '<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">Loading…</div>';
  try {
    const res = await fetch(`${API_BASE}/sniper/pools?limit=50`);
    const data = await res.json();
    const pools = data.pools || [];

    const badge = $('sniperNavBadge');
    if (badge) {
      if (_sniperLastCount !== -1 && pools.length > _sniperLastCount) playNotificationSound();
      _sniperLastCount = pools.length;
    }

    if (!pools.length) {
      el.innerHTML = '<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">' +
        '<div style="font-size:28px;margin-bottom:12px">🎯</div>No new pools detected yet.<br>' +
        '<span style="color:#9ca3af">Checking the chain every few seconds — this list fills in as pools launch.</span></div>';
      return;
    }

    const nowMs = Date.now();
    el.innerHTML = pools.map(p => {
      const ageMs = nowMs - Number(p.detected_at);
      const ageStr = ageMs < 60000 ? `${Math.floor(ageMs/1000)}s ago`
        : ageMs < 3600000 ? `${Math.floor(ageMs/60000)}m ago`
        : `${Math.floor(ageMs/3600000)}h ago`;
      const isFresh = ageMs < 60000;
      const sourceLabel = p.source === 'v3_pool' ? 'V3' : 'V2';
      const enriched = p.enriched_at != null;
      const addr = p.token_address;
      return `<div onclick="sniperGoToTrade('${addr}')"
        style="display:flex;align-items:center;justify-content:space-between;background:#12141e;border:1px solid ${isFresh ? 'var(--green-40)' : '#1e2235'};border-radius:10px;padding:12px 16px;cursor:pointer"
        onmouseover="this.style.background='#161822'" onmouseout="this.style.background='#12141e'">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--green-15);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--accent-green);flex-shrink:0">${(p.symbol||'?').charAt(0)}</div>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;font-weight:700;color:#e2e8f0">${p.symbol || '?'}</span>
              <span style="font-size:9px;padding:1px 6px;border-radius:10px;font-weight:700;background:#1e2235;color:#6b7280;border:1px solid #2d3144">${sourceLabel}</span>
              ${isFresh ? `<span style="font-size:9px;padding:1px 6px;border-radius:10px;font-weight:800;background:var(--green-20);color:var(--accent-green)">NEW</span>` : ''}
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px">${p.name || ''} · ${addr.slice(0,6)}…${addr.slice(-4)} · ${ageStr}</div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${enriched
            ? `<div style="font-size:11px;font-weight:700;color:#e2e8f0">${p.mcap_usd ? '$' + Number(p.mcap_usd).toLocaleString('en-US',{maximumFractionDigits:0}) : '—'}</div>
               <div style="font-size:9px;color:#6b7280">Liq $${p.liquidity_usd ? Number(p.liquidity_usd).toLocaleString('en-US',{maximumFractionDigits:0}) : '—'}</div>`
            : `<div style="font-size:10px;color:#6b7280">Pricing not indexed yet</div>`}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--accent-red);font-size:13px">Error loading new pools</div>';
  }
}

/* ─── AI Track Record ─────────────────────────────────────────────────────
   Public, no-wallet-needed transparency page: every directional AI
   Prediction call gets checked ~24h later against the real price move
   (see backend's _resolvePredictionHistory), shown here win or lose. */
async function loadTrackRecord(showLoadingState) {
  const el = $('trackRecordContent');
  if (!el) return;
  if (showLoadingState) el.innerHTML = '<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">Loading…</div>';
  try {
    const res = await fetch(`${API_BASE}/predict/track-record`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed');

    const winRateEl = $('trWinRate');
    if (winRateEl) winRateEl.textContent = data.winRatePct != null ? `${data.winRatePct}%` : '—';
    const resolvedEl = $('trResolvedCount');
    if (resolvedEl) resolvedEl.textContent = data.totalResolved;
    const pendingEl = $('trPendingCount');
    if (pendingEl) pendingEl.textContent = data.pendingCount;


    _trPendingRows = data.pending || [];
    const pendingSection = $('trPendingSection');
    if (pendingSection) {
      pendingSection.style.display = _trPendingRows.length ? '' : 'none';
      if (_trPendingRows.length) _renderTrPendingList();
    }

    _trackRecordRows = data.recent || [];
    _trackRecordPage = 1;
    _renderTrackRecordList();
  } catch (e) {
    el.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--accent-red);font-size:13px">Error loading track record</div>';
  }
}

const TRACK_RECORD_PAGE_SIZE = 10;
let _trackRecordRows = [];
let _trackRecordPage = 1;

const TR_PENDING_COLLAPSED_LIMIT = 8;
let _trPendingRows = [];
let _trPendingCollapsed = false;   // whole section hidden (list + toggle button)
let _trPendingExpanded = false;    // showing all vs just the first N chips

function _trPendingChipHtml(p) {
  const addr = p.address;
  const short = `${addr.slice(0,6)}…${addr.slice(-4)}`;
  const bullish = p.signal === 'BULLISH';
  const logo = dashLogoUrl({ imageUrl: p.imageUrl, networkId: p.chain, address: p.address });
  const avatar = logo
    ? `<img src="${logo}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'width:22px;height:22px;border-radius:50%;background:${bullish ? 'var(--green-15)' : 'var(--red-15)'};color:${bullish ? 'var(--accent-green)' : 'var(--accent-red)'};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0',textContent:'${(p.symbol||'?').charAt(0)}'}))">`
    : `<div style="width:22px;height:22px;border-radius:50%;background:${bullish ? 'var(--green-15)' : 'var(--red-15)'};color:${bullish ? 'var(--accent-green)' : 'var(--accent-red)'};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(p.symbol||'?').charAt(0)}</div>`;
  return `<div title="${addr}" class="tr-pending-chip" style="display:flex;align-items:center;gap:6px;background:#12141e;border:1px solid #1e2235;border-radius:20px;padding:5px 12px 5px 5px">
    <span class="tr-pending-dot" style="width:6px;height:6px;border-radius:50%;background:#f5a623;flex-shrink:0"></span>
    ${avatar}
    <span style="font-size:12px;font-weight:700;color:#e2e8f0">${p.symbol || '?'}</span>
    <span style="font-size:9px;padding:1px 6px;border-radius:8px;font-weight:700;background:${bullish ? 'var(--green-18)' : 'var(--red-15)'};color:${bullish ? 'var(--accent-green)' : 'var(--accent-red)'}">${p.signal || '?'}</span>
    <span style="font-size:10px;color:#6b7280;font-family:monospace">${short}</span>
  </div>`;
}

function _renderTrPendingList() {
  const list = $('trPendingList');
  const toggleBtn = $('trPendingToggleBtn');
  if (!list) return;
  const rows = _trPendingRows;
  const overLimit = rows.length > TR_PENDING_COLLAPSED_LIMIT;
  const shown = (_trPendingExpanded || !overLimit) ? rows : rows.slice(0, TR_PENDING_COLLAPSED_LIMIT);
  list.innerHTML = shown.map(_trPendingChipHtml).join('');
  if (toggleBtn) {
    if (overLimit) {
      toggleBtn.style.display = '';
      toggleBtn.textContent = _trPendingExpanded ? '▲ Show less' : `▼ Show ${rows.length - TR_PENDING_COLLAPSED_LIMIT} more`;
    } else {
      toggleBtn.style.display = 'none';
    }
  }
}

function toggleTrPendingExpand() {
  _trPendingExpanded = !_trPendingExpanded;
  _renderTrPendingList();
}

function toggleTrPendingCollapse() {
  _trPendingCollapsed = !_trPendingCollapsed;
  const list = $('trPendingList');
  const toggleBtn = $('trPendingToggleBtn');
  const chevron = $('trPendingChevron');
  if (list) list.style.display = _trPendingCollapsed ? 'none' : 'flex';
  if (toggleBtn && !_trPendingCollapsed) _renderTrPendingList();
  if (toggleBtn && _trPendingCollapsed) toggleBtn.style.display = 'none';
  if (chevron) chevron.style.transform = _trPendingCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
}

function _trackRecordRowHtml(r, i) {
  const isCorrect = r.outcome === 'correct';
  const isFlat = r.outcome === 'flat';
  const color = isFlat ? '#9ca3af' : isCorrect ? 'var(--accent-green)' : 'var(--accent-red)';
  const label = isFlat ? 'FLAT' : isCorrect ? 'CORRECT' : 'MISSED';
  const icon = isFlat ? '–' : isCorrect ? '✓' : '✕';
  const bullish = r.signal === 'BULLISH';
  const changeStr = (r.changePct >= 0 ? '+' : '') + Number(r.changePct).toFixed(1) + '%';
  const fmtAge = (ms) => {
    const d = Math.floor((Date.now() - ms) / 3600000);
    return d < 24 ? `${d}h ago` : `${Math.floor(d/24)}d ago`;
  };
  const rowLogo = dashLogoUrl({ imageUrl: r.imageUrl, networkId: r.chain, address: r.address });
  const rowAvatar = rowLogo
    ? `<img src="${rowLogo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'width:36px;height:36px;border-radius:50%;background:${bullish ? 'var(--green-15)' : 'var(--red-15)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0',textContent:'${bullish ? '🐂' : '🐻'}'}))">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:${bullish ? 'var(--green-15)' : 'var(--red-15)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${bullish ? '🐂' : '🐻'}</div>`;
  return `<div class="tr-row" style="animation-delay:${((i || 0) * 0.05).toFixed(2)}s;display:flex;align-items:center;justify-content:space-between;background:#12141e;border:1px solid #1e2235;border-left:3px solid ${color};border-radius:10px;padding:12px 16px">
    <div style="display:flex;align-items:center;gap:12px;min-width:0">
      ${rowAvatar}
      <div style="min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px;font-weight:700;color:#e2e8f0">${r.symbol || '?'}</span>
          <span style="font-size:9px;padding:1px 6px;border-radius:10px;font-weight:700;background:${bullish ? 'var(--green-18)' : 'var(--red-15)'};color:${bullish ? 'var(--accent-green)' : 'var(--accent-red)'};border:1px solid ${bullish ? 'var(--green-40)' : 'var(--red-44)'}">${r.signal} · ${r.confidence}%</span>
        </div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">${fmtAge(r.predictedAt)} · $${Number(r.priceAt).toFixed(6)} → $${Number(r.priceAfter).toFixed(6)}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:700;color:${color}">${label}</div>
        <div style="font-size:11px;color:#6b7280">${changeStr}</div>
      </div>
      <div style="width:22px;height:22px;border-radius:50%;background:${color}22;color:${color};font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon}</div>
    </div>
  </div>`;
}

function _renderTrackRecordList() {
  const el = $('trackRecordContent');
  if (!el) return;
  const rows = _trackRecordRows;
  if (!rows.length) {
    el.innerHTML = '<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">' +
      '<div style="font-size:28px;margin-bottom:12px">📊</div>No resolved predictions yet.<br>' +
      '<span style="color:#9ca3af">Every AI Prediction call gets checked ~24h later — check back soon.</span></div>';
    return;
  }
  const totalPages = Math.max(1, Math.ceil(rows.length / TRACK_RECORD_PAGE_SIZE));
  if (_trackRecordPage > totalPages) _trackRecordPage = totalPages;
  const start = (_trackRecordPage - 1) * TRACK_RECORD_PAGE_SIZE;
  const pageRows = rows.slice(start, start + TRACK_RECORD_PAGE_SIZE);
  const header = `<div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px 8px">
    <span style="font-size:10px;font-weight:700;letter-spacing:.06em;color:#6b7280">TOKEN / CALL</span>
    <span style="font-size:10px;font-weight:700;letter-spacing:.06em;color:#6b7280">RESULT</span>
  </div>`;
  el.innerHTML = header + pageRows.map(_trackRecordRowHtml).join('') + _trackRecordPaginationHtml(totalPages);
}

function _trackRecordPaginationHtml(totalPages) {
  if (totalPages <= 1) return '';
  const p = _trackRecordPage;
  const btn = (label, page, disabled, active) =>
    `<button ${disabled ? 'disabled' : `onclick="trackRecordGoToPage(${page})"`}
      style="min-width:28px;height:28px;padding:0 8px;border-radius:6px;border:1px solid ${active ? 'var(--accent-green)' : '#232838'};background:${active ? 'var(--green-15)' : 'transparent'};color:${disabled ? '#4b5262' : active ? 'var(--accent-green)' : '#9ca3af'};font-size:12px;cursor:${disabled ? 'default' : 'pointer'}">${label}</button>`;
  let pages = '';
  for (let i = 1; i <= totalPages; i++) pages += btn(i, i, false, i === p);
  return `<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:16px 0 4px">` +
    btn('‹ Prev', p - 1, p === 1, false) + pages + btn('Next ›', p + 1, p === totalPages, false) +
    `</div>`;
}

function trackRecordGoToPage(page) {
  _trackRecordPage = page;
  _renderTrackRecordList();
}

/* ─── Trending on Bloombark ────────────────────────────────────────────────
   Internal-activity trending (scans/discussion/trades), deliberately
   separate from Market Overview's price/volume-based Trending tab. */
const TRENDING_MEDALS = ['🥇', '🥈', '🥉'];

function _trendingListHtml(items, emptyMsg, accent) {
  if (!items.length) {
    return `<div style="text-align:center;padding:36px 16px;color:#4b5568;font-size:12px;border:1px dashed #232838;border-radius:12px">${emptyMsg}</div>`;
  }
  const maxCount = Math.max(...items.map(t => t.count || 0), 1);
  return items.map((t, i) => {
    const label = t.symbol || (t.address ? `${t.address.slice(0,6)}…${t.address.slice(-4)}` : '?');
    const canNav = !!t.address;
    const clickAttr = canNav ? `onclick="trendingGoToAnalyzer('${t.address}')"` : '';
    const rankBadge = TRENDING_MEDALS[i]
      ? `<span style="font-size:15px;width:20px;text-align:center;flex-shrink:0">${TRENDING_MEDALS[i]}</span>`
      : `<span style="font-size:10px;color:#4b5568;width:20px;text-align:center;flex-shrink:0">#${i+1}</span>`;
    const pct = Math.max(8, Math.round((t.count || 0) / maxCount * 100));
    const logo = dashLogoUrl({ imageUrl: t.imageUrl, networkId: t.chain, address: t.address });
    const isTop = i === 0;
    const avatarSize = isTop ? 30 : 26;
    return `<div ${clickAttr} class="trending-row${isTop ? ' trend-rank-1' : ''}" style="animation-delay:${(i * 0.06).toFixed(2)}s;cursor:${canNav ? 'pointer' : 'default'};background:#12141e;border:1px solid #1e2235;border-radius:12px;padding:${isTop ? '12px 12px' : '10px 12px'}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:${items.length ? 6 : 0}px">
        ${rankBadge}
        <div style="position:relative;width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;background:${accent}22;color:${accent};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;${isTop ? `box-shadow:0 0 0 2px ${accent}55` : ''}">${label.charAt(0)}${logo ? `<img src="${logo}" alt="" loading="lazy" style="position:absolute;inset:0;width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;object-fit:cover;opacity:0;transition:opacity .15s" onload="this.style.opacity=1" onerror="this.remove()">` : ''}</div>
        <span style="font-size:${isTop ? '14px' : '13px'};font-weight:700;color:#e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">${label}</span>
        <span style="font-size:12px;color:${accent};font-weight:800;flex-shrink:0">${t.count}</span>
      </div>
      <div style="height:4px;background:#1e2235;border-radius:2px;overflow:hidden;margin-left:36px">
        <div style="height:100%;width:${pct}%;background:${accent};border-radius:2px;transition:width .5s ease"></div>
      </div>
    </div>`;
  }).join('');
}

function trendingGoToAnalyzer(address) {
  playClickSound();
  document.querySelector('.nav-item[data-page="ai-analyzer"]')?.click();
  const inp = $('contractInput');
  if (inp) inp.value = address;
  $('scanBtn')?.click();
}

async function loadTrendingBloombark(showLoadingState, bypassCache) {
  const scannedEl = $('trendScannedList'), discussedEl = $('trendDiscussedList'), tradedEl = $('trendTradedList');
  if (!scannedEl) return;
  if (showLoadingState) {
    [scannedEl, discussedEl, tradedEl].forEach(el => { el.innerHTML = '<div style="text-align:center;padding:30px 0;color:#6b7280;font-size:12px">Loading…</div>'; });
  }
  try {
    const res = await fetch(`${API_BASE}/trending-bloombark${bypassCache ? '?refresh=1' : ''}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed');
    scannedEl.innerHTML = _trendingListHtml(data.mostScanned || [], 'No scans in the last 24h yet.', '#4A90E2');
    discussedEl.innerHTML = _trendingListHtml(data.mostDiscussed || [], 'No community mentions in the last 24h yet.', '#9B59B6');
    tradedEl.innerHTML = _trendingListHtml(data.mostTraded || [], 'No trades in the last 24h yet.', '#27C97F');
  } catch (e) {
    [scannedEl, discussedEl, tradedEl].forEach(el => {
      el.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--accent-red);font-size:12px">Failed to load</div>';
    });
  }
}

/* ─── Token Comparison (Track Record page) ────────────────────────────────
   Compare several watchlist tokens side by side. Deliberately watchlist-only
   (not free-text CA entry) — keeps the picker fast and scoped to tokens the
   user already cares about, and reuses /api/analyze for full stats so the
   numbers match exactly what AI Analyzer shows for the same token. */
let _compareTokens = []; // [{address, chain, symbol, name, imageUrl, data}]

let _pickerItems = [];             // full watchlist items available to pick from
let _pickerSelected = new Set();   // addresses (lowercase) checked in the modal

const COMPARE_MIN_TOKENS = 2;

function _updatePickerConfirmBtn() {
  const btn = $('comparePickerConfirmBtn');
  if (!btn) return;
  const n = _pickerSelected.size;
  const total = _compareTokens.length + n;
  btn.textContent = `Add selected (${n})`;
  const enough = total >= COMPARE_MIN_TOKENS;
  btn.disabled = n === 0 || !enough;
  btn.style.opacity = (n === 0 || !enough) ? '0.4' : '1';
}

function _renderPickerList() {
  const list = $('comparePickerList');
  if (!list) return;
  list.innerHTML = _pickerItems.map(it => {
    const addr = it.address.toLowerCase();
    const checked = _pickerSelected.has(addr);
    return `
      <div onclick="togglePickerSelect('${addr}')"
        style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${checked ? 'var(--green-15)' : '#12141e'};border:1px solid ${checked ? 'var(--green-40)' : '#1e2235'};border-radius:10px;cursor:pointer"
        onmouseover="this.style.background='${checked ? 'var(--green-15)' : '#161822'}'" onmouseout="this.style.background='${checked ? 'var(--green-15)' : '#12141e'}'">
        <input type="checkbox" ${checked ? 'checked' : ''} onclick="event.stopPropagation();togglePickerSelect('${addr}')" style="pointer-events:none;width:16px;height:16px;flex-shrink:0">
        ${(() => { const logo = dashLogoUrl({ imageUrl: it.image_url, networkId: it.chain, address: it.address }); return logo
          ? `<img src="${logo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'width:28px;height:28px;border-radius:50%;background:var(--green-15);color:var(--accent-green);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0',textContent:'${(it.symbol||'?').charAt(0)}'}))">`
          : `<div style="width:28px;height:28px;border-radius:50%;background:var(--green-15);color:var(--accent-green);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(it.symbol||'?').charAt(0)}</div>`; })()}
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:700;color:#e2e8f0">${it.symbol || '?'}</div>
          <div style="font-size:10px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.name || ''}</div>
        </div>
      </div>`;
  }).join('');
  _updatePickerConfirmBtn();
}

const COMPARE_MAX_TOKENS = 5;

function togglePickerSelect(addr) {
  playClickSound();
  if (_pickerSelected.has(addr)) {
    _pickerSelected.delete(addr);
  } else {
    const remainingSlots = COMPARE_MAX_TOKENS - _compareTokens.length;
    if (_pickerSelected.size >= remainingSlots) {
      showToast(`You can compare up to ${COMPARE_MAX_TOKENS} tokens at once`);
      return;
    }
    _pickerSelected.add(addr);
  }
  _renderPickerList();
}

async function openComparePickerModal() {
  playClickSound();
  const modal = $('comparePickerModal');
  const list  = $('comparePickerList');
  const confirmBtn = $('comparePickerConfirmBtn');
  if (!modal || !list) return;
  modal.style.display = 'flex';
  if (confirmBtn) confirmBtn.style.display = 'none';
  _pickerSelected = new Set();
  _pickerItems = [];
  list.innerHTML = '<div style="text-align:center;padding:20px 0;color:#6b7280;font-size:12px">Loading watchlist…</div>';

  if (!_privyUser && !localStorage.getItem('bb_jwt')) {
    list.innerHTML = `<div style="text-align:center;padding:20px 0;color:#6b7280;font-size:12px">
      Connect wallet to see your watchlist
      <br><button onclick="closeComparePickerModal();openWalletModal()" style="margin-top:12px;background:var(--accent-green);border:none;border-radius:8px;color:#000;padding:7px 16px;cursor:pointer;font-size:12px;font-weight:600">Connect Wallet</button>
    </div>`;
    return;
  }

  if (_compareTokens.length >= COMPARE_MAX_TOKENS) {
    list.innerHTML = `<div style="text-align:center;padding:20px 0;color:#6b7280;font-size:12px">You're comparing the max of ${COMPARE_MAX_TOKENS} tokens already. Remove one to add another.</div>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/watchlist`, { credentials: 'include', headers: _authHeaders() });
    const data = await res.json();
    const items = data.items || [];
    const already = new Set(_compareTokens.map(t => t.address.toLowerCase()));
    const available = items.filter(it => !already.has(it.address.toLowerCase()));

    if (!items.length) {
      list.innerHTML = '<div style="text-align:center;padding:20px 0;color:#6b7280;font-size:12px">No tokens in watchlist yet. Scan a token and click the ♡ to save it.</div>';
      return;
    }
    if (!available.length) {
      list.innerHTML = '<div style="text-align:center;padding:20px 0;color:#6b7280;font-size:12px">Every watchlist token is already in the comparison.</div>';
      return;
    }

    _pickerItems = available;
    if (confirmBtn) confirmBtn.style.display = 'block';
    _renderPickerList();
  } catch (e) {
    list.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--accent-red);font-size:12px">Failed to load watchlist</div>';
  }
}

function confirmComparePickerSelection() {
  playClickSound();
  if (_compareTokens.length + _pickerSelected.size < COMPARE_MIN_TOKENS) {
    showToast(`Select at least ${COMPARE_MIN_TOKENS} tokens to compare`);
    return;
  }
  const toAdd = _pickerItems.filter(it => _pickerSelected.has(it.address.toLowerCase()));
  closeComparePickerModal();
  toAdd.forEach(it => addTokenToCompare(it.address, it.chain, it.symbol || '?', it.name || '', it.image_url || ''));
}

function closeComparePickerModal() {
  playClickSound();
  const modal = $('comparePickerModal');
  if (modal) modal.style.display = 'none';
}

async function addTokenToCompare(address, chain, symbol, name, imageUrl) {
  closeComparePickerModal();
  if (_compareTokens.some(t => t.address.toLowerCase() === address.toLowerCase())) return;
  if (_compareTokens.length >= COMPARE_MAX_TOKENS) {
    showToast(`You can compare up to ${COMPARE_MAX_TOKENS} tokens at once`);
    return;
  }
  const entry = { address, chain, symbol, name, imageUrl, data: null, loading: true };
  _compareTokens.push(entry);
  renderCompareGrid();
  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractAddress: address, chain: chain || 'auto' }),
    });
    const json = await res.json();
    entry.data = json.success ? json.data : null;
  } catch (e) {
    entry.data = null;
  } finally {
    entry.loading = false;
    renderCompareGrid();
  }
}

function removeTokenFromCompare(address) {
  playClickSound();
  _compareTokens = _compareTokens.filter(t => t.address.toLowerCase() !== address.toLowerCase());
  renderCompareGrid();
}

function clearCompareTokens() {
  playClickSound();
  if (!_compareTokens.length) return;
  _compareTokens = [];
  renderCompareGrid();
}

function renderCompareGrid() {
  const grid = $('compareGrid');
  if (!grid) return;
  if (!_compareTokens.length) {
    grid.style.gridTemplateColumns = '1fr';
    grid.innerHTML = `<div style="text-align:center;padding:40px 0;color:#6b7280;font-size:13px;grid-column:1/-1">
      No tokens added yet. Click <strong>+ Add token</strong> to pick from your watchlist.
    </div>`;
    return;
  }
  // Explicit column count (rather than auto-fit/minmax) so cards always
  // stretch to fill the full row width, however many are being compared —
  // auto-fit was leaving a stretch of empty space on the right with < 4 cards.
  grid.style.gridTemplateColumns = `repeat(${_compareTokens.length}, minmax(0, 1fr))`;

  const fmtUsd = v => v == null ? '—' : v >= 1e6 ? `$${(v/1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v/1e3).toFixed(1)}K` : `$${Number(v).toFixed(2)}`;
  const fmtPct = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

  // ── "Which one's better" model ────────────────────────────────────────────
  // Min-max normalizes each metric (0-100) across the tokens that loaded
  // successfully, then averages across whichever metrics a token actually
  // has data for. Risk score is inverted (lower risk = better). Purely
  // relative to the tokens being compared right now, not an absolute rating.
  const loaded = _compareTokens.filter(t => !t.loading && t.data);
  const scores = {};
  if (loaded.length >= 2) {
    const metrics = [
      { key: 'liquidity',       get: d => d.liquidity,               invert: false },
      { key: 'volume24h',       get: d => d.volume24h,               invert: false },
      { key: 'priceChange24h',  get: d => d.priceChange24h,          invert: false },
      { key: 'holders',         get: d => d.holderStats?.total,      invert: false },
      { key: 'riskScore',       get: d => d.riskScore,               invert: true  },
    ];
    const ranges = metrics.map(m => {
      const vals = loaded.map(t => m.get(t.data)).filter(v => v != null && !isNaN(v));
      return { ...m, min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 0 };
    });
    loaded.forEach(t => {
      const parts = [];
      ranges.forEach(r => {
        const v = r.get(t.data);
        if (v == null || isNaN(v)) return;
        let n = r.max === r.min ? 50 : ((v - r.min) / (r.max - r.min)) * 100;
        if (r.invert) n = 100 - n;
        parts.push(n);
      });
      scores[t.address.toLowerCase()] = parts.length ? Math.round(parts.reduce((a,b)=>a+b,0) / parts.length) : null;
    });
  }
  const bestAddr = Object.keys(scores).length
    ? Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;
  const bestToken = bestAddr ? loaded.find(t => t.address.toLowerCase() === bestAddr) : null;

  const verdictHtml = bestToken
    ? `<div style="grid-column:1/-1;background:var(--green-15);border:1px solid var(--green-40);border-radius:10px;padding:10px 14px;font-size:12px;color:var(--accent-green);display:flex;align-items:center;gap:8px">
        🏆 <strong>${bestToken.symbol}</strong> ranks best overall right now — score ${scores[bestAddr]}/100 across liquidity, volume, momentum, holders and risk.
      </div>`
    : '';

  grid.innerHTML = verdictHtml + _compareTokens.map(t => {
    if (t.loading) {
      return `<div style="background:var(--surface-1,#12141e);border:1px solid #1e2235;border-radius:12px;padding:1rem;text-align:center;color:#6b7280;font-size:12px;min-height:160px;display:flex;align-items:center;justify-content:center">Loading ${t.symbol}…</div>`;
    }
    if (!t.data) {
      return `<div style="background:#12141e;border:1px solid #1e2235;border-radius:12px;padding:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:700;color:#e2e8f0">${t.symbol}</span>
          <button onclick="removeTokenFromCompare('${t.address}')" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:14px">✕</button>
        </div>
        <div style="font-size:11px;color:var(--accent-red);margin-top:8px">Failed to load stats</div>
      </div>`;
    }
    const d = t.data;
    const chg = d.priceChange24h || 0;
    const score = scores[t.address.toLowerCase()];
    const isBest = bestAddr && t.address.toLowerCase() === bestAddr;
    return `<div style="background:#12141e;border:1px solid ${isBest ? 'var(--green-40)' : '#1e2235'};border-radius:12px;padding:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          ${(() => { const logo = dashLogoUrl({ imageUrl: t.imageUrl, networkId: t.chain, address: t.address }); return logo
            ? `<img src="${logo}" style="width:24px;height:24px;border-radius:50%;object-fit:cover" onerror="this.replaceWith(Object.assign(document.createElement('div'),{style:'width:24px;height:24px;border-radius:50%;background:var(--green-15);color:var(--accent-green);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center',textContent:'${(t.symbol||'?').charAt(0)}'}))">`
            : `<div style="width:24px;height:24px;border-radius:50%;background:var(--green-15);color:var(--accent-green);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">${(t.symbol||'?').charAt(0)}</div>`; })()}
          <span style="font-size:13px;font-weight:700;color:#e2e8f0">${t.symbol}</span>
          ${isBest ? `<span style="font-size:9px;font-weight:800;letter-spacing:.5px;background:var(--green-20);color:var(--accent-green);padding:2px 6px;border-radius:10px">🏆 BEST</span>` : ''}
        </div>
        <button onclick="removeTokenFromCompare('${t.address}')" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:14px">✕</button>
      </div>
      ${score != null ? `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-bottom:3px"><span>Overall score</span><span>${score}/100</span></div>
        <div style="height:5px;background:#1e2235;border-radius:3px;overflow:hidden"><div style="height:100%;width:${score}%;background:${isBest ? 'var(--accent-green)' : '#4a90d9'};border-radius:3px"></div></div>
      </div>` : ''}
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tr><td style="color:#6b7280;padding:3px 0">Price</td><td style="text-align:right;color:#e2e8f0">${d.price > 0 ? fmt.price(d.price) : '—'}</td></tr>
        <tr><td style="color:#6b7280;padding:3px 0">Momentum (24h)</td><td style="text-align:right;color:${chg >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${fmtPct(chg)}</td></tr>
        <tr><td style="color:#6b7280;padding:3px 0">Mcap</td><td style="text-align:right;color:#e2e8f0">${fmtUsd(d.marketCap)}</td></tr>
        <tr><td style="color:#6b7280;padding:3px 0">Liquidity</td><td style="text-align:right;color:#e2e8f0">${fmtUsd(d.liquidity)}</td></tr>
        <tr><td style="color:#6b7280;padding:3px 0">Volume 24h</td><td style="text-align:right;color:#e2e8f0">${fmtUsd(d.volume24h)}</td></tr>
        <tr><td style="color:#6b7280;padding:3px 0">Holders</td><td style="text-align:right;color:#e2e8f0">${d.holderStats?.total ? Number(d.holderStats.total).toLocaleString() : '—'}</td></tr>
        <tr><td style="color:#6b7280;padding:3px 0">Risk score</td><td style="text-align:right;color:#e2e8f0">${d.riskScore != null ? d.riskScore + '/100' : '—'}</td></tr>
      </table>
    </div>`;
  }).join('');
}

async function renderAlertsPage() {
  const el = document.getElementById('alertsContent');
  if (!el) return;
  if (!_privyUser && !localStorage.getItem('bb_jwt')) {
    el.innerHTML = `<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">
      <div style="font-size:28px;margin-bottom:12px">🔔</div>
      Connect wallet to see your alerts
      <br><button onclick="openWalletModal()" style="margin-top:16px;background:var(--accent-green);border:none;border-radius:8px;color:#000;padding:8px 20px;cursor:pointer;font-size:13px;font-weight:600">Connect Wallet</button>
    </div>`;
    return;
  }

  const isAdmin = await _checkAlertsAdmin();
  const blastTabBtn = $('alertsBlastTabBtn');
  if (blastTabBtn) blastTabBtn.style.display = isAdmin ? 'inline-block' : 'none';
  if (!isAdmin && _alertsTab === 'blast') switchAlertsTab('notifications');

  el.innerHTML = `<div style="text-align:center;padding:40px 0;color:#6b7280;font-size:13px">Loading…</div>`;
  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/alerts/notifications`, { credentials: 'include', headers });
    const data = await res.json();
    const items = data.items || [];
    _alertsById = new Map(items.map(n => [n.id, n]));
    _alertsSelected = new Set(Array.from(_alertsSelected).filter(id => _alertsById.has(id)));

    _updateAlertsBadge(data.unread || 0);

    const selectBar = $('alertsSelectBar');
    if (selectBar) selectBar.style.display = items.length ? 'flex' : 'none';
    const selectAll = $('alertsSelectAll');
    if (selectAll) selectAll.checked = _alertsSelected.size > 0 && _alertsSelected.size === items.length;
    const count = $('alertsSelectedCount');
    if (count) count.textContent = `${_alertsSelected.size} selected`;

    if (items.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:60px 0;color:#6b7280;font-size:13px">
        <div style="font-size:28px;margin-bottom:12px">🔔</div>
        No alerts yet.<br>
        <span style="color:#9ca3af">Set an alert on a watchlist token, or wait for a Bloombark update.</span>
      </div>`;
    } else {
      el.innerHTML = items.map(_alertRowHtml).join('');
    }

    if (data.unread > 0) {
      fetch(`${API_BASE}/alerts/notifications/mark-read`, { method: 'POST', credentials: 'include', headers }).catch(() => {});
    }
  } catch(e) {
    el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--accent-red);font-size:13px">Error loading alerts</div>`;
  }
}

/* ─── Narrative Tracker ───────────────────────────────────────────────────── */
let _narrativeData = [];
let _narrativeSort = 'change';

async function loadNarrative() {
  const grid = $('narrativeGrid');
  if (!grid) return;
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted);font-size:13px">
    <div style="font-size:24px;margin-bottom:10px">📡</div>Fetching market narratives…</div>`;
  try {
    const res  = await fetch(`${API_BASE}/narrative`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    _narrativeData = json.data;
    renderNarrativeGrid();

    // wire sort buttons
    document.querySelectorAll('.narr-sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.narr-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _narrativeSort = btn.dataset.sort;
        renderNarrativeGrid();
      });
    });
  } catch(e) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--accent-red);font-size:13px">⚠ ${e.message}</div>`;
  }
}

function renderNarrativeGrid() {
  const grid = $('narrativeGrid');
  if (!grid || !_narrativeData.length) return;

  const sorted = [..._narrativeData].sort((a, b) => {
    if (_narrativeSort === 'change')  return b.change24h - a.change24h;
    if (_narrativeSort === 'losers')  return a.change24h - b.change24h;
    return b.marketCap - a.marketCap;
  });

  const fmtMcap = v => v >= 1e9 ? `$${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v/1e6).toFixed(1)}M` : `$${Math.round(v).toLocaleString()}`;
  const fmtChg  = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  grid.innerHTML = sorted.map(n => {
    const chg    = n.change24h || 0;
    const signal = chg > 2 ? 'bullish' : chg < -2 ? 'bearish' : 'neutral';
    const color  = signal === 'bullish' ? 'var(--accent-green)' : signal === 'bearish' ? 'var(--accent-red)' : '#6b7280';
    const coinImgs = (n.topCoins || []).map(url =>
      `<img src="${url}" style="width:20px;height:20px;border-radius:50%;border:2px solid var(--bg-card);margin-left:-6px;object-fit:cover" onerror="this.style.display='none'">`
    ).join('');

    return `
      <div class="narr-card ${signal}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:22px">${n.icon}</span>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${n.label}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:15px;font-weight:800;color:${color}">${fmtChg(chg)}</div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:1px">24h</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">MARKET CAP</div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${fmtMcap(n.marketCap)}</div>
          </div>
          <div style="display:flex;margin-right:6px">${coinImgs}</div>
        </div>
        <div style="margin-top:10px;height:3px;background:var(--border-light);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,Math.abs(chg)*3)}%;background:${color};border-radius:2px;transition:width .5s ease"></div>
        </div>
      </div>`;
  }).join('');
}

let _cachedTicker = null;

// Ticker + contract address are parameterized in the DB (app_config) and served
// via /api/config/public, so they can be flipped live at launch without a deploy.
async function loadLandingCA() {
  try {
    const res = await fetch(`${API_BASE}/config/public`);
    const cfg = await res.json();
    _cachedCA     = cfg.contractAddress || 'coming_soon';
    _cachedTicker = cfg.tokenTicker || 'BBRK';
  } catch (_) {
    _cachedCA     = _cachedCA     || 'coming_soon';
    _cachedTicker = _cachedTicker || 'BBRK';
  }
  // Ticker labels ($BBRK today, whatever the DB says at launch)
  document.querySelectorAll('.js-ticker').forEach(n => { n.textContent = '$' + _cachedTicker; });
  _syncMoonRoomName(_cachedTicker);

  // Contract address — real 0x… address once set in the DB, else "Not Live Yet"
  const el = document.getElementById('landingCA');
  const copyBtn = document.getElementById('landingCACopy');
  if (!el) return;
  const isLive = /^0x[0-9a-fA-F]{40}$/.test(_cachedCA || '');
  if (isLive) {
    el.textContent = _cachedCA;
    el.style.color = 'var(--accent-green)';
    el.title = '';
    if (copyBtn) copyBtn.style.display = 'inline-block';
  } else {
    el.textContent = 'Not Live Yet';
    el.style.color = '#4b5563';
    el.title = 'Contract address will be revealed at launch';
    if (copyBtn) copyBtn.style.display = 'none';
  }
}
window.__copyCA = () => {
  if (!_cachedCA || _cachedCA === 'coming_soon') return;
  navigator.clipboard.writeText(_cachedCA).then(() => showToast('Contract address copied!'));
};

async function toggleWatchlist() {
  if (!_privyUser && !localStorage.getItem('bb_jwt')) {
    openWalletModal();
    return;
  }
  const d = _currentTokenData;
  // Fallback: read address from the scanned input if currentTokenData not set
  const inputAddr = (document.getElementById('contractInput') || document.getElementById('tokenInput'))?.value?.trim();
  const rawAddr = d?.address || inputAddr;
  if (!rawAddr || document.getElementById('tokenHeader')?.style?.display === 'none') {
    showToast('Scan a token first'); return;
  }
  const addr = rawAddr.toLowerCase();
  const btn = document.getElementById('watchlistBtn');
  if (btn) { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.4'; }
  try {
    const headers = { ..._authHeaders(), 'Content-Type': 'application/json' };
    // Check current DB state
    const checkRes = await fetch(`${API_BASE}/watchlist/check/${encodeURIComponent(addr)}`, { credentials: 'include', headers: _authHeaders() });
    if (checkRes.status === 401) { openWalletModal(); throw new Error('Please connect wallet first'); }
    if (!checkRes.ok) throw new Error('Auth error');
    const { inWatchlist } = await checkRes.json();
    if (inWatchlist) {
      const res = await fetch(`${API_BASE}/watchlist/${addr}`, { method: 'DELETE', credentials: 'include', headers });
      if (!res.ok) throw new Error('Failed to remove');
      _watchlist.delete(addr);
      // Alerts are always tied to a watchlist entry — remove it too so it
      // doesn't keep firing (or showing as "set") for a token no longer tracked.
      fetch(`${API_BASE}/alerts/token/${addr}`, { method: 'DELETE', credentials: 'include', headers: _authHeaders() }).catch(() => {});
      showToast('Removed from watchlist');
    } else {
      const res = await fetch(`${API_BASE}/watchlist`, {
        method: 'POST', credentials: 'include', headers,
        body: JSON.stringify({ address: addr, chain: d?.chain || 'unknown', name: d?.name || addr.slice(0,8), symbol: d?.symbol || '?', imageUrl: d?.imageUrl || null }),
      });
      if (!res.ok) throw new Error('Failed to save');
      _watchlist.add(addr);
      showToast('Added to watchlist ❤');
    }
    _updateWatchlistBtn(addr);
  } catch(e) {
    showToast('Error: ' + e.message);
    _updateWatchlistBtn(addr);
  } finally {
    if (btn) { btn.style.pointerEvents = ''; btn.style.opacity = ''; }
  }
}

async function _bbLogin(wallet, privyUser, method = 'metamask') {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        wallet,
        privyUserId: privyUser?.id || null,
        meta: { connectedAt: Date.now(), method },
      }),
    });
    const data = await res.json();
    if (data.token) localStorage.setItem('bb_jwt', data.token);
    return data;
  } catch(e) {
    console.warn('[bbLogin]', e.message);
  }
}

async function _bbLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch(_) {}
  localStorage.removeItem('bb_jwt');
}

async function _bbMe() {
  try {
    const token = localStorage.getItem('bb_jwt');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/auth/me`, { headers, credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch(_) { return null; }
}


// ── MetaMask mobile app support ──────────────────────────────────────────────
// On a phone with no injected provider (i.e. a normal mobile browser, not the
// MetaMask app's own in-app browser), there's nothing to connect to — MetaMask
// only injects window.ethereum inside its own in-app browser. The fix is to
// hand off to the MetaMask app via its official deep link, which reopens this
// exact page inside MetaMask's in-app browser, where window.ethereum then
// exists and the normal eth_requestAccounts flow below works unchanged.
function _isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function _isInMetaMaskApp() {
  return !!(window.ethereum && window.ethereum.isMetaMask);
}
function metamaskDeepLink() {
  const noProtocol = location.host + location.pathname + location.search;
  return `https://metamask.app.link/dapp/${noProtocol}`;
}
window.connectMetaMaskMobile = function() {
  window.location.href = metamaskDeepLink();
};

// Direct MetaMask (EVM) connection — no Privy / SIWE signature required
async function privyConnectMM() {
  // Mobile browser with no injected wallet → hand off to the MetaMask app
  if (_isMobileDevice() && !window.ethereum) {
    connectMetaMaskMobile();
    return;
  }
  const btn = document.getElementById('mmBtn');
  if (btn) { btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; btn.querySelector('div div').textContent = 'Connecting…'; }
  try {
    if (!window.ethereum) throw new Error('MetaMask extension not found — install it first');
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const wallet = accounts?.[0];
    if (!wallet) throw new Error('No account selected');
    const user = { wallet: { address: wallet }, _displayAddress: wallet };
    await _bbLogin(wallet, null, 'metamask');
    localStorage.removeItem('bb_wallet_disconnected'); // user explicitly (re)connected
    _setWalletConnected(user);
    closeWalletModal();
    showToast('Wallet connected');
  } catch(e) {
    const msg = e.code === 4001 ? 'Connection rejected in MetaMask' : (e.message || 'Unknown error');
    showToast('Connection failed: ' + msg);
    if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = ''; btn.querySelector('div div').textContent = 'MetaMask'; }
  }
}

async function privyLogout() {
  await _bbLogout();
  localStorage.setItem('bb_wallet_disconnected', '1'); // remember: user explicitly disconnected
  _setWalletConnected(null);
  closeWalletModal();
  showToast('Wallet disconnected');
}

// React to account switch / disconnect in MetaMask
if (window.ethereum?.on) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (!accounts?.length) {
      localStorage.setItem('bb_wallet_disconnected', '1');
      _bbLogout(); _setWalletConnected(null); showToast('Wallet disconnected'); return;
    }
    localStorage.removeItem('bb_wallet_disconnected');
    const wallet = accounts[0];
    _bbLogin(wallet, null, 'metamask');
    _setWalletConnected({ wallet: { address: wallet }, _displayAddress: wallet });
    showToast('Switched to ' + wallet.slice(0,6) + '…' + wallet.slice(-4));
  });
}

// Init on page load — cookie/JWT auto-login, then silent MetaMask reconnect
(async function() {
  try {
    // 0. User explicitly disconnected last time — don't auto-reconnect,
    //    even though MetaMask itself still has this site "authorized".
    if (localStorage.getItem('bb_wallet_disconnected') === '1') { _setWalletConnected(null); return; }

    // 1. Check if backend session still valid (cookie auto-login)
    const bbUser = await _bbMe();
    if (bbUser) {
      const displayAddr = bbUser.generated_address || bbUser.wallet;
      _setWalletConnected({ _displayAddress: displayAddr, _fromDb: true, id: bbUser.id });
      return;
    }
    // 2. Silent reconnect if MetaMask is already authorized for this site
    if (!window.ethereum) { _setWalletConnected(null); return; }
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const wallet = accounts?.[0];
    if (wallet) {
      await _bbLogin(wallet, null, 'metamask');
      _setWalletConnected({ wallet: { address: wallet }, _displayAddress: wallet });
    } else {
      _setWalletConnected(null);
    }
  } catch(_) {
    _setWalletConnected(null);
  }
})();

/* ─── Community Chat ────────────────────────────────────────────────────────── */
const CHAT_ROOMS = {
  general:   { name: 'General',    icon: '💬', desc: 'General discussion' },
  trading:   { name: 'Trading',    icon: '📈', desc: 'Token analysis & calls' },
  alpha:     { name: 'Alpha',      icon: '🔥', desc: 'Early alpha & gems' },
  freeshill: { name: 'Free Shill', icon: '📣', desc: 'Shill your token here 🚀' },
  // Read-only BloomBuy feed — name tracks the live ticker (see _syncMoonRoomName).
  moon:      { name: '$BBRK Moon', icon: '🚀', desc: 'Live buy feed — read only', readOnly: true },
  holders:   { name: 'Holders',    icon: '💎', desc: 'Token holders only', gated: true },
  private:   { name: 'Private',    icon: '🔐', desc: 'Pay to unlock', gated: true },
};

// Resolves a URL like /community/general -> 'general', only if it's a real room.
function _communityRoomFromPath(path) {
  const prefix = PAGE_ROUTES.community + '/';
  if (!path.startsWith(prefix)) return null;
  const room = path.slice(prefix.length);
  return CHAT_ROOMS[room] ? room : null;
}

// Keep the Moon room's label in sync with the DB-parameterized ticker
// ($BBRK today, whatever it becomes at launch) once /api/config/public loads.
function _syncMoonRoomName(ticker) {
  if (!ticker) return;
  CHAT_ROOMS.moon.name = `$${ticker} Moon`;
  if (document.getElementById('page-community')?.classList.contains('active')) {
    renderChatRooms();
    if (_chatRoom === 'moon' && $('chatRoomName')) $('chatRoomName').textContent = CHAT_ROOMS.moon.name;
  }
}

// Token-gate state: room -> { ok, kind, balance, minAmount, symbol, network, token, amountEth, treasury }
let _chatGates = {};
function _roomLocked(room) {
  return !!CHAT_ROOMS[room]?.gated && !_chatGates[room]?.ok;
}

// Admin/mute state (set from the chat_history payload + live chat_muted pushes)
let _chatIsAdmin   = false;
let _chatMutedUntil = null;

function _updateMuteBanner() {
  const bar   = $('chatInputBar');
  const input = $('chatInput');
  const muted = _chatMutedUntil && _chatMutedUntil > Date.now();
  let banner = $('chatMuteBanner');
  if (muted) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'chatMuteBanner';
      banner.style.cssText = 'padding:8px 18px;background:var(--red-15);border-top:1px solid var(--red-33);color:#ff6b6b;font-size:11px;font-weight:600;text-align:center;flex-shrink:0';
      bar?.parentElement?.insertBefore(banner, bar);
    }
    const mins = Math.max(1, Math.ceil((_chatMutedUntil - Date.now()) / 60000));
    banner.textContent = `🔇 You've been muted — you can chat again in ${mins} minute${mins === 1 ? '' : 's'}`;
    banner.style.display = 'block';
    if (input) input.disabled = true;
  } else {
    if (banner) banner.style.display = 'none';
    if (input) input.disabled = false;
  }
}

// Update a gated room's sidebar description from its live gate config
function _applyGateDesc(room) {
  const g = _chatGates[room];
  if (!g || !CHAT_ROOMS[room]) return;
  const minFmt = (+(g.minAmount ?? 0)).toLocaleString('en-US', { maximumFractionDigits: 2 });
  CHAT_ROOMS[room].desc = g.kind === 'paid'
    ? (g.ok ? 'Unlocked' : `Pay ${g.amountEth} ${g.symbol} to unlock`)
    : `Hold ≥ ${minFmt} ${g.symbol}${g.minUsd ? ` OR $${g.minUsd} USD` : ''} to unlock`;
}

// Fetch gate status for the connected wallet, then refresh room UI
async function checkChatGates() {
  const wallet = window._privyWallet || 'none';
  try {
    const res = await fetch(`${API_BASE}/community/gate/${wallet}`);
    const j = await res.json();
    _chatGates = j.gates || {};
  } catch (_) { _chatGates = {}; }
  Object.keys(_chatGates).forEach(_applyGateDesc);
  renderChatRooms();
  if (CHAT_ROOMS[_chatRoom]?.gated) switchChatRoom(_chatRoom); // refresh lock screen if viewing a gated room
}

let _chatWs        = null;
let _chatRoom      = null; // null = no channel picked yet — show the channel list, not a default room
let _chatMessages  = {};   // room -> [{...}]
let _chatUnread    = {};   // room -> count
let _chatConnected = false;
// Username cache is per-wallet (see _chatNameKey) — starts empty and is loaded
// for the connected wallet in _loadChatIdentityForWallet().
let _chatName      = null;
let _chatNameEdits = 0;


function fmtChatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function _defaultChatName(w) { return w ? (w.slice(0, 4) + '...' + w.slice(-4)) : ''; }

// True when the chat name is still the auto-generated "0xAB…CD12" placeholder
// (i.e. the user has never picked a real username).
function _isDefaultChatName() {
  const w = window._privyWallet;
  if (!w || !_chatName) return false;
  return _chatName === _defaultChatName(w);
}

// Has this wallet picked a real username (not the default 0xAB…CD12 form)?
// Checks the loaded server profile, the in-memory name, then the per-wallet
// localStorage cache directly (so a fresh page load — where the async profile
// fetch may not have finished yet — still recognizes a previously-set name).
function _hasCustomUsername() {
  if (_userProfile?.displayName) return true;
  if (_chatName && !_isDefaultChatName()) return true;
  const w = window._privyWallet;
  if (w) {
    const cached = localStorage.getItem(_chatNameKey(w));
    if (cached && cached !== _defaultChatName(w)) return true;
  }
  return false;
}

// Open the Wallet Profile popup straight into the username editor. Used to make
// the user set a name before they're allowed into Community.
function _openUsernamePrompt() {
  showToast('Set a username to enter the Community (max 15 characters)');
  const popup = document.getElementById('profilePopup');
  if (popup && popup.style.display === 'none') toggleProfilePopup();
  chatNameStartEdit();
}

function initCommunity() {
  checkChatGates();
  // Only auto-open a room if the URL explicitly names one (e.g. a shared
  // /community/freeshill link or browser back/forward) — otherwise land on
  // the channel list and let the user pick.
  // A plain nav-item click re-pushes the room-less /community URL (see
  // _activatePage), clobbering whatever /community/<room> switchChatRoom
  // had pushed — so the URL alone can't tell "user picked no room yet" apart
  // from "user was in a room and just tabbed away and back". Fall back to
  // the in-memory _chatRoom (still set from the prior visit this session)
  // before giving up and showing the channel-list placeholder.
  const roomFromUrl = _communityRoomFromPath(location.pathname) || _chatRoom;
  if (_chatWs && _chatWs.readyState === WebSocket.OPEN) {
    renderChatRooms();
    if (roomFromUrl) switchChatRoom(roomFromUrl, { pushUrl: false });
    else _showCommunityChannelListOnly();
    return;
  }
  _chatRoom = roomFromUrl || null;
  renderChatRooms();
  // Show the placeholder immediately rather than a blank pane while the WS
  // connects — chat_history will refresh this once real data arrives (and
  // will switch straight to roomFromUrl if one was requested).
  if (!roomFromUrl) _showCommunityChannelListOnly();
  connectChat();
}

// Neutral placeholder shown in the message pane when no channel is selected
// yet — the channel list (sidebar) is always visible regardless.
function _showCommunityChannelListOnly() {
  const el = $('chatMessages');
  if (el) el.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;gap:10px;color:var(--text-muted)">
      <div style="font-size:40px;line-height:1">💬</div>
      <div style="font-size:14px;font-weight:700;color:var(--text-primary)">Pick a channel to start chatting</div>
      <div style="font-size:12px">Select any channel from the list on the left.</div>
    </div>`;
  if ($('chatRoomIcon')) $('chatRoomIcon').textContent = '💬';
  if ($('chatRoomName')) $('chatRoomName').textContent = 'Select a channel';
  if ($('chatRoomDesc')) $('chatRoomDesc').textContent = '';
  const inputBar = $('chatInputBar');
  if (inputBar) inputBar.style.display = 'none';
  _updateReadOnlyBanner(false);
  renderChatRooms();
}

function connectChat() {
  const wsUrl = API_BASE.replace('http', 'ws').replace('/api', '') || `ws://${location.host}`;
  _chatWs = new WebSocket(wsUrl);

  _chatWs.onopen = () => {
    _chatConnected = true;
    // Get wallet from Privy or generate anon name
    const wallet = window._privyWallet || null;
    _chatName = _chatName || (wallet ? wallet.slice(0,4)+'...'+wallet.slice(-4) : 'Anon#'+Math.floor(Math.random()*9999));
    _chatWs.send(JSON.stringify({ type: 'chat_join', wallet, displayName: _chatName, avatar: _userProfile?.avatar || null }));
    if ($('chatNameInput') && !$('chatNameInput').value) $('chatNameInput').placeholder = _chatName;
    appendChatSystem('general', '🟢 Connected to Bloombark Community');
  };

  _chatWs.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data);
      if (d.type === 'chat_history') {
        _chatMessages = {};
        for (const [room, msgs] of Object.entries(d.history || {})) _chatMessages[room] = msgs;
        if (d.gates) { _chatGates = { ..._chatGates, ...d.gates }; Object.keys(_chatGates).forEach(_applyGateDesc); renderChatRooms(); }
        _chatIsAdmin    = !!d.isAdmin;
        _chatMutedUntil = d.mutedUntil || null;
        _updateMuteBanner();
        updateOnlineCount(d.online || 0);
        if (!_chatRoom) _showCommunityChannelListOnly();
        else if (CHAT_ROOMS[_chatRoom]?.gated) switchChatRoom(_chatRoom, { pushUrl: false });
        else renderChatMessages();
      } else if (d.type === 'chat_muted') {
        _chatMutedUntil = d.mutedUntil || null;
        _updateMuteBanner();
        if (_chatMutedUntil) showToast('🔇 You have been muted by an admin');
        else showToast('🔊 Your mute has been lifted');
      } else if (d.type === 'chat_mute_ok') {
        showToast(d.mutedUntil ? `Muted ${d.wallet.slice(0,6)}…${d.wallet.slice(-4)}` : `Unmuted ${d.wallet.slice(0,6)}…${d.wallet.slice(-4)}`);
      } else if (d.type === 'chat_gate_denied') {
        showToast(`🔒 ${CHAT_ROOMS[d.room]?.name || 'Channel'} locked — need ≥ ${d.minAmount} ${d.symbol} (you have ${(+d.balance).toFixed(4)})`);
      } else if (d.type === 'chat_msg') {
        const msg = d.msg;
        if (!_chatMessages[msg.room]) _chatMessages[msg.room] = [];
        _chatMessages[msg.room].push(msg);
        updateOnlineCount(d.online || 0);
        if (msg.room === _chatRoom) {
          appendChatMessage(msg);
          scrollChatBottom();
        } else if (!_roomLocked(msg.room)) {
          // Only count as unread if the wallet actually has access to this
          // channel — Holders/Private never contribute when not eligible.
          _chatUnread[msg.room] = (_chatUnread[msg.room] || 0) + 1;
          updateRoomUnread(msg.room);
        }
      } else if (d.type === 'chat_edited') {
        const arr = _chatMessages[d.room];
        if (arr) { const m = arr.find(x => String(x.id) === String(d.id)); if (m) { m.text = d.text; m.edited = true; } }
        if (d.room === _chatRoom) renderChatMessages();
      } else if (d.type === 'chat_deleted') {
        const arr = _chatMessages[d.room];
        const removed = arr ? arr.find(x => String(x.id) === String(d.id)) : null;
        if (arr) { const i = arr.findIndex(x => String(x.id) === String(d.id)); if (i >= 0) arr.splice(i, 1); }
        if (d.room === _chatRoom) renderChatMessages();
        if (d.byAdmin && removed && window._privyWallet && removed.wallet === window._privyWallet) {
          showToast('🛡️ Your message was removed by an admin');
        }
      } else if (d.type === 'chat_online') {
        updateOnlineCount(d.online || 0);
      } else if (d.type === 'chat_nameok') {
        _chatName = d.displayName;
        if ($('chatNameInput')) $('chatNameInput').placeholder = _chatName;
        appendChatSystem(_chatRoom, `✏️ Name changed to "${_chatName}"`);
      }
    } catch(_) {}
  };

  _chatWs.onclose = () => {
    _chatConnected = false;
    appendChatSystem('general', '🔴 Disconnected. Reconnecting in 3s…');
    setTimeout(connectChat, 3000);
  };

  _chatWs.onerror = () => _chatWs.close();
}

function renderChatRooms() {
  const el = $('chatRoomList');
  if (!el) return;
  el.innerHTML = Object.entries(CHAT_ROOMS).map(([id, r]) => {
    const locked = _roomLocked(id);
    return `
    <button class="chat-room-btn ${id === _chatRoom ? 'active' : ''}" onclick="switchChatRoom('${id}')" ${locked ? `title="Locked — ${_escapeHtml(r.desc)}"` : ''}>
      <span>${r.icon}</span><span style="${locked ? 'opacity:.55' : ''}">${r.name}</span>
      ${locked ? '<span style="margin-left:auto;font-size:11px">🔒</span>' : `<span class="room-unread" id="unread-${id}">${_chatUnread[id]||''}</span>`}
    </button>`;
  }).join('');
  _updateChatNavBadge();
}

function switchChatRoom(room, { pushUrl = true } = {}) {
  _chatRoom = room;
  _chatUnread[room] = 0;
  // Clear any pending reply/edit context carried over from another room.
  if (typeof chatCancelContext === 'function') chatCancelContext();
  if (pushUrl) {
    const url = PAGE_ROUTES.community + '/' + room;
    if (location.pathname !== url) history.pushState({ page: 'community', room }, '', url);
  }
  const r = CHAT_ROOMS[room];
  if ($('chatRoomIcon'))  $('chatRoomIcon').textContent  = r.icon;
  if ($('chatRoomName'))  $('chatRoomName').textContent  = r.name;
  if ($('chatRoomDesc'))  $('chatRoomDesc').textContent  = r.desc;
  if ($('chatInput'))     $('chatInput').placeholder     = `Message #${r.name.toLowerCase()}…`;
  renderChatRooms();

  const locked = _roomLocked(room);
  const inputBar = $('chatInputBar');
  if (inputBar) inputBar.style.display = (locked || r.readOnly) ? 'none' : 'flex';
  _updateReadOnlyBanner(r.readOnly && !locked);
  if (locked) { renderChatLockScreen(room); return; }

  renderChatMessages();
  scrollChatBottom();
}

// Small note shown above a read-only room's message list (e.g. $BBRK Moon) —
// input bar is hidden there, this explains why.
function _updateReadOnlyBanner(show) {
  const bar = $('chatInputBar');
  let banner = $('chatReadOnlyBanner');
  if (show) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'chatReadOnlyBanner';
      banner.style.cssText = 'padding:8px 18px;background:var(--green-0f);border-top:1px solid var(--green-30);color:var(--accent-green);font-size:11px;font-weight:600;text-align:center;flex-shrink:0';
      banner.textContent = '📖 Read-only — automated buy alerts, no chatting here';
      bar?.parentElement?.insertBefore(banner, bar);
    }
    banner.style.display = 'block';
  } else if (banner) {
    banner.style.display = 'none';
  }
}

function renderChatLockScreen(room) {
  const el = $('chatMessages');
  if (!el) return;
  const g = _chatGates[room] || {};

  if (g.kind === 'paid') { _renderPaidLockScreen(room, g); return; }

  const min     = (+(g.minAmount ?? 0)).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const minUsd  = g.minUsd ?? null;
  const symbol  = g.symbol || 'TOKEN';
  const network = g.network || '';
  const token   = g.token || '';
  const connected = !!window._privyWallet;
  const bal = connected
    ? `You have <b style="color:#e2e8f0">${(+g.balance || 0).toLocaleString('en-US',{maximumFractionDigits:4})} ${symbol}</b>`
    : 'Connect your wallet to check eligibility';
  const tokenLine = token
    ? `<div style="font-size:10px;color:#4b5563;font-family:monospace;margin-top:2px">${symbol}${network ? ' · ' + network : ''} · ${token.slice(0,10)}…${token.slice(-8)}</div>`
    : '';
  el.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;gap:14px">
      <div style="font-size:52px;line-height:1">🔒</div>
      <div style="font-size:17px;font-weight:800;color:var(--text-primary)">Holders Only</div>
      <div style="font-size:13px;color:var(--text-muted);line-height:1.6;max-width:360px">
        This channel is locked. You need to hold at least <b style="color:var(--accent-green)">${min} ${symbol}</b>${minUsd ? ` OR <b style="color:var(--accent-green)">$${minUsd} USD</b> ${symbol}` : ''}${network ? ` on <b style="color:var(--accent-green)">${network}</b>` : ''} to unlock it.<br>${bal}
      </div>
      ${tokenLine}
      <div style="display:flex;gap:10px;margin-top:6px">
        ${connected
          ? `<button onclick="checkChatGates()" style="background:var(--green-15);border:1px solid var(--green-40);color:var(--accent-green);font-size:12px;font-weight:700;padding:9px 20px;border-radius:8px;cursor:pointer">↻ Re-check balance</button>`
          : `<button onclick="openWalletModal()" style="background:var(--accent-green);border:none;color:#000;font-size:12px;font-weight:800;padding:9px 22px;border-radius:8px;cursor:pointer">Connect Wallet</button>`}
      </div>
    </div>`;
}

// localStorage key holding a sent-but-not-yet-verified payment tx for a room.
function _pendingPayKey(wallet, room) { return 'bloomPrivatePay:' + String(wallet || '').toLowerCase() + ':' + room; }

function _renderPaidLockScreen(room, g) {
  const el = $('chatMessages');
  if (!el) return;
  const connected = !!window._privyWallet;
  const treasury  = g.treasury || '';
  // If we already sent a payment for this wallet+room that hasn't been recorded
  // yet (verify failed / a refresh happened mid-verify), offer to re-verify
  // instead of paying again — and auto-attempt it below.
  const hasPending = connected && !!localStorage.getItem(_pendingPayKey(window._privyWallet, room));
  const primaryBtn = !connected
    ? `<button onclick="openWalletModal()" style="background:var(--accent-green);border:none;color:#000;font-size:12px;font-weight:800;padding:9px 22px;border-radius:8px;cursor:pointer">Connect Wallet</button>`
    : hasPending
      ? `<button id="chatPayBtn" onclick="chatRetryVerify('${room}')" style="background:var(--accent-green);border:none;color:#000;font-size:12px;font-weight:800;padding:9px 22px;border-radius:8px;cursor:pointer">Verify Payment</button>`
      : `<button id="chatPayBtn" onclick="chatPayUnlock('${room}')" style="background:var(--accent-green);border:none;color:#000;font-size:12px;font-weight:800;padding:9px 22px;border-radius:8px;cursor:pointer">Pay ${g.amountEth} ${g.symbol} to Unlock</button>`;
  el.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;gap:14px">
      <div style="font-size:52px;line-height:1">🔐</div>
      <div style="font-size:17px;font-weight:800;color:var(--text-primary)">Private Channel</div>
      <div style="font-size:13px;color:var(--text-muted);line-height:1.6;max-width:360px">
        One-time payment of <b style="color:var(--accent-green)">${g.amountEth} ${g.symbol}</b> unlocks this channel permanently for your wallet.
      </div>
      <div style="font-size:10px;color:#4b5563;font-family:monospace">${treasury.slice(0,10)}…${treasury.slice(-8)}</div>
      <div id="chatPayStatus" style="display:none;font-size:12px;color:var(--accent-blue)"></div>
      <div style="display:flex;gap:10px;margin-top:6px">${primaryBtn}</div>
      ${hasPending ? `<div style="font-size:10px;color:#8b92a8;max-width:320px">We detected a payment you already sent — verifying it now…</div>` : ''}
    </div>`;
  // Auto-recover: if a payment tx is pending verification, try once on render.
  if (hasPending) setTimeout(() => chatRetryVerify(room), 300);
}

// Send the one-time unlock payment via MetaMask, then have the backend verify
// it on-chain before marking the room unlocked for this wallet.
// POST the tx to the backend, which verifies it on-chain and records the unlock.
// Idempotent server-side (tx_hash is unique), so it's safe to call repeatedly.
async function _submitPaymentVerify(room, txHash, wallet) {
  const res = await fetch(`${API_BASE}/community/pay-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, room, txHash }),
  });
  return res.json();
}

window.chatPayUnlock = async function(room) {
  const g = _chatGates[room];
  if (!g || g.kind !== 'paid') return;
  if (!window.ethereum) { showToast('MetaMask not found'); return; }
  const wallet = window._privyWallet;
  if (!wallet) { openWalletModal(); return; }

  const btn = $('chatPayBtn');
  const status = $('chatPayStatus');
  const setStatus = (text) => { if (status) { status.textContent = text; status.style.display = 'block'; } };

  try {
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.textContent = 'Confirm in wallet…'; }
    // Force the wallet onto the gate's actual chain first — without this, a
    // wallet left on a different network (e.g. leftover testnet selection)
    // would silently send the payment there instead of the intended chain.
    if (g.chainKey && TRADE_CHAINS[g.chainKey]) {
      if (btn) btn.textContent = 'Switching network…';
      await _ensureChain(g.chainKey);
      if (btn) btn.textContent = 'Confirm in wallet…';
    }
    const valueWei = BigInt(Math.round(g.amountEth * 1e18));
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: wallet, to: g.treasury, value: '0x' + valueWei.toString(16) }],
    });
    // Persist the tx immediately — if verification (or the whole page) dies now,
    // the payment isn't lost: on next visit we auto-retry verifying this hash.
    try { localStorage.setItem(_pendingPayKey(wallet, room), txHash); } catch (_) {}
    setStatus('⏳ Verifying payment on-chain…');
    if (btn) btn.textContent = 'Verifying…';

    const j = await _submitPaymentVerify(room, txHash, wallet);
    if (!j.ok) throw new Error(j.error || 'Verification failed');

    try { localStorage.removeItem(_pendingPayKey(wallet, room)); } catch (_) {}
    showToast('🔓 Private channel unlocked!');
    await checkChatGates();
  } catch (e) {
    const cancelled = e?.code === 4001 || /user denied|user rejected/i.test(e?.message || '');
    if (cancelled) {
      // Nothing was sent — clear any stale pending marker and reset the button.
      try { localStorage.removeItem(_pendingPayKey(wallet, room)); } catch (_) {}
      showToast('Payment cancelled');
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = `Pay ${g.amountEth} ${g.symbol} to Unlock`; }
      if (status) status.style.display = 'none';
    } else {
      // The tx likely went through but verify failed — keep the pending hash and
      // re-render into the "Verify Payment" state so the user can retry (no re-pay).
      showToast((e?.message || 'Verification failed') + ' — you can retry, no need to pay again');
      switchChatRoom(room);
    }
  }
};

// Re-verify a payment the user already sent (from the stored tx hash) without
// paying again. Used by the "Verify Payment" button and the auto-retry.
window.chatRetryVerify = async function(room) {
  const wallet = window._privyWallet;
  if (!wallet) { openWalletModal(); return; }
  const txHash = localStorage.getItem(_pendingPayKey(wallet, room));
  if (!txHash) { switchChatRoom(room); return; }
  const btn = $('chatPayBtn');
  const status = $('chatPayStatus');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.textContent = 'Verifying…'; }
  if (status) { status.textContent = '⏳ Verifying your payment on-chain…'; status.style.display = 'block'; }
  try {
    const j = await _submitPaymentVerify(room, txHash, wallet);
    if (!j.ok) throw new Error(j.error || 'Verification failed');
    try { localStorage.removeItem(_pendingPayKey(wallet, room)); } catch (_) {}
    showToast('🔓 Private channel unlocked!');
    await checkChatGates();
  } catch (e) {
    showToast((e?.message || 'Still verifying') + ' — try again in a moment');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Verify Payment'; }
  }
};

function renderChatMessages() {
  const el = $('chatMessages');
  if (!el) return;
  const msgs = _chatMessages[_chatRoom] || [];
  if (!msgs.length) {
    el.innerHTML = `<div class="chat-system">No messages yet. Say hi! 👋</div>`;
    return;
  }
  el.innerHTML = msgs.map(m => buildMsgHtml(m)).join('');
}

function _refreshMyMessages() {
  // Update displayName + avatar on all cached messages that belong to me, then re-render
  const wallet = window._privyWallet;
  for (const msgs of Object.values(_chatMessages)) {
    for (const m of msgs) {
      if (wallet && m.wallet === wallet) {
        if (_chatName)            m.displayName = _chatName;
        if (_userProfile?.avatar !== undefined) m.avatar = _userProfile?.avatar || null;
      }
    }
  }
  renderChatMessages();
}

function isMine(m) {
  if (_chatName && m.displayName === _chatName) return true;
  if (window._privyWallet && m.wallet === window._privyWallet) return true;
  return false;
}

function _chatAvatarHtml(m, size = 30) {
  const src = m.avatar || blockieDataUrl(m.wallet || m.displayName || 'anon');
  const ring = m.isSenderAdmin ? 'box-shadow:0 0 0 2px #f5a623;' : m.isDiamondHolder ? 'box-shadow:0 0 0 2px #6ec6ff;' : '';
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;${ring}"><img src="${src}" style="width:100%;height:100%;object-fit:cover"></div>`;
}

function _escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Reply quote shown inside a bubble when a message replies to another.
function _replyQuoteHtml(m, mine) {
  if (!m.replyTo) return '';
  const border = mine ? 'rgba(0,0,0,0.35)' : 'var(--accent-green)';
  const nameCol = mine ? 'rgba(0,0,0,0.75)' : 'var(--accent-green)';
  const txtCol  = mine ? 'rgba(0,0,0,0.6)'  : 'var(--text-muted)';
  return `<div onclick="chatScrollToMsg('${m.replyTo}')" style="border-left:2px solid ${border};padding:2px 8px;margin-bottom:5px;cursor:pointer;border-radius:3px;background:rgba(255,255,255,0.06);max-width:100%;overflow:hidden">
    <div style="font-size:10px;font-weight:700;color:${nameCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escapeHtml(m.replyName || 'Anon')}</div>
    <div style="font-size:11px;color:${txtCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escapeHtml(m.replyText || '')}</div>
  </div>`;
}

// Hover action buttons (reply for everyone; edit/delete for own wallet-owned msgs).
function _msgActionsHtml(m, mine) {
  // Read-only rooms (e.g. $BBRK Moon) have nothing to reply to — no one can post.
  if (CHAT_ROOMS[_chatRoom]?.readOnly) return '';
  const canModify = mine && window._privyWallet && m.wallet && m.wallet === window._privyWallet;
  const isAdminTarget = _chatIsAdmin && !canModify && m.wallet && !m.isBot; // admin acting on someone else's message
  const btn = (label, fn, extra='') => `<button onclick="event.stopPropagation();${fn}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:11px;padding:2px 4px;line-height:1;${extra}" title="${label}">${label}</button>`;
  let btns = btn('Reply', `chatSetReply('${m.id}')`);
  if (canModify && !m.imgData) btns += btn('Edit', `chatStartEdit('${m.id}')`);
  if (canModify) btns += btn('Delete', `chatDeleteMsg('${m.id}')`, 'color:#ff6b6b');
  if (isAdminTarget) {
    btns += btn('Delete', `chatDeleteMsg('${m.id}')`, 'color:#ff6b6b');
    btns += btn('Mute', `chatAdminMute('${m.wallet}','${_escapeHtml(m.displayName || 'this user')}')`, 'color:#f5a623');
  }
  return `<div class="chat-msg-actions">${btns}</div>`;
}

function buildMsgHtml(m) {
  const mine    = isMine(m);
  const safe    = (m.text||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const avatarHtml = _chatAvatarHtml(m, 30);

  const textHtml = safe.replace(/(https?:\/\/[^\s]+)/g, (url) => {
    if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url))
      return `<br><img src="${url}" style="max-width:260px;max-height:200px;border-radius:8px;margin-top:6px;cursor:pointer;display:block" onclick="chatZoomImg('${url}')" onerror="this.style.display='none'">`;
    return `<a href="${url}" target="_blank" rel="noopener" style="color:${mine?'#a7f3d0':'var(--accent-blue)'}">${url}</a>`;
  });
  const imgHtml = m.imgData
    ? `<div style="margin-top:6px"><img src="${m.imgData}" style="max-width:260px;max-height:200px;border-radius:8px;cursor:pointer;display:block" onclick="chatZoomImg(this.src)"></div>`
    : '';
  const editedHtml = m.edited ? `<span style="font-size:9px;opacity:0.6;margin-left:4px">(edited)</span>` : '';
  const replyQuote = _replyQuoteHtml(m, mine);
  const actions    = _msgActionsHtml(m, mine);

  if (mine) {
    return `<div class="chat-msg-row" id="msg-${m.id}" style="display:flex;justify-content:flex-end;padding:3px 0;gap:8px;align-items:flex-end">
      ${actions}
      <div style="max-width:72%;display:flex;flex-direction:column;align-items:flex-end">
        <span style="font-size:10px;color:var(--text-muted);margin-bottom:3px">${fmtChatTime(m.ts)}${editedHtml}</span>
        <div style="background:var(--accent-green);color:#000;padding:9px 13px;border-radius:16px 16px 4px 16px;font-size:13px;line-height:1.5;word-break:break-word;max-width:100%">
          ${replyQuote}${textHtml}${imgHtml}
        </div>
      </div>
      ${avatarHtml}
    </div>`;
  }

  const nameHtml = m.isSenderAdmin
    ? `<span style="color:#f5a623;font-weight:800">👑${m.isDiamondHolder ? '💎' : ''} ${_escapeHtml(m.displayName)}</span>`
    : m.isDiamondHolder
      ? `<span style="color:#6ec6ff;font-weight:800">💎 ${_escapeHtml(m.displayName)}</span>`
      : _escapeHtml(m.displayName);
  return `<div class="chat-msg-row" id="msg-${m.id}" style="display:flex;padding:3px 0;gap:8px;align-items:flex-end">
    ${avatarHtml}
    <div style="max-width:72%;display:flex;flex-direction:column;align-items:flex-start">
      <span style="font-size:10px;color:var(--text-muted);margin-bottom:3px">${nameHtml} · ${fmtChatTime(m.ts)}${editedHtml}</span>
      <div style="background:var(--bg-card);border:1px solid var(--border-light);color:var(--text-primary);padding:9px 13px;border-radius:16px 16px 16px 4px;font-size:13px;line-height:1.5;word-break:break-word;max-width:100%">
        ${replyQuote}${textHtml}${imgHtml}
      </div>
    </div>
    ${actions}
  </div>`;
}

function appendChatMessage(m) {
  const el = $('chatMessages');
  if (!el) return;
  // Remove "no messages" placeholder
  if (el.querySelector('.chat-system')) el.innerHTML = '';
  const div = document.createElement('div');
  div.innerHTML = buildMsgHtml(m);
  el.appendChild(div.firstElementChild);
}

function appendChatSystem(room, text) {
  if (room !== _chatRoom) return;
  const el = $('chatMessages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'chat-system';
  div.textContent = text;
  el.appendChild(div);
  scrollChatBottom();
}

function scrollChatBottom() {
  const el = $('chatMessages');
  if (el) el.scrollTop = el.scrollHeight;
}

// "X online" — shown inside the Community page itself (sidebar count + room
// header). Unrelated to the sidebar nav badge, which shows unread messages.
function updateOnlineCount(n) {
  if ($('chatOnlineCount'))   $('chatOnlineCount').textContent  = n;
  if ($('chatOnlineHeader'))  $('chatOnlineHeader').textContent = `${n} online`;
}

function updateRoomUnread(room) {
  const el = $(`unread-${room}`);
  if (!el) return;
  const n = _chatUnread[room] || 0;
  el.textContent = n || '';
  el.style.display = n > 0 ? 'inline' : 'none';
  _updateChatNavBadge();
}

// Sidebar nav badge (next to "Community") = total unread across channels the
// wallet actually has access to. Gated channels the user isn't eligible for
// (Holders, Private) never contribute — their unread never accumulates there.
function _updateChatNavBadge() {
  const badge = $('chatOnlineBadge');
  if (!badge) return;
  const total = Object.keys(CHAT_ROOMS)
    .filter(room => !_roomLocked(room))
    .reduce((sum, room) => sum + (_chatUnread[room] || 0), 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? 'inline' : 'none';
  _titleCommunityUnread = total;
  _updateTabTitle();
}

let _chatPendingImg = null;
let _chatReplyTo    = null;  // { id, name, text } — message being replied to
let _chatEditId     = null;  // id of the message currently being edited

// Find a message across the current room's cache.
function _findMsg(id) {
  return (_chatMessages[_chatRoom] || []).find(m => String(m.id) === String(id));
}

// Render the little context bar above the input (reply target / edit mode).
function _renderChatContextBar() {
  const bar = $('chatContextBar');
  if (!bar) return;
  if (_chatEditId) {
    bar.style.display = 'flex';
    bar.innerHTML = `<div style="flex:1;min-width:0;overflow:hidden">
        <div style="font-size:10px;font-weight:700;color:var(--accent-yellow)">✏️ Editing message</div>
      </div>
      <button onclick="chatCancelContext()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:15px;line-height:1">✕</button>`;
  } else if (_chatReplyTo) {
    bar.style.display = 'flex';
    bar.innerHTML = `<div style="flex:1;min-width:0;overflow:hidden;border-left:2px solid var(--accent-green);padding-left:8px">
        <div style="font-size:10px;font-weight:700;color:var(--accent-green)">↩ Replying to ${_escapeHtml(_chatReplyTo.name)}</div>
        <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escapeHtml(_chatReplyTo.text)}</div>
      </div>
      <button onclick="chatCancelContext()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:15px;line-height:1">✕</button>`;
  } else {
    bar.style.display = 'none';
    bar.innerHTML = '';
  }
}

window.chatSetReply = function(id) {
  const m = _findMsg(id);
  if (!m) return;
  _chatEditId = null;
  _chatReplyTo = { id: m.id, name: m.displayName || 'Anon', text: (m.text || (m.imgData ? '📷 image' : '')).slice(0, 120) };
  _renderChatContextBar();
  $('chatInput')?.focus();
};

window.chatStartEdit = function(id) {
  const m = _findMsg(id);
  if (!m) return;
  _chatReplyTo = null;
  _chatEditId  = m.id;
  const inp = $('chatInput');
  if (inp) { inp.value = m.text || ''; inp.focus(); }
  _renderChatContextBar();
};

window.chatCancelContext = function() {
  const wasEdit = !!_chatEditId;
  _chatReplyTo = null;
  _chatEditId  = null;
  if (wasEdit && $('chatInput')) { $('chatInput').value = ''; $('chatInput').style.height = 'auto'; }
  _renderChatContextBar();
};

window.chatDeleteMsg = function(id) {
  if (!_chatWs || !_chatConnected) return;
  bloombarkConfirm('Delete this message?', () => {
    _chatWs.send(JSON.stringify({ type: 'chat_delete', id }));
  }, { confirmLabel: 'Delete' });
};

// Admin: mute a wallet — quick duration picker instead of a native prompt().
window.chatAdminMute = function(wallet, name) {
  if (!_chatWs || !_chatConnected || !_chatIsAdmin) return;
  const existing = document.getElementById('bbMuteModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'bbMuteModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);z-index:10000;display:flex;align-items:center;justify-content:center';
  const durations = [['10 min',10],['1 hour',60],['1 day',1440],['7 days',10080],['30 days',43200]];
  overlay.innerHTML = `
    <div style="background:#161822;border:1px solid #1e2235;border-radius:16px;padding:24px 22px;width:300px;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
      <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px">Mute ${_escapeHtml(name)}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:16px">They won't be able to send messages until the mute expires.</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${durations.map(([label, mins]) => `<button data-mins="${mins}" style="background:#1e2235;border:1px solid #2d3748;border-radius:10px;color:#e2e8f0;font-size:12px;font-weight:600;padding:9px;cursor:pointer;text-align:left;padding-left:14px">${label}</button>`).join('')}
      </div>
      <button id="bbMuteCancel" style="width:100%;margin-top:12px;background:none;border:none;color:#6b7280;font-size:11px;cursor:pointer;padding:6px">Cancel</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#bbMuteCancel').onclick = () => overlay.remove();
  overlay.querySelectorAll('button[data-mins]').forEach(b => {
    b.onclick = () => {
      _chatWs.send(JSON.stringify({ type: 'chat_mute', wallet, minutes: parseInt(b.dataset.mins) }));
      overlay.remove();
    };
  });
  document.body.appendChild(overlay);
};

window.chatScrollToMsg = function(id) {
  const el = document.getElementById('msg-' + id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.transition = 'background 0.2s';
  el.style.background = 'rgba(39,201,127,0.12)';
  setTimeout(() => { el.style.background = ''; }, 1200);
};

function chatSend() {
  const inp = $('chatInput');
  if (!inp || !_chatConnected || !_chatWs) return;
  const text = inp.value.trim();

  // Edit mode: save the edit instead of sending a new message.
  if (_chatEditId) {
    if (!text) { showToast('Message cannot be empty'); return; }
    _chatWs.send(JSON.stringify({ type: 'chat_edit', id: _chatEditId, text }));
    inp.value = '';
    inp.style.height = 'auto';
    _chatEditId = null;
    _renderChatContextBar();
    closeEmojiPicker();
    return;
  }

  if (_roomLocked(_chatRoom)) { showToast('🔒 This channel is locked'); return; }
  if (!text && !_chatPendingImg) return;
  _chatWs.send(JSON.stringify({
    type: 'chat_msg', room: _chatRoom, text,
    imgData: _chatPendingImg || null,
    replyTo: _chatReplyTo?.id || null,
  }));
  inp.value = '';
  inp.style.height = 'auto';
  _chatReplyTo = null;
  _renderChatContextBar();
  chatClearImg();
  closeEmojiPicker();
}

function chatLoadImg(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Image too large (max 2MB)'); input.value=''; return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    // Compress via canvas — capped at 640px on the long edge, then step the
    // JPEG quality down until it's comfortably under the server's storage
    // cap (400KB raw / ~530KB base64), so chat images never bloat the DB.
    const img = new Image();
    img.onload = () => {
      const MAX = 640;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) { if (w > h) { h = h/w*MAX; w = MAX; } else { w = w/h*MAX; h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const TARGET_LEN = 350000; // base64 chars — safely under the 400000 server cap
      let dataUrl, quality = 0.65;
      do {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        quality -= 0.15;
      } while (dataUrl.length > TARGET_LEN && quality > 0.2);
      _chatPendingImg = dataUrl;
      const preview = $('chatImgPreview');
      const thumb = $('chatImgThumb');
      if (preview && thumb) { thumb.src = _chatPendingImg; preview.style.display = 'flex'; }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function chatClearImg() {
  _chatPendingImg = null;
  const preview = $('chatImgPreview');
  if (preview) preview.style.display = 'none';
  const inp = $('chatImgInput');
  if (inp) inp.value = '';
}

function chatZoomImg(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  overlay.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:10px;box-shadow:0 0 40px #0008">`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

// ── Emoji Picker ──
const EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤩','🥳','😤','🤔','🫡','🤫','😱','🫣',
  '🔥','💎','🚀','🌙','💰','📈','📉','💸','🤑','💯','✅','❌','⚡','👀','🫀',
  '👍','👎','👏','🙏','💪','🫶','✌️','🤝','💀','👻','🎯','🎰','🎲','🏆',
  '🐋','🦈','🐂','🐸','🦍','🐉','🦁','🐺','🦊','🐻','🐼','🐨','🦄',
  '💬','📣','🔔','⚠️','❓','❗','💡','🔑','🛡️','⚔️','🎪','🎭','🎨',
];

let _emojiOpen = false;

function toggleEmojiPicker() {
  const el = $('emojiPicker');
  if (!el) return;
  _emojiOpen = !_emojiOpen;
  if (_emojiOpen) {
    el.style.display = 'flex';
    el.innerHTML = EMOJIS.map(e =>
      `<span onclick="insertEmoji('${e}')" style="font-size:20px;cursor:pointer;padding:4px;border-radius:4px;line-height:1;transition:transform .1s"
        onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform=''">${e}</span>`
    ).join('');
  } else {
    el.style.display = 'none';
  }
}

function closeEmojiPicker() {
  _emojiOpen = false;
  const el = $('emojiPicker');
  if (el) el.style.display = 'none';
}

function insertEmoji(e) {
  const inp = $('chatInput');
  if (!inp) return;
  const pos = inp.selectionStart || inp.value.length;
  inp.value = inp.value.slice(0, pos) + e + inp.value.slice(pos);
  inp.focus();
  inp.setSelectionRange(pos + e.length, pos + e.length);
}

const MAX_NAME_EDITS = 2;

function _chatNameRenderState() {
  const section = $('usernameSection');
  const view    = $('chatNameView');
  const edit    = $('chatNameEdit');
  const display = $('chatNameDisplay');
  const editBtn = $('chatNameEditBtn');
  const counter = $('chatNameEditsLeft');
  if (!view || !edit) return;

  // No wallet connected → hide the username section entirely
  if (!window._privyWallet) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  const remaining = MAX_NAME_EDITS - _chatNameEdits;

  if (_chatName) {
    // Show view state
    view.style.display = 'flex';
    edit.style.display = 'none';
    if (display) display.textContent = _chatName;
    if (editBtn) {
      if (remaining <= 0) {
        editBtn.style.display = 'none';
      } else {
        editBtn.style.display = '';
        editBtn.disabled = false;
      }
    }
    if (counter) counter.textContent = remaining > 0 ? `${remaining} edit${remaining === 1 ? '' : 's'} left` : 'no edits left';
  } else {
    // No name yet — show edit state
    view.style.display = 'none';
    edit.style.display = 'flex';
    if (counter) counter.textContent = `${remaining} edit${remaining === 1 ? '' : 's'} left`;
  }
}

window.chatNameStartEdit = function() {
  const remaining = MAX_NAME_EDITS - _chatNameEdits;
  if (remaining <= 0) return;
  const view = $('chatNameView');
  const edit = $('chatNameEdit');
  const cancelBtn = $('chatNameCancelBtn');
  if (view) view.style.display = 'none';
  if (edit) {
    edit.style.display = 'flex';
    const inp = $('chatNameInput');
    if (inp) { inp.value = _chatName || ''; inp.focus(); inp.select(); }
  }
  // Show cancel only if name already exists (editing, not first set)
  if (cancelBtn) cancelBtn.style.display = _chatName ? '' : 'none';
};

window.chatNameCancel = function() {
  const view = $('chatNameView');
  const edit = $('chatNameEdit');
  const inp  = $('chatNameInput');
  if (edit) edit.style.display = 'none';
  if (inp)  inp.value = '';
  if (view && _chatName) view.style.display = 'flex';
};

const CHAT_NAME_MAX_LEN = 15;

function chatSetName() {
  const inp = $('chatNameInput');
  if (!inp) return;
  const name = inp.value.trim().slice(0, CHAT_NAME_MAX_LEN);
  if (!name) return;

  const w = window._privyWallet;
  // Setting a name over the auto-generated default counts as the first set,
  // not an edit, so it doesn't consume one of the limited edits.
  const isFirstSet = !_chatName || _isDefaultChatName();
  if (!isFirstSet) {
    if (_chatNameEdits >= MAX_NAME_EDITS) return;
    _chatNameEdits++;
    if (w) localStorage.setItem(_chatEditsKey(w), String(_chatNameEdits));
  }

  if (w) localStorage.setItem(_chatNameKey(w), name);
  _chatName = name;
  if (_chatWs && _chatConnected) {
    _chatWs.send(JSON.stringify({ type: 'chat_setname', name }));
  }
  inp.value = '';
  const st = $('chatNameStatus');
  if (st) { st.style.display = 'block'; setTimeout(() => st.style.display = 'none', 2500); }
  _chatNameRenderState();
  _refreshMyMessages();
  saveProfile();

  // If the user was gated at the Community door, close the popup and let them in
  // now that they have a real username.
  if (_pendingCommunityEntry) {
    _pendingCommunityEntry = false;
    const popup = document.getElementById('profilePopup');
    if (popup && popup.style.display !== 'none') toggleProfilePopup();
    document.querySelector('.nav-item[data-page="community"]')?.click();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOOMBARK TRADE — custom EVM swap via KyberSwap Aggregator
// ─────────────────────────────────────────────────────────────────────────────

// Fallback (mainnet) values — overwritten in-place by _loadNetworkConfig() once
// the backend's active NETWORK_ENV (testnet/mainnet) config is fetched.
const TRADE_CHAINS = {
  ethereum: { id: 1,     hex: '0x1',     native: 'ETH',   explorer: 'https://etherscan.io/tx/' },
  base:     { id: 8453,  hex: '0x2105',  native: 'ETH',   explorer: 'https://basescan.org/tx/' },
  arbitrum: { id: 42161, hex: '0xa4b1',  native: 'ETH',   explorer: 'https://arbiscan.io/tx/' },
  polygon:  { id: 137,   hex: '0x89',    native: 'MATIC', explorer: 'https://polygonscan.com/tx/' },
  optimism: { id: 10,    hex: '0xa',     native: 'ETH',   explorer: 'https://optimistic.etherscan.io/tx/' },
  robinhood:{ id: 4663,  hex: '0x1237',  native: 'ETH',   explorer: 'https://robinhoodchain.blockscout.com/tx/',
              rpc: 'https://rpc.mainnet.chain.robinhood.com', name: 'Robinhood Chain' },
};
const NATIVE_ADDR = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
// Robinhood chain's WETH — Limit Order's escrow contract needs an ERC20 it
// can transferFrom, so a limit BUY (paying native ETH) auto-wraps into this
// first rather than using the native placeholder address above.
const ROBINHOOD_WETH = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73';
const LIMIT_ORDER_CONTRACT = '0xcab2FA2eeab7065B45CBcF6E3936dDE2506b4f6C'; // Kyber DSLO Protocol, Robinhood chain
// DexScreener chainId → our chain key (mainnet slugs only — DexScreener/Kyber/
// GeckoTerminal don't index testnet liquidity, so price/trade data is unaffected
// by NETWORK_ENV; only wallet network-switching (TRADE_CHAINS below) is)
const DEXSCREENER_CHAIN_MAP = { ethereum:'ethereum', base:'base', arbitrum:'arbitrum', polygon:'polygon', optimism:'optimism', robinhood:'robinhood' };

let NETWORK_ENV  = 'mainnet';
let IS_TESTNET   = false;
let _enabledChains = ['robinhood']; // safe default, matches the backend's until config loads
const NATIVE_SYMBOL_BY_CHAIN = { ethereum:'ETH', base:'ETH', arbitrum:'ETH', polygon:'MATIC', optimism:'ETH', robinhood:'ETH' };

// Pulls the backend's active network config (testnet/mainnet) and patches
// TRADE_CHAINS in place so MetaMask network-switching targets the right chain.
async function _loadNetworkConfig() {
  try {
    const res = await fetch(`${API_BASE}/config/public`);
    const cfg = await res.json();
    NETWORK_ENV = cfg.networkEnv || 'mainnet';
    IS_TESTNET  = !!cfg.isTestnet;
    if (Array.isArray(cfg.enabledChains) && cfg.enabledChains.length) _enabledChains = cfg.enabledChains;
    for (const [key, c] of Object.entries(cfg.chains || {})) {
      if (!TRADE_CHAINS[key] || !c) continue;
      TRADE_CHAINS[key] = {
        id: c.chainId, hex: c.hex, native: NATIVE_SYMBOL_BY_CHAIN[key] || 'ETH',
        explorer: c.explorer + '/tx/', rpc: c.rpc, name: c.name || key,
      };
    }
    _updateTestnetBadge();
  } catch (_) { /* keep mainnet fallback defaults */ }
}
_loadNetworkConfig();

function _updateTestnetBadge() {
  const badge = $('testnetBadge');
  if (badge) badge.style.display = IS_TESTNET ? '' : 'none';
}

let _tradeToken    = null;  // { address, symbol, name, chain, price, decimals }
let _tradeSide     = 'buy';
let _tradeSlippage = 'auto'; // 'auto' or a fixed number (0.5/1/3/5); resolved to a number in _fetchQuote() when 'auto'
let _tradeAutoSlippageResolved = 1; // last numeric value 'auto' resolved to, from the live quote's price impact
let _tradeQuote    = null;  // last routeSummary
let _tradeMode     = 'market'; // 'market' | 'limit'
let _limitExpiryDays = 7;
let _tradeTimer    = null;
let _tradeBalance  = null;  // balance of the "pay" asset (float)

function initTradePage() {
  _tradeWalletStatus();
  tradeLoadHoldings();
  loadMyOrders();
}

// ── RPC helpers (via backend proxy to public nodes) ──────────────────────────
async function _rpc(chain, method, params) {
  const r = await fetch(`${API_BASE}/trade/rpc/${chain}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}

async function _erc20Decimals(chain, token) {
  const hex = await _rpc(chain, 'eth_call', [{ to: token, data: '0x313ce567' }, 'latest']);
  return parseInt(hex, 16);
}
async function _erc20Balance(chain, token, owner) {
  const data = '0x70a08231' + owner.toLowerCase().replace('0x','').padStart(64, '0');
  const hex = await _rpc(chain, 'eth_call', [{ to: token, data }, 'latest']);
  return BigInt(hex === '0x' ? '0' : hex);
}
async function _nativeBalance(chain, owner) {
  const hex = await _rpc(chain, 'eth_getBalance', [owner, 'latest']);
  return BigInt(hex);
}
async function _erc20Allowance(chain, token, owner, spender) {
  const data = '0xdd62ed3e'
    + owner.toLowerCase().replace('0x','').padStart(64, '0')
    + spender.toLowerCase().replace('0x','').padStart(64, '0');
  const hex = await _rpc(chain, 'eth_call', [{ to: token, data }, 'latest']);
  return BigInt(hex === '0x' ? '0' : hex);
}

// Decimal string → BigInt raw units (no float precision loss)
function _toRaw(amountStr, decimals) {
  const [whole, frac = ''] = String(amountStr).split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * (10n ** BigInt(decimals)) + BigInt(fracPadded || '0');
}
function _fromRaw(raw, decimals) {
  return Number(raw) / Math.pow(10, decimals);
}
function _fmtAmt(n) {
  if (!isFinite(n)) return '—';
  if (n === 0) return '0';
  if (n < 0.0001) {
    const leadZeros = (n.toFixed(20).match(/^0\.(0*)/) || [,''])[1].length;
    return n.toFixed(Math.min(leadZeros + 4, 18));
  }
  if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

// ── Load token ───────────────────────────────────────────────────────────────
const TRADE_LOADING_STEPS = [
  'Resolving token pair…',
  'Fetching on-chain decimals…',
  'Loading price & liquidity…',
  'Preparing swap panel…',
];

async function tradeLoadToken() {
  const addr = $('tradeTokenInput')?.value?.trim();
  if (!addr) return showToast('Paste a token address first');
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return showToast('Invalid EVM address — must start with 0x');

  playActionSound();
  runLoadingSteps(async () => {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
      const j = await r.json();
      // Only trade on chains that are actually turned on (default: Robinhood
      // only) — so the ETH taken from the wallet is always Robinhood-chain
      // ETH, the same way the Private channel payment is pinned to Robinhood.
      const pairs = (j.pairs || [])
        .filter(p => DEXSCREENER_CHAIN_MAP[p.chainId] && _enabledChains.includes(DEXSCREENER_CHAIN_MAP[p.chainId]))
        .sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0));
      if (!pairs.length) throw new Error(`Token not found on an enabled chain (${_enabledChains.join(', ')})`);
      const p = pairs[0];
      const chain = DEXSCREENER_CHAIN_MAP[p.chainId];

      const decimals = await _erc20Decimals(chain, p.baseToken.address);

      _tradeToken = {
        address:  p.baseToken.address,
        symbol:   p.baseToken.symbol,
        name:     p.baseToken.name,
        chain,
        price:    parseFloat(p.priceUsd || 0),
        priceNative: parseFloat(p.priceNative || 0), // token price in native (ETH/WETH) units — what the limit-order maker/taker amounts are actually denominated in
        decimals,
      };
      _tradePairAddr  = p.pairAddress || null;
      _tradeCreatedAt = p.pairCreatedAt || null;

      // Token bar
      $('tradeTokenBar').style.display = 'flex';
      $('tradeTokenSymbol').textContent = _tradeToken.symbol;
      $('tradeTokenName').textContent   = _tradeToken.name;
      $('tradeChainBadge').textContent  = chain.toUpperCase();
      $('tradeTokenAddr').textContent   = addr.slice(0,10) + '…' + addr.slice(-8);
      $('tradeTokenPrice').textContent  = fmt.price(_tradeToken.price);
      const chg = parseFloat(p.priceChange?.h24 ?? 0);
      const chgEl = $('tradeTokenChange');
      chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '% (24h)';
      chgEl.style.color = chg >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      const logo = $('tradeTokenLogo');
      if (p.info?.imageUrl) { logo.src = p.info.imageUrl; logo.style.display = ''; } else logo.style.display = 'none';

      $('tradeEmptyState').style.display = 'none';
      $('swapPanel').style.display = '';
      swapSetSide('buy');
      $('limitPriceInput').value = '';
      swapSetMode(_tradeMode);
      _tradeWalletStatus();

      // Chart + transactions (live) — chart is built from the transaction history
      $('tradeChartCard').style.display = '';
      $('tradeTxCard').style.display = '';
      $('tradeChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:11px">Loading chart from transactions…</div>';
      _tradeTrades = [];
      _tradeTxFetchAttempted = false;
      tradeLoadTxs(true);
      tradeStartLive();
      _loadTradeGasPrice(chain);

      $('loadingOverlay').style.display = 'none';
      showToast(`${_tradeToken.symbol} ready to trade on ${chain}`);
    } catch (e) {
      $('loadingOverlay').style.display = 'none';
      showToast('Failed: ' + (e.message || 'unknown error'));
    }
  }, TRADE_LOADING_STEPS);
}

// ── UI state ─────────────────────────────────────────────────────────────────
function swapSetSide(side) {
  _tradeSide = side;
  const t = _tradeToken;
  if (!t) return;
  const native = TRADE_CHAINS[t.chain].native;

  $('swapTabBuy').style.cssText  = 'flex:1;padding:8px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;letter-spacing:0.5px;transition:background .15s;border:none;' +
    (side==='buy'  ? 'background:var(--accent-green);color:#000' : 'background:transparent;color:var(--text-muted)');
  $('swapTabSell').style.cssText = 'flex:1;padding:8px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;letter-spacing:0.5px;transition:background .15s;border:none;' +
    (side==='sell' ? 'background:var(--accent-red);color:#fff' : 'background:transparent;color:var(--text-muted)');

  $('swapFromLabel').textContent = side === 'buy' ? native : t.symbol;
  $('swapToLabel').textContent   = side === 'buy' ? t.symbol : native;
  $('swapExecBtn').textContent   = (side === 'buy' ? 'BUY ' : 'SELL ') + t.symbol;
  $('swapExecBtn').style.background = side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)';
  $('swapExecBtn').style.color      = side === 'buy' ? '#000' : '#fff';
  $('swapAmountIn').value = '';
  _clearQuote();
  _updateSwapExecBtn();
  _loadPayBalance();
  if (_tradeMode === 'limit') _updateExecBtnLabel();
}

// Market vs Limit tab — Limit uses KyberSwap's gasless Limit Order API
// (Robinhood-chain only, confirmed supported) instead of an immediate swap.
function swapSetMode(mode) {
  _tradeMode = mode;
  const marketBtn = $('modeMarketBtn'), limitBtn = $('modeLimitBtn');
  marketBtn.style.color = mode === 'market' ? 'var(--accent-green)' : 'var(--text-muted)';
  marketBtn.style.borderBottomColor = mode === 'market' ? 'var(--accent-green)' : 'transparent';
  limitBtn.style.color = mode === 'limit' ? 'var(--accent-green)' : 'var(--text-muted)';
  limitBtn.style.borderBottomColor = mode === 'limit' ? 'var(--accent-green)' : 'transparent';
  $('limitPriceGroup').style.display = mode === 'limit' ? '' : 'none';
  $('swapPresets').style.display = mode === 'market' ? 'flex' : 'none';

  if (mode === 'limit') {
    if (_tradeToken?.priceNative && !$('limitPriceInput').value) {
      $('limitPriceInput').value = _tradeToken.priceNative;
    }
    _updateLimitMarketHint();
    _updateExecBtnLabel();
    $('swapQuoteStatus').textContent = 'Set a price and amount to place a limit order';
    $('swapAmountOut').textContent = '—';
    ['swapImpact','swapMinOut','swapRate','swapGas','swapRoute'].forEach(id => { const el = $(id); if (el) el.textContent = '—'; });
  } else {
    _updateExecBtnLabel();
    if ($('swapAmountIn').value) swapScheduleQuote();
  }
}

function _updateLimitMarketHint() {
  const hint = $('limitMarketPriceHint');
  if (hint && _tradeToken?.priceNative) hint.textContent = `Market: ${_fmtAmt(_tradeToken.priceNative)} (use)`;
}

function limitUseMarketPrice() {
  if (!_tradeToken?.priceNative) return;
  $('limitPriceInput').value = _tradeToken.priceNative;
  limitScheduleUpdate();
}

// KyberSwap's API requires an expiredAt timestamp — there's no true "never"
// option — so "No Expiry" (days=0) is simulated with a 1-year expiry, long
// enough to not practically matter; the order can still be cancelled
// manually anytime before then.
function limitSetExpiry(days) {
  _limitExpiryDays = days === 0 ? 365 : days;
  const ids = { 1:'expBtn1', 7:'expBtn7', 30:'expBtn30', 0:'expBtnNone' };
  for (const [val, id] of Object.entries(ids)) {
    const b = $(id); if (!b) continue;
    const on = parseInt(val) === days;
    b.style.background  = on ? 'var(--green-20)' : 'var(--bg-secondary)';
    b.style.borderColor = on ? 'var(--green-60)' : 'var(--border-light)';
    b.style.color       = on ? 'var(--accent-green)' : 'var(--text-muted)';
  }
}

function _updateExecBtnLabel() {
  const btn = $('swapExecBtn');
  const t = _tradeToken;
  if (!btn || !t) return;
  if (_tradeMode === 'limit') {
    btn.textContent = 'Place Limit Order';
    btn.style.background = 'var(--accent-green)';
    btn.style.color = '#000';
  } else {
    btn.textContent = (_tradeSide === 'buy' ? 'BUY ' : 'SELL ') + t.symbol;
    btn.style.background = _tradeSide === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)';
    btn.style.color = _tradeSide === 'buy' ? '#000' : '#fff';
  }
}

let _limitUpdateTimer = null;
function limitScheduleUpdate() {
  clearTimeout(_limitUpdateTimer);
  _limitUpdateTimer = setTimeout(_updateLimitReceiveEstimate, 200);
}

// Limit orders are denominated directly in native(WETH)-per-token — no live
// quote needed, just amountIn × or ÷ the price the user set.
function _updateLimitReceiveEstimate() {
  const t = _tradeToken;
  const amt = parseFloat($('swapAmountIn')?.value);
  const price = parseFloat($('limitPriceInput')?.value);
  const out = $('swapAmountOut');
  if (!t || !(amt > 0) || !(price > 0)) { out.textContent = '—'; return; }
  const native = TRADE_CHAINS[t.chain].native;
  if (_tradeSide === 'buy') {
    // Paying `amt` native to receive tokens at `price` native/token
    const tokensOut = amt / price;
    out.textContent = _fmtAmt(tokensOut) + ' ' + t.symbol;
    $('swapRate').textContent = `1 ${t.symbol} = ${_fmtAmt(price)} ${native}`;
  } else {
    // Selling `amt` tokens to receive native at `price` native/token
    const nativeOut = amt * price;
    out.textContent = _fmtAmt(nativeOut) + ' ' + native;
    $('swapRate').textContent = `1 ${t.symbol} = ${_fmtAmt(price)} ${native}`;
  }
}

// Routes the single Execute button to the right flow for the active mode.
function swapExecuteRouter() {
  if (_tradeMode === 'limit') limitOrderExecute();
  else swapExecute();
}

function swapSetSlippage(v) {
  _tradeSlippage = v;
  const ids = { auto:'slipBtnAuto', 0.5:'slipBtn05', 1:'slipBtn1', 3:'slipBtn3', 5:'slipBtn5' };
  for (const [val, id] of Object.entries(ids)) {
    const b = $(id); if (!b) continue;
    const on = val === 'auto' ? v === 'auto' : parseFloat(val) === v;
    b.style.background  = on ? 'var(--green-20)' : 'var(--bg-secondary)';
    b.style.borderColor = on ? 'var(--green-60)' : 'var(--border-light)';
    b.style.color       = on ? 'var(--accent-green)' : 'var(--text-muted)';
  }
  const hint = $('slipAutoHint');
  if (hint) hint.style.display = v === 'auto' ? '' : 'none';
  if ($('swapAmountIn')?.value) swapScheduleQuote();
}

// 'Auto' picks a slippage tolerance from the live quote's price impact —
// tight for a clean trade, wider for a thin/illiquid pool — instead of one
// fixed % that's either too loose (bad fills) or too tight (fails to land)
// depending on what's actually being traded.
function _resolveAutoSlippage(impactPct) {
  if (impactPct > 5) return 5;
  if (impactPct > 2) return 3;
  if (impactPct > 0.5) return 1;
  return 0.5;
}

function _tradeWalletStatus() {
  const st = $('swapWalletStatus');
  if (!st) return;
  const w = window._privyWallet;
  st.textContent = w ? '🟢 ' + w.slice(0,6) + '…' + w.slice(-4) : 'Wallet not connected — connect via top-right button';
}

async function _loadPayBalance() {
  _tradeBalance = null;
  const lbl = $('swapBalanceLabel');
  if (lbl) lbl.textContent = '';
  const w = window._privyWallet, t = _tradeToken;
  if (!w || !t) { _updateSwapExecBtn(); return; }
  try {
    if (_tradeSide === 'buy') {
      const raw = await _nativeBalance(t.chain, w);
      _tradeBalance = _fromRaw(raw, 18);
      if (lbl) lbl.textContent = 'Balance: ' + _fmtAmt(_tradeBalance) + ' ' + TRADE_CHAINS[t.chain].native;
    } else {
      const raw = await _erc20Balance(t.chain, t.address, w);
      _tradeBalance = _fromRaw(raw, t.decimals);
      if (lbl) lbl.textContent = 'Balance: ' + _fmtAmt(_tradeBalance) + ' ' + t.symbol;
    }
  } catch (_) {}
  _updateSwapExecBtn();
}

// Disables the Buy/Sell button and relabels it whenever the entered amount
// exceeds the wallet's known balance for the current side — same rule for
// both buy (native ETH balance) and sell (token balance).
function _updateSwapExecBtn() {
  const btn = $('swapExecBtn');
  if (!btn) return;
  const amt = parseFloat($('swapAmountIn')?.value);
  const insufficient = _tradeBalance != null && amt > 0 && amt > _tradeBalance;
  btn.disabled = insufficient;
  btn.style.opacity = insufficient ? '0.5' : '1';
  btn.style.cursor  = insufficient ? 'not-allowed' : 'pointer';
  if (insufficient) {
    btn.textContent = 'Insufficient Balance';
  } else if (_tradeToken) {
    // Market vs Limit label is _updateExecBtnLabel()'s job — this only
    // handles the balance-driven disable/relabel, so it must not stomp on
    // "Place Limit Order" while in limit mode.
    if (_tradeMode === 'limit') _updateExecBtnLabel();
    else btn.textContent = (_tradeSide === 'buy' ? 'BUY ' : 'SELL ') + _tradeToken.symbol;
  }
}

function swapPresetPct(pct) {
  if (_tradeBalance == null) { showToast('Connect wallet to use balance presets'); return; }
  let amt = _tradeBalance * pct / 100;
  // Leave dust for gas when maxing native
  if (_tradeSide === 'buy' && pct === 100) amt = Math.max(0, amt - 0.005);
  $('swapAmountIn').value = amt > 0 ? amt.toFixed(6) : '';
  swapScheduleQuote();
}

// ── Quote (KyberSwap route) ──────────────────────────────────────────────────
function swapScheduleQuote() {
  _updateSwapExecBtn(); // instant balance check, not debounced like the quote itself
  clearTimeout(_tradeTimer);
  const st = $('swapQuoteStatus');
  if (st) st.textContent = 'Fetching quote…';
  _tradeTimer = setTimeout(_fetchQuote, 500);
}

function _clearQuote() {
  _tradeQuote = null;
  clearTimeout(_tradeTimer);
  ['swapImpact','swapMinOut','swapRate','swapGas','swapRoute'].forEach(id => { const el=$(id); if (el) el.textContent='—'; });
  const out = $('swapAmountOut'); if (out) { out.textContent = '—'; out.style.color = 'var(--text-muted)'; }
  const st = $('swapQuoteStatus'); if (st) st.textContent = 'Enter amount to get quote';
}

async function _fetchQuote() {
  const t = _tradeToken;
  const amtStr = $('swapAmountIn')?.value?.trim();
  const amt = parseFloat(amtStr);
  if (!t || !amt || amt <= 0) { _clearQuote(); return; }

  const isBuy = _tradeSide === 'buy';
  const tokenIn  = isBuy ? NATIVE_ADDR : t.address;
  const tokenOut = isBuy ? t.address : NATIVE_ADDR;
  const inDecimals  = isBuy ? 18 : t.decimals;
  const outDecimals = isBuy ? t.decimals : 18;
  const amountIn = _toRaw(amtStr, inDecimals).toString();

  try {
    const r = await fetch(`${API_BASE}/trade/kyber/route?chain=${t.chain}&tokenIn=${tokenIn}&tokenOut=${tokenOut}&amountIn=${amountIn}`);
    const j = await r.json();
    if (!r.ok || !j.data?.routeSummary) throw new Error(j.error || j.message || 'No route found');
    const rs = j.data.routeSummary;
    _tradeQuote = { routeSummary: rs, routerAddress: j.data.routerAddress, tokenIn, outDecimals, inAmountRaw: amountIn };

    const outAmt = _fromRaw(BigInt(rs.amountOut), outDecimals);
    const inUsd  = parseFloat(rs.amountInUsd || 0);
    const outUsd = parseFloat(rs.amountOutUsd || 0);
    const impact = inUsd > 0 ? Math.max(0, (1 - outUsd / inUsd) * 100) : 0;
    if (_tradeSlippage === 'auto') {
      _tradeAutoSlippageResolved = _resolveAutoSlippage(impact);
      const hint = $('slipAutoHint');
      if (hint) hint.textContent = `≈ ${_tradeAutoSlippageResolved}% based on ${impact.toFixed(2)}% price impact`;
    }
    const effectiveSlippage = _tradeSlippage === 'auto' ? _tradeAutoSlippageResolved : _tradeSlippage;
    const minOut = outAmt * (1 - effectiveSlippage / 100);
    const gasUsd = parseFloat(rs.gasUsd || 0);
    const outSym = isBuy ? t.symbol : TRADE_CHAINS[t.chain].native;
    const inSym  = isBuy ? TRADE_CHAINS[t.chain].native : t.symbol;
    // Route DEX names
    const dexes = [...new Set((rs.route || []).flat().map(h => h.exchange).filter(Boolean))].slice(0,3).join(', ');

    const out = $('swapAmountOut');
    out.textContent = _fmtAmt(outAmt) + ' ' + outSym;
    out.style.color = 'var(--text-primary)';
    $('swapMinOut').textContent = _fmtAmt(minOut) + ' ' + outSym;
    $('swapImpact').textContent = impact.toFixed(2) + '%';
    $('swapImpact').style.color = impact > 5 ? 'var(--accent-red)' : impact > 2 ? '#f59e0b' : 'var(--accent-green)';
    $('swapRate').textContent   = '1 ' + inSym + ' = ' + _fmtAmt(outAmt / amt) + ' ' + outSym;
    $('swapGas').textContent    = gasUsd ? '$' + gasUsd.toFixed(2) : '—';
    $('swapRoute').textContent  = dexes || 'KyberSwap';
    $('swapRoute').title        = dexes;
    $('swapQuoteStatus').textContent = '✓ Live quote — auto-refresh 10s';

    clearTimeout(_tradeTimer);
    _tradeTimer = setTimeout(_fetchQuote, 10000);
  } catch (e) {
    _clearQuote();
    const st = $('swapQuoteStatus');
    if (st) st.textContent = '⚠ ' + (e.message || 'Quote failed');
  }
}

// ── Execute ──────────────────────────────────────────────────────────────────
async function _ensureChain(chain) {
  const target = TRADE_CHAINS[chain];
  const current = await window.ethereum.request({ method: 'eth_chainId' });
  if (current === target.hex) return;
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target.hex }] });
  } catch (e) {
    // 4902 = chain not added to MetaMask yet — add it automatically if we know its RPC
    if (e.code === 4902 && target.rpc) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: target.hex,
          chainName: target.name || chain,
          nativeCurrency: { name: target.native, symbol: target.native, decimals: 18 },
          rpcUrls: [target.rpc],
          blockExplorerUrls: [target.explorer.replace(/\/tx\/$/, '')],
        }],
      });
      return;
    }
    if (e.code === 4902) throw new Error(`Please add the ${chain} network to MetaMask first`);
    throw new Error('Network switch rejected');
  }
}

async function swapExecute() {
  const t = _tradeToken, q = _tradeQuote, w = window._privyWallet;
  if (!t || !q) return showToast('Get a quote first');
  if (!w) return showToast('Connect wallet first (top-right button)');
  if (!window.ethereum) return showToast('MetaMask not found');
  const amt = parseFloat($('swapAmountIn')?.value);
  if (_tradeBalance != null && amt > _tradeBalance) return showToast('Insufficient balance');

  const btn = $('swapExecBtn');
  const txSt = $('swapTxStatus');
  const resetBtn = () => { btn.disabled = false; swapSetSide(_tradeSide); };
  btn.disabled = true;
  if (txSt) { txSt.style.display = 'none'; }

  try {
    btn.textContent = 'Switching network…';
    await _ensureChain(t.chain);

    // Build the swap transaction
    btn.textContent = 'Building route…';
    const buildRes = await fetch(`${API_BASE}/trade/kyber/build`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: t.chain,
        routeSummary: q.routeSummary,
        sender: w,
        slippageBps: Math.round((_tradeSlippage === 'auto' ? _tradeAutoSlippageResolved : _tradeSlippage) * 100),
      }),
    });
    const build = await buildRes.json();
    if (!buildRes.ok || !build.data?.data) throw new Error(build.error || 'Failed to build transaction');
    const router = build.data.routerAddress;

    // Approve ERC20 when selling
    if (_tradeSide === 'sell') {
      const allowance = await _erc20Allowance(t.chain, t.address, w, router);
      const needed = BigInt(q.inAmountRaw);
      if (allowance < needed) {
        btn.textContent = 'Approve in MetaMask…';
        const maxUint = 'f'.repeat(64);
        const approveData = '0x095ea7b3' + router.toLowerCase().replace('0x','').padStart(64,'0') + maxUint;
        const approveTx = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from: w, to: t.address, data: approveData }],
        });
        btn.textContent = 'Waiting for approval…';
        await _waitForTx(t.chain, approveTx);
      }
    }

    // Send the swap
    btn.textContent = 'Confirm in MetaMask…';
    const txParams = { from: w, to: router, data: build.data.data };
    if (_tradeSide === 'buy') txParams.value = '0x' + BigInt(q.inAmountRaw).toString(16);
    if (build.data.gas) txParams.gas = '0x' + Math.ceil(parseInt(build.data.gas) * 1.25).toString(16);
    const txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [txParams] });

    btn.textContent = 'Confirming…';
    const ok = await _waitForTx(t.chain, txHash);

    const link = TRADE_CHAINS[t.chain].explorer + txHash;
    if (txSt) {
      txSt.innerHTML = ok
        ? `✅ Swap confirmed! <a href="${link}" target="_blank" rel="noopener" style="color:var(--accent-green)">View on explorer ↗</a>`
        : `⚠ Tx reverted. <a href="${link}" target="_blank" rel="noopener" style="color:#f59e0b">View on explorer ↗</a>`;
      txSt.style.color = ok ? 'var(--accent-green)' : '#f59e0b';
      txSt.style.display = 'block';
    }
    showToast(ok ? 'Swap executed! 🎉' : 'Transaction reverted');
    if (ok) {
      // Fire-and-forget — feeds "Trending on Bloombark" (Most Traded).
      fetch(`${API_BASE}/trade/log-activity`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: t.address, chain: t.chain, symbol: t.symbol, name: t.name }),
      }).catch(() => {});
    }
    $('swapAmountIn').value = '';
    _clearQuote();
    _loadPayBalance();
    resetBtn();
  } catch (e) {
    const msg = e.code === 4001 ? 'Rejected in MetaMask' : (e.message || 'Swap failed');
    showToast(msg);
    if (txSt) { txSt.textContent = '⚠ ' + msg; txSt.style.color = 'var(--accent-red)'; txSt.style.display = 'block'; }
    resetBtn();
  }
}

// Place a gasless limit order via KyberSwap's Limit Order API (Robinhood
// chain only). Unlike swapExecute(), the order itself needs no transaction —
// just a signature — but paying with native ETH still needs a one-time wrap
// to WETH first (the escrow contract can only pull ERC20s), and the escrow
// contract needs one-time ERC20 approval like any other allowance-based flow.
async function limitOrderExecute() {
  const t = _tradeToken, w = window._privyWallet;
  if (!t) return showToast('Load a token first');
  if (t.chain !== 'robinhood') return showToast('Limit orders are only available on Robinhood chain');
  if (!w) return showToast('Connect wallet first (top-right button)');
  if (!window.ethereum) return showToast('MetaMask not found');

  const amt = parseFloat($('swapAmountIn')?.value);
  const price = parseFloat($('limitPriceInput')?.value);
  if (!(amt > 0)) return showToast('Enter an amount');
  if (!(price > 0)) return showToast('Enter a limit price');
  if (_tradeBalance != null && amt > _tradeBalance) return showToast('Insufficient balance');

  const btn = $('swapExecBtn');
  const txSt = $('swapTxStatus');
  const resetBtn = () => { btn.disabled = false; _updateExecBtnLabel(); };
  btn.disabled = true;
  if (txSt) txSt.style.display = 'none';

  try {
    await _ensureChain(t.chain);

    const isBuy = _tradeSide === 'buy';
    const makerAsset = isBuy ? ROBINHOOD_WETH : t.address;
    const takerAsset = isBuy ? t.address : ROBINHOOD_WETH;
    const makerDecimals = isBuy ? 18 : t.decimals;
    const makingAmount = _toRaw(String(amt), makerDecimals);
    const takingAmountFloat = isBuy ? amt / price : amt * price;
    const takingDecimals = isBuy ? t.decimals : 18;
    const takingAmount = _toRaw(takingAmountFloat.toFixed(takingDecimals), takingDecimals);

    // Paying with native ETH → wrap the shortfall into WETH first.
    if (isBuy) {
      const wethBal = await _erc20Balance(t.chain, ROBINHOOD_WETH, w);
      if (wethBal < makingAmount) {
        const shortfall = makingAmount - wethBal;
        const nativeBal = await _nativeBalance(t.chain, w);
        if (nativeBal < shortfall) throw new Error('Insufficient ETH to wrap');
        btn.textContent = 'Wrap ETH in MetaMask…';
        const wrapTx = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from: w, to: ROBINHOOD_WETH, data: '0xd0e30db0', value: '0x' + shortfall.toString(16) }],
        });
        btn.textContent = 'Confirming wrap…';
        await _waitForTx(t.chain, wrapTx);
      }
    }

    // One-time approval for the Limit Order escrow contract.
    const allowance = await _erc20Allowance(t.chain, makerAsset, w, LIMIT_ORDER_CONTRACT);
    if (allowance < makingAmount) {
      btn.textContent = 'Approve in MetaMask…';
      const maxUint = 'f'.repeat(64);
      const approveData = '0x095ea7b3' + LIMIT_ORDER_CONTRACT.toLowerCase().replace('0x','').padStart(64,'0') + maxUint;
      const approveTx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: w, to: makerAsset, data: approveData }],
      });
      btn.textContent = 'Waiting for approval…';
      await _waitForTx(t.chain, approveTx);
    }

    // Get the EIP-712 message, sign it (no transaction — just a signature).
    btn.textContent = 'Preparing order…';
    const expiredAt = Math.floor(Date.now() / 1000) + _limitExpiryDays * 86400;
    const signRes = await fetch(`${API_BASE}/trade/limit-order/sign-message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makerAsset, takerAsset, maker: w, makingAmount: makingAmount.toString(), takingAmount: takingAmount.toString(), expiredAt }),
    });
    const signData = await signRes.json();
    if (!signRes.ok || signData.code !== 0) throw new Error(signData.message || signData.error || 'Failed to prepare order');
    const { types, domain, primaryType, message } = signData.data;

    btn.textContent = 'Sign in MetaMask…';
    const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [w, JSON.stringify({ types, domain, primaryType, message })],
    });

    // Submit the signed order.
    btn.textContent = 'Placing order…';
    const orderRes = await fetch(`${API_BASE}/trade/limit-order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        makerAsset, takerAsset, maker: w,
        makingAmount: message.makingAmount, takingAmount: message.takingAmount,
        expiredAt, salt: message.salt, signature,
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || orderData.code !== 0) throw new Error(orderData.message || orderData.error || 'Failed to place order');

    showToast(`Limit order placed — will fill at ${_fmtAmt(price)} ${TRADE_CHAINS[t.chain].native}/${t.symbol}`);
    $('swapAmountIn').value = '';
    $('swapAmountOut').textContent = '—';
    _loadPayBalance();
    loadMyOrders(true);
    resetBtn();
  } catch (e) {
    const msg = e.code === 4001 ? 'Rejected in MetaMask' : (e.message || 'Failed to place limit order');
    showToast(msg);
    if (txSt) { txSt.textContent = '⚠ ' + msg; txSt.style.color = 'var(--accent-red)'; txSt.style.display = 'block'; }
    resetBtn();
  }
}

async function _waitForTx(chain, hash) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const receipt = await _rpc(chain, 'eth_getTransactionReceipt', [hash]);
      if (receipt) return receipt.status === '0x1';
    } catch (_) {}
  }
  throw new Error('Transaction confirmation timeout — check explorer');
}

// ── Wallet holdings on Trade page ────────────────────────────────────────────
let _holdingsLoaded = false;

// Adds a Robinhood-chain token to MetaMask via the standard wallet_watchAsset
// RPC — restricted to Robinhood only since that's the only chain this app
// trades by default (see enabled_chains). MetaMask always shows its own
// confirmation popup; we can't (and shouldn't) skip that.
async function _watchAssetOnMetamask({ address, symbol, decimals, icon }) {
  if (!window.ethereum) { showToast('MetaMask not found'); return false; }
  try {
    await _ensureChain('robinhood');
    const added = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: { address, symbol, decimals: decimals || 18, image: icon || undefined },
      },
    });
    if (added) showToast(`${symbol} added to MetaMask`);
    return added;
  } catch (e) {
    if (e.code !== 4001) showToast('Error: ' + e.message);
    return false;
  }
}

// "+ Address" — save a token by CA so it's tracked in Bloombark's Holdings
// list (even before/without an on-chain balance being auto-detected) and
// added to MetaMask in the same step. Robinhood chain only — enforced
// server-side in POST /api/trade/custom-tokens, not just here.
function openAddTokenModal() {
  if (!window._privyWallet) return showToast('Connect wallet first');
  const existing = document.getElementById('addTokenModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'addTokenModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);z-index:9998;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#161822;border:1px solid #1e2235;border-radius:16px;padding:24px;width:340px;box-shadow:0 16px 48px rgba(0,0,0,0.7)">
      <div style="font-size:14px;font-weight:800;color:#e2e8f0;margin-bottom:4px">Add Token by Address</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:16px">Robinhood chain only. Saves it to your Holdings list and adds it to MetaMask.</div>
      <input id="addTokenInput" type="text" placeholder="0x…" spellcheck="false"
        style="width:100%;background:#0d0f18;border:1px solid #2d3748;border-radius:8px;color:#e2e8f0;font-size:12px;font-family:monospace;padding:10px 12px;margin-bottom:18px;box-sizing:border-box">
      <div style="display:flex;gap:8px">
        <button id="addTokenCancelBtn" style="flex:1;background:#1e2235;border:1px solid #2d3748;border-radius:10px;color:#8b92a8;font-size:12px;font-weight:700;padding:10px;cursor:pointer">Cancel</button>
        <button id="addTokenSaveBtn" style="flex:1;background:var(--accent-green);border:none;border-radius:10px;color:#000;font-size:12px;font-weight:700;padding:10px;cursor:pointer">Save</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  overlay.querySelector('#addTokenCancelBtn').onclick = () => overlay.remove();

  overlay.querySelector('#addTokenSaveBtn').onclick = async () => {
    const address = overlay.querySelector('#addTokenInput').value.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return showToast('Invalid EVM address — must start with 0x');
    const saveBtn = overlay.querySelector('#addTokenSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const res = await fetch(`${API_BASE}/trade/custom-tokens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: window._privyWallet, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save token');
      overlay.remove();
      showToast(`${data.token.symbol} saved to Holdings`);
      await _watchAssetOnMetamask(data.token);
      tradeLoadHoldings(true);
    } catch (e) {
      showToast('Error: ' + e.message);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  };
}

async function tradeLoadHoldings(force = false) {
  const w = window._privyWallet;
  const card  = $('tradeHoldingsCard');
  const empty = $('tradeHoldingsEmpty');
  const list  = $('tradeHoldingsList');
  if (!card || !list) return;
  if (!w) { card.style.display = 'none'; if (empty) empty.style.display = ''; _holdingsLoaded = false; return; }
  if (_holdingsLoaded && !force) return;

  card.style.display = '';
  if (empty) empty.style.display = 'none';
  list.innerHTML = '<div style="padding:24px 16px;text-align:center;font-size:11px;color:var(--text-muted)">Loading holdings…</div>';
  try {
    const r = await fetch(`${API_BASE}/trade/holdings/${w}`);
    const j = await r.json();
    const hs = j.holdings || [];
    _holdingsLoaded = true;

    if (!hs.length) {
      list.innerHTML = '<div style="padding:24px 16px;text-align:center;font-size:11px;color:var(--text-muted)">No tokens found in this wallet</div>';
      $('tradeHoldingsTotal').textContent = '$0.00';
      return;
    }

    const total = hs.reduce((s, h) => s + (h.usd || 0), 0);
    $('tradeHoldingsTotal').textContent = '$' + total.toLocaleString('en-US', { maximumFractionDigits: 2 });

    list.innerHTML = hs.map(h => {
      const iconHtml = h.icon
        ? `<img src="${h.icon}" style="width:30px;height:30px;border-radius:50%;flex-shrink:0" onerror="this.outerHTML='<div style=\\'width:30px;height:30px;border-radius:50%;background:var(--green-1f);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--accent-green);flex-shrink:0\\'>${(h.symbol||'?')[0]}</div>'">`
        : `<div style="width:30px;height:30px;border-radius:50%;background:var(--green-1f);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--accent-green);flex-shrink:0">${(h.symbol||'?')[0]}</div>`;
      const clickable = !h.native;
      return `<div ${clickable ? `onclick="tradeSelectHolding('${h.address}')" ` : ''}style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border-light);${clickable ? 'cursor:pointer' : ''}"
        ${clickable ? `onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background=''" title="Click to trade ${h.symbol}"` : ''}>
        ${iconHtml}
        <div style="min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px;font-weight:700;color:var(--text-primary)">${h.symbol}</span>
            <span style="font-size:8px;padding:1px 6px;border-radius:10px;font-weight:700;background:var(--bg-secondary);color:var(--text-muted);border:1px solid var(--border-light);white-space:nowrap">${h.chain.toUpperCase()}</span>
          </div>
          <div style="font-size:9px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px">${h.name || ''}</div>
        </div>
        <div style="margin-left:auto;text-align:right;flex-shrink:0">
          <div style="font-size:11px;font-weight:700;color:var(--text-primary);font-family:monospace">${_fmtAmt(h.balance)}</div>
          <div style="font-size:9px;color:${h.usd != null ? 'var(--accent-green)' : 'var(--text-muted)'}">${h.usd != null ? '$' + h.usd.toLocaleString('en-US',{maximumFractionDigits:2}) : '—'}</div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">Failed to load holdings</div>';
  }
}

let _myOrdersLoaded = false;
let _myOrdersData = [];

async function loadMyOrders(force = false) {
  const w = window._privyWallet;
  const card = $('myOrdersCard');
  const list = $('myOrdersList');
  if (!card || !list) return;
  if (!w) { card.style.display = 'none'; _myOrdersLoaded = false; return; }
  if (_myOrdersLoaded && !force) return;

  card.style.display = '';
  list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">Loading orders…</div>';
  try {
    const r = await fetch(`${API_BASE}/trade/limit-orders/${w}?status=open`);
    const j = await r.json();
    _myOrdersLoaded = true;
    const orders = j.data?.orders || [];
    _myOrdersData = orders;

    if (!orders.length) {
      list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">No open limit orders</div>';
      return;
    }

    list.innerHTML = orders.map((o, i) => {
      const makerIsWeth = o.makerAsset?.toLowerCase() === ROBINHOOD_WETH.toLowerCase();
      const side = makerIsWeth ? 'BUY' : 'SELL';
      const sideColor = makerIsWeth ? 'var(--accent-green)' : 'var(--accent-red)';
      const makingAmt = _fromRaw(BigInt(o.makingAmount), makerIsWeth ? 18 : (_tradeToken?.decimals || 18));
      const takingAmt = _fromRaw(BigInt(o.takingAmount), makerIsWeth ? (_tradeToken?.decimals || 18) : 18);
      const price = makerIsWeth ? makingAmt / takingAmt : takingAmt / makingAmt;
      const native = TRADE_CHAINS[_tradeToken?.chain || 'robinhood'].native;
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border-light);font-size:11px">
        <div>
          <span style="font-weight:800;color:${sideColor}">${side}</span>
          <span style="color:var(--text-muted);margin-left:6px">${_fmtAmt(makingAmt)} ${makerIsWeth ? native : (_tradeToken?.symbol || '')} @ ${_fmtAmt(price)} ${native}</span>
        </div>
        <button onclick="cancelLimitOrder(${o.id})" style="background:none;border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;cursor:pointer;color:#ff6b6b;font-size:10px;font-weight:700">Cancel</button>
      </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">Failed to load orders</div>';
  }
}

async function cancelLimitOrder(orderId) {
  const w = window._privyWallet;
  if (!w || !window.ethereum) return showToast('Connect wallet first');
  try {
    const signRes = await fetch(`${API_BASE}/trade/limit-order/cancel-sign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maker: w, orderIds: [orderId] }),
    });
    const signData = await signRes.json();
    if (!signRes.ok || signData.code !== 0) throw new Error(signData.message || signData.error || 'Failed to prepare cancellation');
    const { types, domain, primaryType, message } = signData.data;

    const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [w, JSON.stringify({ types, domain, primaryType, message })],
    });

    const cancelRes = await fetch(`${API_BASE}/trade/limit-order/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maker: w, orderIds: [orderId], signature }),
    });
    const cancelData = await cancelRes.json();
    if (!cancelRes.ok || cancelData.code !== 0) throw new Error(cancelData.message || cancelData.error || 'Failed to cancel order');

    showToast('Order cancelled');
    loadMyOrders(true);
  } catch (e) {
    const msg = e.code === 4001 ? 'Rejected in MetaMask' : (e.message || 'Failed to cancel order');
    showToast(msg);
  }
}

// Click a holding → load it into the trade panel (SELL side, since they own it)
function tradeSelectHolding(address) {
  const inp = $('tradeTokenInput');
  if (inp) inp.value = address;
  tradeLoadToken().then(() => { if (_tradeToken) swapSetSide('sell'); });
}

// ── Trade page: live chart + recent transactions ─────────────────────────────
const TRADE_GECKO_NET = { ethereum:'eth', base:'base', arbitrum:'arbitrum', polygon:'polygon_pos', optimism:'optimism', robinhood:'robinhood' };

let _tradeChart      = null;
let _tradeSeries     = null;
let _tradeInterval   = '1m';
let _tradeChartTimer = null;
let _tradeTxTimer    = null;
let _tradePairAddr   = null;
let _tradeCreatedAt  = null;
let _tradeGasGwei    = null; // {slow,average,fast} for the loaded token's chain

// Live network gas price (Gwei) for the chain being traded — reuses the same
// Blockscout-backed endpoint as Market Overview's Chain Transactions card.
// Fetched once per token load (gas price doesn't need 10s-quote-refresh
// frequency); re-renders the already-visible "Est. gas" row once it lands.
async function _loadTradeGasPrice(chain) {
  _tradeGasGwei = null;
  try {
    const res  = await fetch(`${API_BASE}/chain-transactions`);
    const json = await res.json();
    _tradeGasGwei = json.data?.[chain]?.gasPriceGwei || null;
  } catch (e) { _tradeGasGwei = null; }
  if (_tradeToken?.chain === chain) _renderTradeGasGwei();
}

function _renderTradeGasGwei() {
  const el = $('swapGasGwei');
  if (!el) return;
  const avg = _tradeGasGwei?.average;
  el.textContent = avg != null ? `⛽ ${avg.toFixed(avg < 1 ? 3 : 2)} Gwei` : '';
}

function _tradePageActive() {
  return document.getElementById('page-trade')?.classList.contains('active');
}

function _tradeStopLive() {
  clearInterval(_tradeChartTimer); _tradeChartTimer = null;
  clearInterval(_tradeTxTimer);    _tradeTxTimer = null;
}

function tradeStartLive() {
  _tradeStopLive();
  // Single 12s cycle: transactions feed both the tx list AND the chart candles
  _tradeTxTimer = setInterval(() => { if (_tradePageActive() && _tradePairAddr) tradeLoadTxs(false); }, 12000);
}

function _tradeBuildChart(samplePrice) {
  const container = $('tradeChart');
  if (!container || !window.LightweightCharts) return;
  container.innerHTML = '';
  if (_tradeChart) { try { _tradeChart.remove(); } catch(_){} _tradeChart = null; }

  const chart = LightweightCharts.createChart(container, {
    width:  container.clientWidth || 500,
    height: 260,
    layout: { background:{ color:'transparent' }, textColor:'#8b92a8', fontSize: 10 },
    grid:   { vertLines:{ visible:false }, horzLines:{ color:'#1e223055' } },
    crosshair: { mode: 1 },
    rightPriceScale: { borderColor:'#1e2230' },
    timeScale: { borderColor:'#1e2230', timeVisible:true, secondsVisible:true },
  });

  let minMove = 0.01;
  if (samplePrice < 0.000001)    minMove = 0.0000000001;
  else if (samplePrice < 0.0001) minMove = 0.00000001;
  else if (samplePrice < 0.01)   minMove = 0.000001;
  else if (samplePrice < 1)      minMove = 0.0001;

  _tradeSeries = chart.addCandlestickSeries({
    upColor:_resolveCssVar('var(--accent-green)'), downColor:_resolveCssVar('var(--accent-red)'),
    borderUpColor:_resolveCssVar('var(--accent-green)'), borderDownColor:_resolveCssVar('var(--accent-red)'),
    wickUpColor:_resolveCssVar('var(--accent-green)'), wickDownColor:_resolveCssVar('var(--accent-red)'),
    priceFormat: { type:'custom', formatter: p => (typeof fmt !== 'undefined' && fmt.price) ? fmt.price(p) : p.toPrecision(4), minMove },
  });
  _tradeChart = chart;
}

// Cached transaction history — the single source of truth for the chart
let _tradeTrades = [];
// Recent Transactions list's OWN loading state — deliberately independent of
// _tradeTrades/the chart above it. Tracks whether a fetch for the current
// token has ever completed, so the list can tell "still loading" apart from
// "genuinely has zero trades" instead of showing "Loading…" forever for a
// pool that legitimately has no trade history.
let _tradeTxFetchAttempted = false;

// Bucket transaction prices into OHLC candles for the selected interval
function _buildCandlesFromTrades(trades) {
  const secs = TRADE_INTERVAL_SECS[_tradeInterval] || 60;
  const valid = trades
    .filter(tr => tr.priceUsd > 0 && tr.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp); // oldest → newest
  const buckets = new Map();
  for (const tr of valid) {
    const bucket = Math.floor(tr.timestamp / 1000 / secs) * secs;
    const p = tr.priceUsd;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, { time: bucket, open: p, high: p, low: p, close: p });
    } else {
      const c = buckets.get(bucket);
      c.high  = Math.max(c.high, p);
      c.low   = Math.min(c.low,  p);
      c.close = p;
    }
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

// Render chart entirely from transaction-history prices
function _tradeRenderChartFromTrades(rebuild = true) {
  const t = _tradeToken;
  if (!t) return;
  const candles = _buildCandlesFromTrades(_tradeTrades);
  if (!candles.length) {
    if (rebuild) $('tradeChart').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:11px">No transaction data to chart yet</div>';
    return;
  }
  if (rebuild || !_tradeSeries) _tradeBuildChart(candles[candles.length - 1].close);
  if (!_tradeSeries) return;
  _tradeSeries.setData(candles);
  if (rebuild) _tradeChart.timeScale().fitContent();
  // Track the last candle so live trade prices can extend it in realtime
  _tradeLastCandle = { ...candles[candles.length - 1] };
}

// ── Live price from latest transaction ───────────────────────────────────────
let _tradeLastCandle = null;
const TRADE_INTERVAL_SECS = { '1s': 1, '30s': 30, '1m': 60, '5m': 300 };

function _applyTradePrice(p) {
  const t = _tradeToken;
  if (!t || !p || p <= 0) return;

  // 1. Token bar: show latest execution price, tinted by direction vs previous
  const el = $('tradeTokenPrice');
  if (el) {
    const prev = t.price || 0;
    el.textContent = fmt.price(p);
    if (prev > 0 && p !== prev) {
      el.style.color = p > prev ? 'var(--accent-green)' : 'var(--accent-red)';
      el.style.transition = 'color 0.2s';
    }
  }
  t.price = p;

  // 2. Live candle: extend/replace the current in-progress candle on the chart
  if (_tradeSeries && _tradeLastCandle) {
    const secs   = TRADE_INTERVAL_SECS[_tradeInterval] || 60;
    const bucket = Math.floor(Date.now() / 1000 / secs) * secs;
    if (bucket <= _tradeLastCandle.time) {
      // Same (or older) bucket — update the existing candle
      _tradeLastCandle.close = p;
      _tradeLastCandle.high  = Math.max(_tradeLastCandle.high, p);
      _tradeLastCandle.low   = Math.min(_tradeLastCandle.low,  p);
    } else {
      // New interval started — open a fresh live candle from the previous close
      const open = _tradeLastCandle.close;
      _tradeLastCandle = { time: bucket, open, high: Math.max(open, p), low: Math.min(open, p), close: p };
    }
    try { _tradeSeries.update(_tradeLastCandle); } catch (_) {}
  }
}

function tradeSetInterval(intv) {
  _tradeInterval = intv;
  document.querySelectorAll('.trade-chart-int').forEach(b => {
    const on = b.dataset.int === intv;
    b.style.background   = on ? 'var(--green-20)' : 'var(--bg-secondary)';
    b.style.borderColor  = on ? 'var(--green-60)' : 'var(--border-light)';
    b.style.color        = on ? 'var(--accent-green)' : 'var(--text-muted)';
    b.style.fontWeight   = on ? '700' : '600';
  });
  // Rebuild candles from the cached transaction history with the new bucket size
  _tradeRenderChartFromTrades(true);
}

async function tradeLoadTxs(showLoading = true) {
  const t = _tradeToken;
  const pairAtCall = _tradePairAddr;
  const list = $('tradeTxList');
  if (!t || !pairAtCall || !list) return;
  if (showLoading) list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">Loading transactions…</div>';
  try {
    const net = TRADE_GECKO_NET[t.chain] || t.chain;
    // Fetch up to 300 trades: top 30 shown in the list, all of them feed the chart
    const r = await fetch(`${API_BASE}/recent-trades`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ poolAddress: pairAtCall, network: net, chain: t.chain, limit: 300 }),
    });
    const j = await r.json();
    // The user may have switched to a different pool while this request was
    // in flight — an older response landing after a newer one has already
    // rendered would otherwise clobber the currently-viewed pool's data.
    if (_tradePairAddr !== pairAtCall) return;
    const allTrades = j.trades || [];
    if (!allTrades.length) {
      // An empty result can be a genuinely trade-less pool OR a transient
      // upstream hiccup (GeckoTerminal rate-limit/timeout) on a background
      // poll. Only blank an already-populated list on an explicit
      // user-initiated refresh (showLoading) — a silent background poll
      // that comes back empty just leaves the last-known-good rows up
      // rather than making the whole table appear to "disappear".
      if (showLoading || !_tradeTrades.length) {
        list.innerHTML = !_tradeTxFetchAttempted
          ? '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">Loading transactions…</div>'
          : '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">No recent trades data for this pool</div>';
      }
      _tradeTxFetchAttempted = true;
      return;
    }
    _tradeTxFetchAttempted = true;

    // Chart = transaction history (rebuild only on first load / new data)
    const firstBuild = _tradeTrades.length === 0;
    _tradeTrades = allTrades;
    _tradeRenderChartFromTrades(firstBuild);

    const trades = allTrades.slice(0, 30);
    const explorer = TRADE_CHAINS[t.chain]?.explorer || '';
    const fmtTxPrice = p => !p ? '—' : fmt.price(p);
    list.innerHTML = trades.map(tr => `
      <div style="display:grid;grid-template-columns:56px 1fr 1fr 1fr 62px 34px;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border-light);font-size:11px;align-items:center">
        <span style="font-weight:800;color:${tr.isBuy ? 'var(--accent-green)' : 'var(--accent-red)'}">${tr.isBuy ? '▲ BUY' : '▼ SELL'}</span>
        <span style="text-align:right;font-family:monospace;font-weight:700;color:${tr.isBuy ? 'var(--accent-green)' : 'var(--accent-red)'};font-size:10px" title="Execution price">${fmtTxPrice(tr.priceUsd)}</span>
        <span style="text-align:right;font-family:monospace;font-weight:700;color:var(--text-primary)">$${tr.volUsd >= 1000 ? (tr.volUsd/1000).toFixed(1)+'K' : tr.volUsd.toFixed(2)}</span>
        <span style="font-family:monospace;color:var(--text-muted);font-size:10px">${tr.wallet}</span>
        <span style="text-align:right;color:var(--text-muted);font-size:10px">${tr.time}</span>
        <span style="text-align:right">${tr.txHash && explorer ? `<a href="${explorer}${tr.txHash}" target="_blank" rel="noopener" style="color:var(--accent-green);font-size:10px;text-decoration:none">↗</a>` : '—'}</span>
      </div>`).join('');
    const upd = $('tradeTxUpdated');
    if (upd) upd.textContent = 'Updated ' + new Date().toLocaleTimeString();

    // Latest transaction drives the live price (token bar + current candle)
    const newest = trades[0];
    if (newest?.priceUsd > 0) _applyTradePrice(newest.priceUsd);
  } catch (_) {
    if (showLoading) list.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--text-muted)">Failed to load transactions</div>';
  }
}

/* ─── Colorblind mode ──────────────────────────────────────────────────────
   Swaps the green/red up-down convention for a blue/orange pair that stays
   distinguishable across deuteranopia/protanopia/tritanopia. Preference is
   stored in localStorage so it persists across sessions. */
function _applyColorblindMode(on) {
  document.documentElement.setAttribute('data-colorblind', on ? 'true' : 'false');
  const label = $('colorblindToggleLabel');
  if (label) label.textContent = `Colorblind mode: ${on ? 'On' : 'Off'}`;
  const swatches = $('colorblindSwatches');
  if (swatches) swatches.style.display = on ? 'inline-flex' : 'none';
  const btn = $('colorblindToggleBtn');
  if (btn) {
    btn.style.borderColor = on ? 'var(--accent-blue)' : 'var(--border)';
    btn.style.color = on ? 'var(--accent-blue)' : 'var(--text-secondary)';
    btn.style.boxShadow = on ? '0 0 0 1px var(--accent-blue), 0 0 8px 1px rgba(74,144,226,0.35)' : 'none';
  }
  _refreshChartColorsForColorblindMode();
}

// Canvas/Chart.js/lightweight-charts all bake resolved colors in at render
// time — they don't react to a CSS variable changing on their own, unlike
// plain HTML which repaints automatically. So toggling colorblind mode has
// to explicitly recolor anything already on screen: live-update the
// candlestick series in place, and rebuild the risk gauge / distribution /
// holder-tier charts from whatever token is currently loaded. The wallet
// relationship map's canvas resolves its colors fresh every animation frame
// (see nodeColor()/edgeColor above) so it needs no extra handling here.
function _refreshChartColorsForColorblindMode() {
  const green = _resolveCssVar('var(--accent-green)');
  const red   = _resolveCssVar('var(--accent-red)');

  if (window._candleSeries) {
    window._candleSeries.applyOptions({
      upColor: green, downColor: red,
      borderUpColor: green, borderDownColor: red,
      wickUpColor: green, wickDownColor: red,
    });
  }
  if (typeof _tradeSeries !== 'undefined' && _tradeSeries) {
    _tradeSeries.applyOptions({
      upColor: green, downColor: red,
      borderUpColor: green, borderDownColor: red,
      wickUpColor: green, wickDownColor: red,
    });
  }

  if (typeof _currentTokenData !== 'undefined' && _currentTokenData) {
    if (typeof renderRiskScore === 'function')      renderRiskScore(_currentTokenData);
    if (typeof renderDistribution === 'function')   renderDistribution(_currentTokenData);
    if (typeof renderHolderStats === 'function')    renderHolderStats(_currentTokenData);
    if (typeof renderVolumeChart === 'function')    renderVolumeChart(_currentTokenData);
  }
}
function toggleColorblindMode() {
  const on = document.documentElement.getAttribute('data-colorblind') !== 'true';
  localStorage.setItem('colorblindMode', on ? '1' : '0');
  _applyColorblindMode(on);
  playClickSound();
}
_applyColorblindMode(localStorage.getItem('colorblindMode') === '1');

/* ─── Push notifications (Web Push) ────────────────────────────────────────
   Lets alert notifications reach the user even when the tab is closed or
   backgrounded, via a service worker + browser push subscription tied to
   the connected wallet. */
function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function _getPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.register('/sw.js').catch(() => null);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

function _updatePushToggleBtn(subscribed) {
  const btn = $('pushToggleBtn');
  if (!btn) return;
  btn.textContent = subscribed ? '🔔 Push Enabled' : '🔕 Enable Push';
  btn.style.color = subscribed ? 'var(--accent-green)' : '#9ca3af';
  btn.style.borderColor = subscribed ? 'var(--green-40)' : '#2d3144';
}

async function refreshPushToggleBtn() {
  const sub = await _getPushSubscription().catch(() => null);
  _updatePushToggleBtn(!!sub);
}

async function togglePushNotifications() {
  playClickSound();
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('Push notifications aren\'t supported in this browser');
    return;
  }
  const existing = await _getPushSubscription().catch(() => null);
  if (existing) {
    try {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify({ endpoint: existing.endpoint }),
      });
      await existing.unsubscribe();
      _updatePushToggleBtn(false);
      showToast('Push notifications disabled');
    } catch (e) { showToast('Failed to disable push notifications'); }
    return;
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { showToast('Notification permission denied'); return; }

    const keyRes = await fetch(`${API_BASE}/push/vapid-public-key`);
    const keyData = await keyRes.json();
    if (!keyData.success) { showToast('Push notifications aren\'t configured on the server yet'); return; }

    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(keyData.publicKey),
    });

    await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ..._authHeaders() },
      body: JSON.stringify({ subscription: sub }),
    });
    _updatePushToggleBtn(true);
    showToast('Push notifications enabled — alerts will reach you even with the tab closed');
  } catch (e) {
    console.error('[push] subscribe failed:', e);
    showToast('Failed to enable push notifications');
  }
}

if (document.getElementById('pushToggleBtn')) refreshPushToggleBtn();
