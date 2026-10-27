// GramFi product motion v2 — deterministic timeline. Every visual is a pure function of time `t` (seconds).
// window.renderAt(t) draws the frame; window.EVENTS lists sound/sync events for the audio builder.
// The edit is laid on the music grid: 140 BPM, beat B = 60/140 s. Chapter cuts sit on beats; the
// web → mobile phone flight fills the track's break and lands on its drop (beat 76).
'use strict';
const B = 60 / 140;
const DUR = 61;
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
  ob: u => { const c1 = 1.45, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
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

/* ---------------- GramFi logo (vector, traced from the brand mark) ---------------- */
const SQ = (() => { const p = []; for (let i = 0; i < 360; i += 3) { const a = i * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); p.push(`${(50 + 50 * Math.sign(c) * Math.pow(Math.abs(c), .4)).toFixed(2)},${(50 + 50 * Math.sign(s) * Math.pow(Math.abs(s), .4)).toFixed(2)}`); } return 'M' + p.join(' L') + 'Z'; })();
const ARROW = 'M21.5,38.6 L75.2,24.6 L61.4,79 Q53.4,63 53.6,50.2 L63.4,38.8 L47,48.4 Q31.5,51.5 21.5,38.6 Z';
const MARK = (fill = '#0B0B0B', slit = '#EAFF00') => `<path d="${ARROW}" fill="${fill}" stroke="${fill}" stroke-width="5.5" stroke-linejoin="round"/><path d="M53.6,50.2 L63.4,38.8" stroke="${slit}" stroke-width="2.2" stroke-linecap="round"/><circle cx="40.3" cy="60" r="5.6" fill="${fill}"/>`;
const LOGO = s => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${SQ}" fill="#EAFF00"/>${MARK()}</svg>`;

/* ======================================================================
   TIMELINE (beats)
   ====================================================================== */
const T = { w1: 10 * B, w2: 18 * B, w3: 25 * B, w4: 33 * B, w5: 40 * B, w6: 48 * B, w7: 56 * B, w8: 63 * B, w9: 69 * B,
  D: 76 * B, m2: 92 * B, m3: 102 * B, m4: 110 * B, m5: 121 * B, out: 132 * B };
const EVENTS = [];
const ev = (t, type, extra = {}) => EVENTS.push({ t, type, ...extra });
// background colour per chapter; each change is a circular vector wipe from the click that caused it
const COLS = [
  [0, '#121410'], [T.w1, '#EAFF00'], [T.w2, '#B9A7FF'], [T.w3, '#14171B'], [T.w4, '#8FCBFF'], [T.w5, '#93E6BD'],
  [T.w6, '#101418'], [T.w7, '#FFAE8E'], [T.w8, '#EAFF00'], [T.w9, '#B9A7FF'], [T.D, '#121410'], [T.m2, '#8FCBFF'],
  [T.m3, '#93E6BD'], [T.m4, '#FFAE8E'], [T.m5, '#B9A7FF'], [T.out, '#121410'],
];
const dark = c => { const n = parseInt(c.slice(1), 16); return ((n >> 16) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) < 90; };

/* ======================================================================
   WORLD
   ====================================================================== */
const cam = $('#cam');
// --- vector deco layers: one SVG per chapter, far behind the UI (parallax), drawn on with stroke dashes
const R0 = rng(11);
function decoSVG(kind, light) {
  const st = light ? 'stroke="rgba(18,20,15,.18)"' : 'stroke="rgba(234,255,0,.42)"';
  const fl = light ? 'rgba(255,255,255,.5)' : 'rgba(234,255,0,.85)';
  let h = '';
  const P = (d, w = 3) => { h += `<path class="dp" pathLength="1" d="${d}" fill="none" ${st} stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const C = (x, y, r) => { h += `<circle class="df" cx="${x}" cy="${y}" r="${r}" fill="${fl}"/>`; };
  const rr = (x, y, w, hh, r) => `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + hh - r} Q${x + w},${y + hh} ${x + w - r},${y + hh} H${x + r} Q${x},${y + hh} ${x},${y + hh - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
  const circ = (x, y, r) => `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
  const W = 3600, Hh = 2400;
  if (kind === 'tree') for (let i = 0; i < 14; i++) { const w = 140 + R0() * 380, hh = 100 + R0() * 300, x = R0() * (W - w), y = R0() * (Hh - hh); P(rr(x, y, w, hh, 26), 4); if (i % 3 == 0) C(x + w, y, 9); }
  if (kind === 'arcs') for (let i = 0; i < 6; i++) { const r = 420 + i * 150, a0 = R0() * 6, a1 = a0 + 1.5 + R0() * 2.5; P(`M${1800 + Math.cos(a0) * r},${1200 + Math.sin(a0) * r} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0},1 ${1800 + Math.cos(a1) * r},${1200 + Math.sin(a1) * r}`, 10 + i * 4); }
  if (kind === 'orbit') { for (let i = 0; i < 4; i++) P(`M${1800 - 700 - i * 260},1200 A${700 + i * 260},${170 + i * 70} ${-14 + i * 6} 1,0 ${1800 + 700 + i * 260},1200 A${700 + i * 260},${170 + i * 70} ${-14 + i * 6} 1,0 ${1800 - 700 - i * 260},1200`, 3); for (let i = 0; i < 10; i++) C(300 + R0() * 3000, 200 + R0() * 2000, 6 + R0() * 8); }
  if (kind === 'circles') for (let i = 0; i < 18; i++) { const r = 40 + R0() * 190; P(circ(R0() * W, R0() * Hh, r), 4); }
  if (kind === 'waves') for (let k = 0; k < 4; k++) { let d = ''; for (let x = 0; x <= W; x += 40) d += `${x ? 'L' : 'M'}${x},${1200 + k * 160 - 240 + Math.sin(x / (260 + k * 60) + k) * (120 + k * 30)}`; P(d, 5 - k * .6); }
  if (kind === 'stars') { const pts = []; for (let i = 0; i < 22; i++) pts.push([R0() * W, R0() * Hh]); for (let i = 0; i < pts.length; i++) { const j = (i * 7 + 3) % pts.length; P(`M${pts[i][0]},${pts[i][1]} L${pts[j][0]},${pts[j][1]}`, 2.5); C(pts[i][0], pts[i][1], 8); } }
  if (kind === 'speech') for (let i = 0; i < 12; i++) { const w = 200 + R0() * 260, hh = 90 + R0() * 80, x = R0() * (W - w), y = R0() * (Hh - hh - 60); P(rr(x, y, w, hh, 40) + ` M${x + 40},${y + hh} L${x + 20},${y + hh + 50} L${x + 90},${y + hh}`, 4); }
  if (kind === 'rays') { for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; P(`M${1800 + Math.cos(a) * 380},${1200 + Math.sin(a) * 380} L${1800 + Math.cos(a) * 1500},${1200 + Math.sin(a) * 1500}`, 6); } for (let i = 0; i < 8; i++) { const x = R0() * W, y = R0() * Hh, r = 40 + R0() * 30; let d = ''; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 - 1.57, rr2 = k % 2 ? r * .45 : r; d += `${k ? 'L' : 'M'}${x + Math.cos(a) * rr2},${y + Math.sin(a) * rr2}`; } P(d + 'Z', 4); } }
  if (kind === 'trail') { P('M200,2100 C900,1500 900,500 1800,900 S3000,1500 3400,300', 6); for (let i = 0; i < 12; i++) C(200 + i * 280, 400 + R0() * 1600, 7); }
  if (kind === 'coins') for (let i = 0; i < 14; i++) { const x = R0() * W, y = R0() * Hh, r = 50 + R0() * 90; P(circ(x, y, r), 5); P(circ(x, y, r * .7), 3); }
  if (kind === 'chev') for (let i = 0; i < 16; i++) { const x = R0() * W, y = R0() * Hh, s = 50 + R0() * 60; P(`M${x},${y} L${x + s},${y + s} L${x},${y + 2 * s} M${x + s * .8},${y} L${x + s * 1.8},${y + s} L${x + s * .8},${y + 2 * s}`, 7); }
  if (kind === 'gears') for (let i = 0; i < 7; i++) { const x = R0() * W, y = R0() * Hh, r = 90 + R0() * 130, n = 10; let d = ''; for (let k = 0; k <= n * 4; k++) { const a = k / (n * 4) * 6.283, rr2 = (k % 4 < 2) ? r : r * .82; d += `${k ? 'L' : 'M'}${x + Math.cos(a) * rr2},${y + Math.sin(a) * rr2}`; } P(d, 5); P(circ(x, y, r * .35), 5); }
  if (kind === 'candles') { let y = 1700; for (let i = 0; i < 22; i++) { const x = 160 + i * 150, up = R0() > .35, hh = 80 + R0() * 220; y += up ? -60 - R0() * 40 : 40 + R0() * 30; P(rr(x, y - hh / 2, 70, hh, 10), 5); P(`M${x + 35},${y - hh / 2 - 60} V${y - hh / 2} M${x + 35},${y + hh / 2} V${y + hh / 2 + 60}`, 5); } }
  if (kind === 'rings') for (let i = 0; i < 7; i++) P(circ(1800, 1200, 300 + i * 170), 6 - i * .5);
  return `<svg class="deco" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">${h}</svg>`;
}
const DECO = [
  [T.w1, T.w2, 'tree'], [T.w2, T.w3, 'arcs'], [T.w3, T.w4, 'orbit'], [T.w4, T.w5, 'circles'], [T.w5, T.w6, 'waves'], [T.w6, T.w7, 'stars'],
  [T.w7, T.w8, 'speech'], [T.w8, T.w9, 'rays'], [T.w9, T.D, 'trail'], [T.D, T.m2, 'coins'], [T.m2, T.m3, 'chev'], [T.m3, T.m4, 'gears'],
  [T.m4, T.m5, 'candles'], [T.m5, T.out, 'rings'], [T.out, DUR + 1, 'rings'],
].map(([a, b, k]) => {
  const col = COLS.find(c => Math.abs(c[0] - a) < 1e-6)[1];
  const el = H(`<div class="w">${decoSVG(k, !dark(col))}</div>`); cam.appendChild(el);
  return { a, b, k, el, svg: el.firstElementChild, paths: $$('.dp', el), dots: $$('.df', el) };
});

// --- environment: chat bubbles in depth
const BUBS = [['$BTC to 90k? 👀', ''], ['gm ☀️', ''], ['<b>$PUMP</b> +18% mentions', 'g'], ['who is buying CAP?', ''], ['ETH breakout 🔥', 'l'],
  ['<b>$SUI</b> trending in KR', ''], ['wen airdrop', ''], ['📈 RAY −0.9%', 'r'], ['narrative: Layer 1', ''], ['🐋 whale alert', 'l'],
  ['Polymarket: YES 43¢', 'g'], ['copy sharp_sports?', ''], ['long BTC ×3', 'l'], ['<b>$QUACK</b> +7.7%', 'g'], ['info-fi 🧠', 'l'],
  ['TON community 💎', ''], ['DeFi mindshare 7.2%', ''], ['Telegram alpha 🔑', 'g'], ['GM from Vietnam 🇻🇳', ''], ['ser, chart?', '']];
const R = rng(7);
const bubs = BUBS.map(([txt, cls]) => {
  const el = H(`<div class="w"><div class="bub ${cls}">${txt}</div></div>`); cam.appendChild(el);
  const ang = R() * 6.283, rad = 700 + R() * 1200;
  return { el, x: Math.cos(ang) * rad * 1.25, y: Math.sin(ang) * rad * .72, z: -2200 + R() * 3300, ph: R() * 6.28, sp: .25 + R() * .4, s: .9 + R() * .5 };
});

/* ---------------- BROWSER ---------------- */
const IC = {
  pop: '<rect x="2" y="2" width="10" height="10" rx="2" fill="#12140F"/>', narr: '<circle cx="7" cy="7" r="5" fill="none" stroke="#12140F" stroke-width="2.5" stroke-dasharray="20 12"/>',
  ctry: '<circle cx="7" cy="7" r="5.5" fill="none" stroke="#12140F" stroke-width="1.6"/><path d="M1.5 7h11M7 1.5c-3 3-3 8 0 11c3-3 3-8 0-11" fill="none" stroke="#12140F" stroke-width="1.4"/>',
  bub: '<circle cx="5" cy="8" r="3.5" fill="#12140F"/><circle cx="10" cy="4.5" r="2.5" fill="#12140F"/>', corr: '<path d="M1 10 L4 6 L7 8 L13 2" fill="none" stroke="#12140F" stroke-width="2" stroke-linecap="round"/>',
  map: '<circle cx="3" cy="3" r="2" fill="#12140F"/><circle cx="11" cy="5" r="2" fill="#12140F"/><circle cx="6" cy="11" r="2" fill="#12140F"/><path d="M3 3L11 5L6 11Z" fill="none" stroke="#12140F" stroke-width="1.2"/>',
  feed: '<path d="M2 3h10M2 7h10M2 11h6" stroke="#12140F" stroke-width="2" stroke-linecap="round"/>', top: '<path d="M2 12V7h3v5M6 12V3h3v9M10 12V5h3v7" fill="#12140F"/>',
};
const SIDE = [['sb_pop', 'Most Popular Coin', 'pop'], ['sb_narr', 'Narrative Mindshare', 'narr'], ['sb_ctry', 'Country Popular Coins', 'ctry'], ['sb_bub', 'Crypto Bubbles', 'bub'],
  ['sb_corr', 'Correlation', 'corr'], ['sb_map', 'Channel Map', 'map'], ['sb_feed', 'Telegram Feeds', 'feed'], ['sb_top', 'Top 10 Channels', 'top']];
const browser = H(`<div class="w"><div id="browser">
  <div class="bbar"><span class="dot" style="background:#FF6058"></span><span class="dot" style="background:#FFBD2E"></span><span class="dot" style="background:#28C941"></span><div class="url mono" id="url"></div></div>
  <div class="nav"><div class="logo">${LOGO(32)}GramFi</div>
    <span class="it on" id="nav_insight">Insight</span><span class="it" id="nav_poly">Polymarket</span><span class="it">Airdrops</span><span class="it">Voting</span><span class="it">About</span>
    <span class="gp">100 GP</span><span class="me"><span class="av"></span>My Page</span></div>
  <div class="side"><div class="h">INSIGHT · KOL</div>${SIDE.map(([id, n, ic]) => `<div class="s" id="${id}"><i><svg viewBox="0 0 14 14">${IC[ic]}</svg></i>${n}</div>`).join('')}</div>
  <div class="content" id="content"></div>
</div></div>`);
cam.appendChild(browser);
const content = $('#content');
const PAGES = [];
const addPage = (el, a, b, url, sb) => { content.appendChild(el); PAGES.push({ el, a, b, url, sb }); return el; };

