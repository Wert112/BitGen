// GramFi product motion v5 — dark theme, one BTC thread: attention -> AI explanation -> region -> channels ->
// source post -> the same market -> the user's own action in the Telegram bot. Every visual is a pure function of t.
// window.renderAt(t) draws the frame; window.EVENTS lists sound/sync events for the audio builder.
// Grid: 140 BPM (beat B = 60/140 s). Cuts sit on beats; the phone flies in the track's break and lands on its drop.
'use strict';
const B = 60 / 140;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const H = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const SVGNS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  io: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  o: u => 1 - Math.pow(1 - u, 3),
  o5: u => 1 - Math.pow(1 - u, 5),
  i: u => u * u * u,
  ob: u => { const c1 = 1.45, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }, // only the phone landing
};
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
function spline(keys, t, f) {
  if (t <= keys[0].t) return keys[0][f];
  const n = keys.length; if (t >= keys[n - 1].t) return keys[n - 1][f];
  let i = 0; while (keys[i + 1].t < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const h = k2.t - k1.t, u = (t - k1.t) / h;
  const m1 = (k1.hold ? 0 : (k2[f] - k0[f]) / Math.max(1e-6, k2.t - k0.t)) * h;
  const m2 = (k2.hold ? 0 : (k3[f] - k1[f]) / Math.max(1e-6, k3.t - k1.t)) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * k1[f] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2[f] + (u3 - u2) * m2;
}
const SQ = (() => { const p = []; for (let i = 0; i < 360; i += 3) { const a = i * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); p.push(`${(50 + 50 * Math.sign(c) * Math.pow(Math.abs(c), .4)).toFixed(2)},${(50 + 50 * Math.sign(s) * Math.pow(Math.abs(s), .4)).toFixed(2)}`); } return 'M' + p.join(' L') + 'Z'; })();
const ARROW = 'M21.5,38.6 L75.2,24.6 L61.4,79 Q53.4,63 53.6,50.2 L63.4,38.8 L47,48.4 Q31.5,51.5 21.5,38.6 Z';
const MARK = (fill = '#0B0B0B', slit = '#EAFF00') => `<path d="${ARROW}" fill="${fill}" stroke="${fill}" stroke-width="5.5" stroke-linejoin="round"/><path d="M53.6,50.2 L63.4,38.8" stroke="${slit}" stroke-width="2.2" stroke-linecap="round"/><circle cx="40.3" cy="60" r="5.6" fill="${fill}"/>`;
const LOGO = s => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${SQ}" fill="#EAFF00"/>${MARK()}</svg>`;
const MARKET = 'Will BTC close above $80K on Oct 30, 2026?';
const FED = 'Will there be no change in Fed interest rates after the October 2026 meeting?'; // the alert example: any market works
let TV = 0; // video time, for motion that keeps running through reading pauses

/* ======================================================================
   TIMELINE (beats)
   ====================================================================== */
const T = { A: 10 * B, ai: 22 * B, ctry: 32 * B, top: 38 * B, map: 42 * B, tele: 52 * B, poly: 64 * B, D: 76 * B };
T.copy = T.D + 26 * B; T.auto = T.copy + 12 * B; T.perp = T.auto + 16 * B; T.alert = T.perp + 12 * B; T.fin = T.alert + 14 * B; T.end = T.fin + 7.6;
const D = T.D;
const CUT = T.poly + 2.1; // Trade on the market card -> GramFi-Polymarket overview page
// Scene time (tw) vs video time (tv): reading pauses in the web half, whole beats each (20 in total) so the phone
// still lands on the drop. During a pause the scene holds its state while the camera keeps drifting.
const HOLDS = [[T.A + 2.6, 3], [T.ai + 2.35, 4], [T.ctry + 1.75, 2], [T.map + 3.15, 2], [T.tele + 2.2, 3], [T.poly + 1.1, 3], [T.poly + 1.35, 3]];
const warp = tv => { let acc = 0; for (const [h, n] of HOLDS) { const hv = h + acc; if (tv < hv) return tv - acc; if (tv < hv + n * B) return h; acc += n * B; } return tv - acc; };
const toV = tw => { let acc = 0; for (const [h, n] of HOLDS) if (h < tw) acc += n * B; return tw + acc; };
const DUR = T.end + HOLDS.reduce((a, [, n]) => a + n * B, 0);
const EVENTS = [];
const ev = (t, type, extra = {}) => EVENTS.push({ t, type, ...extra });
const GROUPS = [[0, '#EAFF00', .10], [T.A, '#EAFF00', .15], [T.ctry, '#8B6CFF', .20], [T.poly, '#2EA6FF', .20], [T.fin, '#EAFF00', .22]];
const ILLU = [[T.ctry, T.top], [T.map, T.fin]]; // scenes whose data is illustrative

/* ======================================================================
   WORLD — deco (static after it draws in)
   ====================================================================== */
const cam = $('#cam');
const R0 = rng(11);
function decoSVG(kind, col) {
  let h = ''; const P = (d, w = 2.5) => { h += `<path class="dp" pathLength="1" d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const rr = (x, y, w, hh, r) => `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + hh - r} Q${x + w},${y + hh} ${x + w - r},${y + hh} H${x + r} Q${x},${y + hh} ${x},${y + hh - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
  const W = 3600, Hh = 2400;
  if (kind === 'tree') for (let i = 0; i < 14; i++) { const w = 140 + R0() * 380, hh = 100 + R0() * 300; P(rr(R0() * (W - w), R0() * (Hh - hh), w, hh, 4)); }
  if (kind === 'net') { const pts = []; for (let i = 0; i < 26; i++) pts.push([R0() * W, R0() * Hh]); pts.forEach((p, i) => { const q = pts[(i * 7 + 3) % pts.length]; P(`M${p[0]},${p[1]} L${q[0]},${q[1]}`, 2); }); }
  if (kind === 'msgs') for (let i = 0; i < 14; i++) { const w = 220 + R0() * 260, hh = 80 + R0() * 60, x = R0() * (W - w), y = R0() * (Hh - hh - 60); P(rr(x, y, w, hh, 34) + ` M${x + 36},${y + hh} L${x + 18},${y + hh + 44} L${x + 84},${y + hh}`); }
  if (kind === 'candles') { let y = 1700; for (let i = 0; i < 22; i++) { const x = 160 + i * 150, up = R0() > .35, hh = 80 + R0() * 220; y += up ? -60 - R0() * 40 : 40 + R0() * 30; P(rr(x, y - hh / 2, 70, hh, 10), 3); P(`M${x + 35},${y - hh / 2 - 60} V${y - hh / 2} M${x + 35},${y + hh / 2} V${y + hh / 2 + 60}`, 3); } }
  return `<svg class="deco" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">${h}</svg>`;
}
const DECO = [[T.A, T.ctry, 'tree', 'rgba(234,255,0,.07)', 0], [T.ctry, T.poly, 'net', 'rgba(139,108,255,.14)', 0],
  [D, T.perp, 'msgs', 'rgba(46,166,255,.12)', 1]].map(([a, b, k, col, mob]) => {
  const el = H(`<div class="w">${decoSVG(k, col)}</div>`); cam.appendChild(el); return { a, b, mob, el, paths: $$('.dp', el) };
});

/* ---------------- BROWSER (GramFi site, dark) ---------------- */
const ICW = '#D8D8D8';
const SIDEI = [['sb_pop', 'Most Popular Coin', `<path d="M7 1l1.8 3.8 4.2.5-3.1 2.9.8 4.1L7 10.3 3.3 12.3l.8-4.1L1 5.3l4.2-.5z" fill="none" stroke="${ICW}" stroke-width="1.4" stroke-linejoin="round"/>`],
  ['sb_narr', 'Narrative Mindshare', `<path d="M2 2h10v10H2zM7 2v10M2 7h5" fill="none" stroke="${ICW}" stroke-width="1.4"/>`],
  ['sb_corr', 'Correlation', `<path d="M1 11 L4 7 L7 9 L13 3" fill="none" stroke="${ICW}" stroke-width="1.6" stroke-linecap="round"/>`],
  ['sb_feed', 'Telegram Feeds', `<path d="M2 3h10M2 7h10M2 11h6" stroke="${ICW}" stroke-width="1.6" stroke-linecap="round"/>`],
  ['sb_ctry', 'Country Popular Coins', `<circle cx="7" cy="7" r="5.5" fill="none" stroke="${ICW}" stroke-width="1.4"/><path d="M1.5 7h11M7 1.5c-3 3-3 8 0 11c3-3 3-8 0-11" fill="none" stroke="${ICW}" stroke-width="1.2"/>`],
  ['sb_lead', 'Projects Leaderboard', `<path d="M2 12V7h3v5M6 12V3h3v9M10 12V5h3v7" fill="${ICW}"/>`],
  ['sb_bub', 'Crypto Bubbles', `<circle cx="5" cy="8" r="3.5" fill="none" stroke="${ICW}" stroke-width="1.4"/><circle cx="10" cy="4.5" r="2.5" fill="none" stroke="${ICW}" stroke-width="1.4"/>`],
  ['sb_map', 'Channel Map', `<circle cx="3" cy="3" r="1.8" fill="${ICW}"/><circle cx="11" cy="5" r="1.8" fill="${ICW}"/><circle cx="6" cy="11" r="1.8" fill="${ICW}"/><path d="M3 3L11 5L6 11Z" fill="none" stroke="${ICW}" stroke-width="1"/>`],
  ['sb_tele', 'Telescope', `<circle cx="6" cy="6" r="4.2" fill="none" stroke="${ICW}" stroke-width="1.5"/><path d="M9.2 9.2L13 13" stroke="${ICW}" stroke-width="1.6" stroke-linecap="round"/>`],
  ['sb_top', 'Top 10 Channels', `<path d="M4 2h6v3a3 3 0 0 1-6 0zM7 8v3M4.5 12h5" fill="none" stroke="${ICW}" stroke-width="1.4" stroke-linecap="round"/>`]];
const browser = H(`<div class="w"><div id="browser">
  <div class="bbar"><span class="dot" style="background:#FF6058"></span><span class="dot" style="background:#FFBD2E"></span><span class="dot" style="background:#28C941"></span><div class="url mono" id="url"></div></div>
  <div class="nav"><div class="logo">${LOGO(34)}GramFi</div><span class="it on" id="nav_insight">Insight</span><span class="it" id="nav_poly">Polymarket</span><span class="it">Airdrops</span><span class="it">Voting</span><span class="it">About ▾</span>
   <span class="gp">100 GP</span><span class="acct"><i></i>MY ACCOUNT ▾</span></div>
  <div class="side">${SIDEI.map(([id, n, ic]) => `<div class="s" id="${id}"><svg viewBox="0 0 14 14">${ic}</svg><div class="tipl">${n}</div></div>`).join('')}</div>
  <div class="content" id="content"></div>
  <div class="fab">${`<svg width="30" height="30" viewBox="0 0 100 100">${MARK()}</svg>`}</div>
</div></div>`);
cam.appendChild(browser);
const content = $('#content');
const PAGES = [];
const addPage = (el, a, b, url, sb, kind = 'slide') => { content.appendChild(el); PAGES.push({ el, a, b, url, sb, kind }); return el; };
function squarify(items, x, y, w, h) {
  const total = items.reduce((s, i) => s + i.v, 0), sc = w * h / total, res = {};
  let rest = items.map(i => ({ ...i, a: i.v * sc }));
  while (rest.length) {
    const short = Math.min(w, h);
    const worst = r => { const s = r.reduce((a, b) => a + b.a, 0), mx = Math.max(...r.map(e => e.a)), mn = Math.min(...r.map(e => e.a)); return Math.max(short * short * mx / (s * s), s * s / (short * short * mn)); };
    let row = [rest[0]], i = 1;
    while (i < rest.length && worst([...row, rest[i]]) <= worst(row)) { row.push(rest[i]); i++; }
    const s = row.reduce((a, b) => a + b.a, 0);
    if (w >= h) { const cw = s / h; let cy = y; row.forEach(e => { const ch = e.a / cw; res[e.name] = { x, y: cy, w: cw, h: ch }; cy += ch; }); x += cw; w -= cw; }
    else { const ch = s / w; let cx = x; row.forEach(e => { const c2 = e.a / ch; res[e.name] = { x: cx, y, w: c2, h: ch }; cx += c2; }); y += ch; h -= ch; }
    rest = rest.slice(i);
  }
  return res;
}

// ---- S1/S2: Most Popular Coin (reference snapshot: toggle off, 24H) + Bitcoin panel with AI Analysis
const CR = { red: '#5C120B', red2: '#47100A', org: '#C4471B', grn: '#0D5A3A', teal: '#0E4E4A' };
const COINS = [ // name, icon bg, glyph, price, 24HΔ, weight(24H share), tile colour, medal
  ['Bitcoin', '#F7931A', '₿', '$79843.73', -.57, 11.86, CR.red, '🏆'], ['Solana', '#7A4CF2', 'S', '$99.99', -1.32, 10.29, CR.red, '🥈'], ['Ethereum', '#627EEA', 'Ξ', '$2312.52', -.57, 5.96, CR.red, '🥉'],
  ['Cap', '#2A2A2A', 'C', '$0.0992', 25.93, 5.2, CR.org, ''], ['BNB', '#F0B90B', 'B', '$738.61', -.11, 4.97, CR.org, ''], ['XRP', '#23292F', 'X', '$1.30', 1.0, 4.56, CR.org, ''],
  ['Hyperliquid', '#0F3F38', 'H', '$77.68', .81, 2.6, CR.red2, ''], ['Pump.fun', '#3A3A3A', 'P', '$0.004185', -1.36, 2.31, CR.red2, ''], ['USDC', '#2775CA', '$', '$0.9997', -.01, 2.24, CR.red2, ''],
  ['OKB', '#111', 'O', '$108.25', -.46, 2.03, CR.red2, ''], ['Re', '#111', 're', '$0.3594', -1.3, 1.93, CR.red2, ''], ['Zcash', '#E8B03A', 'Z', '$1251.74', 1.83, 1.54, CR.red2, ''],
  ['NEAR', '#111', 'N', '$2.12', .4, 1.2, CR.red2, ''], ['IRYS', '#1C1C1C', 'I', '$0.0272', 2.0, 1.1, CR.grn, ''], ['ONDO', '#1C1C1C', 'O', '$0.4064', .5, .95, CR.org, ''],
  ['Aave', '#B6509E', 'A', '$130.62', -3.34, .9, CR.red2, ''], ['GRAM', '#2A2A2A', 'G', '$1.21', .6, .85, CR.red2, ''], ['TRX', '#E5484D', 'T', '$0.3274', .7, .7, CR.red2, ''],
  ['SUI', '#4DA2FF', 'S', '$0.9044', 1.1, .7, CR.red2, ''], ['Dash', '#008DE4', 'D', '$54.57', .7, .72, CR.red2, ''], ['RENDER', '#E5484D', 'R', '$2.41', .8, .6, CR.grn, ''],
  ['AIN', '#1C1C1C', 'A', '$0.11', .2, .55, CR.teal, ''], ['TAG', '#1C1C1C', 'T', '$0.01', .1, .5, CR.red2, ''], ['HTX', '#1C1C1C', 'H', '$0.0000019', .3, .45, CR.red2, '']];
const LT = squarify(COINS.map(c => ({ name: c[0], v: c[5] })), 0, 0, 806, 614);
const MOV = [['Bitcoin', '#F7931A', '₿', '18.04%', '11.86%', '12.20%', '$79843.73', '-0.57%'], ['Solana', '#7A4CF2', 'S', '10.24%', '10.29%', '9.45%', '$99.99', '-1.32%'], ['Ethereum', '#627EEA', 'Ξ', '8.46%', '5.96%', '6.73%', '$2312.52', '-0.57%'],
  ['Cap', '#2A2A2A', 'C', '4.01%', '5.20%', '4.59%', '$0.0992', '+25.93%'], ['BNB', '#F0B90B', 'B', '4.01%', '4.97%', '4.08%', '$738.61', '-0.11%'], ['XRP', '#23292F', 'X', '4.01%', '4.56%', '3.20%', '$1.30', '+1.00%'],
  ['USDC', '#2775CA', '$', '3.56%', '2.24%', '2.43%', '$0.9997', '-0.01%'], ['OKB', '#111', 'O', '2.23%', '2.03%', '2.52%', '$108.25', '-0.46%'], ['Re', '#111', 'r', '2.00%', '1.93%', '1.64%', '$0.3594', '-1.30%'],
  ['Bittensor', '#111', 'T', '2.00%', '0.15%', '0.11%', '$248.53', '-0.68%'], ['Pump.fun', '#3A3A3A', 'P', '1.78%', '2.31%', '2.56%', '$0.004185', '-1.36%'], ['Aave', '#B6509E', 'A', '1.78%', '0.90%', '0.87%', '$130.62', '-3.34%'],
  ['Zcash', '#E8B03A', 'Z', '1.56%', '1.54%', '1.32%', '$1251.74', '+1.83%'], ['Dash', '#008DE4', 'D', '1.56%', '0.72%', '0.40%', '$54.57', '+0.48%'], ['TRON', '#E5484D', 'T', '1.56%', '0.70%', '0.82%', '$0.3274', '-0.15%'],
  ['Hyperliquid', '#0F3F38', 'H', '1.40%', '2.60%', '1.90%', '$77.68', '+0.81%'], ['NEAR', '#111', 'N', '1.20%', '1.20%', '1.10%', '$2.12', '+0.40%']];
const trend = (() => { const v = [720, 1310, 780, 1050, 990, 1210, 740, 750, 1240, 1060, 1400, 1420, 1270, 730, 800, 1430]; const W = 380, Hc = 230; return v.map((y, i) => [i / (v.length - 1) * W, Hc - y / 1450 * Hc]); })();
const trendPath = (() => { let d = `M${trend[0][0]},${trend[0][1]}`; for (let i = 1; i < trend.length; i++) { const [x0, y0] = trend[i - 1], [x1, y1] = trend[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; } return d; })();
const pg_mpc = addPage(H(`<div class="page" style="padding:0">
  <div style="position:absolute;left:26px;top:22px;right:560px" class="ptitle"><h2>Most Popular Coin</h2><span class="info">i</span><span style="margin-left:auto;display:flex;gap:14px;align-items:center"><span class="tg2"></span><span class="tabw"><span class="on">24H</span><span>7D</span><span>30D</span><span>90D</span></span></span></div>
  <div class="tm" id="tm"></div>
  <div class="movers"><div class="hd2"><b>Top Movers <span class="info" style="display:inline-flex;vertical-align:middle">i</span></b><span class="srch">🔍&nbsp; Search coin</span></div>
   <div class="mt"><div class="r h"><span style="text-align:left">Coin</span><span>1H ↓</span><span>24H</span><span>7D</span><span>Price</span><span>24H Δ</span></div>
   ${MOV.map(m => `<div class="r"><span class="cn"><i style="background:${m[1]}">${m[2]}</i>${m[0].length > 6 ? m[0].slice(0, 5) + '…' : m[0]}<span class="aiic" ${m[0] === 'Bitcoin' ? 'id="aiBtc"' : ''}>✦</span></span><span>${m[3]}</span><span>${m[4]}</span><span>${m[5]}</span><span>${m[6]}</span><span class="${m[7][0] === '+' ? 'up' : 'dn'}">${m[7]}</span></div>`).join('')}</div></div>
  <div id="mpcDim" style="position:absolute;inset:0;background:rgba(0,0,0,.55)"></div>
  <div id="btcPanel"><div class="bph"><span style="width:34px;height:34px;border-radius:50%;background:#F7931A;display:flex;align-items:center;justify-content:center">₿</span>Bitcoin <span class="t">BTC</span><span style="margin-left:auto;display:flex;gap:8px"><span class="btn lime">Trade</span><span class="btn">Close</span></span></div>
   <div style="position:absolute;left:16px;top:80px;width:470px">
    <div class="aibox"><h4>30-day Mention Trend</h4><svg width="420" height="250" viewBox="-30 -10 420 260"><path d="${trendPath} L380,230 L0,230 Z" fill="rgba(234,255,0,.18)"/><path id="trendL" d="${trendPath}" fill="none" stroke="#EAFF00" stroke-width="2.5"/>${trend.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#EAFF00"/>`).join('')}<text x="-26" y="4" fill="#888" font-size="11">1450</text><text x="-26" y="120" fill="#888" font-size="11">725</text><text x="-10" y="232" fill="#888" font-size="11">0</text></svg></div>
    <div class="aibox" id="aiBox" style="margin-top:16px"><h4>AI Analysis</h4><ul><li><span>Mentions rose sharply because several high-impact news items hit at once: </span><span class="hl" id="aiHl">BlackRock's IBIT moved 1,698 BTC to Coinbase Prime</span><span>, which traders interpreted as a possible sale, while a Japanese whale suddenly withdrew 65 BTC after two quiet years.</span></li><li>Bitcoin also broke below the key $80,000 level and traded around $79,700, increasing discussion across trading channels.</li></ul></div></div>
   <div style="position:absolute;left:502px;top:80px;width:300px" class="aibox"><div style="text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:#F7931A;margin:4px auto 10px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800">₿</div><b style="font-size:20px">Bitcoin</b><div style="color:var(--lime);font-size:14px">BTC</div>
     <div style="color:#999;font-size:13px;margin-top:16px">Current Price</div><div style="color:var(--lime);font-size:24px;font-weight:700">$79843.73</div></div>
     <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:14px 0">${[['1H', '+0.28%', 'up'], ['24H', '-0.57%', 'dn'], ['7D', '-1.95%', 'dn']].map(([k, v, c]) => `<div style="border:1px solid #262626;border-radius:4px;padding:10px 4px;text-align:center"><div style="font-size:12px;color:#999">${k}</div><div class="${c}" style="font-size:16px;font-weight:700">${v}</div></div>`).join('')}</div>
     <b style="font-size:16px">Details</b>${[['CMC Rank', '#1'], ['24h Volume', '$25811.57M'], ['Market Cap', '$1605.20B']].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}</div></div>
</div>`), -1, T.ctry, 'insight?tab=popular', 'sb_pop');
const tmEl = $('#tm', pg_mpc);
const tiles = COINS.map(c => { const r = LT[c[0]], big = r.w > 200 && r.h > 160; const el = H(`<div class="tile ${big ? 'big' : ''}" id="tile_${c[0].replace(/[^a-z0-9]/gi, '')}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:${c[6]};${c[7] ? `border-color:${c[7] === '🏆' ? '#E2B33C' : c[7] === '🥈' ? '#BFC3C8' : '#B07A4E'}` : ''}">${c[7] ? `<span class="tro">${c[7] === '🏆' ? '🏆' : '🏆'}</span>` : ''}<div class="n"><i style="background:${c[1]}">${c[2]}</i>${r.w > 90 ? c[0] : c[0].slice(0, 4) + '…'}</div>${r.h > 50 ? `<div class="p">${c[3]}</div><div class="c ${c[4] >= 0 ? 'up' : 'dn'}">${c[4] >= 0 ? '▲' : '▼'}${Math.abs(c[4]).toFixed(2)}%</div>` : ''}</div>`); tmEl.appendChild(el); return el; });

// ---- S3: Country Popular Coins (illustrative values)
const CTRY = [['kr', 'Korea', 37, 127.5, 4.5, '#FF6FA5'], ['vn', 'Vietnam', 16, 106.5, 5, '#F0A24A'], ['ir', 'Iran', 32, 54, 7, '#3FBF8F'], ['id', 'Indonesia', -2, 117, 8, '#D9B52C'],
  ['ru', 'Russia', 60, 90, 17, '#9B7BFF'], ['us', 'United States', 39, -98, 14, '#5B8DEF'], ['tr', 'Türkiye', 39, 35, 4.5, '#FF5C60'], ['br', 'Brazil', -10, -52, 12, '#2BD47D']];
const pg_ctry = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Country Popular Coins</h2><span class="info">i</span><span class="tabw" style="margin-left:auto"><span class="on">24H</span><span>7D</span><span>30D</span></span></div>
  <canvas id="globe" width="1240" height="1240" style="position:absolute;left:40px;top:84px;width:620px;height:620px"></canvas>
  <div class="card" style="position:absolute;left:720px;top:84px;width:610px;height:620px;padding:20px">
   <div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin-bottom:12px">SELECT A COUNTRY</div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">${CTRY.map(c => `<div class="cchip" id="c_${c[0]}"><i style="background:${c[5]}"></i>${c[1]}</div>`).join('')}</div>
   <div id="ctryRes" style="margin-top:12px;border-top:1px solid #262626;padding-top:14px"><b style="font-size:18px;display:block;margin-bottom:10px">Korea · top coins · share of mentions</b>
    ${[['XRP', 24, '#C9CEC4'], ['BTC', 19, '#F7931A'], ['SUI', 11, '#5B8DEF'], ['DOGE', 8, '#D9B52C'], ['ONDO', 6, '#3FBF8F']].map(([c, v, col]) => `<div class="crow" ${c === 'BTC' ? 'id="krBtc"' : ''}><b>${c}</b><div class="bar cbar" data-v="${v}" style="background:${col}"></div><span class="mono">${v}%</span></div>`).join('')}</div></div>
</div>`), T.ctry, T.top, 'insight?tab=country', 'sb_ctry', 'zoom');
const gctx = $('#globe', pg_ctry).getContext('2d');
const LAND = [[48, -100, 22, 38], [65, -150, 8, 25], [20, -100, 10, 14], [72, -42, 10, 18], [-15, -60, 22, 15], [-40, -68, 13, 7], [52, 15, 12, 22], [63, 15, 7, 10], [8, 20, 22, 22], [-20, 25, 15, 14],
  [28, 45, 10, 14], [60, 95, 13, 60], [38, 100, 15, 35], [22, 78, 10, 9], [15, 103, 7, 7], [-3, 115, 5, 18], [36, 138, 6, 3], [37, 127.5, 3, 2.5], [-25, 134, 11, 17], [68, 100, 8, 55]];