// ---- P1 Most Popular Coin (treemap)
const COINS = [
  ['Cap', 'C', '$0.0956', -4.1, -6.3, 30, 17, 12.2, 9.7], ['Pump.fun', 'P', '$0.004141', -1.1, 3.9, 14, 27, 6.1, 18.4], ['Raydium', 'R', '$1.79', -0.9, -0.9, 9, 8, 4.0, 3.6],
  ['Re', 'R', '$0.3650', 2.1, 1.4, 6, 4, 2.6, 1.9], ['Irys', 'I', '$0.0272', 4.3, 2.0, 5, 6, 2.3, 2.6], ['0x Protocol', '0', '$0.1024', 3.5, 1.1, 5, 3, 2.2, 1.4],
  ['Sui', 'S', '$0.9044', 2.2, 4.8, 4.5, 7, 2.0, 3.1], ['Gram', 'G', '$1.21', -1.3, 0.6, 4.5, 3.5, 2.0, 1.5], ['Ritual', 'R', '$0.0243', -8.1, -3.0, 4, 2.5, 1.9, 1.1],
  ['Quant', 'Q', '$200.01', 1.2, 0.8, 3.5, 2.5, 1.6, 1.1], ['SoSoValue', 'S', '$0.3090', 3.4, 2.6, 3.5, 3, 1.5, 1.3], ['Monad', 'M', '$0.0214', -2.2, 6.4, 3, 6, 1.3, 2.7],
  ['Quack AI', 'Q', '$0.1312', 7.7, 9.6, 3, 9, 1.3, 4.0], ['Aster', 'A', '$0.7056', 5.1, 4.1, 3, 5, 1.2, 2.2], ['Meteora', 'M', '$0.3120', 2.6, -1.2, 2.5, 2, 1.1, .9],
  ['Ondo', 'O', '$0.4064', 1.2, 0.5, 2.5, 2, 1.0, .9], ['Uniswap', 'U', '$7.02', 0.4, -0.7, 2, 2, .9, .8], ['Pepe', 'P', '$0.0000092', -2.1, 1.7, 2, 3, .8, 1.3],
];
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
const L1 = squarify(COINS.map(c => ({ name: c[0], v: c[5] })).sort((a, b) => b.v - a.v), 0, 0, 800, 620);
const L24 = squarify(COINS.map(c => ({ name: c[0], v: c[6] })).sort((a, b) => b.v - a.v), 0, 0, 800, 620);
const pg_tm = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Most Popular Coin <span style="color:var(--muted);font-weight:600">(Alt)</span></h2>
   <div class="tabs"><span class="tab on" id="tab1">1H</span><span class="tab" id="tab24">24H</span><span class="tab">7D</span><span class="tab">30D</span></div>
   <span class="pill">Exclude Top 20 ✓</span><span class="pill" style="margin-left:auto">Telegram mentions · Global</span></div>
  <div id="tm"></div>
  <div class="list" id="movers" style="left:852px;top:84px;width:334px;height:620px"><div class="hd" style="grid-template-columns:1.5fr .8fr .8fr"><span>Top Movers</span><span>Share</span><span>24H</span></div></div>
</div>`), -1, T.w2, 'insight?tab=popular', 'sb_pop');
const tmEl = $('#tm', pg_tm);
const tiles = COINS.map(c => { const el = H(`<div class="tile" id="tile_${c[0].replace(/[^a-z0-9]/gi, '')}"><div class="n"><i>${c[1]}</i>${c[0]}</div><div class="p">${c[2]}</div><div class="c"></div></div>`); tmEl.appendChild(el); return { c, el, cEl: $('.c', el) }; });
const tmTip = H(`<div class="tip" style="width:290px"><div style="font-weight:700;font-size:16px;margin-bottom:8px">Pump.fun · PUMP</div><div class="k">Telegram mention share · 24H</div><div class="v">18.4%</div>
  <div style="display:flex;justify-content:space-between;margin-top:8px"><span class="k">vs 1H window</span><b style="color:#7CE0A6">+12.3 pts</b></div></div>`);
tmEl.appendChild(tmTip);
const MOV = COINS.slice(0, 13), ord1 = [...MOV].sort((a, b) => b[7] - a[7]).map(c => c[0]), ord24 = [...MOV].sort((a, b) => b[8] - a[8]).map(c => c[0]);
const moverRows = MOV.map(c => { const el = H(`<div class="row" style="grid-template-columns:1.5fr .8fr .8fr"><b>${c[0]}</b><span class="mono sh"></span><span class="mono ch"></span></div>`); $('#movers', pg_tm).appendChild(el); return { c, el, sh: $('.sh', el), ch: $('.ch', el) }; });

// ---- P2 Narrative Mindshare (vector donut)
const NARR = [['Layer 1 Protocols', 30.8, '#12140F', 1.2], ['Other', 15.2, '#C9CEC0', -.4], ['DEX', 11.5, '#8FCBFF', 2.4], ['Payment', 9.4, '#B9A7FF', .6], ['DeFi', 7.2, '#93E6BD', 1.1],
  ['Stablecoins', 3.8, '#FFD66B', -.3], ['Social & Community', 3.6, '#FFAE8E', .9], ['Meme', 3.3, '#EAFF00', 1.7], ['Privacy', 3.2, '#5B8DEF', -.2], ['RWA', 2.4, '#3FBF8F', .5], ['Layer 2', 1.9, '#EF6B9B', -.6], ['AI Agents', 7.7, '#F0A24A', 2.0]];
const pg_narr = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Narrative Mindshare</h2><div class="tabs"><span class="tab">1H</span><span class="tab on">24H</span><span class="tab">7D</span></div><span class="pill" style="margin-left:auto">Share of Telegram crypto talk</span></div>
  <svg id="donut" width="560" height="600" style="position:absolute;left:20px;top:84px"></svg>
  <div id="dnC" style="position:absolute;left:20px;top:84px;width:560px;height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none">
   <div id="dnK" style="font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.08em">MINDSHARE · 24H</div><div id="dnV" style="font-family:Unbounded;font-weight:800;font-size:56px;margin:4px 0"></div><div id="dnS" style="font-size:15px;font-weight:600"></div></div>
  <div class="anc" id="dexAnc"></div>
  <div class="list" id="narrList" style="left:610px;top:84px;width:576px;height:620px"><div class="hd" style="grid-template-columns:1.6fr 2fr .7fr .7fr"><span>Narrative</span><span>Share</span><span></span><span>24H</span></div></div>
</div>`), T.w2, T.w3, 'insight?tab=narrative', 'sb_narr');
const donut = $('#donut', pg_narr);
const narrSegs = []; { let acc = 0; const tot = NARR.reduce((s, n) => s + n[1], 0); NARR.forEach(n => { const a0 = acc / tot * 360, a1 = (acc + n[1]) / tot * 360; acc += n[1]; narrSegs.push({ n, a0, a1, p: S('path', { fill: n[2], stroke: '#fff', 'stroke-width': 3 }, donut) }); }); }
function arcPath(cx, cy, r0, r1, a0, a1) {
  if (a1 - a0 < .05) return '';
  const rad = a => (a - 90) * Math.PI / 180, L = a1 - a0 > 180 ? 1 : 0;
  const p = (r, a) => `${cx + r * Math.cos(rad(a))},${cy + r * Math.sin(rad(a))}`;
  return `M${p(r1, a0)} A${r1},${r1} 0 ${L},1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 ${L},0 ${p(r0, a0)} Z`;
}
const narrRows = NARR.slice(0, 11).map((n, i) => { const el = H(`<div class="row" style="grid-template-columns:1.6fr 2fr .7fr .7fr;top:${44 + i * 51}px;height:48px"><b style="display:flex;gap:8px;align-items:center"><i style="width:10px;height:10px;border-radius:3px;background:${n[2]};outline:1px solid rgba(0,0,0,.1)"></i>${n[0]}</b><span><div class="bar" style="background:${n[2]};outline:1px solid rgba(0,0,0,.06)"></div></span><span class="mono" style="font-weight:700">${n[1]}%</span><span class="mono ${n[3] >= 0 ? 'up' : 'dn'}">${n[3] >= 0 ? '+' : ''}${n[3]}</span></div>`); $('#narrList', pg_narr).appendChild(el); return { el, bar: $('.bar', el), n }; });
{ const dx = narrSegs[2], m = (dx.a0 + dx.a1) / 2 - 90, a = m * Math.PI / 180; const anc = $('#dexAnc', pg_narr); anc.style.left = (20 + 280 + Math.cos(a) * 205) + 'px'; anc.style.top = (84 + 300 + Math.sin(a) * 205) + 'px'; }

// ---- P3 Country Popular Coins (dot-matrix globe)
const CTRY = [['kr', 'South Korea', 37, 127.5, 4.5, '#EF6B9B'], ['vn', 'Vietnam', 16, 106.5, 5, '#F0A24A'], ['ir', 'Iran', 32, 54, 7, '#3FBF8F'], ['id', 'Indonesia', -2, 117, 8, '#D9B52C'],
  ['ru', 'Russia', 60, 90, 17, '#9B6BEF'], ['us', 'United States', 39, -98, 14, '#5B8DEF'], ['tr', 'Türkiye', 39, 35, 4.5, '#E5484D'], ['br', 'Brazil', -10, -52, 12, '#17A45E']];
const pg_ctry = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Country Popular Coins</h2><span class="pill">Global</span><span class="pill" style="margin-left:auto">Where each coin is talked about</span></div>
  <canvas id="globe" width="1240" height="1240" style="position:absolute;left:30px;top:76px;width:620px;height:620px"></canvas>
  <div class="card" style="position:absolute;left:690px;top:84px;width:496px;height:620px;padding:20px">
   <div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin-bottom:12px">SELECT A COUNTRY</div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">${CTRY.map(c => `<div class="cchip" id="c_${c[0]}"><i style="background:${c[5]}"></i>${c[1]}</div>`).join('')}</div>
   <div id="ctryRes" style="margin-top:14px;border-top:1px solid var(--line);padding-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><b style="font-size:18px">🇰🇷 South Korea · top coins</b><span class="pill">24H</span></div>
    ${[['XRP', 24, '#12140F'], ['BTC', 19, '#F7931A'], ['SUI', 11, '#5B8DEF'], ['DOGE', 8, '#D9B52C'], ['ONDO', 6, '#3FBF8F']].map(([c, v, col]) => `<div class="crow"><b>${c}</b><div class="bar cbar" data-v="${v}" style="background:${col}"></div><span class="mono">${v}%</span></div>`).join('')}
   </div></div>