const GDOTS = [];
for (let la = -78; la <= 80; la += 2.3) { const step = 2.3 / Math.max(.2, Math.cos(la * Math.PI / 180)); for (let lo = -180; lo < 180; lo += step) {
  const land = LAND.some(([a, b, ra, rb]) => { let d = lo - b; d = ((d + 540) % 360) - 180; return (Math.pow((la - a) / ra, 2) + Math.pow(d / rb, 2)) < 1; });
  if (!land) continue; let c = null; for (const k of CTRY) { let d = lo - k[3]; d = ((d + 540) % 360) - 180; if (Math.hypot(la - k[2], d * Math.cos(la * Math.PI / 180)) < k[4]) c = k[5]; }
  GDOTS.push([la, lo, c]); } }

// ---- S4: Top 10 Channels (reference values)
const TOP = [['Tonfan', 80909], ['Activity News', 27119], ['Tonfan 中文', 12008], ['CRYPTORJ', 11576], ['My Proxy', 10207], ['Airdrop Ninja', 10190], ['Dark Crypto', 9555], ['GEMHUNT', 9457], ['Coin Haonoto', 9192], ['Moon Vibes', 8284]];
const pg_top = addPage(H(`<div class="page"><div class="ptitle"><h2>Top 10 Channels</h2><span class="info">i</span><span style="margin-left:auto;display:flex;gap:8px"><span class="pill">RANGE: 1–10TH</span><span class="pill" style="border-color:#EAFF00;color:#EAFF00">SORT BY: RECENT AVG. VIEWS</span></span></div><div id="pods"></div></div>`), T.top, T.map, 'insight?tab=top10', 'sb_top', 'drop');
const pods = []; [[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]].forEach((row, ri) => row.forEach((k, j) => { const [n, v] = TOP[k - 1]; const x = 660 - (row.length * 236 + (row.length - 1) * 16) / 2 + j * 252, y = 110 + ri * 130;
  const el = H(`<div class="pod ${k === 1 ? 'first' : ''}" style="left:${x}px;top:${y}px"><div class="r">#${k}</div><div class="nm"><span style="width:30px;height:30px;border-radius:50%;background:hsl(${k * 37},45%,45%)"></span>${n}</div><div class="k">RECENT AVG. VIEWS</div><div class="v">${fmt(v)}</div></div>`);
  $('#pods', pg_top).appendChild(el); pods.push({ el, ri, j }); }));

// ---- S5: Channel Map (Crypto Channel is a conditional, labelled example)
const pg_map = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Channel Map</h2><span class="info">i</span><div style="display:flex;gap:8px;margin-left:auto"><div class="inp" id="mapInp" style="width:320px"><span id="mapTxt">Search channel name</span><span class="caret" id="caret"></span></div><div class="btn" id="mapBtn">Search</div></div></div>
  <div style="position:absolute;left:26px;top:84px;width:1318px;height:620px;border-radius:6px;overflow:hidden;border:1px solid #1E1E1E;background:#080808">
   <canvas id="map" width="2636" height="1240" style="width:1318px;height:620px"></canvas>
   <div class="legend"><span><i style="background:#5B8DEF"></i>EN</span><span><i style="background:#9B7BFF"></i>RU</span><span><i style="background:#FF6FA5"></i>KR</span><span><i style="background:#F0A24A"></i>VN</span><span id="lgFwd" style="border-color:#EAFF00"><b style="color:#EAFF00">━</b> message forward</span></div>
   <div class="minfo" id="mapInfo"><div style="display:flex;gap:10px;align-items:center;font-weight:700;font-size:16px"><span style="width:34px;height:34px;border-radius:50%;background:#3A3F3A;display:flex;align-items:center;justify-content:center">E</span>Crypto Channel <span class="ex">EXAMPLE</span></div><div style="margin-top:10px;font-size:14px;color:#ccc">Forwarded by <b style="color:#EAFF00">16 channels</b></div></div></div>
</div>`), T.map, T.tele, 'insight?tab=channelmap', 'sb_map', 'iris');
const mctx = $('#map', pg_map).getContext('2d');
const CL = [['#5B8DEF', 420, 300, 190], ['#9B7BFF', 860, 210, 160], ['#FF6FA5', 1040, 470, 130], ['#F0A24A', 640, 500, 130], ['#3FBF8F', 200, 480, 120], ['#D9B52C', 1160, 130, 90]];
const MR = rng(42), NODES = [], EDGES = [];
CL.forEach(([col, cx, cy, sp], ci) => { const n = [70, 55, 40, 40, 35, 25][ci]; for (let k = 0; k < n; k++) { const a = MR() * 6.283, r = Math.pow(MR(), .7) * sp; NODES.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .8, c: col, ci, r: 2.5 + Math.pow(MR(), 3) * 9 }); } });
const TGT = 3; NODES[TGT].x = 470; NODES[TGT].y = 300; NODES[TGT].r = 14;
for (let i = 0; i < NODES.length; i++) for (let k = 0; k < 2; k++) { const j = Math.floor(MR() * NODES.length); if (NODES[j].ci === NODES[i].ci || MR() < .25) EDGES.push([i, j]); }
const HE = []; { const pick = rng(9); while (HE.length < 16) { const j = Math.floor(pick() * NODES.length); if (j !== TGT && !HE.includes(j)) HE.push(j); } }

// ---- S6: Telescope (the post is a conditional example)
const POSTS0 = [['Whales Guide', '#5B8DEF', 'Large on-chain transfer flagged by trackers — watching exchange inflows'], ['Crypto Insider KR', '#FF6FA5', '<span class="tag">$SUI</span> ecosystem volume up in Korea today'],
  ['Airdrop Gems', '#F0A24A', 'New points campaign is live — farm before the snapshot'], ['Activity News', '#3FBF8F', '<span class="tag">$ETH</span> ETF flows positive for the 5th day'], ['Market Wire', '#9B7BFF', 'Macro calendar: Fed decision this week']];
const POSTS1 = [['Crypto Channel', '#3A3F3A', `<span class="tag t">$BTC</span> ${MARKET.replace(', 2026', '')} Polymarket shows <b style="color:#EAFF00">43% YES</b>.`, 1], ['Whales Guide', '#5B8DEF', '<span class="tag t">$BTC</span> 1,698 BTC moved to Coinbase Prime — possible sale?', 0],
  ['Market Wire', '#9B7BFF', '<span class="tag t">$BTC</span> slips below $80,000 ahead of the Fed decision', 0], ['Crypto Insider KR', '#FF6FA5', '<span class="tag t">$BTC</span> Korean exchanges see rising volume', 0]];
const pg_tele = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Telescope</h2><span class="info">i</span><span class="pill">Global</span></div>
  <div style="position:absolute;left:26px;top:84px;width:780px"><div class="inp" id="tsInp" style="width:640px"><span id="tsTxt">Search coin</span></div></div>
  <div id="feed0" style="position:absolute;left:26px;top:140px;width:780px;height:580px;overflow:hidden">${POSTS0.map(([n, c, tx], i) => `<div class="post" style="top:${i * 104}px"><div class="pa" style="background:${c}">${n[0]}</div><div><div class="pn">${n}<span>10/27/2026 ${14 - i}:0${i}</span></div><div class="pt">${tx}</div></div></div>`).join('')}</div>
  <div id="feed1" style="position:absolute;left:26px;top:140px;width:780px;height:580px;overflow:hidden">${POSTS1.map(([n, c, tx, st], i) => `<div class="post" ${st ? 'id="starPost"' : ''} style="top:${i * 104}px"><div class="pa" style="background:${c}">${n[0]}</div><div><div class="pn">${n}${st ? ' <span class="ex" style="margin-left:6px">EXAMPLE</span>' : ''}<span>10/27/2026 14:${50 - i * 7}</span></div><div class="pt">${tx}</div></div></div>`).join('')}</div>
  <div class="card" style="position:absolute;left:830px;top:84px;width:500px;height:620px;padding:18px">
   <div style="font-size:15px;font-weight:700;margin-bottom:12px">Top marketcap</div>
   <div>${[['BTC', '#F7931A'], ['ETH', '#627EEA'], ['USDT', '#26A17B'], ['XRP', '#555'], ['BNB', '#F0B90B'], ['SOL', '#7A4CF2'], ['USDC', '#2775CA'], ['DOGE', '#C2A633'], ['TRX', '#E5484D'], ['ADA', '#0033AD']].map(([c, col]) => `<span class="chipc" ${c === 'BTC' ? 'id="chipBtc"' : ''}><i style="background:${col}">${c[0]}</i>${c === 'BTC' ? 'Bitcoin' : c}</span>`).join('')}</div>
   <div style="font-size:15px;font-weight:700;margin:14px 0 12px">Trending 🔥</div>
   <div>${[['CAP', '#E5484D'], ['PUMP', '#17A45E'], ['OKB', '#555'], ['QUACK', '#D9B52C'], ['SUI', '#5B8DEF'], ['ASTER', '#9B6BEF'], ['MON', '#7A5AF8'], ['ZEC', '#E8B03A']].map(([c, col]) => `<span class="chipc"><i style="background:${col}">${c[0]}</i>${c}</span>`).join('')}</div>
  </div>
</div>`), T.tele, T.poly, 'insight?tab=telescope', 'sb_tele');

// ---- S7: Polymarket — trending -> market card (reference layout) -> montage cut -> GramFi-Polymarket overview
const pg_poly = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Trending Markets</h2><span class="info">i</span><span class="pill">Crypto</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
   <div class="mcard"><div class="h"><i style="background:#F7931A">₿</i>Bitcoin (BTC)</div><div class="mrow" id="mkRow"><span>${MARKET}</span><span style="display:flex;gap:6px"><span class="yn y">Yes 43%</span><span class="yn n">No 57%</span></span></div>${[['BTC all time high by March 31, 2027?', 12], ['BTC above $150k by June 30, 2027?', 3]].map(([q, y]) => `<div class="mrow"><span>${q}</span><span style="display:flex;gap:6px"><span class="yn y">Yes ${y}%</span></span></div>`).join('')}</div>
   <div class="mcard"><div class="h"><i style="background:#627EEA">Ξ</i>Ethereum (ETH)</div>${[['ETH above $2,500 on Oct 30?', 21], ['ETH all time high by Dec 31, 2026?', 4], ['ETH reach $5,000 by Dec 31, 2026?', 6]].map(([q, y]) => `<div class="mrow"><span>${q}</span><span class="yn y">Yes ${y}%</span></div>`).join('')}</div>
   <div class="mcard"><div class="h"><i style="background:#7A4CF2">S</i>Solana (SOL)</div>${[['SOL above $120 on Oct 30?', 14], ['SOL all time high by June 30, 2027?', 5], ['SOL reach $500 by Dec 31, 2026?', 2]].map(([q, y]) => `<div class="mrow"><span>${q}</span><span class="yn y">Yes ${y}%</span></div>`).join('')}</div></div>
  <div id="modal"><div class="mh">${MARKET}<span style="margin-left:auto;display:flex;gap:8px"><span class="btn">★</span><span class="btn lime" id="mkTrade">Trade</span><span class="btn">Close</span></span></div>
   <div style="position:absolute;left:16px;top:100px;width:300px">
    <div class="aibox" style="display:flex;gap:12px"><div style="width:110px;height:110px;border-radius:6px;background:radial-gradient(circle at 40% 35%,#FFB547,#F7931A 60%,#8A4B00);display:flex;align-items:center;justify-content:center;font-size:54px;font-weight:800;flex:none">₿</div><div><b style="font-size:15px;line-height:1.3;display:block">${MARKET}</b><div style="font-size:12px;color:#999;margin-top:8px">End: 2026-10-30</div><div style="font-size:12px;color:#999">Created: 2026-10-23</div></div></div>
    <div style="margin-top:4px"><span class="tagb" style="color:#2BD47D;border-color:#2BD47D">Accepting Orders</span><span class="tagb" style="color:#EAFF00;border-color:#8A9A00">Crypto</span><span class="tagb" style="color:#FF9A9D;border-color:#6A2428">Bitcoin</span></div>
    <div class="aibox" style="margin-top:6px"><h4>Probability</h4><div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700"><span class="up" id="pYes">Yes 43%</span><span class="dn" id="pNo">No 57%</span></div><div id="pBar" style="height:6px;border-radius:3px;background:#FF5C60;margin:12px 0 14px;overflow:hidden"><div id="pBarY" style="height:100%;width:43%;background:#2BD47D"></div></div>
     <div id="mentBox" style="border:1px solid #6A7A00;background:rgba(234,255,0,.06);border-radius:4px;padding:12px 12px;font-size:16px;font-weight:600"><b style="color:#EAFF00">$BTC</b>&nbsp; 1224 Telegram mentions (24h)</div></div></div>
   <div style="position:absolute;left:330px;top:100px;width:300px"><div class="aibox"><h4>Price History <span style="color:#2BD47D;font-size:13px">Yes</span> <span id="livDot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2BD47D;margin-left:6px;vertical-align:middle"></span><span style="font-size:11px;color:#2BD47D;margin-left:4px">LIVE</span></h4><div style="color:#2BD47D;font-size:22px;font-weight:700" id="phPct">43%</div><svg width="264" height="130"><path id="phPath" pathLength="1" d="M0,80 L30,76 L60,84 L90,70 L120,72 L150,60 L180,66 L210,58 L240,62 L264,56" fill="none" stroke="#2BD47D" stroke-width="2.5"/><circle id="phDot" cx="264" cy="56" r="4" fill="#2BD47D"/></svg></div>
    <div class="aibox" style="margin-top:12px"><h4>Order Book</h4>${['0.47 2 554', '0.46 1 867', '0.45 1 020', '0.44 4 086'].map(r => { const [p, ...s] = r.split(' '); return `<div class="obr"><span class="dn">$${p}</span><span class="obs" data-v="${s.join('')}">${s.join(' ')}</span><span>—</span></div>`; }).join('')}<div style="text-align:center;color:#EAFF00;font-size:12px;margin:6px 0">Spread: +0.01</div>${['0.43 2 936', '0.42 11 356', '0.41 9 588'].map(r => { const [p, ...s] = r.split(' '); return `<div class="obr"><span class="up">$${p}</span><span class="obs" data-v="${s.join('')}">${s.join(' ')}</span><span>—</span></div>`; }).join('')}</div></div>
   <div id="aiMk" style="position:absolute;left:646px;top:100px;right:16px"><div id="aiHead" style="padding:4px 6px;margin:-4px -6px 8px;display:flex;align-items:center;gap:10px;font-size:17px;font-weight:700;margin-bottom:12px">✦ AI Analysis — Bitcoin <span style="font-size:12px;color:#EAFF00;border:1px solid #6A7A00;padding:2px 6px;border-radius:4px">5519</span><span style="margin-left:auto;font-size:11px;color:#888">PERIOD ALL ▾</span></div>
    <div class="gpt"><div class="gh">GPT Analysis <span>10/27/2026 14:50</span></div><ul><li>Mentions rose sharply because several high-impact news items hit at once: BlackRock's IBIT moved 1,698 BTC to Coinbase Prime, which traders interpreted as a possible sale, while a Japanese whale suddenly withdrew 65 BTC after two quiet years.</li><li>Bitcoin also broke below the key $80,000 level and traded around $79,700, increasing discussion across trading channels.</li></ul></div>
    <div class="gpt"><div class="gh">GPT Analysis <span>10/27/2026 13:45</span></div><ul><li>Binance's announcement that it will delist 12 BTC trading pairs on Oct. 30 is the biggest mention driver.</li></ul></div></div>
  </div>
  <div id="landing" style="position:absolute;inset:0;background:#0B0B0B;padding:40px 40px">
   <div style="font-family:'JetBrains Mono';font-size:13px;font-weight:700;letter-spacing:.14em;color:var(--lime)">TELEGRAM NATIVE PREDICTION MARKETS</div>
   <div style="font-family:Unbounded;font-size:54px;font-weight:700;line-height:1.06;letter-spacing:-.02em;margin:16px 0 18px;max-width:760px">Bet on Polymarket directly through Telegram.</div>
   <div style="font-size:16px;color:#C4C9C0;max-width:620px;line-height:1.5">GramFi turns market discovery, wallet readiness, portfolio checks and copy trading into a simple Telegram bot flow.</div>
   <div id="tgBtn" style="margin-top:28px;display:inline-flex;align-items:center;gap:12px;height:58px;padding:0 26px;border-radius:8px;background:var(--lime);color:#12140F;font-weight:800;font-size:18px">${LOGO(30)}<span id="tgLbl">GramFi-Polymarket TG Bot</span></div></div>
</div>`), T.poly, 99, 'polymarket', '', 'rise');

/* ---------------- PHONE (Telegram night theme) ---------------- */
const KB = rows => `<div class="kb">${rows.map(r => `<div class="rw" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(b => { const [lbl, id] = Array.isArray(b) ? b : [b, '']; return `<div class="kbtn"${id ? ` id="${id}"` : ''}>${lbl}</div>`; }).join('')}</div>`).join('')}</div>`;
const CANDLES = (w, h) => { const r = rng(21); let y = h * .65, s = ''; for (let i = 0; i < 22; i++) { const up = r() > .38, b = 6 + r() * 16, x = 6 + i * (w - 12) / 22; const y2 = y + (up ? -b : b); const top = Math.min(y, y2), bh = Math.max(3, Math.abs(y2 - y)); s += `<line x1="${x + 4}" x2="${x + 4}" y1="${top - 6 - r() * 6}" y2="${top + bh + 6 + r() * 6}" stroke="${up ? '#2BD47D' : '#FF5C60'}" stroke-width="1.5"/><rect x="${x}" y="${top}" width="8" height="${bh}" rx="1.5" fill="${up ? '#2BD47D' : '#FF5C60'}"/>`; y = y2 - (up ? 2 : -1); } return `<svg width="${w}" height="${h}">${s}</svg>`; };
const ST = [
  ['st_main', D, `<div class="bm">👋 <b>Alex</b> — Your Polymarket trading companion.<br><br>📋 <span class="k2">0x2b7e4c…9f0b</span><br>💵 <b>pUSD:</b> <span class="k2">$248.60</span> 🔄<br><br>📊 No open positions<br><br><i>💡 Paste a Polymarket link or type keywords to search any market.</i><span class="tme">14:55</span></div>` + KB([['🎯 Markets', '👥 Copy Trading'], ['🤖 Autotrading'], ['⚡ Perps'], ['📊 Portfolio', '💼 Wallet']])],
  ['st_card', D + 1.15, `<div class="bm">📝 <b>${MARKET}</b><br><br>💰 Current prices:<br>✅ Yes: <b>43¢</b><br>❌ No: <b>57¢</b><span class="tme">14:56</span></div>` + KB([[['✅ Yes 43¢', 'b_yes']], ['❌ No 57¢'], ['📜 History'], ['🔖 Watch', '🔔 Set Alert'], ['⬅️ Back']])],
  ['st_amt', D + 2.7, `<div class="bm">💰 <b>Buying ✅ Yes</b> · 43¢<br><br>📋 <b>${MARKET}</b><br><br>How much would you like to bet?<span class="tme">14:56</span></div>` + KB([['$2', '$5', ['$10', 'b_10']], ['$50', '$100'], ['🔢 Custom amount'], ['⬅️ Back']])],
  ['st_conf', D + 3.8, `<div class="bm">⚡ <b>Confirm your bet</b><br><br>${MARKET}<br><br>✅ Outcome: <b>YES</b><br>💰 Amount: <b>10.00 pUSD</b><br>💲 Price: 43.0¢ · Shares ≈ 23.26<br>🏆 If YES wins: <b>23.26 pUSD</b> (before fees)<span class="tme">14:56</span></div>` + KB([[['<span id="placeLbl">✅ Place order</span><span id="placeSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin1"></span>Placing order…</span>', 'b_place']], ['⬅️ Back']])],
  ['st_fill', D + 7.4, `<div class="bm">✅ <b>Order filled</b><br><br>23.26 <b>YES</b> shares @ 43¢ · cost 10.00 pUSD<br>Balance: 238.60 pUSD<span class="tme">14:57</span></div>` + KB([['◉ Open', '○ History', '○ Stats'], ['⬅️ Back']])],
  ['st_top', T.copy + .026, `<div class="bm">📊 <b>Top Traders</b> · by PnL, 30 days<br><br>1. <b>top_sport_trader</b> · <span class="k2">0x1111…1111</span><br>💰 PnL 30d: <b>+$7,120</b> · ROI 71% · Win 84%<br>└ <span class="lnk" id="a_add">➕ Add</span> · 👀 <span class="lnk">View</span><br><br>2. <b>polymarket_whale</b> · <span class="k2">0x2222…2222</span><br>💰 PnL 30d: <b>+$4,380</b> · ROI 14%<span class="tme">14:58</span></div>` + KB([['⬅️ Back']])],
  ['st_tracked', T.copy + 2, `<div class="bm">👁 <b>Tracked Wallets</b><br><i>👇 Tap a link, or just type a trader's number in chat to open it.</i><br><br>1. 🟢 <span class="k2">0x1111…1111</span> · top_sport_trader —<br><i>2% of balance ≈ $4.77</i><br>📊 <span class="lnk">View</span> · ⚙️ <span class="lnk">Filters</span> · 🗑 <span class="lnk">Remove</span><span class="tme">14:58</span></div>` + KB([['➕ Add Trader'], ['⬅️ Back']])],
  ['st_lab', T.auto + .026, `<div class="bm">🧪 <b>Strategy Lab</b> · BTC 5m Up/Down<br><br><span style="color:#C9D6E2">Buy the side trading in your price band near the end of a round. Every rule starts on paper.</span><br><br><span class="k2">Price band</span> 80–96¢ · <span class="k2">Size</span> $2.00<span class="tme">14:59</span></div>` + KB([['Asset', 'Side', ['Price band', 'b_band']], [['▶️ Start on paper', 'b_paper']], ['⬅️ Back']])],
  ['st_run', T.auto + 4.3, `<div class="bm">✅ <b>Strategy saved</b> · BTC 5m Up/Down<br><br>Mode: <b>📄 Paper</b> — no real funds used<br>Price band 80–96¢ · $2.00 per trade<span class="tme">14:59</span></div>` + KB([['📊 Paper results'], ['⬅️ Back']])],
  ['st_perp', T.perp + .027, `<div class="bm">⚡ <b>Perpetual futures</b> · BTC-USD<br><b style="font-size:22px">79,843</b> <b style="color:#FF5C60">−0.57%</b> <span class="lnk">15m</span><div style="margin:8px 0 6px;background:#0F1A25;border-radius:12px;padding:8px">${CANDLES(360, 110)}</div>Leverage up to <b>×50</b> · long or short<span class="tme">15:00</span></div>` + KB([[['📈 Long', 'b_long'], '📉 Short'], ['⬅️ Back', '🕒 15m', '🔄']])],
  ['st_long', T.perp + 1.8, `<div class="bm">📈 <b>Long BTC ×3</b> — profits if BTC rises<br><br>Margin <b>$22.50</b> · Position <b>$67.50</b><br>Liquidation ≈ <b>53,600</b><span class="tme">15:00</span></div>` + KB([['$10', '$25', '$50', 'Max'], ['×1', '✓ ×3', '×10', '×50'], [['<span id="openLbl">✅ Open long</span><span id="openSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin2"></span>Opening…</span>', 'b_open']], ['⬅️ Back']])],
  ['st_open', T.perp + 3.4, `<div class="bm">✅ <b>Long BTC ×3 opened</b><br><br>Entry <b>79,860</b> · margin $22.50<br>Liquidation ≈ 53,600<span class="tme">15:00</span></div>` + KB([['📍 My positions'], ['⬅️ Back']])],
  ['st_aopt', T.alert + .021, `<div class="bm">🔔 <b>${FED}</b><br><br>Choose outcome and direction:<span class="tme">15:01</span></div>` + KB([[['✅ YES 📈 (41¢)', 'b_yesup'], '✅ YES 📉 (41¢)'], ['❌ NO 📈 (59¢)', '❌ NO 📉 (59¢)'], ['⬅️ Back']])],
  ['st_aprompt', T.alert + .8, `<div class="bm">🔔 ✅ <b>YES 📈</b> · now 41¢<br><br>Send the price to alert at (in ¢):<span class="tme">15:01</span></div>`],
  ['st_aset', T.alert + 1.5, `<div class="bm">🔔 <b>Alert set</b><br><br>YES 📈 at <b>45¢</b><br><i>${FED}</i><span class="tme">15:01</span></div>` + KB([['🔔 My alerts'], ['⬅️ Back']])],
];
const phone = H(`<div class="w"><div id="phone"><div id="screen"><div class="wall"></div><div class="island"></div>
  <div class="status"><span>9:41</span><span>●●● ▮</span></div>
  <div class="tgh"><span class="bk">‹</span>${LOGO(44)}<div><div class="nm">GramFi</div><div class="sb">bot</div></div><span style="margin-left:auto;color:var(--tg);font-size:22px">⋮</span></div>
  <div id="chat"><div class="umsg" id="u_q" style="top:18px">btc 80k<small>14:56 ✓✓</small></div><div class="umsg" id="u_45" style="top:18px">45<small>15:01 ✓✓</small></div>${ST.map(([id, , html]) => `<div class="st" id="${id}">${html}</div>`).join('')}
   <div id="later" style="position:absolute;left:50%;top:80px;transform:translateX(-50%);background:rgba(23,33,43,.95);color:#C9D6E2;border-radius:999px;padding:8px 18px;font-size:16px;font-weight:700">🕒 Later…</div></div>
  <div id="lock"><div style="font-size:18px;font-weight:600;opacity:.8">Tuesday, October 27</div><div id="lockClk">15:01</div><div style="font-size:15px;opacity:.6;margin-top:6px">🔒</div></div>
  <div class="push" id="push">${LOGO(40)}<div><div style="display:flex;justify-content:space-between"><b>GramFi</b><span style="color:#9AA3AD;font-size:12px">now</span></div><div style="font-size:19px;font-weight:800;margin-top:2px">🔔 YES reached 45¢ 📈</div><div style="font-size:12px;color:#8E98A3;margin-top:2px">${FED}</div></div></div>
  <div class="inbar"><span class="menuBtn">☰ Menu</span><div class="ph" id="ph"><span id="phTxt">Message</span><span class="caret" id="phCaret" style="height:18px"></span></div><span id="sendBtn">↑</span></div>
</div></div></div>`);
cam.appendChild(phone);
const stEls = ST.map(([id, t]) => ({ el: $('#' + id), t, btns: $$('.kbtn', $('#' + id)) }));