</div>`), T.w3, T.w4, 'insight?tab=country', 'sb_ctry');
const gctx = $('#globe', pg_ctry).getContext('2d');
const LAND = [[48, -100, 22, 38], [65, -150, 8, 25], [20, -100, 10, 14], [72, -42, 10, 18], [-15, -60, 22, 15], [-40, -68, 13, 7], [52, 15, 12, 22], [63, 15, 7, 10], [8, 20, 22, 22], [-20, 25, 15, 14],
  [28, 45, 10, 14], [60, 95, 13, 60], [38, 100, 15, 35], [22, 78, 10, 9], [15, 103, 7, 7], [-3, 115, 5, 18], [36, 138, 6, 3], [37, 127.5, 3, 2.5], [-25, 134, 11, 17], [68, 100, 8, 55]];
const GDOTS = [];
for (let la = -78; la <= 80; la += 2.3) { const step = 2.3 / Math.max(.2, Math.cos(la * Math.PI / 180)); for (let lo = -180; lo < 180; lo += step) {
  const land = LAND.some(([a, b, ra, rb]) => { let d = lo - b; d = ((d + 540) % 360) - 180; return (Math.pow((la - a) / ra, 2) + Math.pow(d / rb, 2)) < 1; });
  if (!land) continue; let c = null; for (const k of CTRY) { let d = lo - k[3]; d = ((d + 540) % 360) - 180; if (Math.hypot(la - k[2], d * Math.cos(la * Math.PI / 180)) < k[4]) c = k[5]; }
  GDOTS.push([la, lo, c]); } }

// ---- P4 Crypto Bubbles
const BUBD = [['MORPHO', 8.58], ['NIGHT', 8.0], ['DASH', 6.49], ['ETHFI', 5.49], ['SKY', -5.4], ['VET', -4.6], ['XDC', 4.62], ['ZRO', -3.56], ['SPX', 3.4], ['STRK', 3.33], ['INJ', 3.14], ['PEPE', -2.97],
  ['PENGU', -2.8], ['ENA', 2.8], ['TRUMP', 2.6], ['CC', -2.3], ['ATOM', -2.2], ['SUI', 2.1], ['ONDO', 1.9], ['AAVE', -1.7], ['SOL', -1.4], ['HYPE', 1.2], ['TON', -1.1], ['ETH', 1.1], ['DOGE', -.9], ['BTC', .8], ['XRP', .6], ['LINK', .4]];
const pg_bub = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Crypto Bubbles</h2><div class="tabs"><span class="tab">1H</span><span class="tab on">24H</span><span class="tab">7D</span></div><span class="pill" style="margin-left:auto">Size = 24H move · colour = direction</span></div>
  <svg id="bubs" width="1156" height="630" style="position:absolute;left:30px;top:78px;overflow:visible"><defs>
   <radialGradient id="gG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#F2FFF6"/><stop offset="1" stop-color="#9FE3BC"/></radialGradient>
   <radialGradient id="gR" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFF4F2"/><stop offset="1" stop-color="#F7A9A3"/></radialGradient></defs></svg>
  <div class="anc" id="morphoAnc"></div>
  <div class="tip" id="bubTip" style="width:280px"><div style="font-weight:800;font-size:18px">MORPHO</div><div class="k" style="margin-top:6px">24H change</div><div class="v">+8.58%</div><div class="k" style="margin-top:6px">Telegram mentions <b style="color:#7CE0A6">↑ 3.1×</b></div></div>
</div>`), T.w4, T.w5, 'insight?tab=cryptobubbles', 'sb_bub');
const bsvg = $('#bubs', pg_bub);
const BR = rng(5), BP = BUBD.map(([n, v]) => ({ n, v, r: 26 + Math.pow(Math.abs(v), .9) * 13.5, x: 80 + BR() * 1000, y: 60 + BR() * 510 }));
for (let it = 0; it < 400; it++) { for (let i = 0; i < BP.length; i++) for (let j = i + 1; j < BP.length; j++) { const a = BP[i], b = BP[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, m = a.r + b.r + 8; if (d < m) { const k = (m - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; } }
  BP.forEach(p => { p.x = clamp(p.x, p.r + 4, 1152 - p.r); p.y = clamp(p.y, p.r + 4, 626 - p.r); p.x += (578 - p.x) * .004; p.y += (315 - p.y) * .004; }); }
BP.forEach((p, i) => { p.g = S('g', {}, bsvg); S('circle', { r: p.r, fill: `url(#${p.v >= 0 ? 'gG' : 'gR'})`, stroke: p.v >= 0 ? '#17A45E' : '#E5484D', 'stroke-width': 3 }, p.g);
  const t1 = S('text', { 'text-anchor': 'middle', y: -2, 'font-family': 'Inter', 'font-weight': 800, 'font-size': Math.max(11, p.r * .32), fill: '#12140F' }, p.g); t1.textContent = p.n;
  const t2 = S('text', { 'text-anchor': 'middle', y: Math.max(11, p.r * .32) + 2, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': Math.max(10, p.r * .25), fill: p.v >= 0 ? '#0E7A43' : '#B42F33' }, p.g); t2.textContent = (p.v >= 0 ? '+' : '') + p.v.toFixed(2) + '%'; });
{ const m = BP[0], a = $('#morphoAnc', pg_bub); a.style.left = (30 + m.x) + 'px'; a.style.top = (78 + m.y) + 'px'; }

// ---- P5 Correlation analysis
const pg_corr = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Correlation analysis</h2><span class="pill" style="background:#FFF3D6;border-color:#F5DFA6">₿ Bitcoin</span>
   <div class="tabs"><span class="tab">7D</span><span class="tab on" id="tab30">30D</span><span class="tab" id="tab90">90D</span><span class="tab">180D</span><span class="tab">1Y</span></div></div>
  <div class="kpis">
   <div class="kpi"><div class="k">Latest BTC close</div><div class="v" id="k0">$80,010</div><div class="s">end of window</div></div>
   <div class="kpi"><div class="k">Period price change</div><div class="v dn" id="k1"></div><div class="s">visible period</div></div>
   <div class="kpi"><div class="k">BTC Telegram mentions</div><div class="v" id="k2"></div><div class="s">tracked channels</div></div>
   <div class="kpi"><div class="k">Price × attention</div><div class="v" id="k3"></div><div class="s">weak negative</div></div>
   <div class="kpi"><div class="k">Same-day reaction</div><div class="v" id="k4"></div><div class="s">return vs attention</div></div>
   <div class="kpi"><div class="k">Price leads</div><div class="v" id="k5"></div><div class="s">return vs next-day</div></div></div>
  <div class="card" id="chartCard"><div style="font-weight:700;font-size:15px">BTC price vs Telegram attention</div><div style="font-size:12px;color:var(--muted);margin-top:2px" id="cs"></div>
   <div style="position:absolute;right:18px;top:16px;display:flex;gap:8px"><span class="pill"><b>━</b> BTC</span><span class="pill"><b style="color:#5AA9E6">▮</b> Mentions</span></div>
   <svg id="chart" width="1120" height="420" style="position:absolute;left:20px;top:80px"></svg>
   <div class="tip" id="chartTip"><div class="k">Oct 3 · daily</div><div><b class="mono" style="color:var(--lime)">1,450</b> mentions</div><div>BTC <b class="mono" style="color:var(--lime)">$86,400</b></div></div></div>
</div>`), T.w5, T.w6, 'insight?tab=correlationanalysis', 'sb_corr');
const NB = 46, svg = $('#chart', pg_corr), datA = [], datB = [], prA = [], prB = [];
for (let i = 0; i < NB; i++) {
  datA.push(.25 + .2 * Math.sin(i * .7) + .15 * Math.sin(i * 1.9 + 1) + .1 * Math.sin(i * .21));
  datB.push(clamp(.3 + .28 * Math.sin(i * .43 + .5) * Math.sin(i * .11 + .3) + .22 * Math.abs(Math.sin(i * 1.37)) + (i > 26 && i < 34 ? .3 : 0), .08, .98));
  prA.push(.55 + .12 * Math.sin(i * .3) + .05 * Math.sin(i * 1.3)); prB.push(.45 + .25 * Math.sin(i * .16 + 1.2) + .08 * Math.sin(i * .9) - i * .004);
}
for (let g = 0; g < 5; g++) S('line', { x1: 0, x2: 1120, y1: 20 + g * 95, y2: 20 + g * 95, stroke: '#EEF0E9' }, svg);
const bars = []; for (let i = 0; i < NB; i++) bars.push(S('rect', { id: 'bar' + i, x: 8 + i * 24.2, width: 15, rx: 4, fill: '#9CCDF2' }, svg));
const pline = S('path', { fill: 'none', stroke: '#12140F', 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
const pdot = S('circle', { r: 8, fill: '#EAFF00', stroke: '#12140F', 'stroke-width': 3 }, svg);
const vline = S('line', { y1: 10, y2: 410, stroke: '#12140F', 'stroke-dasharray': '4 5' }, svg);
const linePath = pr => pr.map((v, i) => `${i ? 'L' : 'M'}${15.5 + i * 24.2},${400 - v * 360}`).join(' ');

// ---- P6 Channel map
const pg_map = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Channel Map</h2><span class="pill">Forwarding network · 90D</span>
   <div style="display:flex;gap:8px;margin-left:auto"><div class="inp" id="mapInp"><span id="mapTxt">Search channel name</span><span class="caret" id="caret"></span></div><div class="btn" id="mapBtn">Search</div></div></div>
  <div style="position:absolute;left:30px;top:84px;width:1156px;height:620px;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#FBFCF8">
   <canvas id="map" width="2312" height="1240" style="width:1156px;height:620px"></canvas>
   <div class="legend"><span><i style="background:#5B8DEF"></i>EN</span><span><i style="background:#9B6BEF"></i>RU</span><span><i style="background:#EF6B9B"></i>KR</span><span><i style="background:#F0A24A"></i>VN</span><span><i style="background:#3FBF8F"></i>IR</span><span><i style="background:#D9B52C"></i>ID</span></div>
   <div class="minfo" id="mapInfo"><div style="display:flex;gap:10px;align-items:center;font-weight:700;font-size:16px"><span class="av" style="width:34px;height:34px;background:linear-gradient(135deg,#5B8DEF,#9CCDF2)"></span>Activity News<span class="yn y" style="margin-left:auto">A</span></div>
    <div class="g"><div><span>Subscribers</span><b>4,153,639</b></div><div><span>Points</span><b>93,710</b></div><div><span>Forwarded by</span><b>16 ch.</b></div><div><span>Reach</span><b>5 regions</b></div></div></div></div>
</div>`), T.w6, T.w7, 'insight?tab=channelmap', 'sb_map');
const mctx = $('#map', pg_map).getContext('2d');
const CL = [['#5B8DEF', 360, 300, 170], ['#9B6BEF', 760, 210, 150], ['#EF6B9B', 900, 470, 120], ['#F0A24A', 560, 500, 120], ['#3FBF8F', 180, 480, 110], ['#D9B52C', 1000, 120, 90]];
const MR = rng(42), NODES = [], EDGES = [];
CL.forEach(([col, cx, cy, sp], ci) => { const n = [70, 55, 40, 40, 35, 25][ci]; for (let k = 0; k < n; k++) { const a = MR() * 6.283, r = Math.pow(MR(), .7) * sp; NODES.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .8, c: col, ci, r: 2.5 + Math.pow(MR(), 3) * 9 }); } });
const TGT = 3; NODES[TGT].x = 430; NODES[TGT].y = 300; NODES[TGT].r = 14;
for (let i = 0; i < NODES.length; i++) for (let k = 0; k < 2; k++) { const j = Math.floor(MR() * NODES.length); if (NODES[j].ci === NODES[i].ci || MR() < .25) EDGES.push([i, j]); }
const HE = []; { const pick = rng(9); while (HE.length < 16) { const j = Math.floor(pick() * NODES.length); if (j !== TGT && !HE.includes(j)) HE.push(j); } HE.sort((a, b) => Math.hypot(NODES[a].x - 430, NODES[a].y - 300) - Math.hypot(NODES[b].x - 430, NODES[b].y - 300)); }

// ---- P7 Telegram feeds + Telescope
const POSTS = [['Whales Crypto Guide', '#5B8DEF', '🐋 Large <span class="tag t">$BTC</span> transfer to an exchange — 2,400 BTC moved in the last hour', 1],
  ['Crypto Insider KR', '#EF6B9B', '<span class="tag">$SUI</span> ecosystem TVL at a new high, Korean volume +38% today', 0],
  ['Trade Nobody', '#12140F', '<span class="tag t">$BTC</span> reclaiming 86k — next resistance 90k? Polymarket says 43% YES', 1],
  ['Airdrop Hidden Gems', '#F0A24A', 'New points campaign is live — farm before the snapshot 🎯', 0],
  ['Activity News', '#3FBF8F', '<span class="tag">$ETH</span> ETF flows positive for the 5th day in a row', 0],
  ['Market Twits', '#9B6BEF', '<span class="tag t">$BTC</span> dominance 58.2% — alts still lagging behind', 1],
  ['Tonfan Trade', '#D9B52C', '<span class="tag">$TON</span> community vote ends tomorrow 💎', 0]];
const pg_feed = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Telegram Feeds</h2><span class="pill" id="feedCnt">Live · all channels</span></div>
  <div id="feed" style="position:absolute;left:30px;top:84px;width:690px;height:640px;overflow:hidden"></div>
  <div class="card" style="position:absolute;left:744px;top:84px;width:442px;height:620px;padding:18px">
   <div style="display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;margin-bottom:14px">🔭 Telescope</div>
   <div style="display:flex;gap:8px"><div class="inp" id="tsInp" style="width:290px"><span id="tsTxt">Search coin (e.g. BTC)</span><span class="caret" id="tsCaret"></span></div><div class="btn" id="tsBtn">Search</div></div>
   <div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin:18px 0 10px">TOP MARKETCAP</div>
   <div>${[['BTC', '#F7931A'], ['ETH', '#627EEA'], ['USDT', '#26A17B'], ['XRP', '#12140F'], ['BNB', '#F0B90B'], ['SOL', '#14C08A'], ['USDC', '#2775CA'], ['DOGE', '#C2A633'], ['TRX', '#E5484D']].map(([c, col]) => `<span class="chipc"><i style="background:${col}">${c[0]}</i>${c}</span>`).join('')}</div>
   <div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin:10px 0 10px">TRENDING 🔥</div>
   <div>${[['CAP', '#E5484D'], ['PUMP', '#17A45E'], ['OKB', '#12140F'], ['QUACK', '#D9B52C'], ['SUI', '#5B8DEF'], ['ASTER', '#9B6BEF'], ['MON', '#7A5AF8']].map(([c, col]) => `<span class="chipc"><i style="background:${col}">${c[0]}</i>${c}</span>`).join('')}</div>
   <div id="tsRes" style="margin-top:12px;background:var(--ink);color:#fff;border-radius:14px;padding:14px 16px"><div style="font-size:12px;color:#A7AD9F">$BTC · last hour</div><div style="font-family:Unbounded;font-weight:700;font-size:26px;color:var(--lime)">1,284 mentions</div><div style="font-size:12px;color:#A7AD9F">across 312 channels</div></div>
  </div>
</div>`), T.w7, T.w8, 'insight?tab=telegramfeeds', 'sb_feed');
const feedEls = POSTS.map(([n, col, txt, btc], i) => { const el = H(`<div class="post"><div class="pa" style="background:${col}">${n[0]}</div><div><div class="pn">${n}<span>${2 + i * 3}m ago</span></div><div class="pt">${txt}</div></div></div>`); $('#feed', pg_feed).appendChild(el); return { el, btc, tags: $$('.tag.t', el) }; });

// ---- P8 Top 10 channels (podium)
const TOP = [['Tonfan', 80909], ['Activity News', 27119], ['Tonfan 中文', 12008], ['CRYPTORJ', 11576], ['My Proxy', 10207], ['Airdrop Ninja', 10190], ['Dark Crypto', 9555], ['GEMHUNT', 9457], ['Coin Haonoto', 9192], ['Moon Vibes', 8284]];
const pg_top = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Top 10 Channels</h2><span class="pill">Global</span><span class="pill" style="margin-left:auto">Sort by · recent avg. views</span></div>
  <svg id="crown" width="300" height="200" style="position:absolute;left:428px;top:40px;overflow:visible"></svg>
  <div id="pods"></div>
  <div style="position:absolute;left:30px;right:30px;bottom:18px;height:58px;overflow:hidden"><div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin-bottom:6px">POPULAR CHANNELS</div><div id="strip" style="display:flex;gap:8px;white-space:nowrap"></div></div>
</div>`), T.w8, T.w9, 'insight?tab=top10', 'sb_top');
const ROWX = [[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]];
const pods = []; ROWX.forEach((row, ri) => row.forEach((k, j) => { const [n, v] = TOP[k - 1]; const x = 608 - (row.length * 250 + (row.length - 1) * 16) / 2 + j * 266, y = 150 + ri * 118;
  const el = H(`<div class="pod ${k === 1 ? 'first' : ''}" ${k === 1 ? 'id="pod1"' : ''} style="left:${x}px;top:${y}px"><div class="r">#${k}</div><div class="nm"><span class="av" style="width:30px;height:30px;background:${['#5B8DEF', '#3FBF8F', '#EF6B9B', '#F0A24A', '#9B6BEF', '#D9B52C', '#12140F', '#E5484D', '#17A45E', '#8FCBFF'][k - 1]}"></span>${n}</div><div class="k">RECENT AVG. VIEWS</div><div class="v">0</div></div>`);
  $('#pods', pg_top).appendChild(el); pods.push({ el, v, k, ri, j, vEl: $('.v', el) }); }));
{ const strip = $('#strip', pg_top); const sr = rng(3); for (let i = 0; i < 60; i++) strip.appendChild(H(`<span style="width:34px;height:34px;border-radius:50%;flex:none;display:inline-block;background:hsl(${Math.floor(sr() * 360)},65%,${55 + sr() * 20}%)"></span>`)); }
{ const cr = $('#crown', pg_top); const g = S('g', { id: 'crownRays' }, cr); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; S('line', { x1: 150 + Math.cos(a) * 46, y1: 92 + Math.sin(a) * 46, x2: 150 + Math.cos(a) * 90, y2: 92 + Math.sin(a) * 90, stroke: '#EAFF00', 'stroke-width': 6, 'stroke-linecap': 'round' }, g); }
  S('path', { id: 'crownP', d: 'M118,108 L112,72 L134,88 L150,62 L166,88 L188,72 L182,108 Z', fill: '#EAFF00', stroke: '#12140F', 'stroke-width': 4, 'stroke-linejoin': 'round' }, cr); }

// ---- P9 GramFi-Polymarket
const MK = [['Bitcoin (BTC)', '₿', '#F7931A', [['BTC above $150k by June 30, 2027?', 3], ['BTC all time high by March 31, 2027?', 12], ['Will BTC close above $90k on Friday?', 43]]],
  ['Ethereum (ETH)', 'Ξ', '#627EEA', [['ETH reach $5,000 by Dec 31, 2026?', 9], ['ETH all time high by Dec 31, 2026?', 7], ['ETH above $4k on Friday?', 38]]],
  ['Solana (SOL)', 'S', '#14C08A', [['SOL all time high by June 30, 2027?', 11], ['SOL reach $500 by Dec 31, 2026?', 4], ['SOL above $200 on Friday?', 46]]]];
const pg_poly = addPage(H(`<div class="page">
  <div class="hero"><div><div class="kick">TELEGRAM NATIVE PREDICTION MARKETS</div><h1>Bet on Polymarket directly through Telegram.</h1>
    <p>GramFi turns market discovery, wallet readiness, portfolio checks and copy trading into a simple Telegram bot flow — without leaving the chat.</p>
    <div id="tgBtn">${LOGO(28)}<span id="tgLbl">GramFi-Polymarket TG Bot</span><span>↗</span></div></div>
   <div class="stats"><div class="stat"><div class="k">Polymarket</div><div class="v" id="s0"></div><div class="s">share of prediction markets volume</div></div>
    <div class="stat"><div class="k">Polymarket volume</div><div class="v" id="s1"></div><div class="s">active liquidity and trading demand</div></div>
    <div class="stat"><div class="k">Prediction markets</div><div class="v" id="s2"></div><div class="s">fastest growing crypto sector</div></div></div></div>
  <div class="mkts">${MK.map(([n, g, col, qs]) => `<div class="mk"><div class="h"><i style="background:${col}">${g}</i>${n}</div>${qs.map(([q, y]) => `<div class="q"><span>${q}</span><span><span class="yn y">Yes ${y}%</span><span class="yn n">No ${100 - y}%</span></span></div>`).join('')}</div>`).join('')}</div>
</div>`), T.w9, 99, 'polymarket', '');

/* ---------------- PHONE (Telegram bot, real-money account view) ---------------- */
const KB = rows => `<div class="kb">${rows.map(r => `<div class="rw" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(b => { const [lbl, id] = Array.isArray(b) ? b : [b, '']; return `<div class="kbtn"${id ? ` id="${id}"` : ''}>${lbl}</div>`; }).join('')}</div>`).join('')}</div>`;
const MAIN = (bal, pos, ids) => `<div class="bm">👋 <b>Alex</b> — Your Polymarket trading companion.<br><br>📋 <span class="k2">0x2b7e4c…9f0b</span><br>💵 <b>pUSD:</b> <span class="mono" style="color:var(--tg)">${bal}</span> 🔄<br><br>📊 ${pos}<br>🤖 No traders tracked<br><br><i>💡 Paste a Polymarket link or type keywords to search any market.</i><span class="tm">12:00</span></div>` +
  KB([[['🎯 Markets', ids.m || ''], ['👥 Copy Trading', ids.c || '']], [['🤖 Autotrading', ids.a || '']], [['⚡ Perps', ids.p || '']], ['📊 Portfolio', '💼 Wallet'], ['⚙️ Settings', '💬 Support']]);