/* ---------------- BOT HALF: one explainer per feature, each with its own device ---------------- */
// autotrading diagram: four BTC 5-minute rounds, the price band, a playhead; the bot buys only when a round enters the band late
const AU = (() => { const r = rng(5), W = 275, G = 30, X0 = 10, Y = p => 20 + (100 - p) / 50 * 230; let h = '';
  [88, 66, 92, 84].forEach((e, k) => { const x0 = X0 + k * (W + G);
    h += `<rect x="${x0}" y="10" width="${W}" height="252" rx="10" fill="#111314" stroke="#2A2E31"/>`;
    h += `<rect x="${x0}" y="${Y(96)}" width="${W}" height="${Y(80) - Y(96)}" fill="rgba(234,255,0,.10)" stroke="rgba(234,255,0,.55)" stroke-dasharray="5 7"/>`;
    if (!k) h += `<text x="${x0 + 10}" y="${Y(96) - 10}" fill="#EAFF00" font-family="JetBrains Mono" font-weight="700" font-size="17">YOUR BAND 80–96¢</text>`;
    h += `<text x="${x0 + W / 2}" y="292" fill="#9AA095" font-family="JetBrains Mono" font-weight="700" font-size="18" text-anchor="middle">ROUND 15:${String(k * 5).padStart(2, '0')}–${String(k * 5 + 5).padStart(2, '0')}</text>`;
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; let p = lerp(50, e, Math.pow(u, 1.3)) + (r() - .5) * 9 * (1 - u * .7); if (i === 26) p = e >= 80 && e <= 96 ? lerp(84, e, .4) : p; pts.push([x0 + u * W, Y(clamp(p, 52, 99))]); }
    h += `<path d="M${pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L')}" fill="none" stroke="#6AB3F3" stroke-width="3.5" stroke-linejoin="round" clip-path="url(#auClip)"/>`;
    if (e >= 80 && e <= 96) { const [bx, by] = pts[26]; h += `<g class="auM" data-x="${bx}"><circle cx="${bx}" cy="${by}" r="12" fill="#EAFF00" stroke="#0F1011" stroke-width="4"/><text x="${bx - 6}" y="${by + 46}" fill="#EAFF00" font-family="Inter" font-weight="800" font-size="22" text-anchor="middle">BUY UP · $2</text></g>`; }
    else h += `<g class="auM" data-x="${x0 + W * .87}"><text x="${x0 + W / 2}" y="${Y(56)}" fill="#C4C9C0" font-family="Inter" font-weight="700" font-size="21" text-anchor="middle">not in band · skip</text></g>`;
  });
  return `<svg width="1200" height="300" style="display:block;margin-top:18px"><defs><clipPath id="auClip"><rect id="auClipR" x="0" y="0" width="0" height="300"/></clipPath></defs>${h}<line id="auHead" y1="4" y2="268" stroke="#fff" stroke-width="2.5" opacity=".8"/></svg>`; })();
const AY = p => 20 + (47 - p) / 8 * 200;   // alert chart: 39¢..47¢
const ALPTS = (() => { const r = rng(8), out = []; for (let i = 0; i <= 40; i++) { const u = i / 40; let p = 41 + 4.25 * Math.pow(u, 1.6) + (r() - .5) * .9 * (1 - u * .5); if (i === 40) p = 45.2; out.push([10 + u * 740, AY(p)]); } return out; })();
const ALPATH = 'M' + ALPTS.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L');
const mob = H(`<div id="mob\" style="position:absolute;inset:0">
  <div id="tk" class="mx" style="left:90px;top:300px;width:860px">
    <div class="steps">${['Find market', 'Pick a side', 'Amount', 'Confirm'].map((w, i) => `<span class="stp"><b>${i + 1}</b>${w}</span>`).join('')}</div>
    <div class="tr" id="tk0"><div class="k">MARKET</div><div class="v" style="font-size:38px">${MARKET}</div></div>
    <div class="tr" style="display:flex;gap:70px"><div id="tk1"><div class="k">SIDE · PRICE</div><div class="v"><em>YES</em> @ 43¢</div></div><div id="tk2"><div class="k">AMOUNT</div><div class="v">$10.00</div></div></div>
    <div class="tr" id="tk3"><div class="k">IF YES WINS</div><div class="v"><em>23.26 pUSD</em> <span style="font-size:24px;color:#9AA095;font-weight:600">before fees</span></div></div>
    <div id="stamp">✓ ORDER FILLED</div></div>
  <div id="cpP" class="mx" style="left:860px;top:270px;width:960px"><div class="v" style="font-size:40px;line-height:1.15">Copy a trader's <em>Polymarket bets</em> automatically.</div><div class="k" style="margin-top:18px">TOP TRADERS · BY 30-DAY PnL</div>
    <div class="tc" id="tc1"><span class="av">T</span><div style="flex:1"><div class="v">top_sport_trader</div><div class="s">PnL <b class="up">+$7,120</b> · ROI 71% · Win 84%</div><div id="tcAdd"><b>✓ Trader added</b> — each of their market trades is copied with 2% of your balance</div></div><span class="badge" id="tcBadge">FOLLOWING</span></div>
    <div class="tc" id="tc2"><span class="av" style="background:#5B8DEF">P</span><div style="flex:1"><div class="v">polymarket_whale</div><div class="s">PnL <b class="up">+$4,380</b> · ROI 14%</div></div></div></div>
  <div id="auP" class="mx" style="left:80px;top:270px;width:1270px">
    <div class="v" style="font-size:44px;line-height:1.18">Trades <em>BTC 5-minute Up/Down</em> rounds for you, automatically.</div>
    <div class="s" style="font-size:27px">You choose the settings. The bot buys only when a round matches them.</div>${AU}
    <div class="chips"><span class="ch" id="ch0">Price band <b>80–96¢</b></span><span class="ch" id="ch1"><b>$2</b> per trade</span><span class="ch" id="ch2">Entry window · <b>last 150s</b></span></div></div>
  <div id="ppL" class="mx" style="left:70px;top:330px;width:640px"><div class="k">YOUR ORDER</div><div class="v" style="font-size:70px">📈 <em>LONG ×3</em></div><div class="s" style="font-size:31px;color:#fff">Margin <b>$22.50</b> → position <b>$67.50</b></div><div class="s">Profits if BTC rises</div></div>
  <div id="ppR" class="mx" style="left:1220px;top:400px;width:640px"><div class="k">✓ POSITION OPENED</div><div class="v" style="font-size:60px">Entry <em>79,860</em></div><div class="s" style="font-size:31px;color:#fff">Liquidation ≈ <b style="color:#FF5C60">53,600</b></div></div>
  <div id="alP" class="mx" style="left:70px;top:270px;width:900px"><div class="k">🔔 PRICE ALERT · WORKS ON ANY POLYMARKET MARKET</div>
    <div style="font-size:30px;font-weight:600;line-height:1.28">${FED}</div>
    <div class="steps" style="margin:18px 0 6px">${['Pick market & side', 'Set your price', 'Get a Telegram message'].map((w, i) => `<span class="stp al"><b>${i + 1}</b>${w}</span>`).join('')}</div>
    <svg id="alSvg" width="836" height="250" style="display:block">
      <line x1="10" x2="760" y1="${AY(45)}" y2="${AY(45)}" id="alThr" stroke="#EAFF00" stroke-width="3" stroke-dasharray="10 9"/>
      <text id="alThrT" x="764" y="${AY(45) + 7}" fill="#EAFF00" font-family="JetBrains Mono" font-weight="800" font-size="20">45¢</text>
      <text id="alThrL" x="14" y="${AY(45) - 12}" fill="#EAFF00" font-family="JetBrains Mono" font-weight="700" font-size="17">YOUR ALERT: YES ≥ 45¢</text>
      <defs><clipPath id="alClip"><rect id="alClipR" x="0" y="0" width="0" height="250"/></clipPath></defs>
      <path d="${ALPATH}" fill="none" stroke="#6AB3F3" stroke-width="4" stroke-linejoin="round" clip-path="url(#alClip)"/>
      <circle id="alHead" r="8" fill="#6AB3F3" stroke="#0F1011" stroke-width="3"/><text id="alNow" fill="#C4C9C0" font-family="JetBrains Mono" font-weight="700" font-size="18"></text>
      <g id="alHit"><circle id="alRing" fill="none" stroke="#EAFF00" stroke-width="4"/><text id="alHitT" font-family="Inter" font-weight="800" font-size="24" fill="#EAFF00" text-anchor="end">🔔 YES reached 45¢ → message sent</text></g>
      <text x="10" y="244" fill="#6D756A" font-family="JetBrains Mono" font-size="16">15:01</text><text x="760" y="244" fill="#6D756A" font-family="JetBrains Mono" font-size="16" text-anchor="end">16:22</text>
    </svg></div>
  <div id="alB"><span style="flex:none">${LOGO(80)}</span><div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:22px;color:#C9D6E2;font-weight:700"><span>GramFi</span><span style="font-weight:500;color:#9AA3AD">now</span></div><div style="font-size:52px;font-weight:800;letter-spacing:-.01em;margin-top:4px">🔔 YES reached <span style="color:#EAFF00">45¢</span> 📈</div><div style="font-size:22px;color:#8E98A3;margin-top:6px;line-height:1.3">${FED}</div></div></div>
</div>`);
$('#ov').insertBefore(mob, $('#caps'));
const alSteps = $$('.stp.al', mob), tkSteps = $$('.stp:not(.al)', mob), auMarks = $$('.auM', mob);
// perps: a full BTC chart behind the phone (world plane), the entry line drawn when the position opens
const CH = (() => { const r = rng(33), N = 52, Y = p => 1130 - (p - 77400) / 3200 * 900; let h = '', raw = [0];
  for (let i = 1; i <= N; i++) raw.push(raw[i - 1] + (r() - .42) * 1 + (i > 30 ? .25 : 0));
  const mn = Math.min(...raw), mx = Math.max(...raw), cl = raw.map(v => 77700 + (v - mn) / (mx - mn) * 2350); cl[N] = 79843;
  for (let i = 0; i < N; i++) { const o = cl[i], p = cl[i + 1], up = p >= o, x = 160 + i * 42, hi = Math.max(o, p) + 40 + r() * 90, lo = Math.min(o, p) - 40 - r() * 90;
    h += `<g class="cn"><line x1="${x + 11}" x2="${x + 11}" y1="${Y(hi)}" y2="${Y(lo)}" stroke="${up ? '#2BD47D' : '#FF5C60'}" stroke-width="3"/><rect x="${x}" y="${Math.min(Y(o), Y(p))}" width="22" height="${Math.max(4, Math.abs(Y(o) - Y(p)))}" rx="3" fill="${up ? '#2BD47D' : '#FF5C60'}"/></g>`; }
  for (let v = 77500; v <= 80500; v += 500) h += `<text x="2440" y="${Y(v) + 8}" fill="#5E6A75" font-family="JetBrains Mono" font-size="26" text-anchor="end">${fmt(v)}</text><line x1="140" x2="2330" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.05)" stroke-width="2"/>`;
  h += `<line id="cEntry" x1="140" x2="2340" y1="${Y(79860)}" y2="${Y(79860)}" stroke="#EAFF00" stroke-width="5" stroke-dasharray="18 12" pathLength="1"/>`;
  h += `<text x="160" y="1215" fill="#fff" font-family="Inter" font-weight="800" font-size="52">BTC-USD · Perpetual</text><text x="160" y="1272" fill="#FF5C60" font-family="JetBrains Mono" font-weight="700" font-size="40">79,843  −0.57%</text>`;
  return `<svg width="2600" height="1300" viewBox="0 0 2600 1300">${h}</svg>`; })();
const chart = H(`<div class="w" style="width:2600px;height:1300px">${CH}</div>`); cam.insertBefore(chart, phone);
const bell = H(`<div class="w" style="width:1400px;height:1400px"><svg width="1400" height="1400" viewBox="0 0 140 140"><g id="bellG" style="transform-origin:70px 18px"><path d="M70 14 C70 14 70 8 70 8 M46 92 C46 60 50 34 70 30 C90 34 94 60 94 92 L102 102 L38 102 Z M60 108 a10 10 0 0 0 20 0" fill="none" stroke="#EAFF00" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></g>${[0, 1, 2].map(k => `<circle class="bRing" cx="70" cy="70" r="40" fill="none" stroke="#EAFF00" stroke-width="1"/>`).join('')}</svg></div>`); cam.insertBefore(bell, phone); const bRings = $$('.bRing', bell); const chartC = $$('.cn', chart);
function renderMob(t, tv) {
  const show = (el, a, b, dx = 0, dy = 0) => { const q = E.o5(seg(t, a, a + .5)), o = E.io(seg(t, b - .3, b)), op = q * (1 - o); vis(el, op);
    el.style.transform = `translate(${(1 - q) * dx - o * dx * .3}px,${(1 - q) * dy}px)`; return op > 0; };
  const pulse = .5 + .5 * Math.sin(tv * 5);
  // bet: the ticket fills in as the user taps; the stamp is the result
  if (show($('#tk'), D + 1.233, T.copy + .219, -140)) {
    [['#tk0', D + 1.4], ['#tk1', D + 2.8], ['#tk2', D + 3.9], ['#tk3', D + 4.2]].forEach(([id, a]) => { const q = E.o5(seg(t, a, a + .45)); $(id).style.opacity = .12 + .88 * q; $(id).style.transform = `translateY(${(1 - q) * 16}px)`; });
    const on = t < D + 2.7 ? 1 : t < D + 3.8 ? 2 : t < D + 7.4 ? 3 : 4;
    tkSteps.forEach((e, i) => { e.className = 'stp' + (i < on ? ' done' : i === on ? ' on' : ''); e.style.boxShadow = i === on ? `0 0 0 ${2 + 3 * pulse}px rgba(234,255,0,.35)` : 'none'; });
    const sq = seg(t, D + 7.5, D + 7.85); $('#stamp').style.opacity = E.o(sq); $('#stamp').style.transform = `rotate(-7deg) scale(${lerp(2.2, 1, E.o5(sq)) * (1 + .02 * Math.sin(tv * 3))})`;
  }
  // copy trading: cards come in from the right; the chosen trader is promoted, the other steps back
  if (show($('#cpP'), T.copy + .525, T.auto + .087, 160)) {
    const a = E.o5(seg(t, T.copy + .656, T.copy + .967)), b = E.o5(seg(t, T.copy + .8, T.copy + 1.1)), ad = E.o5(seg(t, T.copy + 2.045, T.copy + 2.45));
    $('#tc1').style.transform = `translateX(${(1 - a) * 120}px) scale(${1 + .04 * ad})`; $('#tc1').style.opacity = a; $('#tc1').style.borderColor = ad > .5 ? '#EAFF00' : '#2A2E31';
    $('#tc2').style.transform = `translateX(${(1 - b) * 120}px) scale(${1 - .06 * ad})`; $('#tc2').style.opacity = b * (1 - .65 * ad);
    $('#tcAdd').style.maxHeight = (ad * 80) + 'px'; $('#tcAdd').style.opacity = ad;
    $('#tcBadge').style.opacity = ad; $('#tcBadge').style.transform = `scale(${lerp(1.8, 1, ad)})`;
  }
  // autotrading: the playhead runs through four rounds, buying only inside the band
  if (show($('#auP'), T.auto + .656, T.perp + .089, 0, 60)) {
    const ph = 1200 * E.io(seg(t, T.auto + 1.3, T.auto + 3.5)); $('#auClipR').setAttribute('width', ph); $('#auHead').setAttribute('x1', ph); $('#auHead').setAttribute('x2', ph); $('#auHead').style.opacity = ph > 0 && ph < 1199 ? .8 : 0;
    auMarks.forEach(m => { const q = clamp((ph - +m.dataset.x) / 40); m.style.opacity = q; m.style.transformOrigin = `${m.dataset.x}px 150px`; m.style.transform = `scale(${lerp(1.4, 1, E.o(q))})`; });
    [['#ch0', T.auto + 1.777], ['#ch1', T.auto + 1.923], ['#ch2', T.auto + 2.07]].forEach(([id, a]) => { const q = E.o(seg(t, a, a + .3)); $(id).classList.toggle('on', q > .5); $(id).style.opacity = .4 + .6 * q; $(id).style.transform = `scale(${1 + .06 * Math.sin(Math.PI * q)})`; });
  }
  // perps: chart draws in behind; order on the left, opened position on the right
  { const cq = seg(t, T.perp + .267, T.perp + 1.143), co = E.io(seg(t, T.alert + .07, T.alert + .49)); vis(chart, (cq > 0 ? 1 : 0) * (1 - co));
    if (cq > 0 && co < 1) { setW(chart, 0, 20 + co * 300, -500, 2600, 1300); chartC.forEach((c, i) => c.style.opacity = clamp(cq * chartC.length * 1.15 - i)); const en = E.io(seg(t, T.perp + 3.471, T.perp + 3.9)); $('#cEntry').style.strokeDasharray = `${en} 1`; $('#cEntry').style.opacity = en > 0 ? 1 : 0; } }
  show($('#ppL'), T.perp + 1.929, T.alert + .07, -140); show($('#ppR'), T.perp + 3.614, T.alert + .07, 140);
  // alert: what was set, then the trigger lifted out of the lock screen
  // alert: the mechanism — market, price, message — with the price line crossing the threshold while time passes
  if (show($('#alP'), T.alert + .45, T.fin + .1, -140)) {
    const on = t < T.alert + .8 ? 0 : t < T.alert + 2.5 ? 1 : 2, done = t >= T.alert + 3.25;
    alSteps.forEach((e, i) => { e.className = 'stp al' + (i < on || done ? ' done' : i === on ? ' on' : ''); e.style.boxShadow = i === on && !done ? `0 0 0 ${2 + 3 * (.5 + .5 * Math.sin(tv * 5))}px rgba(234,255,0,.35)` : 'none'; });
    const th = E.io(seg(t, T.alert + 1.5, T.alert + 1.85)); $('#alThr').setAttribute('x2', 10 + 750 * th); $('#alThrT').style.opacity = th; $('#alThrL').style.opacity = th;
    const u = E.io(seg(t, T.alert + 1.0, T.alert + 3.25)), k = Math.min(40, Math.round(u * 40)), [hx, hy] = ALPTS[k];
    $('#alClipR').setAttribute('width', hx); $('#alHead').setAttribute('cx', hx); $('#alHead').setAttribute('cy', hy); $('#alHead').setAttribute('fill', done ? '#EAFF00' : '#6AB3F3');
    $('#alNow').setAttribute('x', hx + 14); $('#alNow').setAttribute('y', hy + 30); $('#alNow').textContent = done ? '' : `YES ${(41 + 4.2 * Math.pow(u, 1.6)).toFixed(0)}¢`;
    const hq = seg(t, T.alert + 3.25, T.alert + 3.9); $('#alHit').style.opacity = hq > 0 ? 1 : 0; $('#alRing').setAttribute('cx', hx); $('#alRing').setAttribute('cy', hy); $('#alRing').setAttribute('r', 10 + 60 * E.o(hq)); $('#alRing').style.opacity = 1 - hq;
    $('#alHitT').setAttribute('x', hx - 16); $('#alHitT').setAttribute('y', hy - 22); $('#alHitT').style.opacity = E.o(seg(t, T.alert + 3.3, T.alert + 3.6));
  }
  { const bq = E.o(seg(t, T.alert + .2, T.alert + 1.0)) * (1 - seg(t, T.fin - .1, T.fin + .3)); vis(bell, bq * .16);
    if (bq > 0) { setW(bell, -120, -40, -600, 1400, 1400); const ring = seg(t, T.alert + 3.25, T.alert + 5.0), amp = 4 + 14 * Math.sin(Math.PI * Math.min(1, ring * 1.4)) * (1 - ring * .5);
      $('#bellG').style.transform = `rotate(${amp * Math.sin(tv * (ring > 0 ? 9 : 1.6))}deg)`;
      bRings.forEach((c, i) => { const q = (ring * 2.2 + i * .33) % 1; c.setAttribute('r', 40 + q * 30); c.style.opacity = ring > 0 && ring < 1 ? (1 - q) * 1.5 : 0; }); } }
  { const q = E.o5(seg(t, T.alert + 3.55, T.alert + 3.95)), o = seg(t, T.fin - .1, T.fin + .2); const el = $('#alB'); vis(el, q * (1 - o));
    el.style.transform = `translate(0px,${lerp(-120, 0, q)}px) scale(${lerp(.55, 1, q) * (1 + .012 * Math.sin(tv * 2.4))})`; }
}

/* ---------------- OVERLAY: theses, readouts ---------------- */
const CAPS = [
  { in: T.A + .25, out: T.ai - .3, t: 'See what <em>gets attention.</em>', s: 'MOST POPULAR COIN', sh: T.A + 2.0 },
  { in: T.ai + .2, out: T.ctry - .3, t: 'Understand <em>the context.</em>', s: 'AI ANALYSIS · BITCOIN', sh: T.ai + 1.75 },
  { in: T.ctry + .15, out: T.top - .25, t: 'Explore <em>regional</em> attention.', s: 'COUNTRY POPULAR COINS', sh: T.ctry + 1.55 },
  { in: T.top + .1, out: T.map - .2, t: 'Explore <em>the channels.</em>', s: 'TOP 10 CHANNELS · RANKED BY RECENT AVG. VIEWS' },
  { in: T.map + .15, out: T.tele - .3, t: 'Follow <em>the connections.</em>', s: 'CHANNEL MAP · LINKS = MESSAGE FORWARDS', sh: T.map + 2.6 },
  { in: T.tele + .15, out: T.poly - .3, t: 'Read <em>the source.</em>', s: 'TELESCOPE · POSTS THAT MENTION $BTC', sh: T.tele + 1.55 },
  { in: T.poly + .15, out: CUT + .5, t: 'Explore <em>the market.</em>', s: 'GRAMFI × POLYMARKET', sh: T.poly + .8 },
  { in: CUT + .75, out: D + .25, t: 'Act <em>in Telegram.</em>', s: 'GRAMFI-POLYMARKET BOT' },
  { in: D + .386, out: T.copy - .35, t: 'Bet <em>in a few taps.</em>', s: 'POLYMARKET BOT · BET', sh: D + 1.15 },
  { in: T.copy + .262, out: T.auto - .3, t: 'Choose <em>who to follow.</em>', s: 'COPY TRADING · MIRROR THEIR MARKET TRADES', sh: T.copy + 1.3, r: 1 },
  { in: T.auto + .175, out: T.perp - .3, t: 'Define <em>your rules.</em>', s: 'AUTOTRADING · BTC 5-MIN ROUNDS', sh: T.auto + .85 },
  { in: T.perp + .178, out: T.alert - .3, t: 'Trade <em>perpetual futures.</em>', s: 'PERPS · LONG OR SHORT', sh: T.perp + 1.229 },
  { in: T.alert + .14, out: T.fin - .3, t: 'Stay <em>informed.</em>', s: 'PRICE ALERTS', sh: T.alert + .9 },
];
const capsEl = $('#caps');
CAPS.forEach(c => {
  const words = c.t.replace(/<em>(.*?)<\/em>/g, (m, g) => '<em>' + g.replace(/ /g, '\u0001') + '</em>').split(' ').map(w => w.replace(/\u0001/g, ' '));
  const el = H(`<div class="cap"><div class="cp"><div class="tt">${words.map((w, j) => `<span>${w}${j < words.length - 1 ? ' ' : ''}</span>`).join('')}</div><div class="sb"><i></i>${c.s}</div></div></div>`);
  if (c.r) { el.style.left = (1920 - 72 - 1300) + 'px'; el.style.textAlign = 'right'; }
  capsEl.appendChild(el); c.el = el; c.cp = $('.cp', el); c.words = $$('.tt > span', el); c.sbEl = $('.sb', el); c.tt = $('.tt', el);
});
// readouts: the must-read fragment, lifted out of the interface at 56–64 px, with a connector to its source
const ROS = [
  { id: 'r1', t0: T.A + 2.1, t1: T.ai - .25, anc: '#tile_Bitcoin', side: 'r', w: 640, html: `<div class="k">BITCOIN · SHARE OF TELEGRAM MENTIONS · 24H</div><div class="v"><em>11.86%</em></div>` },
  { id: 'r2', t0: T.ai + 1.85, t1: T.ctry - .25, anc: '#aiHl', side: 'l', w: 880, html: `<div class="k">✦ AI ANALYSIS · BITCOIN</div><div class="v" style="font-size:54px">BlackRock's IBIT moved <em>1,698 BTC</em> to Coinbase Prime</div>` },
  { id: 'r3', t0: T.ctry + 1.3, t1: T.top - .5, anc: '#krBtc', side: 'l', w: 620, html: `<div class="k">KOREA · SHARE OF MENTIONS</div><div class="v">BTC <em>19%</em> · #2</div>` },
  { id: 'r5', t0: T.map + 2.7, t1: T.tele - .25, anc: '#mapInfo', side: 'r', w: 640, html: `<div class="k">CRYPTO CHANNEL</div><div class="v">Forwarded by <em>16 channels</em></div>` },
  { id: 'r6', t0: T.tele + 1.65, t1: T.poly - .2, anc: '#starPost', side: 'r', w: 1080, html: `<div style="display:flex;gap:16px;align-items:center;margin-bottom:12px"><span style="width:54px;height:54px;border-radius:50%;background:#3A3F3A;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px">E</span><div><b style="font-size:28px">Crypto Channel</b> <span class="ex" style="font-size:14px">EXAMPLE</span><div style="font-size:20px;color:#9AA095">10/27/2026 · 14:50</div></div></div><div class="v" style="font-size:56px">Will BTC close above $80K on Oct 30? Polymarket shows <em>43% YES.</em></div><div class="s" style="color:#6AB3F3">Open in Telegram ↗</div>` },
];
const rosEl = $('#ros'), conn = $('#conn');
ROS.forEach(r => { r.el = H(`<div class="ro" style="width:${r.w}px">${r.html}</div>`); rosEl.appendChild(r.el); r.line = S('line', { stroke: '#EAFF00', 'stroke-width': 3, 'stroke-dasharray': '2 8', 'stroke-linecap': 'round' }, conn); r.dot = S('circle', { r: 8, fill: '#EAFF00' }, conn); });

/* ---------------- INTRO ---------------- */
const intro = $('#intro');
const NMS = [['Whales Guide', '🐋 <span class="tg">$BTC</span> 1,698 moved to Coinbase Prime'], ['Crypto KR', '<span class="tg">$SUI</span> volume up in Korea'], ['Airdrop Gems', 'new points campaign live 🎯'], ['Market Wire', '<span class="tg">$BTC</span> below $80k?'],
  ['Tonfan Trade', '<span class="tg">$TON</span> vote ends tomorrow'], ['Moon Vibes', 'who is buying <span class="tg">$CAP</span>?'], ['Activity News', '<span class="tg">$ETH</span> ETF flows positive'], ['Dark Crypto', '<span class="tg">$PUMP</span> meta is back'],
  ['GEMHUNT', 'narrative: Layer 1 🔥'], ['Market Twits', '<span class="tg">$BTC</span> dominance 58%'], ['Coin Haonoto', 'gm ☀️ wagmi'], ['My Proxy', '<span class="tg">$SOL</span> under $100']];
const nmsgs = []; { const r = rng(17); for (let i = 0; i < 48; i++) { const [n, txt] = NMS[i % NMS.length]; const el = H(`<div class="nmsg"><b>${n}</b>${txt}</div>`); intro.appendChild(el); nmsgs.push({ el, col: i % 7, layer: i % 3, off: r() * 1400, sp: 170 + r() * 140, tile: i < 14 ? i : -1 }); } }
intro.insertAdjacentHTML('beforeend', `<div id="iscrim" style="position:absolute;inset:0;background:radial-gradient(1000px 420px at 50% 50%,rgba(9,10,8,.92),rgba(9,10,8,.35) 70%,transparent)"></div>
  <div class="ctxt" id="it1" style="top:470px;font-size:72px">Crypto news breaks <span style="color:#6AB3F3">in Telegram first.</span></div>
  <div id="it3" style="position:absolute;left:0;right:0;top:330px;text-align:center"><div style="display:inline-flex;align-items:center;gap:20px;font-family:Unbounded;font-weight:800;font-size:56px">${LOGO(84)}GramFi</div><div class="ctxt" style="position:static;font-size:62px;line-height:1.12;margin-top:26px">GramFi reads crypto Telegram<br><span style="color:#EAFF00">and shows what matters.</span></div></div>
  <svg id="iplane" width="1920" height="1080" style="position:absolute;inset:0;overflow:visible"><g id="itrail"></g><g id="imark">${MARK('#EAFF00', '#090A08')}</g></svg>`);
const itrail = $('#itrail'); const trailDots = []; for (let i = 0; i < 60; i++) trailDots.push(S('circle', { r: 3.5, fill: '#EAFF00' }, itrail));
const planeAt = u => [lerp(-200, 2150, u), 640 - Math.sin(u * Math.PI) * 200 + Math.sin(u * 9) * 18];