const SPARK = (w, h, col) => { const p = []; for (let i = 0; i <= 40; i++) p.push(`${i ? 'L' : 'M'}${(i / 40 * w).toFixed(1)},${(h * .8 - (Math.sin(i * .35) * .18 + i / 40 * .55 + Math.sin(i * 1.7) * .06) * h * .9).toFixed(1)}`); return `<svg width="${w}" height="${h}"><path d="${p.join(' ')}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/></svg>`; };
const D = T.D, CARD = (alertId, yesId) => `<div class="bm">📝 <b>Will BTC close above $90k on Friday?</b><br><br>💰 Current prices:<br>✅ Yes: <b>43¢</b><br>❌ No: <b>59¢</b><span class="tm">12:00</span></div>` + KB([[['✅ Yes 43¢', yesId]], ['❌ No 59¢'], ['📜 History'], ['🔖 Watch', ['🔔 Set Alert', alertId]], ['🌐 View on Polymarket'], ['⬅️ Back']]);
const ST = [
  ['st_main1', D, MAIN('$248.60', 'No open positions', { m: 'b_markets' })],
  ['st_pm', D + 1.0, `<div class="bm">🎯 <b>Polymarket</b><br><br>Choose a section below to get started<span class="tm">12:00</span></div>` + KB([['📊 Select Category'], [['🔥 Trending Now', 'b_trending']], ['📈 Volume', '💧 Liquidity', '🆕 Newest'], ['⏳ Ending soon', '🏆 Competitive'], ['⚡ Fast Bets · 5 min'], ['⬅️ Back']])],
  ['st_card', D + 2.0, CARD('', 'b_yes')],
  ['st_amt', D + 3.05, `<div class="bm">💰 <b>Buying ✅ Yes</b><br><br>📋 <b>Will BTC close above $90k on Friday?</b><br>📈 Current price: <b>43¢</b><br><br>How much would you like to bet?<span class="tm">12:00</span></div>` + KB([['$2', '$5', ['$10', 'b_10']], ['$50', '$100'], ['🔢 Custom amount'], ['⬅️ Back']])],
  ['st_conf', D + 3.95, `<div class="bm">⚡ <b>Confirm your bet</b><br><br>Will BTC close above $90k on Friday?<br><br>✅ Outcome: <b>Yes</b><br>💰 Amount: <b>10.00 pUSD</b><br>💲 Current Price: <b>43.0¢</b><br>📊 Est. Shares: <b>23.26</b><br>🏆 If it wins: <b>23.26 (+133%)</b><br><br>Balance after: 238.60 pUSD<span class="tm">12:00</span></div>` + KB([[['<span id="placeLbl">✅ Place order</span><span id="placeSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin1"></span>Placing order…</span>', 'b_place']], ['⬅️ Back']])],
  ['st_fill', D + 5.7, `<div class="bm">✅ <b>Bet filled</b> · 23.26 shares @ 43¢<br><br>📊 <b>My Portfolio</b> 🔄<br>💼 <b>1</b> position · 💰 <b>238.60</b> pUSD<br><br>1. <b>Will BTC close above $90k on Friday?</b><br>✅ YES · 23.26 shares · 43¢<br><span class="lnk">Show</span> · <span class="lnk">Sell</span> · <span class="lnk">📤 PnL</span><span class="tm">12:00</span></div>` + KB([['◉ Open', '○ History', '○ Stats'], ['○ 👁 Watch', '○ 🔔 Alerts'], [['⬅️ Back', 'b_back1']]])],
  ['st_main2', T.m2 + .05, MAIN('$238.60', '1 open position', { c: 'b_copy' })],
  ['st_disc', T.m2 + .85, `<div class="bm">🔍 <b>Discover Traders</b><br><br>Browse top-performing wallets on Polymarket. Follow the best traders and copy their bets automatically.<span class="tm">12:00</span></div>` + KB([[['🏆 Highest PnL', 'b_pnl'], '🎯 Best Win Rate'], ['📈 Most Active', '🥇 Top Ranked'], ['💵 By my budget'], ['⬅️ Back']])],
  ['st_top', T.m2 + 1.75, `<div class="bm">📊 <b>Top Traders</b> · by PnL<br><i>1–6 of 6 · page 1/1</i><br><br>1. <b>sharp_sports</b> · <span class="k2">0x1111…1111</span><br>💰 PnL 30d: <b>+$7,120</b> ↗ ROI: <b>71%</b><br>📈 Win: <b>84%</b> · ✅ In profit 5 of 5 weeks<br>└ <span class="lnk" id="a_add">➕ Add</span> &nbsp;👀 <span class="lnk">View</span><br><br>2. <b>macro_mind</b> · <span class="k2">0x2222…2222</span><br>💰 PnL 30d: <b>+$4,380</b> ↗ ROI: <b>14%</b><br>📈 Win: <b>65%</b> · 📅 In profit 9 of 15 weeks<br>└ <span class="lnk">➕ Add</span> &nbsp;👀 <span class="lnk">View</span><span class="tm">12:00</span></div>` + KB([[['⬅️ Back', 'b_back2']]])],
  ['st_main3', T.m3 + .05, MAIN('$238.60', '1 open position', { a: 'b_auto' })],
  ['st_auto', T.m3 + .85, `<div class="bm">🤖 <b>Autotrading</b><br><br>A rule buys a side of a crypto Up/Down round when it trades in your price band, and can check the Chainlink feed the market settles on before it does.<br><br>Nothing runs until you add one. Every rule starts on paper.<span class="tm">12:00</span></div>` + KB([[['➕ New strategy', 'b_new']], ['⬅️ Back']])],
  ['st_lab', T.m3 + 1.7, `<div class="bm">🧪 <b>Strategy Lab</b> · BTC 5m<br><br><div class="lab mono" style="font-size:14px;line-height:1.6">${[['Asset', 'BTC'], ['Side', 'either'], ['Price band', '<b id="bandV">80–96¢</b>'], ['Entry window', 'last 150s'], ['Size', '$2.00'], ['Max spread', '≤ 3¢'], ['Loss stop', '4 in a row'], ['Daily cap', '$20']].map(([k, v]) => `<div class="lr"><span style="color:var(--tg)">${k}</span> ${v}</div>`).join('')}</div><span class="tm">12:00</span></div>` + KB([['⭐ Preset: Favourite'], ['Asset', 'Side', ['Price band', 'b_band']], ['Entry window', 'Size', 'Max spread'], [['⬅️ Back', 'b_back3']]])],
  ['st_main4', T.m4 + .05, MAIN('$238.60', '1 open position', { p: 'b_perps' })],
  ['st_perp', T.m4 + .85, `<div class="bm">⚡ <b>BTC 86,458</b> 🟢 <b style="color:var(--green)">+1.48%</b> <span class="lnk">15m</span><div style="margin:10px 0 6px;background:#F3F7EE;border-radius:12px;padding:10px">${SPARK(360, 90, '#17A45E')}</div>Leverage up to <b>×50</b><span class="tm">12:00</span></div>` + KB([[['📈 Rise · Long', 'b_long'], '📉 Fall · Short'], ['⬅️ Back', '🕒 15m', '🔄']])],
  ['st_long', T.m4 + 1.8, `<div class="bm">📈 <b>Long BTC ×3</b> — bets on a rise · $22.50<br>Position <b>$67.50</b> · liquidation ≈ <b>57,639</b><span class="tm">12:00</span></div>` + KB([['$10', '$25', '$50', 'Max'], ['×1', '✓ ×3', '×10', '×50'], ['✏️ Other amount', 'Other leverage'], [['<span id="openLbl">✅ Open long</span><span id="openSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin2"></span>Opening…</span>', 'b_open']], ['⬅️ Back']])],
  ['st_open', T.m4 + 3.5, `<div class="bm">⚡ <b>Perps account</b><br><br>✅ Opened 📈 <b>Long BTC</b> — $22.50 margin at 3×.<br>Filled at <b>86,460.0</b> · fee 0.02 pUSD<span class="tm">12:00</span></div>` + KB([['📍 My positions'], ['⬅️ Back']])],
  ['st_card2', T.m5 + 1.45, CARD('b_alert', '')],
  ['st_aopt', T.m5 + 2.4, `<div class="bm">🔔 <b>Will BTC close above $90k on Friday?</b><br><br>Choose outcome and direction:<span class="tm">12:00</span></div>` + KB([[['✅ YES 📈 (42¢)', 'b_yesup'], '✅ YES 📉 (42¢)'], ['❌ NO 📈 (58¢)', '❌ NO 📉 (58¢)'], ['⬅️ Back']])],
  ['st_aset', T.m5 + 3.3, `<div class="bm">🔔 <b>Alert set</b><br><br>I'll ping you when <b>YES</b> on<br><i>Will BTC close above $90k on Friday?</i><br>rises to <b>45¢</b> 📈<span class="tm">12:00</span></div>` + KB([['🔔 My alerts'], ['⬅️ Back']])],
];
const phone = H(`<div class="w"><div id="phone"><div id="screen"><div class="wall"></div><div class="island"></div>
  <div class="status"><span>9:41</span><span>●●● ▮</span></div>
  <div class="tgh"><span class="bk">‹</span>${LOGO(44)}<div><div class="nm">GramFi</div><div class="sb">bot</div></div><span style="margin-left:auto;color:var(--tg);font-size:22px">⋮</span></div>
  <div id="chat"><div class="umsg" id="u_start" style="top:18px">/start<small>12:00 ✓✓</small></div><div class="umsg" id="u_q" style="top:64px">btc 90k<small>12:01 ✓✓</small></div>${ST.map(([id, , html]) => `<div class="st" id="${id}">${html}</div>`).join('')}
   <div id="toast" style="position:absolute;left:30px;right:30px;top:14px;background:rgba(18,20,15,.92);color:#fff;border-radius:16px;padding:14px 16px;font-size:15px;font-weight:600;text-align:center">✅ Now copying <span style="color:var(--lime)">sharp_sports</span><div style="font-weight:400;font-size:12px;color:#B9BEB2;margin-top:3px">new bets will be mirrored automatically</div></div></div>
  <div class="push" id="push">${LOGO(40)}<div><div style="display:flex;justify-content:space-between"><b>GramFi</b><span style="color:#888;font-size:12px">now</span></div>🔔 <b>YES hit 45¢</b> 📈 — Will BTC close above $90k on Friday?</div></div>
  <div class="inbar"><span class="menuBtn">☰ Menu</span><div class="ph" id="ph"><span id="phTxt">Message</span><span class="caret" id="phCaret" style="height:18px"></span></div><span id="sendBtn">↑</span></div>
</div></div></div>`);
cam.appendChild(phone);
const stEls = ST.map(([id, t]) => ({ el: $('#' + id), t, btns: $$('.kbtn', $('#' + id)), bm: $('.bm', $('#' + id)) }));
const chips = [
  { t: D + 5.8, out: T.m2 - .1, el: H(`<div class="w"><div class="chip"><div class="k">IF YES WINS</div><div class="v" style="color:var(--green)">+133%</div><div style="font-size:14px;color:var(--muted);margin-top:4px">23.26 shares · 10 pUSD</div></div></div>`), dx: -480, dy: 330 },
  { t: T.m2 + 2.9, out: T.m3 - .1, el: H(`<div class="w"><div class="chip" style="display:flex;gap:16px;align-items:center"><span class="av" style="width:56px;height:56px"></span><div><div class="k">COPYING</div><div style="font-family:Unbounded;font-weight:700;font-size:24px;margin:2px 0">sharp_sports</div><div style="font-size:14px"><b class="up">+$7,120</b> PnL 30d · <b>84%</b> win</div></div></div></div>`), dx: -510, dy: 340 },
  { t: T.m3 + 2.75, out: T.m4 - .1, el: H(`<div class="w"><div class="chip" style="width:380px"><div class="k">PRICE BAND · BTC 5m</div><svg width="336" height="64" style="margin-top:10px"><line x1="10" y1="30" x2="326" y2="30" stroke="#E7E9E2" stroke-width="8" stroke-linecap="round"/><line id="bandL" y1="30" y2="30" stroke="#12140F" stroke-width="8" stroke-linecap="round"/><circle id="bandA" cy="30" r="13" fill="#EAFF00" stroke="#12140F" stroke-width="4"/><circle id="bandB" cy="30" r="13" fill="#EAFF00" stroke="#12140F" stroke-width="4"/><text id="bandTa" y="62" font-family="JetBrains Mono" font-weight="700" font-size="14" text-anchor="middle">80¢</text><text id="bandTb" y="62" font-family="JetBrains Mono" font-weight="700" font-size="14" text-anchor="middle">96¢</text></svg></div></div>`), dx: -500, dy: 320 },
  { t: T.m4 + 3.6, out: T.m5 - .1, el: H(`<div class="w"><div class="chip"><div class="k">LONG BTC ×3 · FILLED</div><div class="v">86,460.0</div><div style="margin-top:6px">${SPARK(240, 56, '#17A45E')}</div></div></div>`), dx: -490, dy: 330 },
  { t: T.m5 + 3.4, out: T.out - .1, el: H(`<div class="w"><div class="chip" style="display:flex;gap:16px;align-items:center"><svg width="64" height="64" viewBox="0 0 64 64" id="bell"><path d="M32 8c-10 0-16 8-16 18v10l-6 8h44l-6-8V26c0-10-6-18-16-18z" fill="#EAFF00" stroke="#12140F" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="52" r="6" fill="#12140F"/></svg><div><div class="k">ALERT</div><div style="font-family:Unbounded;font-weight:700;font-size:26px">YES ≥ 45¢</div></div></div></div>`), dx: -500, dy: 330 },
];
chips.forEach(c => cam.appendChild(c.el));

/* ---------------- OVERLAY: captions ---------------- */
const CAPS = [
  { in: T.w1 + .25, out: T.w2 - .3, k: '01 · MOST POPULAR COIN', t: 'What Telegram is <em>talking</em> about' },
  { in: T.w2 + .15, out: T.w3 - .3, k: '02 · NARRATIVE MINDSHARE', t: 'Which <em>narratives</em> own the chat' },
  { in: T.w3 + .15, out: T.w4 - .3, k: '03 · COUNTRY POPULAR COINS', t: 'Hot coins, <em>country by country</em>' },
  { in: T.w4 + .15, out: T.w5 - .3, k: '04 · CRYPTO BUBBLES', t: 'The whole market <em>at a glance</em>' },
  { in: T.w5 + .15, out: T.w6 - .3, k: '05 · CORRELATION', t: 'Price vs. Telegram <em>attention</em>' },
  { in: T.w6 + .15, out: T.w7 - .3, k: '06 · CHANNEL MAP', t: 'See who <em>moves</em> the conversation' },
  { in: T.w7 + .15, out: T.w8 - .3, k: '07 · FEEDS · TELESCOPE', t: 'Every alpha post, <em>searchable</em>' },
  { in: T.w8 + .15, out: T.w9 - .3, k: '08 · TOP 10 CHANNELS', t: 'Rank the <em>loudest</em> voices' },
  { in: T.w9 + .15, out: T.w9 + 1.25, k: '09 · GRAMFI × POLYMARKET', t: 'Bet on it — <em>through Telegram</em>' },
  { in: T.w9 + 1.5, out: D + .3, k: 'MOBILE · TELEGRAM BOT', t: 'Now — right <em>in the chat</em>.', side: 1 },
  { in: D + .55, out: T.m2 - .35, k: '10 · MARKETS & BETS', t: 'From market to <em>filled bet</em> in taps', side: 1 },
  { in: T.m2 + .15, out: T.m3 - .35, k: '11 · COPY TRADING', t: 'Copy the <em>best wallets</em>', side: 1 },
  { in: T.m3 + .15, out: T.m4 - .35, k: '12 · AUTOTRADING', t: 'Rules that <em>trade for you</em>', side: 1 },
  { in: T.m4 + .15, out: T.m5 - .35, k: '13 · PERPS', t: 'Long or short BTC up to <em>×50</em>', side: 1 },
  { in: T.m5 + .15, out: T.out - .3, k: '14 · PRICE ALERTS', t: 'Never miss <em>the move</em>', side: 1 },
];
const capsEl = $('#caps');
CAPS.forEach(c => {
  const words = c.t.replace(/<em>(.*?)<\/em>/g, (m, g) => '<em>' + g.replace(/ /g, '\u0001') + '</em>').split(' ').map(w => w.replace(/\u0001/g, ' '));
  const el = H(`<div class="cap"><div class="cp"><div class="kk"><i></i><span class="kt"></span></div><div class="tt">${words.map((w, j) => `<span>${w}${j < words.length - 1 ? ' ' : ''}</span>`).join('')}</div></div></div>`);
  if (c.side) { el.style.top = '360px'; el.style.width = '720px'; $('.tt', el).style.fontSize = '56px'; }
  capsEl.appendChild(el); c.el = el; c.cp = $('.cp', el); c.words = $$('.tt > span', el); c.kt = $('.kt', el); c.ems = $$('em', el);
});