/* ---------------- FINALE: See · Understand · Act -> logo -> CTA ---------------- */
const outro = $('#outro');
const miniTree = `<svg width="300" height="190" viewBox="0 0 300 190">${[[0, 0, 120, 110, '#5C120B'], [122, 0, 100, 110, '#5C120B'], [224, 0, 76, 110, '#5C120B'], [0, 112, 90, 78, '#C4471B'], [92, 112, 70, 78, '#47100A'], [164, 112, 60, 78, '#C4471B'], [226, 112, 74, 40, '#0D5A3A'], [226, 154, 74, 36, '#47100A']].map(([x, y, w, h, c], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${i === 0 ? 'stroke="#EAFF00" stroke-width="4"' : ''}/>`).join('')}<text x="12" y="34" fill="#fff" font-family="Inter" font-weight="700" font-size="20">₿ BTC</text></svg>`;
const miniMsg = `<div style="width:300px;height:190px;border-radius:14px;background:#15181A;border:1px solid #2A2E31;padding:18px;text-align:left"><div style="display:flex;gap:10px;align-items:center;margin-bottom:12px"><span style="width:36px;height:36px;border-radius:50%;background:#3A3F3A"></span><span style="height:12px;width:120px;border-radius:6px;background:#3A3F3A"></span></div><div style="height:12px;border-radius:6px;background:#EAFF00;width:90%;margin-bottom:10px"></div><div style="height:12px;border-radius:6px;background:#3A3F3A;width:75%;margin-bottom:10px"></div><div style="height:12px;border-radius:6px;background:#3A3F3A;width:55%"></div><div style="margin-top:14px;color:#A98BFF;font-weight:800;font-size:18px">✦ AI Analysis</div></div>`;
const miniTg = `<div style="width:190px;height:190px;border-radius:50%;background:#2EA6FF;display:flex;align-items:center;justify-content:center;margin:0 auto"><svg width="110" height="110" viewBox="0 0 24 24"><path d="M20.7 3.6L2.9 10.5c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.2-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8l2.9-13.9c.3-1.2-.4-1.7-1.4-1.1z" fill="#fff"/></svg></div>`;
outro.innerHTML = `<div id="oBg" style="position:absolute;inset:0;background:radial-gradient(1200px 700px at 50% 45%,rgba(234,255,0,.10),transparent 70%),#090A08"></div>
  <div id="fgrp" style="position:absolute;inset:0;transform-origin:960px 500px">${[['See.', miniTree, 400], ['Understand.', miniMsg, 960], ['Act.', miniTg, 1520]].map(([w, img, x], i) => `<div class="fcard" style="position:absolute;left:${x - 270}px;top:330px;width:540px;text-align:center"><div style="height:220px;display:flex;align-items:center;justify-content:center">${img}</div><div style="font-family:Unbounded;font-weight:800;font-size:64px;letter-spacing:-.03em;margin-top:30px;color:#fff">${w}</div></div>`).join('')}</div>
  <div id="oCore" style="position:absolute;left:0;right:0;top:250px;text-align:center"><div id="oLogo" style="display:inline-block">${LOGO(180)}</div>
   <div id="oCta" style="font-family:Unbounded;font-weight:800;font-size:84px;letter-spacing:-.03em;color:#fff;margin-top:26px">Explore <span style="color:#EAFF00">GramFi</span></div>
   <div id="oUrl" style="display:inline-block;margin-top:26px;font-family:'JetBrains Mono';font-weight:700;font-size:36px;background:#EAFF00;color:#12140F;border-radius:999px;padding:14px 40px">gramfi.ai</div>
   <div id="oTag" style="font-size:24px;color:#9AA095;margin-top:26px;font-weight:600">AI-powered InfoFi platform built for the Telegram ecosystem</div></div>`;
const fcards = $$('.fcard', outro);
const wave = $('#wave');
wave.innerHTML = `<div id="wDark" style="position:absolute;inset:0;background:#090A08"></div><div id="wRing" style="position:absolute;border-radius:50%;border:120px solid #EAFF00"></div>`;

/* ======================================================================
   CURSOR (web) / TOUCH (mobile)
   ====================================================================== */
const CUR = [
  { t: T.A + .4, pt: [2060, 1180] },
  { t: T.A + 1.6, sel: '#tile_Bitcoin', fx: .55, fy: .72 },
  { t: T.ai + .75, sel: '#aiBtc', c: 1 },
  { t: T.ai + 2.2, sel: '#aiHl', fx: .8, fy: 1.6 },
  { t: T.ctry - .12, sel: '#sb_ctry', c: 1 },
  { t: T.ctry + .95, sel: '#c_kr', fx: .4, c: 1 },
  { t: T.ctry + 1.7, sel: '#krBtc', fx: .96, fy: .6 },
  { t: T.top - .12, sel: '#sb_top', c: 1 },
  { t: T.map - .12, sel: '#sb_map', c: 1 },
  { t: T.map + .6, sel: '#mapInp', fx: .25, c: 1 },
  { t: T.map + 1.55, sel: '#mapBtn', c: 1 },
  { t: T.tele - .12, sel: '#sb_tele', c: 1 },
  { t: T.tele + .75, sel: '#chipBtc', c: 1 },
  { t: T.tele + 2.2, sel: '#starPost', fx: .2, fy: .85 },
  { t: T.poly - .12, sel: '#nav_poly', c: 1 },
  { t: T.poly + .38, sel: '#mkRow', fx: .3, c: 1 },
  { t: T.poly + 1.0, sel: '#mentBox', fx: .85, fy: .85 },
  { t: T.poly + 1.3, sel: '#aiHead', fx: .42, fy: .9 },
  { t: T.poly + 1.9, sel: '#mkTrade', c: 1 },
  { t: CUT + .05, sel: '#tgBtn', fx: .7, fy: 1.8 },
  { t: CUT + .78, sel: '#tgBtn', fx: .5, c: 1 },
];
const TOUCH = [
  { t: D + .15, sel: '#ph', fx: .3 }, { t: D + 1, sel: '#sendBtn', c: 1 }, { t: D + 2.6, sel: '#b_yes', c: 1 }, { t: D + 3.7, sel: '#b_10', c: 1 }, { t: D + 6.8, sel: '#b_place', c: 1 },
  { t: T.copy + 1.9, sel: '#a_add', c: 1 }, { t: T.auto + 1.74, sel: '#b_band', c: 1 }, { t: T.auto + 4.2, sel: '#b_paper', c: 1 },
  { t: T.perp + 1.7, sel: '#b_long', c: 1 }, { t: T.perp + 2.9, sel: '#b_open', c: 1 },
  { t: T.alert + .7, sel: '#b_yesup', c: 1 }, { t: T.alert + .9, sel: '#ph', fx: .3 }, { t: T.alert + 1.4, sel: '#sendBtn', c: 1 },
];
[CUR, TOUCH].forEach(L => L.forEach(e => { e.arr = e.c ? e.t - .28 : e.t; e.el = e.sel ? $(e.sel) : null; if (e.c) ev(e.t, L === CUR ? 'click' : 'tap'); }));
const curEl = $('#cursor'), touchEl = $('#touch'), ripsEl = $('#rips');
const ripEls = [...CUR, ...TOUCH].filter(e => e.c).map(e => { const r = H('<div class="rip"></div>'); ripsEl.appendChild(r); return { e, r }; });
function tpos(e) { if (e.pt) return e.pt; const r = e.el.getBoundingClientRect(); return [r.left + r.width * (e.fx ?? .5), r.top + r.height * (e.fy ?? .55)]; }
function pathAt(L, t) {
  let i = 0; while (i < L.length - 1 && L[i + 1].arr <= t) i++;
  const a = L[i], b = L[i + 1], pa = tpos(a);
  if (!b || t < a.arr) return pa;
  const leaveA = a.c ? a.t + .12 : a.arr, travel = Math.min(.7, (b.arr - leaveA) * .9), dep = b.arr - travel;
  if (t <= dep) return pa;
  const pb = tpos(b), u = E.io(seg(t, dep, b.arr)), dx = pb[0] - pa[0], dy = pb[1] - pa[1], dist = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * u) * Math.min(80, dist * .12);
  return [lerp(pa[0], pb[0], u) + (-dy / dist) * arc, lerp(pa[1], pb[1], u) + (dx / dist) * arc];
}
function hoverState(el, t) {
  let hv = 0, pr = 0;
  for (const e of [...CUR, ...TOUCH]) { if (e.el !== el) continue; if (t >= e.arr - .06 && t <= (e.c ? e.t + .3 : e.arr + 1.0)) hv = 1; if (e.c) pr = Math.max(pr, Math.sin(Math.PI * seg(t, e.t - .02, e.t + .16))); }
  return { hv, pr };
}

/* ======================================================================
   CAMERA — frontal while reading, moves between actions
   ====================================================================== */
const PH = { x: 330, y: 0, z: 300 };
const K = (t, x, y, d, rx = 2, ry = 0, rz = 0, hold = 0) => ({ t, x, y, d, rx, ry, rz, hold });
const CAM = [
  K(0, 0, -50, -130, 3, -3), K(T.A - .2, 0, -50, -130, 3, -3, 0, 1), K(T.A + 1.0, -140, -60, -40, 2, -1), K(T.A + 1.9, -230, -70, 30, 1.5, 0, 0, 1), K(T.ai - .25, -230, -70, 30, 1.5, 0, 0, 1),
  K(T.ai + .6, 130, -120, 20, 2, -1), K(T.ai + 1.6, 0, 40, 40, 1.5, 0, 0, 1), K(T.ctry - .3, 0, 40, 40, 1.5, 0, 0, 1),
  K(T.ctry + .2, 0, -50, -110, 2.5, 2), K(T.ctry + 1.3, 60, -30, -50, 2, 0, 0, 1), K(T.top - .25, 60, -30, -50, 2, 0, 0, 1),
  K(T.top + .2, 0, -40, -110, 2.5, -2), K(T.map - .25, 0, -40, -100, 2.5, -1, 0, 1),
  K(T.map + .3, 0, -50, -110, 2.5, 2), K(T.map + .7, 200, -240, 30, 2, -1), K(T.map + 1.7, 40, 0, 30, 2, 0), K(T.map + 2.6, -20, 0, 60, 1.5, 0, 0, 1), K(T.tele - .25, -20, 0, 60, 1.5, 0, 0, 1),
  K(T.tele + .2, 0, -50, -110, 2.5, -2), K(T.tele + .8, 250, -150, -30, 2, -1), K(T.tele + 1.6, -30, -30, 0, 1.5, 0, 0, 1), K(T.poly - .25, -30, -30, 0, 1.5, 0, 0, 1),
  K(T.poly + .25, 0, -60, -100, 2.5, 2), K(T.poly + .9, -10, -70, 170, 1.5, 0, 0, 1), K(CUT - .05, -10, -70, 170, 1.5, 0, 0, 1),
  K(CUT + .05, -200, 0, -40, 2, 3), K(CUT + .8, -260, 40, 20, 2, 4), K(D - 1.1, 40, -20, -380, 4, -8, -.8), K(D - .2, 20, 40, -150, 2, -8, -.4),
];
{
  const pR = $('#phone'); const offs = (el, root) => { let x = 0, y = 0, n = el; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y, el.offsetWidth, el.offsetHeight]; };
  CAM.push(K(D + .643, 0, 0, -300, 0, 0, 0, 1), K(T.fin - .05, 0, 0, -300, 0, 0, 0, 1));
  CAM.push(K(T.fin + .1, 0, 20, -320, 2, -3), K(T.fin + 1.2, 0, 0, -1400, 6, 0), K(T.end, 0, 0, -1450, 6, 0, 0, 1));
  CAM.sort((a, b) => a.t - b.t);
  for (let i = CAM.length - 1; i > 0; i--) if (CAM[i].t - CAM[i - 1].t < .22) CAM.splice(i - 1, 1);
}
function browserPose(t) {
  const a = E.io(seg(t, CUT + .95, D - .2));
  return { x: lerp(0, -900, a), y: lerp(0, 80, a), z: lerp(0, -1500, a), ry: lerp(0, 24, a), op: lerp(1, .35, a) * (1 - seg(t, D + .2, D + .643)), bl: lerp(0, 7, a) };
}
const BTN_W = { x: -480, y: 60, z: 20 };
// camera sits at d = -300 after landing, so z = 300 is 1:1 on screen; screen x = 960 + x * scale
const PPK = (t, x, y, z, ry, rz = 0, hold = 1) => ({ t, x, y, z, ry, rz, hold });
const PK = [PPK(D, PH.x, 0, 300, -4, 0, 0), PPK(D + .643, 430, 0, 300, -6), PPK(T.copy, 430, 0, 300, -6),
  PPK(T.copy + .7, -500, 10, 300, 8), PPK(T.auto, -500, 10, 300, 8),                                // copy: slides across to the left
  PPK(T.auto + .7, 846, 95, -500, -16), PPK(T.perp, 846, 95, -500, -16),                            // auto: recedes into the corner
  PPK(T.perp + .4, 846, 1500, -500, -16, 8, 0), PPK(T.perp + .8, 0, 1400, -58, 0, -6, 0), PPK(T.perp + 1.4, 0, 58, -58, 0), // perps: drops out, rises in front of the chart
  PPK(T.alert, 0, 58, -58, 0), PPK(T.alert + .6, 430, 0, 300, -6), PPK(T.fin, 430, 0, 300, -6)];          // alert: moves aside for the explanation
function phonePose(t) {
  const t0 = CUT + .9; if (t < t0) return null;
  const f = seg(t, t0, D - .08), fe = E.o5(f);
  let x = lerp(BTN_W.x, PH.x, E.io(f)), y = lerp(BTN_W.y, PH.y, E.io(f)) - Math.sin(f * Math.PI) * 110, z = lerp(BTN_W.z, PH.z, fe);
  let s = lerp(.08, 1, E.ob(seg(t, t0, D + .05))), ry = lerp(-60, -4, fe), rz = lerp(12, 0, fe), rx = lerp(25, 0, fe);
  if (t > D) { x = spline(PK, t, 'x'); y = spline(PK, t, 'y'); z = spline(PK, t, 'z'); ry = spline(PK, t, 'ry'); rz = spline(PK, t, 'rz'); rx = 0; }
  const o = E.io(seg(t, T.fin, T.fin + .9)); z = lerp(z, -900, o); s = lerp(s, .5, o);
  const dim = 1 - .3 * E.io(seg(t, T.alert + 3.55, T.alert + 3.95));
  return { x, y, z, s, rx, ry, rz, op: clamp(seg(t, t0, t0 + .12)) * (1 - seg(t, T.fin + .3, T.fin + .9)) * dim };
}

/* ======================================================================
   SOUND EVENTS — click / tap / confirm / notify / landing (+ a few UI cues)
   ====================================================================== */
ev(.05, 'rumble', { len: 2.4 }); ev(1.85, 'whoosh', { len: 1.2, up: 1 }); ev(3.1, 'logo');
ev(T.A + 1.6, 'pop'); ev(T.ai + .85, 'sparkle'); ev(T.ctry + 1.0, 'whoosh', { len: .7, up: 0 });
for (let k = 0; k < 15; k++) ev(T.map + .72 + k * .045, 'key'); ev(T.map + 1.6, 'whoosh', { len: .9, up: 0 }); ev(T.tele + .8, 'morph');
ev(CUT, 'swish'); ev(CUT + .9, 'whoosh', { len: 1.7, up: 1 }); ev(D, 'land');
for (let k = 0; k < 7; k++) ev(D + .3 + k * .1, 'key'); for (let k = 0; k < 2; k++) ev(T.alert + 1.017 + k * .2, 'key');
ST.forEach(([, t]) => { if (t > D + .471) ev(t, 'pop'); });
ev(D + 6.843, 'tick', { len: .6 }); ev(D + 7.4, 'confirm'); ev(D + 7.55, 'impact', { g: .4 });
ev(T.copy, 'whoosh', { len: .8, up: 0 }); ev(T.copy + 2, 'confirm');
ev(T.auto, 'whoosh', { len: .8, up: 1 }); ev(T.auto + 1.3, 'tick', { len: 2.2 }); ev(T.auto + 4.3, 'confirm');
ev(T.perp + .044, 'whoosh', { len: .5, up: 0 }); ev(T.perp + .8, 'whoosh', { len: .8, up: 1 }); ev(T.perp + 2.942, 'tick', { len: .5 }); ev(T.perp + 3.4, 'confirm');
ev(T.alert + 1.5, 'confirm'); ev(T.alert + 2.587, 'tick', { len: .8 }); ev(T.alert + 3.25, 'notify'); ev(T.alert + 3.55, 'whoosh', { len: .6, up: 1 });
ev(T.fin, 'whoosh', { len: 1.2, up: 0 }); [.6, .9, 1.2].forEach(d => ev(T.fin + d, 'blip')); ev(T.fin + 3.45, 'logo');

/* ======================================================================
   RENDER
   ====================================================================== */
function setW(el, x, y, z, ww, hh, extra = '') { el.style.transform = `translate3d(${x - ww / 2}px,${y - hh / 2}px,${z}px) ${extra}`; }
function vis(el, op) { el.style.opacity = op; el.style.visibility = op <= .001 ? 'hidden' : 'visible'; }

function renderAt(tv) {
  tv = clamp(tv, 0, DUR - 1e-6); const t = warp(tv); TV = tv;
  let gi = 0; while (gi < GROUPS.length - 1 && GROUPS[gi + 1][0] <= t) gi++;
  const g0 = GROUPS[Math.max(0, gi - 1)], g1 = GROUPS[gi], gq = gi ? E.io(seg(t, g1[0] - .3, g1[0] + .9)) : 1;
  $('#glowA').style.background = `radial-gradient(closest-side, ${g0[1]}, transparent)`; $('#glowA').style.opacity = g0[2] * (1 - gq);
  $('#glowB').style.background = `radial-gradient(closest-side, ${g1[1]}, transparent)`; $('#glowB').style.opacity = g1[2] * gq;
  $('#glowA').style.transform = $('#glowB').style.transform = `translate(${600 + Math.sin(t * .15) * 160}px,${-250 + Math.cos(t * .11) * 100}px)`;
  const C = {}; for (const f of ['x', 'y', 'd', 'rx', 'ry', 'rz']) C[f] = spline(CAM, t, f);
  { const dr = 1 - seg(t, T.fin, T.fin + .5); C.x += 9 * Math.sin(tv * .55) * dr; C.y += 6 * Math.sin(tv * .37 + 1) * dr; C.d += 22 * Math.sin(tv * .29) * dr; C.ry += .5 * Math.sin(tv * .23) * dr; }
  cam.style.transform = `translateZ(${C.d}px) rotateX(${C.rx}deg) rotateY(${C.ry}deg) rotateZ(${C.rz}deg) translate3d(${-C.x}px,${-C.y}px,0)`;
  $('#grid').style.transform = `translate(${(-C.x * .08) % 34}px,${(-C.y * .08) % 34}px)`;
  DECO.forEach(dc => {
    const inn = seg(t, dc.a - .05, dc.a + 1.2), out = seg(t, dc.b - .1, dc.b + .4);
    if (inn <= 0 || out >= 1) { vis(dc.el, 0); return; }
    dc.el.style.transform = `translate3d(${(dc.mob ? PH.x - 200 : 0) - 1800}px,-1200px,-800px)`;
    vis(dc.el, 1 - E.io(out));
    dc.paths.forEach((p, j) => { const q = E.o(seg(inn, (j % 9) * .05, (j % 9) * .05 + .6)); p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = (1 - q).toFixed(4); });
  });
  const Bp = browserPose(t);
  setW(browser, Bp.x, Bp.y, Bp.z, 1440, 830, `rotateY(${Bp.ry}deg)`);
  browser.style.filter = Bp.bl > .2 ? `blur(${Bp.bl.toFixed(1)}px)` : 'none';
  vis(browser, Bp.op * E.o(seg(t, 3.2, 4.0)));
  if (t < T.fin + .7) renderWeb(t);
  renderIntro(t);
  renderPhone(t);
  renderMob(t, tv);
  // theses
  CAPS.forEach(c => {
    if (!(t >= c.in - .1 && t <= c.out + .7)) { vis(c.el, 0); return; }
    vis(c.el, 1);
    if (!c.fit) { c.fit = 1; const w = c.tt.scrollWidth; if (w > 1250) c.tt.style.fontSize = Math.floor(72 * 1250 / w) + 'px'; }
    c.words.forEach((wd, j) => {
      const q = seg(t, c.in + j * .05, c.in + j * .05 + .45), o = seg(t, c.out + j * .025, c.out + j * .025 + .28), e = E.o5(q), eo = E.i(o);
      wd.style.transform = `translateY(${(1 - e) * 46 - eo * 36}px)`; wd.style.opacity = clamp(q * 1.6) * (1 - eo);
    });
    const sq = E.o5(seg(t, c.in + .3, c.in + .7)); c.sbEl.style.opacity = sq * (1 - seg(t, c.out, c.out + .25));
    const pi = E.o5(seg(t, c.in - .04, c.in + .3)), po = E.io(seg(t, c.out, c.out + .3)), sk = c.sh ? E.io(seg(t, c.sh, c.sh + .45)) : 0;
    const sg = c.r ? -1 : 1; c.cp.style.transformOrigin = c.r ? '100% 0' : '0 0';
    c.cp.style.opacity = pi * (1 - po) * (1 - .15 * sk); c.cp.style.transform = `translate(${sg * ((1 - pi) * -30 - po * 24 - 20 * sk)}px,${-18 * sk}px) scale(${1 - .5 * sk})`;
  });
  // readouts
  ROS.forEach(r => {
    const q = E.o5(seg(t, r.t0, r.t0 + .35)), o = E.io(seg(t, r.t1 - .25, r.t1));
    const op = q * (1 - o); vis(r.el, op); r.line.style.opacity = op * .9; r.dot.style.opacity = op;
    if (op <= 0) return;
    const ar = $(r.anc).getBoundingClientRect(), ax = ar.left + ar.width / 2, ay = ar.top + ar.height / 2, h = r.el.offsetHeight;
    let x, y;
    if (r.side === 'm') { x = 80; y = 430; }
    else if (r.side === 'c') { x = 150; y = 330; }
    else if (r.side === 'r') { x = clamp(ar.right + 50, 60, 1920 - r.w - 60); y = clamp(ay - h / 2, 300, 1080 - h - 60); }
    else if (r.side === 'l') { x = clamp(ar.left - r.w - 50, 60, 1920 - r.w - 60); y = clamp(ay - h / 2, 300, 1080 - h - 60); }
    else { x = clamp(ax - r.w / 2, 60, 1920 - r.w - 60); y = clamp(ar.bottom + 40, 300, 1080 - h - 60); }
    r.el.style.transform = `translate(${x}px,${y + (1 - q) * 18}px) scale(${.96 + .04 * q})`;
    const ex = clamp(ax, x, x + r.w), ey = clamp(ay, y, y + h);
    r.line.setAttribute('x1', ax); r.line.setAttribute('y1', ay); r.line.setAttribute('x2', ex); r.line.setAttribute('y2', ey); r.dot.setAttribute('r', 8 + 3 * Math.sin(TV * 5)); r.dot.setAttribute('cx', ax); r.dot.setAttribute('cy', ay);
  });
  vis($('#illu'), ILLU.some(([a, b]) => t >= a + .1 && t < b - .1) ? .9 : 0);
  renderOutro(t);
  // pointer
  const webOn = t >= T.A + .2 && t < CUT + 1.0, mobOn = t >= D + .05 && t < T.fin + .2;
  if (webOn) { const [cx, cy] = pathAt(CUR, t); let press = 0; for (const e of CUR) if (e.c) press = Math.max(press, Math.sin(Math.PI * seg(t, e.t - .04, e.t + .18)));
    const sc = 1 - press * .14; curEl.style.transform = `translate(${cx - 4 * sc}px,${cy - 3 * sc}px) scale(${sc})`;
    curEl.style.opacity = seg(t, T.A + .2, T.A + .45) * (1 - seg(t, CUT + .9, CUT + 1.0)); } else curEl.style.opacity = 0;
  if (mobOn) { const [cx, cy] = pathAt(TOUCH, t); let press = 0; for (const e of TOUCH) if (e.c) press = Math.max(press, Math.sin(Math.PI * seg(t, e.t - .05, e.t + .15)));
    touchEl.style.transform = `translate(${cx}px,${cy}px) scale(${1 - press * .25})`; let act = 0; for (const e of TOUCH) act = Math.max(act, seg(t, e.arr - .9, e.arr - .5) * (1 - seg(t, (e.c ? e.t : e.arr) + .45, (e.c ? e.t : e.arr) + .8)));
    touchEl.style.opacity = act * (.55 + .45 * press) * seg(t, D + .05, D + .3) * (1 - seg(t, T.fin - .05, T.fin + .2)); } else touchEl.style.opacity = 0;
  ripEls.forEach(({ e, r }) => {
    const q = seg(t, e.t, e.t + .45); if (q <= 0 || q >= 1) { vis(r, 0); return; }
    const p = tpos(e), s = 18 + E.o(q) * 70; r.style.left = (p[0] - s / 2) + 'px'; r.style.top = (p[1] - s / 2) + 'px'; r.style.width = r.style.height = s + 'px'; vis(r, (1 - q) * .9);
  });
}

function renderIntro(t) {
  const io = 1 - seg(t, 3.85, 4.28);
  vis(intro, io > 0 ? 1 : 0); if (io <= 0) return;
  intro.style.opacity = io;
  const sweep = seg(t, 1.85, 2.9);
  nmsgs.forEach(m => {
    const colX = 40 + m.col * 270 + (m.layer - 1) * 30, sc = [.78, .9, 1.04][m.layer], y = 1150 - ((t * m.sp + m.off) % 1500), x = colX;
    const ts = 1.85 + (colX / 1920) * 1.0, q = E.io(seg(t, ts, ts + .85)), el = m.el;
    if (m.tile >= 0 && q > 0) {
      const tr = tiles[m.tile].getBoundingClientRect();
      el.style.transform = 'none'; el.style.left = lerp(x, tr.left, q) + 'px'; el.style.top = lerp(y, tr.top, q) + 'px'; el.style.width = lerp(300 * sc, tr.width, q) + 'px'; el.style.height = lerp(74 * sc, tr.height, q) + 'px';
      el.style.background = q > .5 ? COINS[m.tile][6] : '#15181A'; el.style.borderRadius = lerp(14, 0, q) + 'px'; el.style.color = q > .5 ? 'transparent' : '';
      el.style.opacity = 1 - seg(t, 3.6, 4.0); el.style.filter = 'none';
    } else {
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = '300px'; el.style.height = '74px'; el.style.transform = `scale(${sc})`;
      el.style.opacity = (m.layer === 0 ? .45 : m.layer === 1 ? .7 : .95) * (1 - E.io(q)) * seg(t, 0, .4); el.style.filter = m.layer === 0 ? 'blur(3px)' : 'none';
    }
  });
  $('#iscrim').style.opacity = seg(t, .1, .5) * (1 - seg(t, 3.5, 3.9));
  const a1 = E.o5(seg(t, .25, .75)), o1 = seg(t, 1.7, 2.0); $('#it1').style.opacity = a1 * (1 - o1); $('#it1').style.transform = `translateY(${(1 - a1) * 40 - o1 * 30}px)`;
  const a3 = E.o5(seg(t, 2.55, 3.0)), o3 = seg(t, 3.6, 3.9); $('#it3').style.opacity = a3 * (1 - o3); $('#it3').style.transform = `translateY(${(1 - a3) * 40 - o3 * 30}px)`;
  const u = E.io(sweep), [px, py] = planeAt(u), [qx, qy] = planeAt(Math.min(1, u + .01)), ang = Math.atan2(qy - py, qx - px) * 180 / Math.PI;
  $('#imark').setAttribute('transform', `translate(${px},${py}) rotate(${ang + 20}) scale(1.1) translate(-48,-52)`); $('#imark').style.opacity = sweep > 0 && sweep < 1 ? 1 : 0;
  trailDots.forEach((d, k) => { const uu = u - k * .012; if (uu <= 0 || sweep >= 1) { d.setAttribute('opacity', 0); return; } const [x, y] = planeAt(uu); d.setAttribute('cx', x); d.setAttribute('cy', y); d.setAttribute('opacity', (1 - k / 60) * .9); });
}

function renderOutro(t) {
  const s = T.fin;
  // the one colour wave of the film: a lime ring sweeps out from the phone and leaves the finale behind it
  const wq = seg(t, s - .02, s + .7);
  if (wq > 0 && wq < 1) { const r = E.io(wq) * 2300, cx = 1390, cy = 540; const ring = $('#wRing'); ring.style.left = (cx - r) + 'px'; ring.style.top = (cy - r) + 'px'; ring.style.width = ring.style.height = 2 * r + 'px'; ring.style.borderWidth = lerp(40, 160, wq) + 'px';
    $('#wDark').style.clipPath = `circle(${Math.max(0, r - 80)}px at ${cx}px ${cy}px)`; vis(wave, 1); } else vis(wave, 0);
  const on = t > s + .3; vis(outro, on ? 1 : 0); if (!on) return;
  // three fixed columns; after a short hold the whole group recedes as one, then the logo arrives on its own
  const g = E.io(seg(t, s + 2.85, s + 3.35));
  $('#fgrp').style.transform = `scale(${1 - .12 * g})`; $('#fgrp').style.opacity = 1 - g;
  fcards.forEach((c, i) => { const q = E.o5(seg(t, s + .5 + i * .3, s + .9 + i * .3)); c.style.transform = `translateY(${(1 - q) * 40}px)`; c.style.opacity = q; });
  const lq = seg(t, s + 3.5, s + 4.0);
  $('#oLogo').style.transform = `scale(${lerp(.5, 1, E.o5(lq))})`; $('#oLogo').style.opacity = lq;
  const cq = E.o5(seg(t, s + 3.8, s + 4.3)); $('#oCta').style.opacity = cq; $('#oCta').style.transform = `translateY(${(1 - cq) * 24}px)`;
  const uq = E.o5(seg(t, s + 4.05, s + 4.5)); $('#oUrl').style.opacity = uq; $('#oUrl').style.transform = `translateY(${(1 - uq) * 20}px)`;
  $('#oTag').style.opacity = E.o(seg(t, s + 4.3, s + 4.8));
}

function renderWeb(t) {
  const pIdx = PAGES.findIndex(p => t >= p.a && t < p.b), pg = PAGES[Math.max(0, pIdx)];
  $('#url').textContent = 'gramfi.ai/' + pg.url + (t >= CUT ? '' : '');
  if (t >= CUT) $('#url').textContent = 'gramfi.ai/polymarket/overview';
  const np = hoverState($('#nav_poly'), t); $('#nav_insight').className = 'it' + (t < T.poly ? ' on' : ''); $('#nav_poly').className = 'it' + (t >= T.poly ? ' on' : np.hv ? ' hv' : '');
  SIDEI.forEach(([id]) => { const el = $('#' + id), hs = hoverState(el, t), on = pg.sb === id; el.className = 's' + (on ? ' on' : hs.hv ? ' hv' : ''); el.style.transform = `scale(${1 - hs.pr * .06})`;
    const tip = $('.tipl', el); vis(tip, hs.hv ? 1 : 0); });
  PAGES.forEach(({ el, a, b, kind }) => {
    const inn = a < 0 ? 1 : E.o5(seg(t, a + .05, a + .5)), out = E.io(seg(t, b, b + .22)); let tf = '', cl = 'none', op = inn;
    if (kind === 'zoom') tf = `scale(${lerp(.8, 1, inn)})`;                                   // country: the globe comes at you
    else if (kind === 'drop') tf = `translateY(${(1 - inn) * -110}px)`;                        // top 10: drops in from above
    else if (kind === 'iris') { cl = inn < 1 ? `circle(${(inn * 115).toFixed(1)}% at 50% 45%)` : 'none'; op = inn > 0 ? 1 : 0; } // map: opens from the centre
    else if (kind === 'rise') tf = `perspective(1400px) translateY(${(1 - inn) * 120}px) rotateX(${(1 - inn) * 16}deg)`; // polymarket: tilts up from below
    else tf = `translateX(${(1 - inn) * 90}px)`;                                                // telescope: slides in like a feed
    el.style.transform = `${tf} scale(${1 + out * .08})`; el.style.clipPath = cl; vis(el, Math.min(op, 1 - out)); });
  if (t < T.ctry + .3) pMpc(t);
  if (t > T.ctry - .1 && t < T.top + .3) pGlobe(t);
  if (t > T.top - .1 && t < T.map + .3) pods.forEach(p => { const d = T.top + .05 + p.ri * .1 + p.j * .03, q = E.o(seg(t, d, d + .35)); p.el.style.transform = `translateY(${(1 - q) * -30}px)`; p.el.style.opacity = q; });
  if (t > T.map - .1 && t < T.tele + .3) pMap(t);
  if (t > T.tele - .1 && t < T.poly + .3) pTele(t);
  if (t > T.poly - .1) pPoly(t);
}
function pMpc(t) {
  const s = T.A, sel = E.io(seg(t, s + 1.55, s + 1.95)) * (1 - E.io(seg(t, T.ai + .6, T.ai + 1.0)));
  const outl = E.io(seg(t, s + 1.55, s + 1.95));
  tiles.forEach((el, i) => { const isB = i === 0; el.style.opacity = isB ? 1 : 1 - .6 * sel; el.style.zIndex = isB ? 2 : 1; el.style.boxShadow = isB ? `inset 0 0 0 ${4 * outl}px #EAFF00, 0 0 ${outl * (14 + 10 * Math.sin(TV * 4))}px rgba(234,255,0,.5)` : 'none'; });
  tiles.forEach((el, i) => { if (i) el.style.filter = `brightness(${(1 + .08 * Math.sin(TV * 1.7 + i * 1.3)).toFixed(3)})`; });
  $$('.mt .r:not(.h)', pg_mpc).forEach((r, k) => { const q = E.o5(seg(t, 3.5 + k * .035, 3.95 + k * .035)); r.style.opacity = q; r.style.transform = `translateX(${(1 - q) * 26}px)`;
    const f = t > T.A && (Math.floor(TV * 2.4) * 7 + k * 5) % 13 === 0; r.style.background = f ? (k % 3 ? 'rgba(43,212,125,.12)' : 'rgba(255,92,96,.12)') : 'transparent'; });
  $$('#btcPanel circle').forEach((c, k, a) => { const q = E.ob(seg(t, T.ai + 1.15 + k * .045, T.ai + 1.45 + k * .045)); c.setAttribute('r', (3.5 * q * (k === a.length - 1 ? 1 + .5 * (.5 + .5 * Math.sin(TV * 5)) : 1)).toFixed(2)); });
  $$('#aiBox li').forEach((li, k) => { const q = E.o(seg(t, T.ai + 1.25 + k * .3, T.ai + 1.6 + k * .3)); li.style.opacity = .1 + .9 * q; li.style.transform = `translateY(${(1 - q) * 10}px)`; });
  $('#aiHl').style.boxShadow = `0 0 ${(10 + 8 * Math.sin(TV * 4)) * E.io(seg(t, T.ai + 1.55, T.ai + 1.9))}px rgba(234,255,0,.45)`;
  const ai = hoverState($('#aiBtc'), t); $('#aiBtc').className = 'aiic' + (ai.hv ? ' hv' : '');
  const pq = E.o5(seg(t, T.ai + .8, T.ai + 1.25)); $('#btcPanel').style.transform = `translateX(${(1 - pq) * 840}px)`; vis($('#btcPanel'), pq > 0 ? 1 : 0); vis($('#mpcDim'), pq * .9);
  $('#mpcDim').style.backdropFilter = pq > .05 ? `blur(${(4 * pq).toFixed(1)}px)` : 'none';
  $('#trendL').style.strokeDasharray = '1200'; $('#trendL').style.strokeDashoffset = 1200 * (1 - E.o(seg(t, T.ai + 1.1, T.ai + 1.9)));
  const hq = E.io(seg(t, T.ai + 1.55, T.ai + 1.9)); $('#aiHl').style.backgroundSize = `${hq * 100}% 100%`;
  $$('#aiBox li > span:not(#aiHl), #aiBox li:nth-child(2)').forEach(e => e.style.opacity = 1 - .55 * hq);
}
function pGlobe(t) {
  const s = T.ctry, c = gctx, Rg = 290, cx = 310, cy = 310; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 620, 620);
  const turn = E.io(seg(t, s + 1.0, s + 1.6)), lon0 = lerp(104, 127.5, turn), lat0 = lerp(24, 32, turn), ap = E.o(seg(t, s + .05, s + .5));
  const g = c.createRadialGradient(cx - 90, cy - 110, 40, cx, cy, Rg); g.addColorStop(0, '#22262A'); g.addColorStop(1, '#101214');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Rg, 0, 7); c.fill(); c.strokeStyle = 'rgba(139,108,255,.45)'; c.lineWidth = 1.5; c.stroke();
  const rl = lat0 * Math.PI / 180, sinL = Math.sin(rl), cosL = Math.cos(rl);
  const proj = (la, lo) => { const p = la * Math.PI / 180, l = (lo - lon0) * Math.PI / 180; const x = Math.cos(p) * Math.sin(l), y = cosL * Math.sin(p) - sinL * Math.cos(p) * Math.cos(l), z = sinL * Math.sin(p) + cosL * Math.cos(p) * Math.cos(l); return [cx + x * Rg, cy - y * Rg, z]; };
  const sel = t >= s + .95;
  GDOTS.forEach(([la, lo, col]) => { const [x, y, z] = proj(la, lo); if (z <= 0) return; const isKr = col === '#FF6FA5'; c.fillStyle = col ? (sel && !isKr ? col + '55' : col) : '#4A5048'; c.globalAlpha = (.35 + .65 * z) * ap; c.beginPath(); c.arc(x, y, (col ? 3.1 : 2.3) * (isKr && sel ? 1.3 : 1), 0, 7); c.fill(); });
  c.globalAlpha = 1;
  const pin = E.o5(seg(t, s + 1.5, s + 1.8));
  if (pin > 0) { const [x, y] = proj(37, 127.5); c.strokeStyle = '#EAFF00'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 60 * pin); c.stroke(); c.fillStyle = '#EAFF00'; c.beginPath(); c.arc(x, y - 60 * pin, 13, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '700 20px Inter'; c.fillText('Korea', x + 22, y - 54 * pin); }
  const kr = hoverState($('#c_kr'), t); CTRY.forEach(k => { const el = $('#c_' + k[0]); el.className = 'cchip' + (k[0] === 'kr' && sel ? ' on' : (k[0] === 'kr' && kr.hv ? ' hv' : '')); });
  const res = $('#ctryRes'), rq = E.o5(seg(t, s + 1.1, s + 1.5)); res.style.opacity = rq;
  $$('.cbar', res).forEach((b, i) => b.style.width = (b.dataset.v / 24 * 100 * E.o(seg(t, s + 1.2 + i * .05, s + 1.6 + i * .05))) + '%');
  const hb = E.io(seg(t, s + 1.5, s + 1.75)); $('#krBtc').style.background = `rgba(234,255,0,${.18 * hb})`; $('#krBtc').style.boxShadow = hb ? `inset 0 0 0 ${2 * hb}px #EAFF00` : 'none';
}
function pMap(t) {
  const s = T.map, Wd = 1318, Hh = 620, c = mctx; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, Wd, Hh);
  const fz = E.io(seg(t, s + 1.6, s + 2.5)), z = 1 + 1.0 * fz, tg = NODES[TGT], fx = lerp(Wd / 2, tg.x, fz), fy = lerp(Hh / 2, tg.y, fz);
  c.translate(Wd / 2, Hh / 2); c.scale(z, z); c.translate(-fx, -fy);
  const ap = E.o(seg(t, s + .05, s + .5)), hl = seg(t, s + 1.9, s + 2.6);
  c.lineWidth = 1.2 / z;
  EDGES.forEach(([a, b]) => { const A = NODES[a], Bn = NODES[b]; c.strokeStyle = `rgba(200,210,190,${.12 * ap * (1 - .6 * hl)})`; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bn.x, Bn.y); c.stroke(); });
  HE.forEach((j, k) => { const q = E.o(seg(t, s + 1.95 + k * .04, s + 2.3 + k * .04)); if (q <= 0) return; const Bn = NODES[j]; c.strokeStyle = 'rgba(234,255,0,.9)'; c.lineWidth = 2.2 / z; c.beginPath(); c.moveTo(Bn.x, Bn.y); c.lineTo(lerp(Bn.x, tg.x, q), lerp(Bn.y, tg.y, q)); c.stroke(); });
  NODES.forEach((n, i) => { c.fillStyle = n.c; c.globalAlpha = ap * (hl > 0 && i !== TGT && !HE.includes(i) ? 1 - .6 * hl : 1); c.beginPath(); c.arc(n.x, n.y, n.r, 0, 7); c.fill(); });
  c.globalAlpha = 1;
  if (t > s + 1.6) { c.fillStyle = '#EAFF00'; c.beginPath(); c.arc(tg.x, tg.y, 15, 0, 7); c.fill(); c.strokeStyle = 'rgba(234,255,0,.5)'; c.lineWidth = 3 / z; c.beginPath(); c.arc(tg.x, tg.y, 26, 0, 7); c.stroke(); }
  $('#lgFwd').style.opacity = E.o(seg(t, s + 2.2, s + 2.6));
  const typed = 'Crypto Channel', n = Math.round(typed.length * seg(t, s + .72, s + 1.35)), focused = t >= s + .6;
  $('#mapInp').className = 'inp' + (focused ? ' f' : ''); $('#mapTxt').textContent = n > 0 ? typed.slice(0, n) : 'Search channel name'; $('#caret').style.opacity = focused && t < s + 1.6 ? 1 : 0;
  const hb = hoverState($('#mapBtn'), t); $('#mapBtn').className = 'btn' + (hb.hv || t > s + 1.55 ? ' lime' : ''); $('#mapBtn').style.transform = `scale(${1 - hb.pr * .08})`;
  const sx = (tg.x - fx) * z + Wd / 2, sy = (tg.y - fy) * z + Hh / 2, ic = E.o5(seg(t, s + 2.4, s + 2.7)), info = $('#mapInfo');
  info.style.left = (sx + 40) + 'px'; info.style.top = (sy - 40) + 'px'; vis(info, ic);
}
function pTele(t) {
  const s = T.tele, f = E.io(seg(t, s + .8, s + 1.25)), star = E.io(seg(t, s + 1.35, s + 1.6));
  vis($('#feed0'), 1 - f); vis($('#feed1'), f); $('#feed1').style.transform = `translateY(${(1 - f) * 30}px)`;
  $('#tsInp').className = 'inp' + (f > 0 ? ' f' : ''); $('#tsTxt').textContent = f > 0 ? 'Bitcoin (BTC)' : 'Search coin';
  $('#chipBtc').className = 'chipc' + (t >= s + .75 ? ' on' : '');
  $$('#feed1 .tag.t').forEach(tg => tg.className = 'tag t' + (f > .5 ? ' hot' : ''));
  const sp = $('#starPost'); sp.style.boxShadow = star ? `inset 0 0 0 ${2 * star}px #EAFF00` : 'none'; sp.style.background = `rgba(234,255,0,${.06 * star})`;
  $$('#feed1 .post').forEach(p => { if (p !== sp) p.style.opacity = 1 - .55 * star; });
}
function pPoly(t) {
  const s = T.poly, mq = E.o5(seg(t, s + .42, s + .72));
  const rowH = hoverState($('#mkRow'), t); $('#mkRow').style.background = rowH.hv || t > s + .38 ? 'rgba(234,255,0,.10)' : 'transparent';
  const lq = E.o5(seg(t, CUT - .05, CUT + .45));
  $('#modal').style.transform = `translateY(${(1 - mq) * 40}px) scale(${1 - .05 * lq})`; vis($('#modal'), mq);
  const m1 = E.io(seg(t, s + .9, s + 1.05)) * (1 - E.io(seg(t, s + 1.18, s + 1.25))), m2 = E.io(seg(t, s + 1.2, s + 1.3)) * (1 - E.io(seg(t, s + 1.75, s + 1.85)));
  $('#mentBox').style.boxShadow = `0 0 0 ${3 * m1}px #EAFF00, 0 0 ${18 * m1 * (.6 + .4 * Math.sin(TV * 5))}px rgba(234,255,0,.45)`;
  $('#aiHead').style.boxShadow = `0 0 0 ${3 * m2}px #EAFF00, 0 0 ${18 * m2 * (.6 + .4 * Math.sin(TV * 5))}px rgba(234,255,0,.45)`; $('#aiHead').style.borderRadius = '6px';
  // the card is live while the viewer reads it (video time keeps running through the pause)
  if (mq > 0) { const pv = TV - toV(s + .72), r = E.o(clamp(pv / 1.2));
    $('#phPath').style.strokeDasharray = '1 1'; $('#phPath').style.strokeDashoffset = (1 - E.io(clamp(pv / 1.6))).toFixed(3);
    $('#phDot').setAttribute('r', 4 + 2.5 * (.5 + .5 * Math.sin(TV * 6))); $('#phDot').style.opacity = clamp((pv - 1.4) / .2); $('#livDot').style.opacity = .4 + .6 * (.5 + .5 * Math.sin(TV * 6));
    $('#pBarY').style.width = (43 * r) + '%'; $('#pYes').textContent = `Yes ${Math.round(43 * r)}%`; $('#pNo').textContent = `No ${100 - Math.round(43 * r)}%`; $('#phPct').textContent = `${Math.round(43 * r)}%`;
    const tick = Math.floor(Math.max(0, pv) * 2.6);
    $$('.obs', $('#modal')).forEach((e, k) => { const v = +e.dataset.v, w = Math.round(v * (1 + .09 * Math.sin(k * 7.3 + tick * 2.1))), hot = (tick + k) % 5 === 0 && pv > .3;
      e.textContent = fmt(w).replace(/,/g, ' '); e.parentNode.style.background = hot ? 'rgba(255,255,255,.06)' : 'transparent'; });
    $$('#aiMk li').forEach((li, k) => { const q = E.o(clamp((pv - .2 - k * .35) / .5)); li.style.opacity = .15 + .85 * q; li.style.transform = `translateX(${(1 - q) * 14}px)`; }); }
  const tb = hoverState($('#mkTrade'), t); $('#mkTrade').style.transform = `scale(${(1 + tb.hv * .08) * (1 - tb.pr * .1)})`; $('#mkTrade').style.boxShadow = tb.hv ? '0 0 0 3px rgba(234,255,0,.35)' : 'none';
  vis($('#landing'), lq > 0 ? 1 : 0); $('#landing').style.transform = `translateX(${(1 - lq) * 1300}px)`; $('#landing').style.boxShadow = lq < 1 ? '-30px 0 60px rgba(0,0,0,.6)' : 'none';
  const hb = hoverState($('#tgBtn'), t), pushed = t >= CUT + .78; $('#tgBtn').style.transform = `scale(${(1 + hb.hv * .04) * (1 - hb.pr * .07)})`;
  $('#tgBtn').style.background = pushed ? '#FFFFFF' : '#EAFF00'; $('#tgLbl').textContent = pushed ? 'Opening Telegram…' : 'GramFi-Polymarket TG Bot';
}

function renderPhone(t) {
  const P = phonePose(t);
  if (!P) { vis(phone, 0); return; }
  setW(phone, P.x, P.y, P.z, 450, 940, `rotateX(${P.rx}deg) rotateY(${P.ry}deg) rotateZ(${P.rz}deg) scale(${P.s})`); vis(phone, P.op);
  stEls.forEach((s, i) => {
    const next = stEls[i + 1], gap = next ? next.t : 99;
    const inn = seg(t, s.t + .04, s.t + .3), out = seg(t, gap - .03, gap + .07), op = (t >= s.t ? E.o(inn) : 0) * (1 - out);
    vis(s.el, op); s.el.style.transform = `translateY(${(1 - E.o5(inn)) * 18 - out * 8}px)`;
    if (op <= 0) return;
    s.btns.forEach((b, j) => { const q = E.o(seg(t, s.t + .05 + j * .015, s.t + .28 + j * .015)), hs = hoverState(b, t); b.classList.toggle('hv', !!hs.hv); b.style.transform = `translateY(${(1 - q) * 8}px) scale(${1 - hs.pr * .05})`; b.style.opacity = q; });
  });
  const uq = E.o(seg(t, D + 1.038, D + 1.192)) * (1 - seg(t, T.copy - .05, T.copy)); $('#u_q').style.opacity = uq; vis($('#u_q'), uq);
  const u4 = E.o(seg(t, T.alert + 1.45, T.alert + 1.562)) * (1 - seg(t, T.fin - .1, T.fin)); vis($('#u_45'), u4);
  // typing into the chat input: the keyword search, then the alert price
  const ty1 = seg(t, D + .3, D + .9), ty2 = seg(t, T.alert + 1, T.alert + 1.25);
  const f1 = t >= D + .1 && t < D + 1.038, f2 = t >= T.alert + .9 && t < T.alert + 1.45;
  $('#ph').className = 'ph' + (f1 || f2 ? ' f' : '');
  $('#phTxt').textContent = f1 ? ('btc 80k'.slice(0, Math.round(7 * ty1)) || 'Message') : f2 ? ('45'.slice(0, Math.round(2 * ty2)) || 'Message') : 'Message';
  $('#phCaret').style.opacity = f1 || f2 ? 1 : 0;
  const sb = $('#sendBtn'), sh = hoverState(sb, t); sb.style.background = (f1 && ty1 > 0) || (f2 && ty2 > 0) ? '#6AB3F3' : '#2B5278'; sb.style.transform = `scale(${1 - sh.pr * .15})`;
  const placing = t >= D + 6.843 && t < D + 7.4, opening = t >= T.perp + 2.942 && t < T.perp + 3.4;
  $('#placeLbl').style.display = placing ? 'none' : 'inline'; $('#placeSp').style.display = placing ? 'inline-flex' : 'none'; $('#b_place').classList.toggle('dk', placing);
  $('#openLbl').style.display = opening ? 'none' : 'inline'; $('#openSp').style.display = opening ? 'inline-flex' : 'none'; $('#b_open').classList.toggle('dk', opening);
  $('#spin1').style.transform = $('#spin2').style.transform = `rotate(${t * 900}deg)`;
  const ad = hoverState($('#a_add'), t); Object.assign($('#a_add').style, { background: ad.hv ? '#EAFF00' : 'transparent', color: ad.hv ? '#12140F' : '', borderRadius: '6px', padding: '1px 4px' });
  vis($('#later'), 0);
  // "later": the phone locks, the clock runs forward, the alert arrives on the lock screen
  vis($('#lock'), E.io(seg(t, T.alert + 2.5, T.alert + 2.85)));
  const clk = Math.round(lerp(61, 144, E.io(seg(t, T.alert + 2.675, T.alert + 3.15)))); $('#lockClk').textContent = `${Math.floor(clk / 60) + 14}:${String(clk % 60).padStart(2, '0')}`;
  const pu = E.o5(seg(t, T.alert + 3.25, T.alert + 3.43)); $('#push').style.transform = `translateY(${(1 - pu) * -140}px)`; vis($('#push'), clamp(pu * 1.5));
}

window.renderAt = renderAt; window.EVENTS = EVENTS.map(e => ({ ...e, t: toV(e.t) })).sort((a, b) => a.t - b.t); window.DUR = DUR;
window.READY = document.fonts.ready.then(() => { renderAt(0); return true; });