/* ---------------- INTRO / OUTRO (screen-space vectors) ---------------- */
const intro = $('#intro');
intro.innerHTML = `<svg width="1920" height="1080" style="position:absolute;inset:0;overflow:visible">
  <path id="ipath" d="M-120,980 C380,1040 420,240 900,300 S1360,820 960,520" fill="none" stroke="none"/>
  <g id="itrail"></g><g id="ibubs"></g>
  <g id="ilogo"><path id="isq" d="${SQ}" fill="#EAFF00"/><g id="imark">${MARK('#EAFF00', '#121410')}</g></g></svg>
  <div id="iword" style="position:absolute;left:0;top:0;font-family:Unbounded;font-weight:800;font-size:150px;letter-spacing:-.03em;color:#fff;white-space:nowrap">${'GramFi'.split('').map(c => `<span style="display:inline-block">${c}</span>`).join('')}</div>
  <div id="itag" style="position:absolute;left:0;right:0;top:700px;text-align:center;font-family:Unbounded;font-weight:600;font-size:44px;line-height:1.25;color:#fff;letter-spacing:-.01em">
   <div class="l1">AI-powered <span style="color:#12140F;background:#EAFF00;border-radius:12px;padding:0 14px">InfoFi</span> platform</div><div class="l2" style="color:#C9CCC3">built for the Telegram ecosystem</div></div>`;
const ipath = $('#ipath'), IPL = ipath.getTotalLength(), itrail = $('#itrail'), ibubsG = $('#ibubs');
const trailDots = []; for (let s = 0; s < IPL; s += 26) { const p = ipath.getPointAtLength(s); trailDots.push({ s, c: S('circle', { cx: p.x, cy: p.y, r: 4, fill: '#EAFF00' }, itrail) }); }
const IB = [['$BTC 🚀', '#B9A7FF', .16], ['gm', '#8FCBFF', .32], ['alpha?', '#93E6BD', .5], ['airdrop 🎯', '#FFAE8E', .66], ['$TON 💎', '#FFFFFF', .82]].map(([txt, col, f], i) => {
  const p = ipath.getPointAtLength(IPL * f), g = S('g', {}, ibubsG), w = txt.length * 19 + 44;
  S('rect', { x: -w / 2, y: -34, width: w, height: 60, rx: 24, fill: col }, g); S('path', { d: 'M-' + (w / 2 - 18) + ',22 l-10,18 l28,-14z', fill: col }, g);
  const tx = S('text', { x: 0, y: 6, 'text-anchor': 'middle', 'font-family': 'Inter, Noto Color Emoji', 'font-weight': 800, 'font-size': 26, fill: '#12140F' }, g); tx.textContent = txt;
  return { g, f, x: p.x + (i % 2 ? 70 : -70), y: p.y + (i % 2 ? -80 : 70) };
});
const outro = $('#outro');
outro.innerHTML = `<div style="position:absolute;left:0;right:0;top:120px;text-align:center">
  <div id="oLogo" style="display:inline-flex;align-items:center;gap:30px">${LOGO(150)}<span id="oWord" style="font-family:Unbounded;font-weight:800;font-size:140px;letter-spacing:-.03em;color:#fff">GramFi</span></div>
  <div id="oTag" style="font-family:Unbounded;font-weight:600;font-size:40px;line-height:1.3;margin-top:22px;color:#fff">AI-powered <span style="color:#12140F;background:#EAFF00;border-radius:12px;padding:0 12px">InfoFi</span> platform<br><span style="color:#C9CCC3">built for the Telegram ecosystem</span></div>
  <div id="oUrl" style="display:inline-block;margin-top:30px;font-family:'JetBrains Mono';font-weight:700;font-size:28px;background:#EAFF00;color:#12140F;border-radius:999px;padding:14px 32px">gramfi.ai</div></div>`;

/* ======================================================================
   CURSOR EVENTS
   ====================================================================== */
const w = T;
const CUR = [
  { t: T.w1 - .2, pt: [2060, 1180] },
  { t: T.w1 + .9, sel: '#tab24', c: 1 },
  { t: T.w1 + 2.1, sel: '#tile_Pumpfun', fx: .42, fy: .6 },
  { t: T.w2 - .15, sel: '#sb_narr', fx: .3, c: 1 },
  { t: T.w2 + 1.55, sel: '#dexAnc' },
  { t: T.w3 - .15, sel: '#sb_ctry', fx: .3, c: 1 },
  { t: T.w3 + 1.45, sel: '#c_kr', fx: .4, c: 1 },
  { t: T.w4 - .15, sel: '#sb_bub', fx: .3, c: 1 },
  { t: T.w4 + 1.35, sel: '#morphoAnc' },
  { t: T.w5 - .15, sel: '#sb_corr', fx: .3, c: 1 },
  { t: T.w5 + .75, sel: '#tab90', c: 1 },
  { t: T.w5 + 2.5, sel: '#bar31', fy: .25 },
  { t: T.w6 - .15, sel: '#sb_map', fx: .3, c: 1 },
  { t: T.w6 + .6, sel: '#mapInp', fx: .25, c: 1 },
  { t: T.w6 + 1.6, sel: '#mapBtn', c: 1 },
  { t: T.w7 - .15, sel: '#sb_feed', fx: .3, c: 1 },
  { t: T.w7 + .9, sel: '#tsInp', fx: .3, c: 1 },
  { t: T.w7 + 1.55, sel: '#tsBtn', c: 1 },
  { t: T.w8 - .15, sel: '#sb_top', fx: .3, c: 1 },
  { t: T.w8 + 1.6, sel: '#pod1', fx: .7, fy: .7 },
  { t: T.w9 - .15, sel: '#nav_poly', c: 1 },
  { t: T.w9 + 1.1, sel: '#tgBtn', fx: .4, c: 1 },
  { t: D + .3, sel: '#u_start', fx: .2, fy: 3.5 },
  { t: D + .9, sel: '#b_markets', c: 1 },
  { t: D + 1.9, sel: '#b_trending', c: 1 },
  { t: D + 2.95, sel: '#b_yes', fx: .62, c: 1 },
  { t: D + 3.85, sel: '#b_10', c: 1 },
  { t: D + 5.0, sel: '#b_place', fx: .62, c: 1 },
  { t: T.m2 - .05, sel: '#b_back1', fx: .6, c: 1 },
  { t: T.m2 + .75, sel: '#b_copy', c: 1 },
  { t: T.m2 + 1.65, sel: '#b_pnl', c: 1 },
  { t: T.m2 + 2.8, sel: '#a_add', fx: .55, c: 1 },
  { t: T.m3 - .05, sel: '#b_back2', fx: .6, c: 1 },
  { t: T.m3 + .75, sel: '#b_auto', fx: .56, c: 1 },
  { t: T.m3 + 1.6, sel: '#b_new', fx: .6, c: 1 },
  { t: T.m3 + 2.65, sel: '#b_band', c: 1 },
  { t: T.m4 - .05, sel: '#b_back3', fx: .6, c: 1 },
  { t: T.m4 + .75, sel: '#b_perps', fx: .56, c: 1 },
  { t: T.m4 + 1.7, sel: '#b_long', c: 1 },
  { t: T.m4 + 2.9, sel: '#b_open', fx: .62, c: 1 },
  { t: T.m5 - .02, sel: '#ph', fx: .35, c: 1 },
  { t: T.m5 + 1.1, sel: '#sendBtn', c: 1 },
  { t: T.m5 + 2.3, sel: '#b_alert', fx: .55, c: 1 },
  { t: T.m5 + 3.2, sel: '#b_yesup', c: 1 },
  { t: T.m5 + 3.9, sel: '#push', fx: .8, fy: 1.4 },
  { t: T.out + .35, pt: [2080, 1220] },
];
CUR.forEach(e => { e.arr = e.c ? e.t - .28 : e.t; e.el = e.sel ? $(e.sel) : null; if (e.c) ev(e.t, 'click'); });
const curEl = $('#cursor'), ripsEl = $('#rips');
const ripEls = CUR.filter(e => e.c).map(e => { const r = H('<div class="rip"></div>'); ripsEl.appendChild(r); return { e, r }; });
function tpos(e) { if (e.pt) return e.pt; const r = e.el.getBoundingClientRect(); return [r.left + r.width * (e.fx ?? .5), r.top + r.height * (e.fy ?? .55)]; }
function cursorAt(t) {
  let i = 0; while (i < CUR.length - 1 && CUR[i + 1].arr <= t) i++;
  const a = CUR[i], b = CUR[i + 1], pa = tpos(a);
  if (!b) return pa;
  const leaveA = a.c ? a.t + .12 : a.arr, travel = Math.min(.75, (b.arr - leaveA) * .9), dep = b.arr - travel;
  if (t <= dep) return pa;
  const pb = tpos(b), u = E.io(seg(t, dep, b.arr)), dx = pb[0] - pa[0], dy = pb[1] - pa[1], dist = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * u) * Math.min(90, dist * .14);
  return [lerp(pa[0], pb[0], u) + (-dy / dist) * arc, lerp(pa[1], pb[1], u) + (dx / dist) * arc];
}
function hoverState(el, t) {
  let hv = 0, pr = 0;
  for (const e of CUR) { if (e.el !== el) continue; if (t >= e.arr - .06 && t <= (e.c ? e.t + .3 : e.arr + 1.0)) hv = 1; if (e.c) pr = Math.max(pr, Math.sin(Math.PI * seg(t, e.t - .02, e.t + .16))); }
  return { hv, pr };
}
// wipe origins: the click that opens each chapter
const WIPES = COLS.slice(1).map(([t, col]) => { const e = CUR.filter(c => c.c && Math.abs(c.t - t) < .4).pop(); return { t, col, e }; });

/* ======================================================================
   CAMERA
   ====================================================================== */
function offs(el, root) { if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) { const bb = el.getBBox(), sv = el.ownerSVGElement, po = offs(sv.parentElement, root), o = [po[0] + (parseFloat(sv.style.left) || 0), po[1] + (parseFloat(sv.style.top) || 0)]; return [o[0] + bb.x, o[1] + bb.y, bb.width, bb.height]; } let x = 0, y = 0; let n = el; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y, el.offsetWidth, el.offsetHeight]; }
const PH = { x: 330, y: 0, z: 300 };
const CAM = [{ t: 0, x: 0, y: -110, d: -2700, rx: 14, ry: -18, rz: -3 }, { t: T.w1 - .35, x: 0, y: -110, d: -2400, rx: 13, ry: -16, rz: -2 }];
{
  const bR = $('#browser'), pR = $('#phone');
  const webCh = [T.w1, T.w2, T.w3, T.w4, T.w5, T.w6, T.w7, T.w8, T.w9];
  webCh.forEach((s, i) => {
    const e2 = webCh[i + 1] ?? D;
    CAM.push({ t: s + (i ? .15 : .55), x: 0, y: -105, d: i ? -150 : -170, rx: 8, ry: i % 2 ? 9 : -9, rz: i % 2 ? .6 : -.6 });
    CUR.filter(e => e.el && e.t > s + .4 && e.t < e2 - .3 && bR.contains(e.el)).forEach(e => {
      const [x, y, ww, hh] = offs(e.el, bR), ex = x + ww * (e.fx ?? .5) - 720, ey = y + hh * (e.fy ?? .5) - 415;
      CAM.push({ t: e.t, x: ex * .5, y: ey * .5 - 30, d: 120, rx: 6, ry: -ex / 720 * 7, rz: 0 });
    });
    if (i < 8) { const e = CUR.find(c => c.c && Math.abs(c.t - (e2 - .15)) < .01); if (e) { const [x, y, ww, hh] = offs(e.el, bR), ex = x + ww * .3 - 720, ey = y + hh * .5 - 415; CAM.push({ t: e.t, x: ex * .3, y: ey * .3 - 70, d: 0, rx: 7, ry: 9, rz: .8 }); } }
  });
  CAM.push({ t: D - 1.2, x: 40, y: -20, d: -380, rx: 5, ry: -10, rz: -1 }, { t: D - .25, x: 110, y: 0, d: -250, rx: 4, ry: -14, rz: -1 });
  const mobCh = [D, T.m2, T.m3, T.m4, T.m5];
  mobCh.forEach((s, i) => {
    const e2 = mobCh[i + 1] ?? T.out;
    if (i) CAM.push({ t: s + .15, x: PH.x - 300, y: 20, d: -110, rx: 4, ry: i % 2 ? -17 : -8, rz: -.6 });
    CUR.filter(e => e.el && e.t > s + .4 && e.t < e2 - .3 && pR.contains(e.el)).forEach(e => {
      const [x, y, ww, hh] = offs(e.el, pR), ly = y + hh * .5 - 470, lx = x + ww * .5 - 225;
      CAM.push({ t: e.t, x: PH.x - 260 + lx * .35, y: ly * .55, d: 70, rx: 4, ry: -11 + lx / 225 * 3, rz: -.3 });
    });
  });
  CAM.push({ t: T.out + .2, x: PH.x - 280, y: 0, d: -200, rx: 5, ry: -12, rz: -.8 }, { t: T.out + 1.35, x: 0, y: -185, d: -600, rx: 9, ry: -3, rz: 0 }, { t: T.out + 3.3, x: 0, y: -185, d: -620, rx: 9, ry: -1.5, rz: 0, hold: 1 }, { t: DUR, x: 0, y: -185, d: -620, rx: 9, ry: -1.5, rz: 0, hold: 1 });
  for (let i = CAM.length - 1; i >= 0; i--) if (['x', 'y', 'd'].some(f => !isFinite(CAM[i][f]))) CAM.splice(i, 1);
  CAM.sort((a, b) => a.t - b.t);
  for (let i = CAM.length - 1; i > 0; i--) if (CAM[i].t - CAM[i - 1].t < .3) CAM.splice(i - 1, 1);
}
function browserPose(t) {
  const a = E.io(seg(t, T.w9 + 1.2, D - .2)), b = E.io(seg(t, T.out, T.out + 1.3));
  let x = lerp(0, -880, a), y = lerp(0, 80, a), z = lerp(0, -1500, a), ry = lerp(0, 26, a), op = lerp(1, .55, a), bl = lerp(0, 7, a);
  x = lerp(x, -420, b); y = lerp(y, 170, b); z = lerp(z, -260, b); ry = lerp(ry, 15, b); op = lerp(op, 1, b); bl = lerp(bl, 0, b);
  return { x, y, z, ry, op, bl };
}
const BTN_W = { x: -310, y: 150, z: 20 };
function phonePose(t) {
  const t0 = T.w9 + 1.2; if (t < t0) return null;
  const f = seg(t, t0, D - .1), fe = E.o5(f);
  let x = lerp(BTN_W.x, PH.x, E.io(f)), y = lerp(BTN_W.y, PH.y, E.io(f)) - Math.sin(f * Math.PI) * 110, z = lerp(BTN_W.z, PH.z, fe);
  let s = lerp(.08, 1, E.ob(seg(t, t0, D + .05))), ry = lerp(-70, -6, fe), rz = lerp(14, 0, fe), rx = lerp(30, 0, fe);
  const bob = seg(t, D, D + 1); y += Math.sin(t * 1.3) * 6 * bob; rz += Math.sin(t * .9) * .4 * bob;
  const o = E.io(seg(t, T.out, T.out + 1.3));
  x = lerp(x, 520, o); y = lerp(y, 210, o); z = lerp(z, 60, o); ry = lerp(ry, -16, o); s = lerp(s, .86, o);
  return { x, y, z, s, rx, ry, rz, op: clamp(seg(t, t0, t0 + .12)) };
}

/* ======================================================================
   SOUND EVENTS (non-click)
   ====================================================================== */
ev(.15, 'whoosh', { len: 1.4, up: 1 }); IB.forEach((b, i) => ev(.2 + b.f * 1.5, 'pop')); ev(1.75, 'logo'); ev(2.15, 'pop');
ev(T.w1 - .45, 'whoosh', { len: .6, up: 1 });
[T.w2, T.w3, T.w4, T.w5, T.w6, T.w7, T.w8, T.w9, T.m2, T.m3, T.m4, T.m5].forEach(t => ev(t - .05, 'swish'));
ev(T.w1 + .95, 'morph'); ev(T.w2 + .1, 'build', { len: .9 }); ev(T.w3 + .1, 'sparkle'); ev(T.w3 + 1.5, 'whoosh', { len: .8, up: 0 }); ev(T.w3 + 2.2, 'pop');
ev(T.w4 + .05, 'sparkle'); ev(T.w4 + 1.4, 'pop'); ev(T.w5 + .8, 'build', { len: 1.4 }); ev(T.w6 + .05, 'sparkle');
for (let k = 0; k < 13; k++) ev(T.w6 + .75 + k * .046, 'key'); ev(T.w6 + 1.65, 'whoosh', { len: 1.0, up: 0 }); ev(T.w6 + 2.6, 'pop');
for (let k = 0; k < 3; k++) ev(T.w7 + 1.0 + k * .1, 'key'); ev(T.w7 + 1.6, 'morph');
for (let k = 0; k < 4; k++) ev(T.w8 + .1 + k * .22, 'pop'); ev(T.w8 + .95, 'success');
ev(T.w9 + 1.2, 'whoosh', { len: 1.6, up: 1 }); ev(D, 'drop');
ST.forEach(([, t]) => { if (t > D + .5) ev(t, 'pop'); });
ev(D + 5.05, 'tick', { len: .65 }); ev(D + 5.7, 'success'); ev(T.m2 + 2.9, 'success'); ev(T.m3 + 2.75, 'morph');
ev(T.m4 + 2.95, 'tick', { len: .5 }); ev(T.m4 + 3.5, 'success');
for (let k = 0; k < 7; k++) ev(T.m5 + .2 + k * .1, 'key'); ev(T.m5 + 3.3, 'success'); ev(T.m5 + 3.9, 'notify');
ev(T.out, 'whoosh', { len: 1.2, up: 0 }); ev(T.out + .55, 'logo');

/* ======================================================================
   RENDER
   ====================================================================== */
function setW(el, x, y, z, ww, hh, extra = '') { el.style.transform = `translate3d(${x - ww / 2}px,${y - hh / 2}px,${z}px) ${extra}`; }
function vis(el, op) { el.style.opacity = op; el.style.visibility = op <= .001 ? 'hidden' : 'visible'; }
function hex2rgb(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }

function renderAt(t) {
  t = clamp(t, 0, DUR - 1e-6);
  // ---------- background colour + wipes
  let base = COLS[0][1], wipe = null;
  for (const W of WIPES) { if (t >= W.t + .7) base = W.col; else if (t >= W.t - .02) { wipe = W; break; } }
  $('#bg0').style.background = base;
  const bgW = $('#bgW');
  if (wipe && wipe.t !== T.w1) {
    const q = E.io(seg(t, wipe.t - .02, wipe.t + .7)), o = wipe.e ? tpos(wipe.e) : [960, 540];
    bgW.style.background = wipe.col; bgW.style.clipPath = `circle(${(q * 2400).toFixed(0)}px at ${o[0].toFixed(0)}px ${o[1].toFixed(0)}px)`; bgW.style.visibility = 'visible';
  } else bgW.style.visibility = 'hidden';
  if (wipe && wipe.t === T.w1 && t >= T.w1 - .02) $('#bg0').style.background = wipe.col;
  const curCol = (wipe && seg(t, wipe.t, wipe.t + .7) > .4) ? wipe.col : base;
  $('#grid').style.backgroundImage = `radial-gradient(${dark(curCol) ? 'rgba(255,255,255,.10)' : 'rgba(18,20,15,.16)'} 1.3px,transparent 1.4px)`;

  // ---------- camera
  const C = {}; for (const f of ['x', 'y', 'd', 'rx', 'ry', 'rz']) C[f] = spline(CAM, t, f);
  cam.style.transform = `translateZ(${C.d}px) rotateX(${C.rx}deg) rotateY(${C.ry}deg) rotateZ(${C.rz}deg) translate3d(${-C.x}px,${-C.y}px,0)`;
  $('#grid').style.transform = `translate(${(-C.x * .08) % 34}px,${(-C.y * .08) % 34}px)`;
  const focusZ = t < D - 1.2 ? 0 : t < T.out ? PH.z : lerp(PH.z, 0, seg(t, T.out, T.out + 1.5));

  // ---------- deco vectors
  DECO.forEach((dc, i) => {
    const inn = seg(t, dc.a - .05, dc.a + 1.1), out = seg(t, dc.b - .05, dc.b + .5);
    if (inn <= 0 || out >= 1) { vis(dc.el, 0); return; }
    const mob = dc.a >= D - .1 && dc.a < T.out - .1, cx = mob ? PH.x - 200 : (dc.a >= T.out - .1 ? 0 : 0);
    const k = dc.k, rot = (k === 'arcs' || k === 'rays' || k === 'rings' || k === 'gears') ? (t - dc.a) * (i % 2 ? 4 : -4) : (t - dc.a) * .6;
    dc.el.style.transform = `translate3d(${cx - 1800}px,${-1200 + (k === 'circles' ? -(t - dc.a) * 40 : 0)}px,-750px) rotate(${rot}deg)`;
    vis(dc.el, (1 - E.io(out)) * (dc.a >= T.out - .1 ? .9 : 1));
    dc.paths.forEach((p, j) => { const q = E.o(seg(inn, (j % 9) * .05, (j % 9) * .05 + .6)); p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = (1 - q).toFixed(4); });
    dc.dots.forEach((d, j) => { d.style.transform = `scale(${E.ob(seg(inn, .3 + (j % 7) * .05, .7 + (j % 7) * .05))})`; d.style.transformBox = 'fill-box'; d.style.transformOrigin = 'center'; });
  });
  // ---------- environment bubbles
  const envOp = seg(t, T.w1 - .3, T.w1 + .5) * (1 - .6 * seg(t, T.out + .5, T.out + 1.5));
  bubs.forEach(b => {
    const x = b.x + Math.sin(t * b.sp + b.ph) * 30, y = b.y + Math.cos(t * b.sp * .8 + b.ph) * 22 - t * 5, zc = b.z + C.d;
    const bl = Math.min(16, Math.abs(b.z - focusZ) * .0065), near = zc > 1700 ? 0 : zc > 1350 ? (1700 - zc) / 350 : 1;
    b.el.style.transform = `translate3d(${x}px,${y}px,${b.z}px) scale(${b.s})`; b.el.style.filter = bl > .4 ? `blur(${bl.toFixed(1)}px)` : 'none';
    vis(b.el, near * envOp);
  });

  // ---------- intro
  renderIntro(t);
  // ---------- browser
  const Bp = browserPose(t);
  setW(browser, Bp.x, Bp.y, Bp.z, 1440, 830, `rotateY(${Bp.ry}deg)`);
  browser.style.filter = Bp.bl > .2 ? `blur(${Bp.bl.toFixed(1)}px)` : 'none';
  vis(browser, Bp.op * E.o(seg(t, T.w1 - .25, T.w1 + .25)));
  if (t > T.w1 - .3 && t < D + .3 || t > T.out - .2) renderWeb(t);
  // ---------- phone
  renderPhone(t);
  // ---------- captions
  CAPS.forEach(c => {
    if (!(t >= c.in - .1 && t <= c.out + .7)) { vis(c.el, 0); return; }
    vis(c.el, 1);
    c.words.forEach((wd, j) => {
      const q = seg(t, c.in + j * .06, c.in + j * .06 + .55), o = seg(t, c.out + j * .03, c.out + j * .03 + .3), e = E.o5(q), eo = E.i(o);
      wd.style.transform = `translateY(${(1 - e) * 60 - eo * 46}px) rotateX(${(1 - e) * -75 + eo * 50}deg)`;
      wd.style.opacity = clamp(q * 1.6) * (1 - eo); wd.style.filter = (1 - e) > .02 || eo > .02 ? `blur(${((1 - e) * 10 + eo * 8).toFixed(1)}px)` : 'none';
    });
    const pi = E.o5(seg(t, c.in - .04, c.in + .3)), po = E.io(seg(t, c.out + .15, c.out + .5));
    c.cp.style.opacity = pi * (1 - po); c.cp.style.transform = `translateX(${(1 - pi) * -40 - po * 30}px) scale(${.96 + .04 * pi})`;
    c.ems.forEach(m => { m.style.backgroundSize = `${E.io(seg(t, c.in + .3, c.in + .8)) * 100}% 100%`; });
    c.kt.textContent = c.k.slice(0, Math.round(c.k.length * seg(t, c.in, c.in + .4)));
  });
  // ---------- outro lockup
  const ol = seg(t, T.out + .55, T.out + 1.3);
  vis(outro, clamp(ol * 4));
  $('#oLogo').style.transform = `translateY(${(1 - E.o5(ol)) * 70}px) scale(${lerp(.6, 1, E.ob(ol))})`;
  $('#oLogo svg').style.transform = `rotate(${(1 - E.o5(seg(t, T.out + .55, T.out + 1.4))) * -120}deg)`;
  $('#oWord').style.letterSpacing = `${lerp(.25, -.03, E.o5(seg(t, T.out + .65, T.out + 1.5)))}em`;
  const tg = E.o5(seg(t, T.out + 1.25, T.out + 1.9)); $('#oTag').style.transform = `translateY(${(1 - tg) * 40}px)`; $('#oTag').style.opacity = tg;
  const ur = E.ob(seg(t, T.out + 1.7, T.out + 2.3)); $('#oUrl').style.transform = `scale(${ur})`; $('#oUrl').style.opacity = clamp(ur);

  // ---------- cursor
  const [cx, cy] = cursorAt(t);
  let press = 0; for (const e of CUR) if (e.c) press = Math.max(press, Math.sin(Math.PI * seg(t, e.t - .04, e.t + .18)));
  const sc = (t > D - .4 && t < T.out + .3 ? 1.12 : 1) * (1 - press * .14);
  curEl.style.transform = `translate(${cx - 4 * sc}px,${cy - 3 * sc}px) scale(${sc}) rotate(${-press * 4}deg)`;
  let cop = seg(t, T.w1 - .2, T.w1 + .1) * (1 - seg(t, T.out + .3, T.out + .6));
  if (t > T.w9 + 1.2 && t < D + .2) cop = t < T.w9 + 1.4 ? 1 - seg(t, T.w9 + 1.2, T.w9 + 1.4) : seg(t, D - .05, D + .2);
  curEl.style.opacity = cop;
  ripEls.forEach(({ e, r }) => {
    const q = seg(t, e.t, e.t + .5); if (q <= 0 || q >= 1) { vis(r, 0); return; }
    const p = tpos(e), s = 18 + E.o(q) * 70; r.style.left = (p[0] - s / 2) + 'px'; r.style.top = (p[1] - s / 2) + 'px'; r.style.width = r.style.height = s + 'px'; vis(r, (1 - q) * .9);
  });
  $('#flash').style.opacity = t >= D ? .3 * Math.exp(-(t - D) * 9) : 0;
}

function renderIntro(t) {
  const io = 1 - seg(t, T.w1 - .25, T.w1 + .05);
  vis(intro, io > 0 ? 1 : 0); if (io <= 0) return;
  // plane flight along the vector path
  const fp = E.io(seg(t, .15, 1.75)), s = IPL * fp, p = ipath.getPointAtLength(s), p2 = ipath.getPointAtLength(Math.min(IPL, s + 2));
  const ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
  trailDots.forEach(d => { const a = d.s < s - 10 ? 1 : 0; d.c.setAttribute('opacity', a * (1 - seg(t, 1.9, 2.5)) * (.35 + .65 * clamp(1 - (s - d.s) / 900))); });
  IB.forEach((b, i) => { const q = seg(t, .2 + b.f * 1.5, .55 + b.f * 1.5), o = seg(t, 1.9 + i * .04, 2.3 + i * .04); b.g.setAttribute('transform', `translate(${b.x + Math.sin(t * 2 + i) * 6},${b.y - o * 40}) scale(${E.ob(q) * (1 - o * .3)})`); b.g.setAttribute('opacity', clamp(q * 3) * (1 - o)); });
  // logo formation: squircle grows behind the plane, then everything zooms into the yellow
  const lf = seg(t, 1.6, 2.1), sqS = E.ob(lf), shift = E.io(seg(t, 2.1, 2.7)) * -300, zoom = E.i(seg(t, 3.45, T.w1));
  const arrive = seg(t, 1.45, 1.8), mx = lerp(p.x, 960, E.io(arrive)), my = lerp(p.y, 470, E.io(arrive)), mang = lerp(ang - 30, 0, E.io(arrive));
  const L = 220 * (1 + zoom * 22), lx = 960 + shift * (1 - zoom), ly = 470;
  $('#isq').setAttribute('transform', `translate(${lx - L / 2},${ly - L / 2}) scale(${L / 100 * sqS})`);
  $('#isq').style.transformOrigin = '0 0';
  const isqScale = sqS, cxq = lx - L / 2 * isqScale + L / 2 * (isqScale - 1) * 0; // keep centre
  $('#isq').setAttribute('transform', `translate(${lx},${ly}) scale(${L / 100 * isqScale}) translate(-50,-50)`);
  const markIn = arrive < 1 ? 0 : 1, mk = $('#imark');
  const MS = lerp(.42, 1, E.o(arrive)) * L / 100;
  const mxx = lerp(mx, lx, seg(t, 1.8, 2.1)), myy = lerp(my, ly, seg(t, 1.8, 2.1));
  mk.setAttribute('transform', `translate(${t < 1.8 ? mx : mxx},${t < 1.8 ? my : myy}) rotate(${mang}) scale(${MS}) translate(-48,-52)`);
  const ink = seg(t, 1.75, 1.95);
  mk.querySelectorAll('path,circle')[0].setAttribute('fill', ink > .5 ? '#0B0B0B' : '#EAFF00'); mk.querySelectorAll('path')[0].setAttribute('stroke', ink > .5 ? '#0B0B0B' : '#EAFF00');
  mk.querySelector('circle').setAttribute('fill', ink > .5 ? '#0B0B0B' : '#EAFF00'); mk.querySelector('circle').setAttribute('opacity', E.ob(seg(t, 2.0, 2.3)));
  mk.querySelectorAll('path')[1].setAttribute('stroke', ink > .5 ? '#EAFF00' : '#121410');
  $('#isq').setAttribute('opacity', lf > 0 ? 1 : 0);
  // wordmark + tagline
  const word = $('#iword'); word.style.left = (lx + 150) + 'px'; word.style.top = (ly - 100) + 'px';
  $$('span', word).forEach((sp, i) => { const q = E.o5(seg(t, 2.2 + i * .05, 2.65 + i * .05)); sp.style.transform = `translateX(${(1 - q) * -60}px)`; sp.style.opacity = q; });
  word.style.opacity = 1 - seg(t, 3.35, 3.55);
  const tg = $('#itag'); const q1 = E.o5(seg(t, 2.55, 3.0)), q2 = E.o5(seg(t, 2.7, 3.15));
  $('.l1', tg).style.transform = `translateY(${(1 - q1) * 40}px)`; $('.l1', tg).style.opacity = q1 * (1 - seg(t, 3.35, 3.55));
  $('.l2', tg).style.transform = `translateY(${(1 - q2) * 40}px)`; $('.l2', tg).style.opacity = q2 * (1 - seg(t, 3.35, 3.55));
  mk.setAttribute('opacity', 1 - seg(t, 3.5, 3.8));
}

function renderWeb(t) {
  const pIdx = PAGES.findIndex(p => t >= p.a && t < p.b);
  const pg = PAGES[Math.max(0, pIdx)];
  $('#url').textContent = 'gramfi.ai/' + pg.url;
  $('#nav_insight').className = 'it' + (t < T.w9 ? ' on' : '');
  const np = hoverState($('#nav_poly'), t); $('#nav_poly').className = 'it' + (t >= T.w9 || np.hv ? ' on' : ''); $('#nav_poly').style.transform = `scale(${1 - np.pr * .06})`;
  SIDE.forEach(([id]) => { const el = $('#' + id), hs = hoverState(el, t), on = pg.sb === id; el.className = 's' + (on ? ' on' : hs.hv ? ' hv' : ''); el.style.transform = `scale(${1 - hs.pr * .05})`; });
  PAGES.forEach(({ el, a, b }) => { const inn = E.o5(seg(t, a + .1, a + .55)), out = E.io(seg(t, b, b + .18)); el.style.transform = `translateX(${(1 - inn) * 90 - out * 70}px)`; vis(el, Math.min(a < 0 ? 1 : inn, 1 - out)); });
  if (t < T.w2 + .3) pTree(t);
  if (t > T.w2 - .1 && t < T.w3 + .3) pNarr(t);
  if (t > T.w3 - .1 && t < T.w4 + .3) pGlobe(t);
  if (t > T.w4 - .1 && t < T.w5 + .3) pBub(t);
  if (t > T.w5 - .1 && t < T.w6 + .3) pCorr(t);
  if (t > T.w6 - .1 && t < T.w7 + .3) pMap(t);
  if (t > T.w7 - .1 && t < T.w8 + .3) pFeed(t);
  if (t > T.w8 - .1 && t < T.w9 + .3) pTop(t);
  if (t > T.w9 - .1) pPoly(t);
}
function pTree(t) {
  const s = T.w1, sw = t >= s + 1.3, h24 = hoverState($('#tab24'), t);
  $('#tab1').className = 'tab' + (t < s + .9 ? ' on' : ''); $('#tab24').className = 'tab' + (t >= s + .9 ? ' on' : h24.hv ? ' hv' : ''); $('#tab24').style.transform = `scale(${1 - h24.pr * .08})`;
  const hvP = t >= s + 2.0 ? E.o(seg(t, s + 2.0, s + 2.3)) * (1 - E.io(seg(t, T.w2 - .45, T.w2 - .2))) : 0;
  tiles.forEach(({ c, el, cEl }, i) => {
    const a = L1[c[0]], b = L24[c[0]], ap = E.o(seg(t, s + .05 + i * .025, s + .5 + i * .025)), lag = E.io(seg(t, s + .92 + (i % 5) * .03, s + 1.7 + (i % 5) * .03));
    const r = { x: lerp(a.x, b.x, lag), y: lerp(a.y, b.y, lag), w: lerp(a.w, b.w, lag), h: lerp(a.h, b.h, lag) };
    const ch = sw ? c[4] : c[3], k = clamp(Math.abs(ch) / 8), up = ch >= 0, isP = c[0] === 'Pump.fun';
    el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
    el.style.background = up ? `rgb(${lerp(228, 140, k)},${lerp(246, 214, k)},${lerp(234, 170, k)})` : `rgb(${lerp(252, 240, k)},${lerp(230, 150, k)},${lerp(228, 146, k)})`;
    el.className = 'tile' + (r.w > 170 && r.h > 110 ? ' big' : '');
    el.style.transform = `scale(${(.85 + .15 * ap) * (isP ? 1 + .025 * hvP : 1)})`; el.style.opacity = ap * (hvP && !isP ? 1 - .35 * hvP : 1); el.style.zIndex = isP ? 2 : 1;
    el.style.boxShadow = isP && hvP ? `0 ${16 * hvP}px ${36 * hvP}px rgba(20,24,16,${.28 * hvP}), 0 0 0 ${3 * hvP}px #12140F` : 'none';
    cEl.textContent = (up ? '+' : '') + ch.toFixed(2) + '%'; cEl.className = 'c ' + (up ? 'up' : 'dn');
  });
  const pr = L24['Pump.fun']; tmTip.style.left = (pr.x + pr.w * .5 + 20) + 'px'; tmTip.style.top = (pr.y + pr.h * .5 + 26 + (1 - hvP) * 14) + 'px'; vis(tmTip, hvP);
  moverRows.forEach(({ c, el, sh, ch }) => {
    const y1 = ord1.indexOf(c[0]), y2 = ord24.indexOf(c[0]), lag = E.io(seg(t, s + 1.0 + y2 * .02, s + 1.7 + y2 * .02));
    el.style.top = (44 + lerp(y1, y2, lag) * 44) + 'px'; sh.textContent = (sw ? c[8] : c[7]).toFixed(1) + '%';
    const v = sw ? c[4] : c[3]; ch.textContent = (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; ch.className = 'mono ch ' + (v >= 0 ? 'up' : 'dn');
    el.style.background = c[0] === 'Pump.fun' && sw ? `rgba(234,255,0,${.6 * E.o(seg(t, s + 1.6, s + 2.0))})` : 'transparent';
  });
}
function pNarr(t) {
  const s = T.w2, sw = E.io(seg(t, s + .1, s + 1.0)) * 360, hv = t > s + 1.5 ? E.ob(seg(t, s + 1.5, s + 1.8)) * (1 - E.io(seg(t, T.w3 - .45, T.w3 - .2))) : 0;
  narrSegs.forEach((sg, i) => {
    const a1 = Math.min(sg.a1, sw), isD = i === 2, m = ((sg.a0 + sg.a1) / 2 - 90) * Math.PI / 180, off = isD ? 22 * hv : 0;
    sg.p.setAttribute('d', a1 > sg.a0 ? arcPath(280 + Math.cos(m) * off, 300 + Math.sin(m) * off, isD ? 150 - 6 * hv : 150, isD ? 250 + 14 * hv : 250, sg.a0, a1) : '');
    sg.p.style.opacity = hv && !isD ? 1 - .4 * hv : 1;
  });
  const showD = hv > .4;
  $('#dnK').textContent = showD ? 'DEX · 24H' : 'LAYER 1 PROTOCOLS';
  $('#dnV').textContent = showD ? '11.5%' : (30.8 * seg(t, s + .2, s + 1.0)).toFixed(1) + '%'; $('#dnS').innerHTML = showD ? '<span class="up">+2.4 pts</span> vs yesterday' : 'leads the conversation';
  narrRows.forEach(({ el, bar, n }, i) => { const q = E.o5(seg(t, s + .15 + i * .05, s + .6 + i * .05)); el.style.transform = `translateX(${(1 - q) * 40}px)`; el.style.opacity = q; bar.style.width = (n[1] / 30.8 * 100 * E.o(seg(t, s + .3 + i * .05, s + 1.1 + i * .05))) + '%';
    el.style.background = i === 2 && hv > .2 ? `rgba(143,203,255,${.35 * hv})` : 'transparent'; });
}
function pGlobe(t) {
  const s = T.w3, c = gctx, Rg = 290, cx = 310, cy = 310; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 620, 620);
  const turn = E.io(seg(t, s + 1.5, s + 2.3)), spin = 20 + (t - s) * 22;
  const lon0 = lerp(spin, 127.5, turn), lat0 = lerp(18, 32, turn), ap = E.o(seg(t, s + .05, s + .9));
  const g = c.createRadialGradient(cx - 90, cy - 110, 40, cx, cy, Rg); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#E8ECE1');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Rg * ap, 0, 7); c.fill(); c.strokeStyle = 'rgba(18,20,15,.15)'; c.lineWidth = 1.5; c.stroke();
  const rl = lat0 * Math.PI / 180, sinL = Math.sin(rl), cosL = Math.cos(rl);
  c.strokeStyle = 'rgba(18,20,15,.07)'; c.lineWidth = 1;
  const proj = (la, lo) => { const p = la * Math.PI / 180, l = (lo - lon0) * Math.PI / 180; const x = Math.cos(p) * Math.sin(l), y = cosL * Math.sin(p) - sinL * Math.cos(p) * Math.cos(l), z = sinL * Math.sin(p) + cosL * Math.cos(p) * Math.cos(l); return [cx + x * Rg, cy - y * Rg, z]; };
  for (let lo = -180; lo < 180; lo += 30) { c.beginPath(); let st = 0; for (let la = -90; la <= 90; la += 5) { const [x, y, z] = proj(la, lo); if (z > 0) { st ? c.lineTo(x, y) : c.moveTo(x, y); st = 1; } else st = 0; } c.stroke(); }
  const kr = hoverState($('#c_kr'), t), sel = t >= s + 1.45;
  GDOTS.forEach(([la, lo, col], i) => { const [x, y, z] = proj(la, lo); if (z <= 0) return; const k = E.o(seg(ap, (i % 50) / 50 * .5, (i % 50) / 50 * .5 + .5)); if (k <= 0) return;
    const isKr = col === '#EF6B9B'; c.fillStyle = col ? (sel && !isKr ? col + '88' : col) : '#B9BFB0'; c.globalAlpha = (.35 + .65 * z) * k;
    c.beginPath(); c.arc(x, y, (col ? 3.1 : 2.3) * (isKr && sel ? 1.25 : 1) * k, 0, 7); c.fill(); });
  c.globalAlpha = 1;
  const pin = E.ob(seg(t, s + 2.2, s + 2.5));
  if (pin > 0) { const [x, y] = proj(37, 127.5); c.strokeStyle = '#12140F'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 60 * pin); c.stroke(); c.fillStyle = '#EAFF00'; c.beginPath(); c.arc(x, y - 60 * pin, 14 * pin, 0, 7); c.fill(); c.stroke();
    for (let r = 0; r < 2; r++) { const ph = ((t - s) * 1.4 + r * .5) % 1; c.strokeStyle = `rgba(239,107,155,${.8 * (1 - ph)})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 8 + ph * 40, 0, 7); c.stroke(); }
    c.fillStyle = '#12140F'; c.font = '700 18px Inter'; c.fillText('South Korea', x + 22, y - 54 * pin); }
  CTRY.forEach(k => { const el = $('#c_' + k[0]); el.className = 'cchip' + (k[0] === 'kr' && sel ? ' on' : (k[0] === 'kr' && kr.hv ? ' hv' : '')); if (k[0] === 'kr') el.style.transform = `scale(${1 - kr.pr * .05})`; });
  const res = $('#ctryRes'), rq = E.o5(seg(t, s + 1.6, s + 2.1)); res.style.opacity = rq; res.style.transform = `translateY(${(1 - rq) * 20}px)`;
  $$('.cbar', res).forEach((b, i) => b.style.width = (b.dataset.v / 24 * 100 * E.o(seg(t, s + 1.8 + i * .08, s + 2.4 + i * .08))) + '%');
}
function pBub(t) {
  const s = T.w4, hv = t > s + 1.3 ? E.ob(seg(t, s + 1.3, s + 1.6)) * (1 - E.io(seg(t, T.w5 - .45, T.w5 - .2))) : 0, m = BP[0];
  BP.forEach((p, i) => {
    const ap = E.ob(seg(t, s + .05 + i * .025, s + .45 + i * .025)), fx = Math.sin(t * 1.1 + i) * 4, fy = Math.cos(t * .9 + i * 1.7) * 5;
    let x = p.x + fx, y = p.y + fy, sc = ap;
    if (i === 0) sc *= 1 + .45 * hv; else { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy); const push = hv * Math.max(0, 1 - d / 400) * 50; x += dx / d * push; y += dy / d * push; }
    p.g.setAttribute('transform', `translate(${x},${y}) scale(${Math.max(0, sc)})`); p.g.style.opacity = hv && i ? 1 - .3 * hv : 1;
  });
  const tip = $('#bubTip'); tip.style.left = (30 + m.x + m.r * 1.45 + 24) + 'px'; tip.style.top = (78 + m.y - 60 + (1 - hv) * 10) + 'px'; vis(tip, clamp(hv));
}
function pCorr(t) {
  const s = T.w5, p = seg(t, s + .8, s + 2.2), sw = t >= s + .75;
  $('#tab30').className = 'tab' + (sw ? '' : ' on'); const h9 = hoverState($('#tab90'), t); $('#tab90').className = 'tab' + (sw ? ' on' : h9.hv ? ' hv' : ''); $('#tab90').style.transform = `scale(${1 - h9.pr * .08})`;
  const intro = E.o(seg(t, s + .1, s + .7));
  bars.forEach((r, i) => {
    const q = E.o(seg(p, i / NB * .65, i / NB * .65 + .35)), shrink = E.io(seg(t, s + .78, s + 1.0));
    const v = p > 0 ? (q > 0 ? datB[i] * E.ob(q) : datA[i] * (1 - shrink)) : datA[i] * E.o(seg(intro, i / NB * .5, i / NB * .5 + .5));
    const hh = Math.max(0, v * 330); r.setAttribute('y', 400 - hh); r.setAttribute('height', hh);
    r.setAttribute('fill', t > s + 2.35 && t < T.w6 - .2 && i === 31 ? '#12140F' : (sw && i > 26 && i < 34 ? '#5AA9E6' : '#A9D3F2'));
  });
  pline.setAttribute('d', linePath(p > 0 ? prB : prA));
  const L = pline.getTotalLength(), lp = p > 0 ? E.io(p) : intro; pline.style.strokeDasharray = L; pline.style.strokeDashoffset = L * (1 - lp);
  const pt = pline.getPointAtLength(L * lp); pdot.setAttribute('cx', pt.x); pdot.setAttribute('cy', pt.y); pdot.style.opacity = (p > 0 && p < 1) ? 1 : 0;
  const K = (a, b) => lerp(a, b, E.io(p));
  $('#k1').textContent = K(-2.1, -5.3).toFixed(1) + '%'; $('#k2').textContent = fmt(Math.round(K(11240, 33165))); $('#k3').textContent = K(-.11, -.24).toFixed(2); $('#k4').textContent = K(-.18, -.29).toFixed(2); $('#k5').textContent = K(-.06, -.14).toFixed(2);
  $('#cs').textContent = sw ? '2026-07-28 → 2026-10-26 · 90 days' : '2026-09-26 → 2026-10-26 · 30 days';
  const ht = t > s + 2.35 ? E.o(seg(t, s + 2.35, s + 2.6)) * (1 - E.io(seg(t, T.w6 - .45, T.w6 - .2))) : 0, bx = 15.5 + 31 * 24.2;
  vline.setAttribute('x1', bx); vline.setAttribute('x2', bx); vline.style.opacity = ht;
  const ct = $('#chartTip'); ct.style.left = (20 + bx - 250) + 'px'; ct.style.top = (86 + (1 - ht) * 10) + 'px'; vis(ct, ht);
}
function pMap(t) {
  const s = T.w6, Wd = 1156, Hh = 620, c = mctx; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, Wd, Hh);
  const fz = E.io(seg(t, s + 1.65, s + 2.7)), z = 1 + 1.15 * fz, tg = NODES[TGT], fx = lerp(Wd / 2, tg.x, fz), fy = lerp(Hh / 2, tg.y, fz), drift = Math.sin(t * .4) * 6;
  c.translate(Wd / 2, Hh / 2); c.scale(z, z); c.translate(-fx + drift, -fy);
  const ap = i => E.ob(seg(t, s - .05 + (i % 60) * .009 + Math.floor(i / 60) * .04, s + .35 + (i % 60) * .009 + Math.floor(i / 60) * .04)), hl = seg(t, s + 1.95, s + 3.0);
  c.lineWidth = 1.2 / z;
  EDGES.forEach(([a, b]) => { const A = NODES[a], Bn = NODES[b], k = Math.min(ap(a), ap(b)); if (k <= 0) return; c.strokeStyle = `rgba(60,70,50,${.13 * clamp(k) * (1 - .5 * hl)})`; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bn.x, Bn.y); c.stroke(); });
  HE.forEach((j, k) => { const q = E.o(seg(t, s + 2.0 + k * .045, s + 2.35 + k * .045)); if (q <= 0) return; const Bn = NODES[j];
    c.strokeStyle = 'rgba(18,20,15,.85)'; c.lineWidth = 2.2 / z; c.beginPath(); c.moveTo(tg.x, tg.y); c.lineTo(lerp(tg.x, Bn.x, q), lerp(tg.y, Bn.y, q)); c.stroke();
    if (q > .98) { c.fillStyle = '#EAFF00'; c.beginPath(); c.arc(Bn.x, Bn.y, (Bn.r + 3.5) / Math.sqrt(z), 0, 7); c.fill(); } });
  NODES.forEach((n, i) => { const k = ap(i); if (k <= 0) return; c.fillStyle = n.c; c.globalAlpha = clamp(k) * (hl > 0 && i !== TGT && !HE.includes(i) ? 1 - .5 * hl : 1); c.beginPath(); c.arc(n.x, n.y, n.r * k, 0, 7); c.fill(); });
  c.globalAlpha = 1;
  const pulse = seg(t, s + 1.7, s + 3.5);
  if (pulse > 0) { for (let r = 0; r < 2; r++) { const ph = (pulse * 2.2 + r * .5) % 1; c.strokeStyle = `rgba(18,20,15,${.6 * (1 - ph)})`; c.lineWidth = 2.5 / z; c.beginPath(); c.arc(tg.x, tg.y, 16 + ph * 40, 0, 7); c.stroke(); }
    c.fillStyle = '#EAFF00'; c.strokeStyle = '#12140F'; c.lineWidth = 3 / z; c.beginPath(); c.arc(tg.x, tg.y, 15, 0, 7); c.fill(); c.stroke(); }
  const typed = 'Activity News', n = Math.round(typed.length * seg(t, s + .75, s + 1.35)), focused = t >= s + .6;
  $('#mapInp').className = 'inp' + (focused ? ' f' : ''); $('#mapTxt').textContent = n > 0 ? typed.slice(0, n) : 'Search channel name';
  $('#caret').style.opacity = focused && t < s + 1.7 && (Math.floor(t * 3) % 2 === 0 || (t > s + .75 && t < s + 1.35)) ? 1 : 0;
  const hb = hoverState($('#mapBtn'), t); $('#mapBtn').className = 'btn' + (hb.hv || t > s + 1.6 ? ' lime' : ''); $('#mapBtn').style.transform = `scale(${1 - hb.pr * .08})`;
  const sx = (tg.x - fx + drift) * z + Wd / 2, sy = (tg.y - fy) * z + Hh / 2, ic = E.ob(seg(t, s + 2.6, s + 2.95)), info = $('#mapInfo');
  info.style.left = (sx + 46) + 'px'; info.style.top = (sy - 70) + 'px'; info.style.transform = `scale(${.8 + .2 * ic})`; info.style.transformOrigin = '0 50%'; vis(info, clamp(ic));
}
function pFeed(t) {
  const s = T.w7, f = E.io(seg(t, s + 1.6, s + 2.2)), kept = POSTS.map(p => p[3]);
  let ky = 0;
  feedEls.forEach(({ el, btc, tags }, i) => {
    const appear = E.o5(seg(t, s + .05 + (feedEls.length - 1 - i) * .08, s + .5 + (feedEls.length - 1 - i) * .08));
    const y0 = i * 114, y1 = btc ? (ky++) * 114 : y0;
    el.style.top = lerp(y0, y1, f) + 'px'; el.style.transform = `translateY(${(1 - appear) * -40}px) scale(${btc ? 1 : 1 - .06 * f})`;
    el.style.opacity = appear * (btc ? 1 : 1 - f); el.style.zIndex = btc ? 2 : 1;
    tags.forEach(tg => tg.className = 'tag t' + (f > .3 ? ' hot' : ''));
    el.style.boxShadow = btc && f > .3 ? '0 0 0 2px #12140F' : 'none';
  });
  const typed = 'BTC', n = Math.round(3 * seg(t, s + 1.0, s + 1.3)), focused = t >= s + .9;
  $('#tsInp').className = 'inp' + (focused ? ' f' : ''); $('#tsInp').style.width = '290px'; $('#tsTxt').textContent = n ? typed.slice(0, n) : 'Search coin (e.g. BTC)';
  $('#tsCaret').style.opacity = focused && t < s + 1.6 ? 1 : 0;
  const hb = hoverState($('#tsBtn'), t); $('#tsBtn').className = 'btn' + (hb.hv || t > s + 1.55 ? ' lime' : ''); $('#tsBtn').style.transform = `scale(${1 - hb.pr * .08})`;
  const rq = E.ob(seg(t, s + 1.7, s + 2.05)); $('#tsRes').style.transform = `scale(${.85 + .15 * rq})`; $('#tsRes').style.opacity = clamp(rq);
  $('#feedCnt').textContent = f > .5 ? '$BTC · 3 posts in view' : 'Live · all channels';
}
function pTop(t) {
  const s = T.w8, hv = hoverState($('#pod1'), t).hv ? E.o(seg(t, s + 1.55, s + 1.8)) : 0;
  pods.forEach(p => { const d = s + .05 + p.ri * .22 + p.j * .05, q = E.ob(seg(t, d, d + .45)); p.el.style.transform = `translateY(${(1 - q) * -120}px) scale(${(.7 + .3 * clamp(q, 0, 1.2)) * (p.k === 1 ? 1 + .05 * hv : 1)})`; p.el.style.opacity = clamp(q * 2);
    p.vEl.textContent = fmt(Math.round(p.v * E.o(seg(t, d + .1, d + .9)))); if (p.k === 1) p.el.style.boxShadow = `0 ${10 + 20 * hv}px ${24 + 20 * hv}px rgba(0,0,0,${.15 + .2 * hv})`; });
  const cq = E.ob(seg(t, s + .45, s + .85)); $('#crown').style.opacity = clamp(cq); $('#crownP').setAttribute('transform', `translate(150,${92 + (1 - cq) * -40}) scale(${cq}) translate(-150,-92)`);
  $('#crownRays').setAttribute('transform', `rotate(${(t - s) * 40},150,92)`); $('#crownRays').style.opacity = E.o(seg(t, s + .7, s + 1.1));
  $('#strip').style.transform = `translateX(${-(t - s) * 60}px)`;
}
function pPoly(t) {
  const s = T.w9, a = seg(t, s + .2, s + 1.0);
  $('#s0').textContent = '$' + (9.9 * E.o(a)).toFixed(1) + 'B'; $('#s1').textContent = '$' + Math.round(171 * E.o(a)) + 'M+'; $('#s2').textContent = '#' + Math.max(1, Math.round(9 - 8 * E.o(a)));
  $$('.mk', pg_poly).forEach((m, i) => { const q = E.o(seg(t, s + .3 + i * .1, s + .8 + i * .1)); m.style.transform = `translateY(${(1 - q) * 40}px)`; m.style.opacity = q; });
  const hb = hoverState($('#tgBtn'), t), btn = $('#tgBtn'), pushed = t >= s + 1.1;
  btn.style.transform = `scale(${(1 + hb.hv * .04) * (1 - hb.pr * .07)})`; btn.style.background = pushed ? '#12140F' : '#EAFF00'; btn.style.color = pushed ? '#EAFF00' : '#12140F';
  btn.style.boxShadow = `0 ${8 + hb.hv * 10}px ${20 + hb.hv * 16}px rgba(160,190,0,${.35 + hb.hv * .2})`; $('#tgLbl').textContent = pushed ? 'Opening Telegram…' : 'GramFi-Polymarket TG Bot';
}

function renderPhone(t) {
  const P = phonePose(t);
  if (!P) { vis(phone, 0); chips.forEach(c => vis(c.el, 0)); return; }
  setW(phone, P.x, P.y, P.z, 450, 940, `rotateX(${P.rx}deg) rotateY(${P.ry}deg) rotateZ(${P.rz}deg) scale(${P.s})`); vis(phone, P.op);
  const us = E.o(seg(t, D - 1.0, D - .75)); $('#u_start').style.opacity = us * (1 - seg(t, T.m5 + 1.1, T.m5 + 1.3)); $('#u_start').style.transform = `translateY(${(1 - us) * 20 - seg(t, T.m5 + 1.1, T.m5 + 1.4) * 40}px)`;
  const uq = E.o(seg(t, T.m5 + 1.15, T.m5 + 1.4)); $('#u_q').style.opacity = uq; $('#u_q').style.top = (18 + (1 - uq) * 30) + 'px';
  stEls.forEach((s, i) => {
    const next = stEls[i + 1], gap = next && s.el.id === 'st_open' ? T.m5 + 1.1 : (next ? next.t : 99);
    const inn = seg(t, s.t + .05, s.t + .37), out = seg(t, gap - .03, gap + .08), op = (t >= s.t ? E.o(inn) : 0) * (1 - out);
    vis(s.el, op); s.el.style.transform = `translateY(${(1 - E.o5(inn)) * 26 - out * 10}px) scale(${lerp(.97, 1, E.ob(inn))})`;
    if (op <= 0) return;
    s.btns.forEach((b, j) => { const q = E.ob(seg(t, s.t + .06 + j * .022, s.t + .36 + j * .022)), hs = hoverState(b, t); b.classList.toggle('hv', !!hs.hv);
      b.style.transform = `translateY(${(1 - q) * 14}px) scale(${(.94 + .06 * q) * (1 - hs.pr * .06)})`; b.style.opacity = clamp(q * 1.3); });
    $$('.lr', s.el).forEach((r, j) => { const q = E.o5(seg(t, s.t + .1 + j * .07, s.t + .4 + j * .07)); r.style.opacity = q; r.style.transform = `translateX(${(1 - q) * 30}px)`; });
  });
  const placing = t >= D + 5.02 && t < D + 5.7, opening = t >= T.m4 + 2.92 && t < T.m4 + 3.5;
  $('#placeLbl').style.display = placing ? 'none' : 'inline'; $('#placeSp').style.display = placing ? 'inline-flex' : 'none'; $('#b_place').classList.toggle('dk', placing);
  $('#openLbl').style.display = opening ? 'none' : 'inline'; $('#openSp').style.display = opening ? 'inline-flex' : 'none'; $('#b_open').classList.toggle('dk', opening);
  $('#spin1').style.transform = $('#spin2').style.transform = `rotate(${t * 900}deg)`;
  const ad = hoverState($('#a_add'), t), copied = t > T.m2 + 2.8; Object.assign($('#a_add').style, { background: ad.hv || copied ? '#EAFF00' : 'transparent', borderRadius: '6px', padding: '1px 4px' }); $('#a_add').textContent = copied ? '✅ Copying' : '➕ Add';
  const to = E.ob(seg(t, T.m2 + 2.9, T.m2 + 3.2)) * (1 - E.io(seg(t, T.m3 - .4, T.m3 - .2))); $('#toast').style.transform = `translateY(${(1 - to) * -30}px) scale(${.9 + .1 * to})`; vis($('#toast'), clamp(to));
  // typing a search query into the chat input
  const typing = seg(t, T.m5 + .2, T.m5 + .9), q = 'btc 90k', nq = Math.round(q.length * typing), focus = t >= T.m5 && t < T.m5 + 1.15;
  $('#ph').className = 'ph' + (focus ? ' f' : ''); $('#phTxt').textContent = focus && nq ? q.slice(0, nq) : 'Message'; $('#phCaret').style.opacity = focus ? 1 : 0;
  const sb = $('#sendBtn'), sbq = focus && nq > 0 ? 1 : 0; sb.style.transform = `scale(${sbq ? 1 - hoverState(sb, t).pr * .15 : .8})`; sb.style.opacity = .35 + .65 * sbq;
  const pu = E.o5(seg(t, T.m5 + 3.9, T.m5 + 4.25)); $('#push').style.transform = `translateY(${(1 - pu) * -140}px)`; vis($('#push'), clamp(pu * 1.5));
  // chips flying out of the phone
  chips.forEach((c, ci) => {
    const qq = seg(t, c.t, c.t + .7), out = E.io(seg(t, c.out, c.out + .35));
    if (qq <= 0 || out >= 1) { vis(c.el, 0); return; }
    const e = E.o5(qq), x = P.x + c.dx * e, y = P.y + c.dy * e - Math.sin(qq * Math.PI) * 60 + Math.sin(t * 1.6) * 6, z = P.z + 180 * e + out * 120;
    c.el.style.transform = `translate3d(${x - 170}px,${y - 60}px,${z}px) rotateY(${18 * (1 - e)}deg) rotateZ(${-6 * e}deg) scale(${(.3 + .7 * E.ob(qq)) * (1 - out * .2)})`;
    vis(c.el, clamp(qq * 3) * (1 - out));
    if (ci === 2) { const b = E.io(seg(t, c.t + .3, c.t + 1.0)), a = lerp(60, 80, b), bb = lerp(84, 96, b), X = v => 10 + (v - 50) / 50 * 316;
      $('#bandL').setAttribute('x1', X(a)); $('#bandL').setAttribute('x2', X(bb)); $('#bandA').setAttribute('cx', X(a)); $('#bandB').setAttribute('cx', X(bb));
      $('#bandTa').setAttribute('x', X(a)); $('#bandTb').setAttribute('x', X(bb)); $('#bandTa').textContent = Math.round(a) + '¢'; $('#bandTb').textContent = Math.round(bb) + '¢'; }
    if (ci === 4) $('#bell').style.transform = `rotate(${Math.sin((t - c.t) * 18) * 14 * Math.exp(-(t - c.t) * 1.5)}deg)`;
  });
}

window.renderAt = renderAt; window.EVENTS = EVENTS.sort((a, b) => a.t - b.t); window.DUR = DUR;
window.READY = document.fonts.ready.then(() => { renderAt(0); return true; });
