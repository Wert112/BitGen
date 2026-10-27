// GramFi product motion v3 — dark theme, meaning-first edit. Every visual is a pure function of time `t`.
// window.renderAt(t) draws the frame; window.EVENTS lists sound/sync events for the audio builder.
// One thread runs through the web half: BTC grows in Telegram mentions -> where it is discussed ->
// which channel drives it -> the actual post (which cites a Polymarket market) -> that market in the bot.
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
  ob: u => { const c1 = 1.45, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }, // decorative only
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
const T = {
  A: 12 * B, n1: 24 * B, n2: 28 * B, n3: 32 * B, ctry: 36 * B, map: 44 * B, feed: 56 * B, top: 64 * B, poly: 68 * B,
  D: 76 * B, copy: 100 * B, auto: 108 * B, perp: 116 * B, alert: 128 * B, fin: 140 * B, end: 156 * B,
};
const DUR = T.end;
const D = T.D;
const EVENTS = [];
const ev = (t, type, extra = {}) => EVENTS.push({ t, type, ...extra });
// ambient colour per meaning group: attention (lime) · sources (violet) · act in Telegram (blue) · finale (lime)
const GROUPS = [[0, '#EAFF00', .10], [T.A, '#EAFF00', .16], [T.ctry, '#8B6CFF', .22], [T.poly, '#2EA6FF', .20], [T.fin, '#EAFF00', .22]];

/* ======================================================================
   WORLD
   ====================================================================== */
const cam = $('#cam');
const R0 = rng(11);
function decoSVG(kind, col) {
  const st = `stroke="${col}"`;
  let h = '';
  const P = (d, w = 3) => { h += `<path class="dp" pathLength="1" d="${d}" fill="none" ${st} stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const C = (x, y, r) => { h += `<circle class="df" cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`; };
  const rr = (x, y, w, hh, r) => `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + hh - r} Q${x + w},${y + hh} ${x + w - r},${y + hh} H${x + r} Q${x},${y + hh} ${x},${y + hh - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
  const W = 3600, Hh = 2400;
  if (kind === 'tree') for (let i = 0; i < 14; i++) { const w = 140 + R0() * 380, hh = 100 + R0() * 300, x = R0() * (W - w), y = R0() * (Hh - hh); P(rr(x, y, w, hh, 22), 3); }
  if (kind === 'net') { const pts = []; for (let i = 0; i < 26; i++) pts.push([R0() * W, R0() * Hh]); for (let i = 0; i < pts.length; i++) { const j = (i * 7 + 3) % pts.length; P(`M${pts[i][0]},${pts[i][1]} L${pts[j][0]},${pts[j][1]}`, 2); C(pts[i][0], pts[i][1], 7); } }
  if (kind === 'msgs') for (let i = 0; i < 14; i++) { const w = 220 + R0() * 260, hh = 80 + R0() * 60, x = R0() * (W - w), y = R0() * (Hh - hh - 60); P(rr(x, y, w, hh, 34) + ` M${x + 36},${y + hh} L${x + 18},${y + hh + 44} L${x + 84},${y + hh}`, 3); }
  if (kind === 'candles') { let y = 1700; for (let i = 0; i < 22; i++) { const x = 160 + i * 150, up = R0() > .35, hh = 80 + R0() * 220; y += up ? -60 - R0() * 40 : 40 + R0() * 30; P(rr(x, y - hh / 2, 70, hh, 10), 4); P(`M${x + 35},${y - hh / 2 - 60} V${y - hh / 2} M${x + 35},${y + hh / 2} V${y + hh / 2 + 60}`, 4); } }
  return `<svg class="deco" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">${h}</svg>`;
}
// content-related motifs only, low contrast; they calm down while data changes
const DECO = [[T.A, T.n1, 'tree', 'rgba(234,255,0,.10)', 0], [T.ctry, T.poly, 'net', 'rgba(139,108,255,.20)', 0], [T.feed, T.top, 'msgs', 'rgba(139,108,255,.16)', 0],
  [D, T.perp, 'msgs', 'rgba(46,166,255,.16)', 1], [T.perp, T.alert, 'candles', 'rgba(46,166,255,.20)', 1]].map(([a, b, k, col, mob]) => {
  const el = H(`<div class="w">${decoSVG(k, col)}</div>`); cam.appendChild(el);
  return { a, b, k, mob, el, paths: $$('.dp', el), dots: $$('.df', el) };
});
const BUBS = [['$BTC to 90k? 👀', ''], ['gm ☀️', ''], ['<b>$PUMP</b> mentions up', ''], ['who is buying CAP?', ''], ['ETH breakout?', ''], ['<b>$SUI</b> trending in KR', ''],
  ['wen airdrop', ''], ['narrative: Layer 1', ''], ['🐋 whale alert', ''], ['Polymarket: YES 43¢', ''], ['copy sharp_sports?', ''], ['long BTC ×3', ''], ['TON community 💎', ''], ['ser, chart?', '']];
const R = rng(7);
const bubs = BUBS.map(([txt]) => {
  const el = H(`<div class="w"><div class="bub">${txt}</div></div>`); cam.appendChild(el);
  const ang = R() * 6.283, rad = 800 + R() * 1100;
  return { el, x: Math.cos(ang) * rad * 1.25, y: Math.sin(ang) * rad * .72, z: -2200 + R() * 2600, ph: R() * 6.28, sp: .2 + R() * .3, s: .9 + R() * .4 };
});

/* ---------------- BROWSER ---------------- */
const ICW = '#EEF0EA';
const IC = {
  pop: `<rect x="2" y="2" width="10" height="10" rx="2" fill="${ICW}"/>`, narr: `<rect x="1.5" y="1.5" width="6" height="11" rx="1.5" fill="${ICW}"/><rect x="8.5" y="1.5" width="4" height="5" rx="1.5" fill="${ICW}"/><rect x="8.5" y="7.5" width="4" height="5" rx="1.5" fill="${ICW}"/>`,
  ctry: `<circle cx="7" cy="7" r="5.5" fill="none" stroke="${ICW}" stroke-width="1.6"/><path d="M1.5 7h11M7 1.5c-3 3-3 8 0 11c3-3 3-8 0-11" fill="none" stroke="${ICW}" stroke-width="1.4"/>`,
  bub: `<circle cx="5" cy="8" r="3.5" fill="${ICW}"/><circle cx="10" cy="4.5" r="2.5" fill="${ICW}"/>`, corr: `<path d="M1 10 L4 6 L7 8 L13 2" fill="none" stroke="${ICW}" stroke-width="2" stroke-linecap="round"/>`,
  map: `<circle cx="3" cy="3" r="2" fill="${ICW}"/><circle cx="11" cy="5" r="2" fill="${ICW}"/><circle cx="6" cy="11" r="2" fill="${ICW}"/><path d="M3 3L11 5L6 11Z" fill="none" stroke="${ICW}" stroke-width="1.2"/>`,
  feed: `<path d="M2 3h10M2 7h10M2 11h6" stroke="${ICW}" stroke-width="2" stroke-linecap="round"/>`, top: `<path d="M2 12V7h3v5M6 12V3h3v9M10 12V5h3v7" fill="${ICW}"/>`,
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
const addPage = (el, a, b, url, sb, mode = 'x') => { content.appendChild(el); PAGES.push({ el, a, b, url, sb, mode }); return el; };
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
const tileCol = (ch) => { const k = clamp(Math.abs(ch) / 6); return ch >= 0 ? `rgb(${lerp(22, 24, k)},${lerp(52, 128, k)},${lerp(36, 72, k)})` : `rgb(${lerp(62, 160, k)},${lerp(26, 42, k)},${lerp(28, 48, k)})`; };

// ---- A: Most Popular Coin (all coins) — BTC is the thread
const COINS = [ // name, glyph, price, ch1H, ch24H, w1H, w24H
  ['BTC', '₿', '$86,458', .4, 1.5, 14, 27], ['Pump.fun', 'P', '$0.004141', -1.1, 3.9, 18, 12], ['Cap', 'C', '$0.0956', -4.1, -6.3, 16, 9], ['ETH', 'Ξ', '$3,912', .2, 1.1, 12, 12],
  ['SOL', 'S', '$187.40', -.6, -1.4, 9, 8], ['XRP', 'X', '$2.41', .3, .6, 7, 6], ['Sui', 'S', '$0.9044', 2.2, 4.8, 6, 6], ['TON', 'T', '$2.12', -.4, -1.1, 5, 4],
  ['Raydium', 'R', '$1.79', -.9, -.9, 5, 3.5], ['Quack AI', 'Q', '$0.1312', 7.7, 9.6, 4, 4], ['Monad', 'M', '$0.0214', -2.2, 6.4, 4, 3.5], ['Aster', 'A', '$0.7056', 5.1, 4.1, 3.5, 3],
  ['DOGE', 'D', '$0.1912', -.9, -.9, 3.5, 3], ['Irys', 'I', '$0.0272', 4.3, 2.0, 3, 2.5], ['Ondo', 'O', '$0.4064', 1.2, .5, 3, 2.5], ['Pepe', 'P', '$0.0000092', -2.1, 1.7, 2.5, 2]];
const SUM1 = COINS.reduce((s, c) => s + c[5], 0), SUM24 = COINS.reduce((s, c) => s + c[6], 0);
const L1 = squarify(COINS.map(c => ({ name: c[0], v: c[5] })).sort((a, b) => b.v - a.v), 0, 0, 800, 620);
const L24 = squarify(COINS.map(c => ({ name: c[0], v: c[6] })).sort((a, b) => b.v - a.v), 0, 0, 800, 620);
const pg_tm = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Most Popular Coin</h2>
   <div class="tabs"><span class="tab on" id="tab1">1H</span><span class="tab" id="tab24">24H</span><span class="tab">7D</span><span class="tab">30D</span></div>
   <span class="pill" style="margin-left:auto">Share of Telegram mentions · Global</span></div>
  <div class="tm" id="tm"></div>
  <div class="list" id="movers" style="left:852px;top:84px;width:334px;height:620px"><div class="hd" style="grid-template-columns:1.4fr .9fr .8fr"><span>Coin</span><span>Mentions</span><span>24H</span></div></div>
</div>`), -1, T.n1, 'insight?tab=popular', 'sb_pop');
const tmEl = $('#tm', pg_tm);
const tiles = COINS.map(c => { const el = H(`<div class="tile" id="tile_${c[0].replace(/[^a-z0-9]/gi, '')}"><div class="n"><i>${c[1]}</i>${c[0]}</div><div class="p">${c[2]}</div><div class="c"></div></div>`); tmEl.appendChild(el); return { c, el, cEl: $('.c', el) }; });
const tmTip = H(`<div class="tip" style="width:300px"><div style="font-weight:800;font-size:17px;margin-bottom:8px">₿ BTC · 24H</div><div class="k">Share of Telegram mentions</div><div class="v">${(27 / SUM24 * 100).toFixed(1)}%</div>
  <div style="display:flex;justify-content:space-between;margin-top:8px"><span class="k">1H window</span><b>${(14 / SUM1 * 100).toFixed(1)}%</b></div></div>`);
tmEl.appendChild(tmTip);
const MOV = COINS.slice(0, 13), ord1 = [...MOV].sort((a, b) => b[5] - a[5]).map(c => c[0]), ord24 = [...MOV].sort((a, b) => b[6] - a[6]).map(c => c[0]);
const moverRows = MOV.map(c => { const el = H(`<div class="row" style="grid-template-columns:1.4fr .9fr .8fr"><b>${c[0]}</b><span class="mono sh"></span><span class="mono ch"></span></div>`); $('#movers', pg_tm).appendChild(el); return { c, el, sh: $('.sh', el), ch: $('.ch', el) }; });

// ---- montage 1: Narrative Mindshare (treemap, as on the site)
const NARR = [['Layer 1 Protocols', 30.8, 1.2], ['Other', 15.2, -.4], ['DEX', 11.5, 2.4], ['Payment', 9.4, .6], ['DeFi', 7.2, 1.1], ['Stablecoins', 3.8, -.3], ['Social & Community', 3.6, .9],
  ['Meme', 3.3, 1.7], ['Privacy', 3.2, -.2], ['RWA', 2.4, .5], ['Layer 2', 1.9, -.6], ['Gaming', 1.6, -.9], ['NFT', 1.2, .3]];
const LN = squarify(NARR.map(n => ({ name: n[0], v: n[1] })), 0, 0, 1156, 620);
const pg_narr = addPage(H(`<div class="page"><div class="ptitle"><h2>Narrative Mindshare</h2><div class="tabs"><span class="tab">1H</span><span class="tab on">24H</span><span class="tab">7D</span></div><span class="pill" style="margin-left:auto">Share of Telegram crypto talk by theme</span></div><div class="tm" id="ntm" style="width:1156px"></div></div>`), T.n1, T.n2, 'insight?tab=narrative', 'sb_narr', 'y');
const ntiles = NARR.map(n => { const r = LN[n[0]], el = H(`<div class="tile" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:${tileCol(n[2] * 2)}"><div class="n" style="font-size:${r.w > 300 ? 22 : 14}px">${n[0]}</div><div class="p" style="font-size:${r.w > 300 ? 20 : 13}px">${n[1]}%</div></div>`); $('#ntm', pg_narr).appendChild(el); return el; });

// ---- montage 2: Crypto Bubbles
const BUBD = [['MORPHO', 8.58], ['NIGHT', 8.0], ['DASH', 6.49], ['ETHFI', 5.49], ['SKY', -5.4], ['VET', -4.6], ['XDC', 4.62], ['ZRO', -3.56], ['SPX', 3.4], ['STRK', 3.33], ['INJ', 3.14], ['PEPE', -2.97],
  ['PENGU', -2.8], ['ENA', 2.8], ['TRUMP', 2.6], ['CC', -2.3], ['ATOM', -2.2], ['SUI', 2.1], ['ONDO', 1.9], ['AAVE', -1.7], ['SOL', -1.4], ['HYPE', 1.2], ['TON', -1.1], ['ETH', 1.1], ['DOGE', -.9], ['BTC', 1.5], ['XRP', .6], ['LINK', .4]];
const pg_bub = addPage(H(`<div class="page"><div class="ptitle"><h2>Crypto Bubbles</h2><div class="tabs"><span class="tab">1H</span><span class="tab on">24H</span><span class="tab">7D</span></div><span class="pill" style="margin-left:auto">Bubble size = 24H move</span></div>
  <svg id="bubs" width="1156" height="630" style="position:absolute;left:30px;top:78px;overflow:visible"><defs>
   <radialGradient id="gG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#1D5A3A"/><stop offset="1" stop-color="#0E2A1C"/></radialGradient>
   <radialGradient id="gR" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#6A2428"/><stop offset="1" stop-color="#2C1012"/></radialGradient></defs></svg></div>`), T.n2, T.n3, 'insight?tab=cryptobubbles', 'sb_bub', 'y');
const bsvg = $('#bubs', pg_bub);
const BR = rng(5), BP = BUBD.map(([n, v]) => ({ n, v, r: 26 + Math.pow(Math.abs(v), .9) * 13.5, x: 80 + BR() * 1000, y: 60 + BR() * 510 }));
for (let it = 0; it < 400; it++) { for (let i = 0; i < BP.length; i++) for (let j = i + 1; j < BP.length; j++) { const a = BP[i], b = BP[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, m = a.r + b.r + 8; if (d < m) { const k = (m - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; } }
  BP.forEach(p => { p.x = clamp(p.x, p.r + 4, 1152 - p.r); p.y = clamp(p.y, p.r + 4, 626 - p.r); p.x += (578 - p.x) * .004; p.y += (315 - p.y) * .004; }); }
BP.forEach(p => { p.g = S('g', {}, bsvg); S('circle', { r: p.r, fill: `url(#${p.v >= 0 ? 'gG' : 'gR'})`, stroke: p.v >= 0 ? '#2BD47D' : '#FF5C60', 'stroke-width': 3 }, p.g);
  const t1 = S('text', { 'text-anchor': 'middle', y: -2, 'font-family': 'Inter', 'font-weight': 800, 'font-size': Math.max(11, p.r * .32), fill: '#fff' }, p.g); t1.textContent = p.n;
  const t2 = S('text', { 'text-anchor': 'middle', y: Math.max(11, p.r * .32) + 2, 'font-family': 'JetBrains Mono', 'font-weight': 700, 'font-size': Math.max(10, p.r * .25), fill: p.v >= 0 ? '#7CF0B0' : '#FF9A9D' }, p.g); t2.textContent = (p.v >= 0 ? '+' : '') + p.v.toFixed(2) + '%'; });

// ---- montage 3: Correlation (BTC)
const pg_corr = addPage(H(`<div class="page"><div class="ptitle"><h2>Correlation analysis</h2><span class="pill" style="color:#F7B24A">₿ Bitcoin</span><div class="tabs"><span class="tab">30D</span><span class="tab on">90D</span><span class="tab">1Y</span></div></div>
  <div class="card" style="position:absolute;left:30px;top:84px;width:1156px;height:620px;padding:18px 20px">
   <div style="display:flex;gap:10px"><span class="pill"><b style="color:#fff">━</b> BTC price</span><span class="pill"><b style="color:#5AA9E6">▮</b> BTC mentions in Telegram</span><span class="pill" style="margin-left:auto">2026-07-28 → 2026-10-26</span></div>
   <svg id="chart" width="1110" height="520" style="position:absolute;left:22px;top:80px"></svg></div></div>`), T.n3, T.ctry, 'insight?tab=correlationanalysis', 'sb_corr', 'y');
const NB = 46, svg = $('#chart', pg_corr), datB = [], prB = [];
for (let i = 0; i < NB; i++) { datB.push(clamp(.3 + .28 * Math.sin(i * .43 + .5) * Math.sin(i * .11 + .3) + .22 * Math.abs(Math.sin(i * 1.37)) + (i > 26 && i < 34 ? .3 : 0), .08, .98)); prB.push(.45 + .25 * Math.sin(i * .16 + 1.2) + .08 * Math.sin(i * .9) - i * .004); }
for (let g = 0; g < 5; g++) S('line', { x1: 0, x2: 1110, y1: 20 + g * 110, y2: 20 + g * 110, stroke: '#24282B' }, svg);
const bars = []; for (let i = 0; i < NB; i++) bars.push(S('rect', { x: 8 + i * 24, width: 15, rx: 4, fill: '#2F6E9E' }, svg));
const pline = S('path', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', d: prB.map((v, i) => `${i ? 'L' : 'M'}${15.5 + i * 24},${470 - v * 420}`).join(' ') }, svg);
const pdot = S('circle', { r: 8, fill: '#EAFF00', stroke: '#0F1011', 'stroke-width': 3 }, svg);

// ---- Country Popular Coins (dot-matrix globe)
const CTRY = [['kr', 'South Korea', 37, 127.5, 4.5, '#FF6FA5'], ['vn', 'Vietnam', 16, 106.5, 5, '#F0A24A'], ['ir', 'Iran', 32, 54, 7, '#3FBF8F'], ['id', 'Indonesia', -2, 117, 8, '#D9B52C'],
  ['ru', 'Russia', 60, 90, 17, '#9B7BFF'], ['us', 'United States', 39, -98, 14, '#5B8DEF'], ['tr', 'Türkiye', 39, 35, 4.5, '#FF5C60'], ['br', 'Brazil', -10, -52, 12, '#2BD47D']];
const pg_ctry = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Country Popular Coins</h2><span class="pill">24H</span><span class="pill" style="margin-left:auto">Top coins in each country's Telegram channels</span></div>
  <canvas id="globe" width="1240" height="1240" style="position:absolute;left:30px;top:76px;width:620px;height:620px"></canvas>
  <div class="card" style="position:absolute;left:690px;top:84px;width:496px;height:620px;padding:20px">
   <div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin-bottom:12px">SELECT A COUNTRY</div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">${CTRY.map(c => `<div class="cchip" id="c_${c[0]}"><i style="background:${c[5]}"></i>${c[1]}</div>`).join('')}</div>
   <div id="ctryRes" style="margin-top:12px;border-top:1px solid var(--line);padding-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:18px">🇰🇷 South Korea · top coins</b><span class="pill">share of mentions</span></div>
    ${[['XRP', 24, '#C9CEC4'], ['BTC', 19, '#F7931A'], ['SUI', 11, '#5B8DEF'], ['DOGE', 8, '#D9B52C'], ['ONDO', 6, '#3FBF8F']].map(([c, v, col]) => `<div class="crow" ${c === 'BTC' ? 'id="krBtc"' : ''}><b>${c}</b><div class="bar cbar" data-v="${v}" style="background:${col}"></div><span class="mono">${v}%</span></div>`).join('')}
   </div></div>
</div>`), T.ctry, T.map, 'insight?tab=country', 'sb_ctry');
const gctx = $('#globe', pg_ctry).getContext('2d');
const LAND = [[48, -100, 22, 38], [65, -150, 8, 25], [20, -100, 10, 14], [72, -42, 10, 18], [-15, -60, 22, 15], [-40, -68, 13, 7], [52, 15, 12, 22], [63, 15, 7, 10], [8, 20, 22, 22], [-20, 25, 15, 14],
  [28, 45, 10, 14], [60, 95, 13, 60], [38, 100, 15, 35], [22, 78, 10, 9], [15, 103, 7, 7], [-3, 115, 5, 18], [36, 138, 6, 3], [37, 127.5, 3, 2.5], [-25, 134, 11, 17], [68, 100, 8, 55]];
const GDOTS = [];
for (let la = -78; la <= 80; la += 2.3) { const step = 2.3 / Math.max(.2, Math.cos(la * Math.PI / 180)); for (let lo = -180; lo < 180; lo += step) {
  const land = LAND.some(([a, b, ra, rb]) => { let d = lo - b; d = ((d + 540) % 360) - 180; return (Math.pow((la - a) / ra, 2) + Math.pow(d / rb, 2)) < 1; });
  if (!land) continue; let c = null; for (const k of CTRY) { let d = lo - k[3]; d = ((d + 540) % 360) - 180; if (Math.hypot(la - k[2], d * Math.cos(la * Math.PI / 180)) < k[4]) c = k[5]; }
  GDOTS.push([la, lo, c]); } }

// ---- Channel map
const pg_map = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Channel Map</h2><span class="pill">Forwarding network · 90D</span>
   <div style="display:flex;gap:8px;margin-left:auto"><div class="inp" id="mapInp"><span id="mapTxt">Search channel name</span><span class="caret" id="caret"></span></div><div class="btn" id="mapBtn">Search</div></div></div>
  <div id="mapBox" style="position:absolute;left:30px;top:84px;width:1156px;height:620px;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#0C0D0E">
   <canvas id="map" width="2312" height="1240" style="width:1156px;height:620px"></canvas>
   <div class="legend"><span><i style="background:#5B8DEF"></i>EN</span><span><i style="background:#9B7BFF"></i>RU</span><span><i style="background:#FF6FA5"></i>KR</span><span><i style="background:#F0A24A"></i>VN</span><span><i style="background:#3FBF8F"></i>IR</span><span id="lgFwd" style="border-color:#EAFF00"><b style="color:#EAFF00">━</b> forwarded message</span></div>
   <div class="minfo" id="mapInfo"><div style="display:flex;gap:10px;align-items:center;font-weight:700;font-size:16px"><span class="av" style="width:34px;height:34px;background:#24282B;display:flex;align-items:center;justify-content:center;font-weight:800">T</span>Trade Nobody<span class="yn y" style="margin-left:auto">EN</span></div>
    <div class="g"><div><span>Subscribers</span><b>6,232,584</b></div><div><span>Points</span><b>58,440</b></div><div><span>Forwarded by</span><b>16 channels</b></div><div><span>Top coin (24H)</span><b style="color:#F7B24A">BTC</b></div></div>
    <div class="btn lime" id="viewPosts" style="margin-top:12px;justify-content:center">View posts →</div></div>
   <div id="expand" style="position:absolute;background:#141617;border:1px solid #33383B;border-radius:16px"></div></div>
</div>`), T.map, T.feed, 'insight?tab=channelmap', 'sb_map');
const mctx = $('#map', pg_map).getContext('2d');
const CL = [['#5B8DEF', 360, 300, 170], ['#9B7BFF', 760, 210, 150], ['#FF6FA5', 900, 470, 120], ['#F0A24A', 560, 500, 120], ['#3FBF8F', 180, 480, 110], ['#D9B52C', 1000, 120, 90]];
const MR = rng(42), NODES = [], EDGES = [];
CL.forEach(([col, cx, cy, sp], ci) => { const n = [70, 55, 40, 40, 35, 25][ci]; for (let k = 0; k < n; k++) { const a = MR() * 6.283, r = Math.pow(MR(), .7) * sp; NODES.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .8, c: col, ci, r: 2.5 + Math.pow(MR(), 3) * 9 }); } });
const TGT = 3; NODES[TGT].x = 430; NODES[TGT].y = 300; NODES[TGT].r = 14;
for (let i = 0; i < NODES.length; i++) for (let k = 0; k < 2; k++) { const j = Math.floor(MR() * NODES.length); if (NODES[j].ci === NODES[i].ci || MR() < .25) EDGES.push([i, j]); }
const HE = []; { const pick = rng(9); while (HE.length < 16) { const j = Math.floor(pick() * NODES.length); if (j !== TGT && !HE.includes(j)) HE.push(j); } HE.sort((a, b) => Math.hypot(NODES[a].x - 430, NODES[a].y - 300) - Math.hypot(NODES[b].x - 430, NODES[b].y - 300)); }

// ---- Telegram feeds + Telescope
const POSTS = [['Trade Nobody', '#2A2E31', '<span class="tag t">$BTC</span> reclaiming 86k — next stop 90k? Polymarket gives <b style="color:#EAFF00">43% YES</b> on a Friday close above $90k', 1, 1],
  ['Crypto Insider KR', '#FF6FA5', '<span class="tag">$SUI</span> ecosystem TVL at a new high, Korean volume up today', 0, 0],
  ['Whales Crypto Guide', '#5B8DEF', '🐋 Large <span class="tag t">$BTC</span> transfer to an exchange — 2,400 BTC moved in the last hour', 1, 0],
  ['Airdrop Hidden Gems', '#F0A24A', 'New points campaign is live — farm before the snapshot 🎯', 0, 0],
  ['Activity News', '#3FBF8F', '<span class="tag">$ETH</span> ETF flows positive for the 5th day in a row', 0, 0],
  ['Market Twits', '#9B7BFF', '<span class="tag t">$BTC</span> dominance 58.2% — alts still lagging behind', 1, 0]];
const pg_feed = addPage(H(`<div class="page">
  <div class="ptitle"><h2>Telegram Feeds</h2><span class="pill" id="feedCnt">Live · all channels</span></div>
  <div id="feed" style="position:absolute;left:30px;top:84px;width:700px;height:640px"></div>
  <div class="card" style="position:absolute;left:744px;top:84px;width:442px;height:620px;padding:18px">
   <div style="display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;margin-bottom:14px">🔭 Telescope <span style="font-size:13px;color:var(--muted);font-weight:500">search posts by coin</span></div>
   <div style="display:flex;gap:8px"><div class="inp" id="tsInp" style="width:290px"><span id="tsTxt">Search coin (e.g. BTC)</span><span class="caret" id="tsCaret"></span></div><div class="btn" id="tsBtn">Search</div></div>
   <div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin:18px 0 10px">TOP MARKETCAP</div>
   <div>${[['BTC', '#F7931A'], ['ETH', '#627EEA'], ['USDT', '#26A17B'], ['XRP', '#555'], ['BNB', '#F0B90B'], ['SOL', '#14C08A'], ['USDC', '#2775CA'], ['DOGE', '#C2A633'], ['TRX', '#E5484D']].map(([c, col]) => `<span class="chipc"><i style="background:${col}">${c[0]}</i>${c}</span>`).join('')}</div>
   <div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin:10px 0 10px">TRENDING</div>
   <div>${[['CAP', '#E5484D'], ['PUMP', '#17A45E'], ['OKB', '#555'], ['QUACK', '#D9B52C'], ['SUI', '#5B8DEF'], ['ASTER', '#9B6BEF'], ['MON', '#7A5AF8']].map(([c, col]) => `<span class="chipc"><i style="background:${col}">${c[0]}</i>${c}</span>`).join('')}</div>
  </div>
</div>`), T.feed, T.top, 'insight?tab=telegramfeeds', 'sb_feed', 'none');
const feedEls = POSTS.map(([n, col, txt, btc, star], i) => { const el = H(`<div class="post" ${star ? 'id="starPost"' : ''}><div class="pa" style="background:${col}">${n[0]}</div><div><div class="pn">${n}<span>${2 + i * 3}m ago</span></div><div class="pt">${txt}</div></div></div>`); $('#feed', pg_feed).appendChild(el); return { el, btc, star, tags: $$('.tag.t', el) }; });

// ---- Top 10 channels (short)
const TOP = [['Tonfan', 80909], ['Activity News', 27119], ['Tonfan 中文', 12008], ['CRYPTORJ', 11576], ['My Proxy', 10207], ['Airdrop Ninja', 10190], ['Dark Crypto', 9555], ['GEMHUNT', 9457], ['Coin Haonoto', 9192], ['Moon Vibes', 8284]];
const pg_top = addPage(H(`<div class="page"><div class="ptitle"><h2>Top 10 Channels</h2><span class="pill">Global</span><span class="pill" style="margin-left:auto;border-color:#EAFF00;color:#EAFF00">Ranked by recent avg. views</span></div>
  <svg id="crown" width="300" height="200" style="position:absolute;left:458px;top:40px;overflow:visible"></svg><div id="pods"></div></div>`), T.top, T.poly, 'insight?tab=top10', 'sb_top');
const ROWX = [[1], [2, 3], [4, 5, 6], [7, 8, 9, 10]];
const pods = []; ROWX.forEach((row, ri) => row.forEach((k, j) => { const [n, v] = TOP[k - 1]; const x = 608 - (row.length * 250 + (row.length - 1) * 16) / 2 + j * 266, y = 160 + ri * 124;
  const el = H(`<div class="pod ${k === 1 ? 'first' : ''}" style="left:${x}px;top:${y}px"><div class="r">#${k}</div><div class="nm"><span class="av" style="width:30px;height:30px;background:${['#12140F', '#3FBF8F', '#FF6FA5', '#F0A24A', '#9B7BFF', '#D9B52C', '#5B8DEF', '#FF5C60', '#2BD47D', '#8FCBFF'][k - 1]}"></span>${n}</div><div class="k">RECENT AVG. VIEWS</div><div class="v">0</div></div>`);
  $('#pods', pg_top).appendChild(el); pods.push({ el, v, k, ri, j, vEl: $('.v', el) }); }));
{ const cr = $('#crown', pg_top); const g = S('g', { id: 'crownRays' }, cr); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; S('line', { x1: 150 + Math.cos(a) * 46, y1: 100 + Math.sin(a) * 46, x2: 150 + Math.cos(a) * 80, y2: 100 + Math.sin(a) * 80, stroke: '#EAFF00', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .7 }, g); }
  S('path', { id: 'crownP', d: 'M118,116 L112,80 L134,96 L150,70 L166,96 L188,80 L182,116 Z', fill: '#EAFF00', stroke: '#0F1011', 'stroke-width': 4, 'stroke-linejoin': 'round' }, cr); }

// ---- GramFi-Polymarket
const pg_poly = addPage(H(`<div class="page">
  <div class="hero" style="display:grid;grid-template-columns:1.05fr 1fr;gap:30px"><div><div class="kick">TELEGRAM NATIVE PREDICTION MARKETS</div><h1>Bet on Polymarket directly through Telegram.</h1>
    <p>Market discovery, wallet, portfolio and copy trading — in one Telegram bot flow, without leaving the chat.</p>
    <div id="tgBtn">${LOGO(28)}<span id="tgLbl">GramFi-Polymarket TG Bot</span><span>↗</span></div></div>
   <div><div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);margin:4px 0 12px">TRENDING MARKETS · CRYPTO</div>
    <div class="mrow" id="mkBtc"><span>₿ Will BTC close above $90k on Friday?</span><span style="display:flex;gap:6px"><span class="yn y">Yes 43%</span><span class="yn n">No 57%</span></span></div>
    ${[['Ξ ETH above $4k on Friday?', 38], ['₿ BTC all time high by March 31, 2027?', 12], ['◎ SOL above $200 on Friday?', 46], ['Ξ ETH reach $5,000 by Dec 31, 2026?', 9], ['₿ BTC above $150k by June 30, 2027?', 3]].map(([q, y]) => `<div class="mrow"><span>${q}</span><span style="display:flex;gap:6px"><span class="yn y">Yes ${y}%</span><span class="yn n">No ${100 - y}%</span></span></div>`).join('')}
   </div></div>
</div>`), T.poly, 99, 'polymarket', '');

/* ---------------- PHONE (Telegram night theme) ---------------- */
const KB = rows => `<div class="kb">${rows.map(r => `<div class="rw" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(b => { const [lbl, id] = Array.isArray(b) ? b : [b, '']; return `<div class="kbtn"${id ? ` id="${id}"` : ''}>${lbl}</div>`; }).join('')}</div>`).join('')}</div>`;
const MAIN = (bal, pos, ids) => `<div class="bm">👋 <b>Alex</b> — Your Polymarket trading companion.<br><br>📋 <span class="k2">0x2b7e4c…9f0b</span><br>💵 <b>pUSD:</b> <span class="k2">${bal}</span> 🔄<br><br>📊 ${pos}<br><br><i style="color:#9FB2C5">💡 Paste a Polymarket link or type keywords to search any market.</i><span class="tm">12:00</span></div>` +
  KB([[['🎯 Markets', ids.m || ''], ['👥 Copy Trading', ids.c || '']], [['🤖 Autotrading', ids.a || '']], [['⚡ Perps', ids.p || '']], ['📊 Portfolio', '💼 Wallet'], ['⚙️ Settings', '💬 Support']]);
const CANDLES = (w, h) => { const r = rng(21); let y = h * .65, s = ''; for (let i = 0; i < 22; i++) { const up = r() > .38, b = 6 + r() * 16, x = 6 + i * (w - 12) / 22; const y2 = y + (up ? -b : b); const top = Math.min(y, y2), bh = Math.max(3, Math.abs(y2 - y)); s += `<line x1="${x + 4}" x2="${x + 4}" y1="${top - 6 - r() * 6}" y2="${top + bh + 6 + r() * 6}" stroke="${up ? '#2BD47D' : '#FF5C60'}" stroke-width="1.5"/><rect x="${x}" y="${top}" width="8" height="${bh}" rx="1.5" fill="${up ? '#2BD47D' : '#FF5C60'}"/>`; y = y2 - (up ? 2 : -1); } return `<svg width="${w}" height="${h}">${s}</svg>`; };
const CARD = (alertId, yesId) => `<div class="bm">📝 <b>Will BTC close above $90k on Friday?</b><br><br>💰 Current prices:<br>✅ Yes: <b>43¢</b><br>❌ No: <b>57¢</b><span class="tm">12:00</span></div>` + KB([[['✅ Yes 43¢', yesId]], ['❌ No 57¢'], ['📜 History'], ['🔖 Watch', ['🔔 Set Alert', alertId]], ['⬅️ Back']]);
const ST = [
  ['st_main1', D, MAIN('$248.60', 'No open positions', { m: 'b_markets' })],
  ['st_pm', D + .95, `<div class="bm">🎯 <b>Polymarket</b><br><br>Choose a section below to get started<span class="tm">12:00</span></div>` + KB([['📊 Select Category'], [['🔥 Trending Now', 'b_trending']], ['📈 Volume', '💧 Liquidity', '🆕 Newest'], ['⏳ Ending soon', '🏆 Competitive'], ['⬅️ Back']])],
  ['st_card', D + 1.95, CARD('', 'b_yes')],
  ['st_amt', D + 3.4, `<div class="bm">💰 <b>Buying ✅ Yes</b> · 43¢<br><br>📋 <b>Will BTC close above $90k on Friday?</b><br><br>How much would you like to bet?<span class="tm">12:00</span></div>` + KB([['$2', '$5', ['$10', 'b_10']], ['$50', '$100'], ['🔢 Custom amount'], ['⬅️ Back']])],
  ['st_conf', D + 4.4, `<div class="bm">⚡ <b>Confirm your bet</b><br><br>Will BTC close above $90k on Friday?<br><br>✅ Outcome: <b>YES</b><br>💰 Amount: <b>10.00 pUSD</b><br>💲 Price: <b>43.0¢</b> per share<br>📊 Shares: <b>≈ 23.26</b><span class="note">🏆 If YES wins, you receive <b>23.26 pUSD</b><br><span style="color:#9FB2C5;font-size:13px">each share pays 1 pUSD · before fees</span></span><span class="tm">12:00</span></div>` + KB([[['<span id="placeLbl">✅ Place order</span><span id="placeSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin1"></span>Placing order…</span>', 'b_place']], ['⬅️ Back']])],
  ['st_fill', D + 6.65, `<div class="bm">✅ <b>Order filled</b><br><br>23.26 <b>YES</b> shares @ 43¢<br>Cost: <b>10.00 pUSD</b> · Balance: <b>238.60 pUSD</b><br><br>📊 Will BTC close above $90k on Friday?<br><span class="lnk">Show</span> · <span class="lnk">Sell</span> · <span class="lnk">📤 PnL</span><span class="tm">12:00</span></div>` + KB([['◉ Open', '○ History', '○ Stats'], ['⬅️ Back']])],
  ['st_main2', T.copy + .03, MAIN('$238.60', '1 open position', { c: 'b_copy' })],
  ['st_top', T.copy + .9, `<div class="bm">📊 <b>Top Traders</b> · by PnL, 30 days<br><br>1. <b>sharp_sports</b> · <span class="k2">0x1111…1111</span><br>💰 PnL 30d: <b>+$7,120</b> · ROI <b>71%</b><br>📈 Win rate: <b>84%</b><br>└ <span class="lnk" id="a_add">➕ Add</span> &nbsp;👀 <span class="lnk">View</span><br><br>2. <b>macro_mind</b> · <span class="k2">0x2222…2222</span><br>💰 PnL 30d: <b>+$4,380</b> · ROI <b>14%</b><span class="tm">12:00</span></div>` + KB([['⬅️ Back']])],
  ['st_copied', T.copy + 2.15, `<div class="bm">✅ <b>You're now copying sharp_sports</b><br><br>Their new Polymarket bets will be mirrored in your account automatically.<br><br>👥 My traders: <b>1</b> · <span class="lnk">sharp_sports</span><span class="tm">12:00</span></div>` + KB([['⚙️ Copy settings'], ['⬅️ Back']])],
  ['st_main3', T.auto + .03, MAIN('$238.60', '1 open position · 1 trader copied', { a: 'b_auto' })],
  ['st_lab', T.auto + .9, `<div class="bm">🧪 <b>Strategy Lab</b> · BTC 5m Up/Down<span class="note" style="margin-bottom:6px">Buy the side trading at <b id="bandV">80–96¢</b> in the last 150 s of a round · <b>$2</b> per trade · stop after 4 losses in a row</span><div class="mono" style="font-size:13.5px;line-height:1.6;color:#C9D6E2">${[['Price band', '80–96¢'], ['Entry window', 'last 150s'], ['Size', '$2.00'], ['Daily cap', '$20'], ['Mode', 'paper first']].map(([k, v]) => `<div class="lr"><span style="color:var(--tg)">${k}</span> ${v}</div>`).join('')}</div><span class="tm">12:00</span></div>` + KB([['Asset', 'Side', ['Price band', 'b_band']], ['▶️ Start on paper'], ['⬅️ Back']])],
  ['st_main4', T.perp + .03, MAIN('$238.60', '1 open position · 1 trader copied', { p: 'b_perps' })],
  ['st_perp', T.perp + .9, `<div class="bm">⚡ <b>Perpetual futures</b> · BTC-USD<br><b style="font-size:22px">86,458</b> <b style="color:#2BD47D">+1.48%</b> <span class="lnk">15m</span><div style="margin:8px 0 6px;background:#0F1A25;border-radius:12px;padding:8px">${CANDLES(360, 110)}</div>Leverage up to <b>×50</b> · long or short<span class="tm">12:00</span></div>` + KB([[['📈 Long', 'b_long'], '📉 Short'], ['⬅️ Back', '🕒 15m', '🔄']])],
  ['st_long', T.perp + 2.0, `<div class="bm">📈 <b>Long BTC ×3</b> — profits if BTC rises<br><br>Margin <b>$22.50</b> · Position <b>$67.50</b><br>Liquidation ≈ <b>57,639</b><span class="tm">12:00</span></div>` + KB([['$10', '$25', '$50', 'Max'], ['×1', '✓ ×3', '×10', '×50'], [['<span id="openLbl">✅ Open long</span><span id="openSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin2"></span>Opening…</span>', 'b_open']], ['⬅️ Back']])],
  ['st_open', T.perp + 3.7, `<div class="bm">✅ <b>Long BTC ×3 opened</b><br><br>Margin $22.50 · entry <b>86,460.0</b><br>Liquidation ≈ 57,639<span class="tm">12:00</span></div>` + KB([['📍 My positions'], ['⬅️ Back']])],
  ['st_card2', T.alert + .03, CARD('b_alert', '')],
  ['st_aopt', T.alert + .9, `<div class="bm">🔔 <b>Will BTC close above $90k on Friday?</b><br><br>Alert me when:<span class="tm">12:00</span></div>` + KB([[['✅ YES rises to 45¢ 📈', 'b_yesup']], ['✅ YES falls to 40¢ 📉'], ['❌ NO rises to 60¢ 📈'], ['⬅️ Back']])],
  ['st_aset', T.alert + 1.8, `<div class="bm">🔔 <b>Alert set</b><br><br>I'll ping you when <b>YES</b> on <i>Will BTC close above $90k on Friday?</i> rises to <b>45¢</b> 📈<span class="tm">12:00</span></div>` + KB([['🔔 My alerts'], ['⬅️ Back']])],
];
const phone = H(`<div class="w"><div id="phone"><div id="screen"><div class="wall"></div><div class="island"></div>
  <div class="status"><span>9:41</span><span>●●● ▮</span></div>
  <div class="tgh"><span class="bk">‹</span>${LOGO(44)}<div><div class="nm">GramFi</div><div class="sb">bot</div></div><span style="margin-left:auto;color:var(--tg);font-size:22px">⋮</span></div>
  <div id="chat">${ST.map(([id, , html]) => `<div class="st" id="${id}">${html}</div>`).join('')}
   <div id="later" style="position:absolute;left:50%;top:30px;transform:translateX(-50%);background:rgba(23,33,43,.95);color:#9FB2C5;border-radius:999px;padding:6px 14px;font-size:14px;font-weight:600">🕒 later…</div></div>
  <div class="push" id="push">${LOGO(40)}<div><div style="display:flex;justify-content:space-between"><b>GramFi</b><span style="color:#9AA3AD;font-size:12px">now</span></div>🔔 <b>YES reached 45¢</b> 📈 · Will BTC close above $90k on Friday?</div></div>
  <div class="inbar"><span class="menuBtn">☰ Menu</span><div class="ph">Message</div><span style="font-size:22px">🎤</span></div>
</div></div></div>`);
cam.appendChild(phone);
const stEls = ST.map(([id, t]) => ({ el: $('#' + id), t, btns: $$('.kbtn', $('#' + id)) }));
const chips = [
  { t: D + 6.75, out: T.copy - .15, el: H(`<div class="w"><div class="chip"><div class="k">POSITION · WILL BTC CLOSE ABOVE $90K?</div><div class="v">23.26 <span style="color:#2BD47D">YES</span></div><div style="font-size:14px;color:#AEB4AA;margin-top:4px">pays 23.26 pUSD if YES wins · cost 10.00</div></div></div>`), dx: -520, dy: 320 },
  { t: T.copy + 2.25, out: T.auto - .15, el: H(`<div class="w"><div class="chip" style="display:flex;gap:16px;align-items:center"><span class="av" style="width:56px;height:56px"></span><div><div class="k">COPYING</div><div style="font-family:Unbounded;font-weight:700;font-size:24px;margin:2px 0">sharp_sports</div><div style="font-size:14px"><b class="up">+$7,120</b> PnL 30d · <b>84%</b> win rate</div></div></div></div>`), dx: -530, dy: 330 },
  { t: T.auto + 1.9, out: T.perp - .15, el: H(`<div class="w"><div class="chip" style="width:390px"><div class="k">PRICE BAND · BTC 5m</div><svg width="346" height="64" style="margin-top:10px"><line x1="10" y1="30" x2="336" y2="30" stroke="#2A2E31" stroke-width="8" stroke-linecap="round"/><line id="bandL" y1="30" y2="30" stroke="#EAFF00" stroke-width="8" stroke-linecap="round"/><circle id="bandA" cy="30" r="13" fill="#EAFF00" stroke="#0F1011" stroke-width="4"/><circle id="bandB" cy="30" r="13" fill="#EAFF00" stroke="#0F1011" stroke-width="4"/><text id="bandTa" y="62" font-family="JetBrains Mono" font-weight="700" font-size="14" fill="#fff" text-anchor="middle">80¢</text><text id="bandTb" y="62" font-family="JetBrains Mono" font-weight="700" font-size="14" fill="#fff" text-anchor="middle">96¢</text></svg></div></div>`), dx: -520, dy: 320 },
  { t: T.perp + 3.8, out: T.alert - .15, el: H(`<div class="w"><div class="chip"><div class="k">PERPS · LONG BTC ×3</div><div class="v">86,460.0</div><div style="font-size:14px;color:#AEB4AA;margin-top:4px">entry · margin $22.50</div></div></div>`), dx: -510, dy: 320 },
  { t: T.alert + 1.9, out: T.fin - .15, el: H(`<div class="w"><div class="chip" style="display:flex;gap:16px;align-items:center"><svg width="64" height="64" viewBox="0 0 64 64" id="bell"><path d="M32 8c-10 0-16 8-16 18v10l-6 8h44l-6-8V26c0-10-6-18-16-18z" fill="#EAFF00" stroke="#0F1011" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="52" r="6" fill="#EAFF00" stroke="#0F1011" stroke-width="3"/></svg><div><div class="k">PRICE ALERT</div><div style="font-family:Unbounded;font-weight:700;font-size:26px">YES ≥ 45¢</div></div></div></div>`), dx: -520, dy: 320 },
];
chips.forEach(c => cam.appendChild(c.el));

/* ---------------- OVERLAY: captions (question + one line of explanation) ---------------- */
const CAPS = [
  { in: T.A + .3, out: T.n1 - .35, k: 'MOST POPULAR COIN', t: 'What is Telegram <em>talking about?</em>', s: 'Tile size = share of Telegram mentions' },
  { in: T.n1 + .1, out: T.n2 - .25, k: 'NARRATIVE MINDSHARE', t: 'Which <em>themes</em> dominate', s: '' },
  { in: T.n2 + .1, out: T.n3 - .25, k: 'CRYPTO BUBBLES', t: '24H moves <em>at a glance</em>', s: '' },
  { in: T.n3 + .1, out: T.ctry - .3, k: 'CORRELATION', t: 'BTC price vs. <em>Telegram mentions</em>', s: '' },
  { in: T.ctry + .15, out: T.map - .3, k: 'COUNTRY POPULAR COINS', t: 'Where is <em>BTC</em> being discussed?', s: 'Top coins in each country\'s channels' },
  { in: T.map + .15, out: T.feed - .5, k: 'CHANNEL MAP', t: 'Who is <em>driving</em> the conversation?', s: 'Lines = messages forwarded between channels' },
  { in: T.feed + .15, out: T.top - .3, k: 'TELEGRAM FEEDS · TELESCOPE', t: 'What exactly are they <em>saying?</em>', s: 'Every post that mentions a coin, in one place' },
  { in: T.top + .1, out: T.poly - .25, k: 'TOP 10 CHANNELS', t: 'The channels people <em>read most</em>', s: '' },
  { in: T.poly + .25, out: T.poly + 1.45, k: 'GRAMFI × POLYMARKET', t: 'Have a view? <em>Act on it.</em>', s: 'GramFi\'s Polymarket bot lives in Telegram' },
  { in: D + .25, out: T.copy - .4, k: 'POLYMARKET BOT', t: 'The same market — <em>in a few taps</em>', s: 'Pick a side, set an amount, confirm', side: 1 },
  { in: T.copy + .12, out: T.auto - .35, k: 'COPY TRADING', t: 'Follow <em>top wallets</em>', s: 'Mirror their new bets automatically', side: 1 },
  { in: T.auto + .12, out: T.perp - .35, k: 'AUTOTRADING', t: 'Rules that <em>trade for you</em>', s: 'Every rule starts on paper', side: 1 },
  { in: T.perp + .12, out: T.alert - .35, k: 'PERPS', t: 'Long or short BTC, <em>up to ×50</em>', s: 'Perpetual futures — not a yes/no bet', side: 1 },
  { in: T.alert + .12, out: T.fin - .35, k: 'PRICE ALERTS', t: 'Never miss <em>the move</em>', s: 'Get pinged when a price hits your level', side: 1 },
];
const capsEl = $('#caps');
CAPS.forEach(c => {
  const words = c.t.replace(/<em>(.*?)<\/em>/g, (m, g) => '<em>' + g.replace(/ /g, '\u0001') + '</em>').split(' ').map(w => w.replace(/\u0001/g, ' '));
  const el = H(`<div class="cap"><div class="cp"><div class="kk"><i></i><span class="kt"></span></div><div class="tt">${words.map((w, j) => `<span>${w}${j < words.length - 1 ? ' ' : ''}</span>`).join('')}</div>${c.s ? `<div class="sb">${c.s}</div>` : ''}</div></div>`);
  if (c.side) { el.style.top = '330px'; el.style.width = '740px'; $('.tt', el).style.fontSize = '54px'; }
  capsEl.appendChild(el); c.el = el; c.cp = $('.cp', el); c.words = $$('.tt > span', el); c.kt = $('.kt', el); c.sb = $('.sb', el);
});

/* ---------------- INTRO: Telegram noise -> GramFi sorts it into the treemap ---------------- */
const intro = $('#intro');
const NMS = [['Whales Guide', '🐋 <span class="tg">$BTC</span> 2,400 moved to exchange'], ['Crypto KR', '<span class="tg">$SUI</span> volume up in Korea'], ['Airdrop Gems', 'new points campaign live 🎯'], ['Trade Nobody', '<span class="tg">$BTC</span> 86k → 90k?'],
  ['Tonfan Trade', '<span class="tg">$TON</span> vote ends tomorrow'], ['Moon Vibes', 'who is buying <span class="tg">$CAP</span>?'], ['Activity News', '<span class="tg">$ETH</span> ETF flows positive'], ['Dark Crypto', '<span class="tg">$PUMP</span> meta is back'],
  ['GEMHUNT', 'narrative: Layer 1 🔥'], ['Market Twits', '<span class="tg">$BTC</span> dominance 58%'], ['Coin Haonoto', 'gm ☀️ wagmi'], ['My Proxy', '<span class="tg">$QUACK</span> listing?']];
const nmsgs = []; { const r = rng(17); for (let i = 0; i < 48; i++) { const [n, txt] = NMS[i % NMS.length]; const el = H(`<div class="nmsg"><b>${n}</b>${txt}</div>`); intro.appendChild(el); nmsgs.push({ el, col: i % 7, layer: i % 3, off: r() * 1400, sp: 160 + r() * 140, tile: i < COINS.length ? i : -1 }); } }
intro.insertAdjacentHTML('beforeend', `<div id="iscrim" style="position:absolute;inset:0;background:radial-gradient(900px 420px at 50% 50%,rgba(9,10,8,.92),rgba(9,10,8,.35) 70%,transparent)"></div>
  <div class="ctxt" id="it1" style="top:440px;font-size:66px">Crypto alpha lives on <span style="color:#6AB3F3">Telegram</span>.</div>
  <div class="ctxt" id="it2" style="top:540px;font-size:36px;font-weight:600;color:#AEB4AA">…scattered across thousands of channels.</div>
  <div class="ctxt" id="it3" style="top:470px;font-size:60px;display:flex;justify-content:center;align-items:center;gap:26px">${LOGO(96)}<span>GramFi turns the chatter into <span style="color:#EAFF00">signal</span>.</span></div>
  <svg id="iplane" width="1920" height="1080" style="position:absolute;inset:0;overflow:visible"><g id="itrail"></g><g id="imark">${MARK('#EAFF00', '#090A08')}</g></svg>`);
const itrail = $('#itrail'); const trailDots = []; for (let i = 0; i < 70; i++) trailDots.push(S('circle', { r: 3.5, fill: '#EAFF00' }, itrail));
const planeAt = u => [lerp(-200, 2150, u), 600 - Math.sin(u * Math.PI) * 180 + Math.sin(u * 9) * 18];

/* ---------------- OUTRO: logo in the centre, every feature on an orbit ---------------- */
const FEATS = ['Most Popular Coin', 'Narrative Mindshare', 'Country Popular Coins', 'Crypto Bubbles', 'Correlation', 'Channel Map', 'Telegram Feeds', 'Telescope', 'Top 10 Channels', 'Polymarket Bot', 'Copy Trading', 'Autotrading', 'Perps', 'Price Alerts'];
const outro = $('#outro');
outro.innerHTML = `<svg width="1920" height="1080" style="position:absolute;inset:0"><ellipse id="orb1" cx="960" cy="520" rx="760" ry="300" fill="none" stroke="rgba(234,255,0,.22)" stroke-width="2" pathLength="1"/><ellipse id="orb2" cx="960" cy="520" rx="560" ry="215" fill="none" stroke="rgba(234,255,0,.12)" stroke-width="2" pathLength="1" stroke-dasharray=".006 .012"/></svg>
  <div id="oCore" style="position:absolute;left:0;right:0;top:300px;text-align:center">
   <div id="oLogo" style="display:inline-block">${LOGO(170)}</div>
   <div id="oCta" style="font-family:Unbounded;font-weight:800;font-size:64px;letter-spacing:-.025em;color:#fff;margin-top:22px">Try <span style="color:#EAFF00">GramFi</span> today</div>
   <div id="oUrl" style="display:inline-block;margin-top:22px;font-family:'JetBrains Mono';font-weight:700;font-size:30px;background:#EAFF00;color:#12140F;border-radius:999px;padding:14px 34px">gramfi.ai</div></div>
  ${FEATS.map((f, i) => `<div class="ochip" data-i="${i}"><i style="background:${i < 9 ? (i < 5 ? '#EAFF00' : '#8B6CFF') : '#2EA6FF'}"></i>${f}</div>`).join('')}`;
const ochips = $$('.ochip', outro);

/* ======================================================================
   CURSOR (web) / TOUCH (mobile) EVENTS
   ====================================================================== */
const CUR = [
  { t: T.A + .45, pt: [2060, 1180] },
  { t: T.A + 1.45, sel: '#tab24', c: 1 },
  { t: T.A + 2.6, sel: '#tile_BTC', fx: .52, fy: .78 },
  { t: T.n1 - .2, pt: [1980, 1150] },
  { t: T.ctry + .5, pt: [1990, 1130] },
  { t: T.ctry + 1.2, sel: '#c_kr', fx: .4, c: 1 },
  { t: T.ctry + 2.3, sel: '#krBtc', fx: .9, fy: .8 },
  { t: T.map - .15, sel: '#sb_map', fx: .3, c: 1 },
  { t: T.map + .7, sel: '#mapInp', fx: .25, c: 1 },
  { t: T.map + 1.75, sel: '#mapBtn', c: 1 },
  { t: T.map + 3.4, sel: '#mapInfo', fx: .85, fy: .5 },
  { t: T.map + 4.4, sel: '#viewPosts', fx: .55, c: 1 },
  { t: T.feed + .55, sel: '#tsInp', fx: .3, c: 1 },
  { t: T.feed + 1.2, sel: '#tsBtn', c: 1 },
  { t: T.feed + 2.2, sel: '#starPost', fx: .78, fy: .85 },
  { t: T.top - .15, sel: '#sb_top', fx: .3, c: 1 },
  { t: T.poly - .15, sel: '#nav_poly', c: 1 },
  { t: T.poly + .75, sel: '#mkBtc', fx: .85, fy: .7 },
  { t: T.poly + 1.4, sel: '#tgBtn', fx: .45, c: 1 },
];
const TOUCH = [
  { t: D + .4, sel: '#st_main1 .bm', fx: .75, fy: .9 },
  { t: D + .85, sel: '#b_markets', c: 1 }, { t: D + 1.85, sel: '#b_trending', c: 1 }, { t: D + 3.3, sel: '#b_yes', c: 1 }, { t: D + 4.3, sel: '#b_10', c: 1 },
  { t: D + 5.95, sel: '#b_place', c: 1 }, { t: D + 7.6, sel: '#st_fill .bm', fx: .8, fy: .85 },
  { t: T.copy + .8, sel: '#b_copy', c: 1 }, { t: T.copy + 2.05, sel: '#a_add', c: 1 },
  { t: T.auto + .8, sel: '#b_auto', c: 1 }, { t: T.auto + 1.8, sel: '#b_band', c: 1 },
  { t: T.perp + .8, sel: '#b_perps', c: 1 }, { t: T.perp + 1.9, sel: '#b_long', c: 1 }, { t: T.perp + 3.0, sel: '#b_open', c: 1 },
  { t: T.alert + .8, sel: '#b_alert', c: 1 }, { t: T.alert + 1.7, sel: '#b_yesup', c: 1 },
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
   CAMERA — calm while reading, moves between actions
   ====================================================================== */
const PH = { x: 330, y: 0, z: 300 };
const CAM = [
  { t: 0, x: 0, y: -110, d: -170, rx: 7, ry: -6, rz: 0 }, { t: T.A - .1, x: 0, y: -110, d: -170, rx: 7, ry: -6, rz: 0, hold: 1 },
  { t: T.A + 1.45, x: -150, y: -200, d: 110, rx: 6, ry: -3, rz: 0 },
  { t: T.A + 2.6, x: -170, y: -60, d: 150, rx: 5, ry: 3, rz: 0, hold: 1 }, { t: T.n1 - .4, x: -150, y: -60, d: 140, rx: 5, ry: 4, rz: 0, hold: 1 },
  { t: T.n1 + .2, x: 0, y: -100, d: -150, rx: 7, ry: -7, rz: 0 }, { t: T.ctry - .3, x: 30, y: -100, d: -130, rx: 7, ry: 6, rz: 0 },
  { t: T.ctry + .3, x: -40, y: -90, d: -90, rx: 7, ry: -7, rz: 0 }, { t: T.ctry + 1.2, x: 140, y: -120, d: 60, rx: 6, ry: -6, rz: 0 },
  { t: T.ctry + 2.3, x: 120, y: 40, d: 80, rx: 5, ry: -5, rz: 0, hold: 1 }, { t: T.map - .45, x: 110, y: 40, d: 70, rx: 5, ry: -4, rz: 0, hold: 1 },
  { t: T.map - .1, x: -260, y: -80, d: -40, rx: 6, ry: 8, rz: .6 }, { t: T.map + .7, x: 150, y: -200, d: 140, rx: 6, ry: -6, rz: 0 },
  { t: T.map + 1.75, x: 230, y: -190, d: 150, rx: 6, ry: -7, rz: 0 }, { t: T.map + 2.9, x: 60, y: 30, d: 260, rx: 4, ry: 0, rz: 0 },
  { t: T.map + 4.2, x: 90, y: 40, d: 250, rx: 4, ry: 2, rz: 0, hold: 1 }, { t: T.feed + .3, x: 0, y: -60, d: 40, rx: 6, ry: -5, rz: 0 },
  { t: T.feed + 1.2, x: 230, y: -200, d: 130, rx: 6, ry: -6, rz: 0 }, { t: T.feed + 2.2, x: -180, y: -170, d: 210, rx: 5, ry: 4, rz: 0, hold: 1 },
  { t: T.top - .45, x: -170, y: -170, d: 200, rx: 5, ry: 4, rz: 0, hold: 1 }, { t: T.top + .3, x: 0, y: -90, d: -120, rx: 7, ry: -7, rz: 0 },
  { t: T.poly + .2, x: 0, y: -90, d: -110, rx: 7, ry: 6, rz: 0 }, { t: T.poly + .9, x: 120, y: -120, d: 40, rx: 6, ry: -4, rz: 0 },
  { t: T.poly + 1.4, x: -150, y: -10, d: 90, rx: 6, ry: 5, rz: .4 }, { t: D - 1.0, x: 40, y: -20, d: -380, rx: 5, ry: -10, rz: -1 }, { t: D - .2, x: 110, y: 0, d: -250, rx: 4, ry: -14, rz: -1 },
];
{
  const pR = $('#phone');
  const offs = (el, root) => { let x = 0, y = 0, n = el; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return [x, y, el.offsetWidth, el.offsetHeight]; };
  const mob = [D, T.copy, T.auto, T.perp, T.alert];
  mob.forEach((s, i) => {
    const e2 = mob[i + 1] ?? T.fin;
    if (i) CAM.push({ t: s + .1, x: PH.x - 300, y: 20, d: -110, rx: 4, ry: i % 2 ? -16 : -9, rz: -.5 });
    TOUCH.filter(e => e.el && e.t > s + .3 && e.t < e2 - .2).forEach(e => { const [x, y, ww, hh] = offs(e.el, pR), ly = y + hh * .5 - 470, lx = x + ww * .5 - 225;
      CAM.push({ t: e.t, x: PH.x - 270 + lx * .3, y: ly * .5, d: 70, rx: 4, ry: -11 + lx / 225 * 3, rz: -.3 }); });
  });
  CAM.push({ t: T.fin + .1, x: PH.x - 260, y: 0, d: -300, rx: 5, ry: -10, rz: -.6 }, { t: T.fin + 1.0, x: 0, y: 0, d: -1400, rx: 10, ry: 0, rz: 0 }, { t: DUR, x: 0, y: 0, d: -1450, rx: 10, ry: 0, rz: 0, hold: 1 });
  CAM.sort((a, b) => a.t - b.t);
  for (let i = CAM.length - 1; i > 0; i--) if (CAM[i].t - CAM[i - 1].t < .25) CAM.splice(i - 1, 1);
}
function browserPose(t) {
  const a = E.io(seg(t, T.poly + 1.5, D - .2));
  return { x: lerp(0, -880, a), y: lerp(0, 80, a), z: lerp(0, -1500, a), ry: lerp(0, 26, a), op: lerp(1, .45, a) * (1 - seg(t, T.fin, T.fin + .6)), bl: lerp(0, 7, a) };
}
const BTN_W = { x: -330, y: 120, z: 20 };
function phonePose(t) {
  const t0 = T.poly + 1.5; if (t < t0) return null;
  const f = seg(t, t0, D - .08), fe = E.o5(f);
  let x = lerp(BTN_W.x, PH.x, E.io(f)), y = lerp(BTN_W.y, PH.y, E.io(f)) - Math.sin(f * Math.PI) * 110, z = lerp(BTN_W.z, PH.z, fe);
  let s = lerp(.08, 1, E.ob(seg(t, t0, D + .05))), ry = lerp(-70, -6, fe), rz = lerp(14, 0, fe), rx = lerp(30, 0, fe);
  const bob = seg(t, D, D + 1); y += Math.sin(t * 1.3) * 6 * bob;
  const o = E.io(seg(t, T.fin, T.fin + .9)); z = lerp(z, -900, o); s = lerp(s, .5, o);
  return { x, y, z, s, rx, ry, rz, op: clamp(seg(t, t0, t0 + .12)) * (1 - seg(t, T.fin + .3, T.fin + .9)) };
}

/* ======================================================================
   SOUND EVENTS — distinct sounds: click / tap / swish (page) / confirm / notify / landing
   ====================================================================== */
ev(.05, 'rumble', { len: 2.6 }); ev(2.45, 'whoosh', { len: 1.3, up: 1 }); ev(3.0, 'sparkle'); ev(4.3, 'logo');
ev(T.A + 1.5, 'morph');
[T.n1, T.n2, T.n3, T.ctry, T.top].forEach(t => ev(t - .04, 'swish'));
ev(T.ctry + 1.25, 'whoosh', { len: .8, up: 0 }); for (let k = 0; k < 12; k++) ev(T.map + .82 + k * .055, 'key'); ev(T.map + 1.8, 'whoosh', { len: 1.0, up: 0 });
ev(T.map + 4.45, 'whoosh', { len: .55, up: 1 }); for (let k = 0; k < 3; k++) ev(T.feed + .65 + k * .09, 'key'); ev(T.feed + 1.25, 'morph');
ev(T.poly - .1, 'swish'); ev(T.poly + 1.5, 'whoosh', { len: 1.6, up: 1 }); ev(D, 'land');
ST.forEach(([, t]) => { if (t > D + .5) ev(t, 'pop'); });
ev(D + 6.0, 'tick', { len: .6 }); ev(D + 6.65, 'confirm'); ev(T.copy + 2.15, 'confirm'); ev(T.auto + 1.9, 'morph');
ev(T.perp + 3.05, 'tick', { len: .6 }); ev(T.perp + 3.7, 'confirm'); ev(T.alert + 1.8, 'confirm'); ev(T.alert + 3.0, 'notify');
ev(T.fin, 'whoosh', { len: 1.2, up: 0 }); ev(T.fin + .5, 'logo'); FEATS.forEach((f, i) => ev(T.fin + .9 + i * B / 2, 'blip'));

/* ======================================================================
   RENDER
   ====================================================================== */
function setW(el, x, y, z, ww, hh, extra = '') { el.style.transform = `translate3d(${x - ww / 2}px,${y - hh / 2}px,${z}px) ${extra}`; }
function vis(el, op) { el.style.opacity = op; el.style.visibility = op <= .001 ? 'hidden' : 'visible'; }

function renderAt(t) {
  t = clamp(t, 0, DUR - 1e-6);
  let gi = 0; while (gi < GROUPS.length - 1 && GROUPS[gi + 1][0] <= t) gi++;
  const g0 = GROUPS[Math.max(0, gi - 1)], g1 = GROUPS[gi], gq = gi ? E.io(seg(t, g1[0] - .3, g1[0] + .9)) : 1;
  const gA = $('#glowA'), gB = $('#glowB');
  gA.style.background = `radial-gradient(closest-side, ${g0[1]}, transparent)`; gA.style.opacity = g0[2] * (1 - gq);
  gB.style.background = `radial-gradient(closest-side, ${g1[1]}, transparent)`; gB.style.opacity = g1[2] * gq;
  const gx = 600 + Math.sin(t * .15) * 200, gy = -250 + Math.cos(t * .11) * 120;
  gA.style.transform = gB.style.transform = `translate(${gx}px,${gy}px)`;
  const C = {}; for (const f of ['x', 'y', 'd', 'rx', 'ry', 'rz']) C[f] = spline(CAM, t, f);
  cam.style.transform = `translateZ(${C.d}px) rotateX(${C.rx}deg) rotateY(${C.ry}deg) rotateZ(${C.rz}deg) translate3d(${-C.x}px,${-C.y}px,0)`;
  $('#grid').style.transform = `translate(${(-C.x * .08) % 34}px,${(-C.y * .08) % 34}px)`;
  const focusZ = t < D - 1 ? 0 : PH.z;
  const busy = (t > T.A + 1.4 && t < T.A + 2.4) || (t > T.map + 1.7 && t < T.map + 3) || (t > T.feed + 1.2 && t < T.feed + 2.0);
  DECO.forEach(dc => {
    const inn = seg(t, dc.a - .05, dc.a + 1.2), out = seg(t, dc.b - .1, dc.b + .5);
    if (inn <= 0 || out >= 1) { vis(dc.el, 0); return; }
    dc.el.style.transform = `translate3d(${(dc.mob ? PH.x - 200 : 0) - 1800}px,-1200px,-800px) rotate(${(t - dc.a) * .5}deg)`;
    vis(dc.el, (1 - E.io(out)) * (busy ? .5 : 1));
    dc.paths.forEach((p, j) => { const q = E.o(seg(inn, (j % 9) * .05, (j % 9) * .05 + .6)); p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = (1 - q).toFixed(4); });
  });
  const envOp = .7 * seg(t, T.A, T.A + 1) * (1 - seg(t, T.fin, T.fin + .6));
  bubs.forEach(b => {
    const x = b.x + Math.sin(t * b.sp + b.ph) * 30, y = b.y + Math.cos(t * b.sp * .8 + b.ph) * 22 - t * 4, zc = b.z + C.d;
    const bl = Math.min(14, Math.abs(b.z - focusZ) * .006), near = zc > 1700 ? 0 : zc > 1350 ? (1700 - zc) / 350 : 1;
    b.el.style.transform = `translate3d(${x}px,${y}px,${b.z}px) scale(${b.s})`; b.el.style.filter = bl > .4 ? `blur(${bl.toFixed(1)}px)` : 'none';
    vis(b.el, near * envOp);
  });
  const Bp = browserPose(t);
  setW(browser, Bp.x, Bp.y, Bp.z, 1440, 830, `rotateY(${Bp.ry}deg)`);
  browser.style.filter = Bp.bl > .2 ? `blur(${Bp.bl.toFixed(1)}px)` : 'none';
  vis(browser, Bp.op * E.o(seg(t, 3.9, 4.9)));
  if (t < T.fin + .7) renderWeb(t);
  renderIntro(t);
  renderPhone(t);
  CAPS.forEach(c => {
    if (!(t >= c.in - .1 && t <= c.out + .7)) { vis(c.el, 0); return; }
    vis(c.el, 1);
    c.words.forEach((wd, j) => {
      const q = seg(t, c.in + j * .05, c.in + j * .05 + .5), o = seg(t, c.out + j * .025, c.out + j * .025 + .28), e = E.o5(q), eo = E.i(o);
      wd.style.transform = `translateY(${(1 - e) * 50 - eo * 40}px) rotateX(${(1 - e) * -70 + eo * 50}deg)`;
      wd.style.opacity = clamp(q * 1.6) * (1 - eo); wd.style.filter = (1 - e) > .02 || eo > .02 ? `blur(${((1 - e) * 8 + eo * 8).toFixed(1)}px)` : 'none';
    });
    if (c.sb) { const q = E.o5(seg(t, c.in + .35, c.in + .8)); c.sb.style.opacity = q * (1 - seg(t, c.out, c.out + .25)); c.sb.style.transform = `translateY(${(1 - q) * 12}px)`; }
    const pi = E.o5(seg(t, c.in - .04, c.in + .3)), po = E.io(seg(t, c.out + .15, c.out + .5));
    c.cp.style.opacity = pi * (1 - po); c.cp.style.transform = `translateX(${(1 - pi) * -40 - po * 30}px) scale(${.96 + .04 * pi})`;
    c.kt.textContent = c.k.slice(0, Math.round(c.k.length * seg(t, c.in, c.in + .35)));
  });
  renderOutro(t);
  const webOn = t >= T.A + .2 && t < T.poly + 1.55, mobOn = t >= D + .05 && t < T.fin + .2;
  if (webOn) { const [cx, cy] = pathAt(CUR, t); let press = 0; for (const e of CUR) if (e.c) press = Math.max(press, Math.sin(Math.PI * seg(t, e.t - .04, e.t + .18)));
    const sc = 1 - press * .14; curEl.style.transform = `translate(${cx - 4 * sc}px,${cy - 3 * sc}px) scale(${sc}) rotate(${-press * 4}deg)`;
    curEl.style.opacity = seg(t, T.A + .2, T.A + .45) * (1 - seg(t, T.poly + 1.45, T.poly + 1.55)); } else curEl.style.opacity = 0;
  if (mobOn) { const [cx, cy] = pathAt(TOUCH, t); let press = 0; for (const e of TOUCH) if (e.c) press = Math.max(press, Math.sin(Math.PI * seg(t, e.t - .05, e.t + .15)));
    touchEl.style.transform = `translate(${cx}px,${cy}px) scale(${1 - press * .25})`; touchEl.style.opacity = (.55 + .45 * press) * seg(t, D + .05, D + .3) * (1 - seg(t, T.fin - .05, T.fin + .2)); } else touchEl.style.opacity = 0;
  ripEls.forEach(({ e, r }) => {
    const q = seg(t, e.t, e.t + .45); if (q <= 0 || q >= 1) { vis(r, 0); return; }
    const p = tpos(e), s = 18 + E.o(q) * 70; r.style.left = (p[0] - s / 2) + 'px'; r.style.top = (p[1] - s / 2) + 'px'; r.style.width = r.style.height = s + 'px'; vis(r, (1 - q) * .9);
  });
  $('#flash').style.opacity = t >= D ? .5 * Math.exp(-(t - D) * 8) : 0;
}

function renderIntro(t) {
  const io = 1 - seg(t, 4.75, 5.15);
  vis(intro, io > 0 ? 1 : 0); if (io <= 0) return;
  intro.style.opacity = io;
  const sweep = seg(t, 2.45, 3.6);
  nmsgs.forEach(m => {
    const colX = 40 + m.col * 270 + (m.layer - 1) * 30, sc = [.78, .9, 1.04][m.layer];
    const y = 1150 - ((t * m.sp + m.off) % 1500), x = colX;
    const ts = 2.45 + (colX / 1920) * 1.1, q = E.io(seg(t, ts, ts + .9));
    const el = m.el;
    if (m.tile >= 0 && q > 0) {
      const tr = tiles[m.tile].el.getBoundingClientRect();
      el.style.transform = 'none'; el.style.left = lerp(x, tr.left, q) + 'px'; el.style.top = lerp(y, tr.top, q) + 'px'; el.style.width = lerp(300 * sc, tr.width, q) + 'px'; el.style.height = lerp(74 * sc, tr.height, q) + 'px';
      el.style.background = q > .5 ? tileCol(COINS[m.tile][3]) : '#15181A'; el.style.borderRadius = '10px'; el.style.color = q > .5 ? 'transparent' : '';
      el.style.opacity = 1 - seg(t, 4.55, 4.95); el.style.filter = 'none';
    } else {
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = '300px'; el.style.height = '74px'; el.style.transform = `scale(${sc})`;
      el.style.opacity = (m.layer === 0 ? .45 : m.layer === 1 ? .7 : .95) * (1 - E.io(q)) * seg(t, 0, .4);
      el.style.filter = m.layer === 0 ? 'blur(3px)' : 'none';
    }
  });
  $('#iscrim').style.opacity = seg(t, .1, .5) * (1 - seg(t, 4.2, 4.7));
  const t1 = $('#it1'), t2 = $('#it2'), t3 = $('#it3');
  const a1 = E.o5(seg(t, .25, .8)), a2 = E.o5(seg(t, 1.0, 1.5)), o12 = seg(t, 2.25, 2.55);
  t1.style.opacity = a1 * (1 - o12); t1.style.transform = `translateY(${(1 - a1) * 40 - o12 * 30}px)`;
  t2.style.opacity = a2 * (1 - o12); t2.style.transform = `translateY(${(1 - a2) * 30 - o12 * 30}px)`;
  const a3 = E.o5(seg(t, 3.0, 3.5)), o3 = seg(t, 4.3, 4.6); t3.style.opacity = a3 * (1 - o3); t3.style.transform = `translateY(${(1 - a3) * 40 - o3 * 30}px)`;
  const u = E.io(sweep), [px, py] = planeAt(u), [qx, qy] = planeAt(Math.min(1, u + .01)), ang = Math.atan2(qy - py, qx - px) * 180 / Math.PI;
  $('#imark').setAttribute('transform', `translate(${px},${py}) rotate(${ang + 20}) scale(1.1) translate(-48,-52)`); $('#imark').style.opacity = sweep > 0 && sweep < 1 ? 1 : 0;
  trailDots.forEach((d, k) => { const uu = u - k * .012; if (uu <= 0 || sweep >= 1) { d.setAttribute('opacity', 0); return; } const [x, y] = planeAt(uu); d.setAttribute('cx', x); d.setAttribute('cy', y); d.setAttribute('opacity', (1 - k / 70) * .9); });
}

function renderOutro(t) {
  const on = t > T.fin - .05; vis(outro, on ? 1 : 0); if (!on) return;
  const s = T.fin;
  $('#orb1').style.strokeDasharray = '1 1'; $('#orb1').style.strokeDashoffset = 1 - E.io(seg(t, s + .2, s + 1.2));
  $('#orb2').style.opacity = E.o(seg(t, s + .5, s + 1.2));
  const lq = seg(t, s + .5, s + 1.1);
  $('#oLogo').style.transform = `scale(${E.ob(lq)}) rotate(${(1 - E.o5(lq)) * -90}deg)`; $('#oLogo').style.opacity = clamp(lq * 3);
  const cq = E.o5(seg(t, s + 1.0, s + 1.6)); $('#oCta').style.opacity = cq; $('#oCta').style.transform = `translateY(${(1 - cq) * 30}px)`;
  const uq = E.ob(seg(t, s + 1.5, s + 2.0)); $('#oUrl').style.opacity = clamp(uq); $('#oUrl').style.transform = `scale(${uq})`;
  const spin = (t - s) * lerp(.16, .06, seg(t, s + 4, s + 6.5));
  ochips.forEach((el, i) => {
    const a = i / FEATS.length * 6.283 + spin + 1.2, x = 960 + Math.cos(a) * 760, y = 520 + Math.sin(a) * 300, depth = (Math.sin(a) + 1) / 2;
    const q = E.o5(seg(t, s + .9 + i * B / 2, s + 1.3 + i * B / 2));
    el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${(.78 + .3 * depth) * (.6 + .4 * q)})`;
    el.style.opacity = q * (.62 + .38 * depth); el.style.zIndex = depth > .5 ? 3 : 0; el.style.filter = depth < .3 ? 'blur(1.5px)' : 'none';
  });
  $('#oCore').style.zIndex = 2;
}

function renderWeb(t) {
  const pIdx = PAGES.findIndex(p => t >= p.a && t < p.b);
  const pg = PAGES[Math.max(0, pIdx)];
  $('#url').textContent = 'gramfi.ai/' + pg.url;
  const np = hoverState($('#nav_poly'), t); $('#nav_insight').className = 'it' + (t < T.poly ? ' on' : ''); $('#nav_poly').className = 'it' + (t >= T.poly ? ' on' : np.hv ? ' hv' : ''); $('#nav_poly').style.transform = `scale(${1 - np.pr * .06})`;
  SIDE.forEach(([id]) => { const el = $('#' + id), hs = hoverState(el, t), on = pg.sb === id; el.className = 's' + (on ? ' on' : hs.hv ? ' hv' : ''); el.style.transform = `scale(${1 - hs.pr * .05})`; });
  PAGES.forEach(({ el, a, b, mode }) => {
    const inn = E.o5(seg(t, a + .05, a + .45)), out = E.io(seg(t, b, b + .2));
    if (mode === 'none') { el.style.transform = 'none'; vis(el, (a < 0 ? 1 : seg(t, a - .01, a)) * (1 - out)); return; }
    el.style.transform = mode === 'y' ? `translateY(${(1 - inn) * 60 - out * 50}px)` : `translateX(${(1 - inn) * 80 - out * 60}px)`;
    vis(el, Math.min(a < 0 ? 1 : inn, 1 - out));
  });
  if (t < T.n1 + .3) pTree(t);
  if (t > T.n1 - .1 && t < T.n2 + .3) ntiles.forEach((el, i) => { const q = E.o(seg(t, T.n1 + .05 + i * .03, T.n1 + .4 + i * .03)); el.style.opacity = q; el.style.transform = `scale(${.92 + .08 * q})`; });
  if (t > T.n2 - .1 && t < T.n3 + .3) BP.forEach((p, i) => { const q = E.o(seg(t, T.n2 + .05 + i * .02, T.n2 + .4 + i * .02)); p.g.setAttribute('transform', `translate(${p.x + Math.sin(t * 1.1 + i) * 4},${p.y + Math.cos(t * .9 + i * 1.7) * 5}) scale(${.6 + .4 * q})`); p.g.style.opacity = q; });
  if (t > T.n3 - .1 && t < T.ctry + .3) pCorr(t);
  if (t > T.ctry - .1 && t < T.map + .3) pGlobe(t);
  if (t > T.map - .1 && t < T.feed + .3) pMap(t);
  if (t > T.feed - .1 && t < T.top + .3) pFeed(t);
  if (t > T.top - .1 && t < T.poly + .3) pTop(t);
  if (t > T.poly - .1) pPoly(t);
}
function pTree(t) {
  const s = T.A, sw = t >= s + 1.9, h24 = hoverState($('#tab24'), t);
  $('#tab1').className = 'tab' + (t < s + 1.45 ? ' on' : ''); $('#tab24').className = 'tab' + (t >= s + 1.45 ? ' on' : h24.hv ? ' hv' : ''); $('#tab24').style.transform = `scale(${1 - h24.pr * .08})`;
  const focus = E.io(seg(t, s + 2.4, s + 2.8)) * (1 - E.io(seg(t, T.n1 - .4, T.n1 - .1)));
  tiles.forEach(({ c, el, cEl }) => {
    const a = L1[c[0]], b = L24[c[0]], lag = E.io(seg(t, s + 1.5, s + 2.35));
    const r = { x: lerp(a.x, b.x, lag), y: lerp(a.y, b.y, lag), w: lerp(a.w, b.w, lag), h: lerp(a.h, b.h, lag) };
    const ch = sw ? c[4] : c[3], isB = c[0] === 'BTC';
    el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
    el.style.background = tileCol(ch); el.className = 'tile' + (r.w > 170 && r.h > 110 ? ' big' : '');
    el.style.opacity = isB ? 1 : 1 - .55 * focus; el.style.zIndex = isB ? 2 : 1;
    el.style.boxShadow = isB ? `0 0 0 ${3 * Math.max(focus, seg(t, s + 1.5, s + 1.8) * .5)}px #EAFF00` : 'none';
    cEl.textContent = (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%'; cEl.className = 'c ' + (ch >= 0 ? 'up' : 'dn');
  });
  const br = L24.BTC; tmTip.style.left = (br.x + br.w + 16) + 'px'; tmTip.style.top = (br.y + 60 + (1 - focus) * 10) + 'px'; tmTip.style.zIndex = 5; vis(tmTip, focus);
  moverRows.forEach(({ c, el, sh, ch }) => {
    const y1 = ord1.indexOf(c[0]), y2 = ord24.indexOf(c[0]), lag = E.io(seg(t, s + 1.55, s + 2.35));
    el.style.top = (44 + lerp(y1, y2, lag) * 44) + 'px'; sh.textContent = ((sw ? c[6] / SUM24 : c[5] / SUM1) * 100).toFixed(1) + '%';
    const v = sw ? c[4] : c[3]; ch.textContent = (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; ch.className = 'mono ch ' + (v >= 0 ? 'up' : 'dn');
    el.style.background = c[0] === 'BTC' ? `rgba(234,255,0,${.16 * focus})` : 'transparent'; el.style.opacity = c[0] === 'BTC' ? 1 : 1 - .4 * focus;
  });
}
function pCorr(t) {
  const s = T.n3, p = seg(t, s + .1, s + 1.3);
  bars.forEach((r, i) => { const q = E.o(seg(p, i / NB * .7, i / NB * .7 + .3)), hh = datB[i] * 380 * q; r.setAttribute('y', 470 - hh); r.setAttribute('height', hh); });
  const L = pline.getTotalLength(), lp = E.io(p); pline.style.strokeDasharray = L; pline.style.strokeDashoffset = L * (1 - lp);
  const pt = pline.getPointAtLength(L * lp); pdot.setAttribute('cx', pt.x); pdot.setAttribute('cy', pt.y); pdot.style.opacity = p > 0 && p < 1 ? 1 : 0;
}
function pGlobe(t) {
  const s = T.ctry, c = gctx, Rg = 290, cx = 310, cy = 310; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 620, 620);
  const turn = E.io(seg(t, s + 1.25, s + 1.95)), lon0 = lerp(98 + (t - s) * 4, 127.5, turn), lat0 = lerp(22, 32, turn), ap = E.o(seg(t, s + .05, s + .7));
  const g = c.createRadialGradient(cx - 90, cy - 110, 40, cx, cy, Rg); g.addColorStop(0, '#22262A'); g.addColorStop(1, '#101214');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Rg * ap, 0, 7); c.fill(); c.strokeStyle = 'rgba(139,108,255,.45)'; c.lineWidth = 1.5; c.stroke();
  const rl = lat0 * Math.PI / 180, sinL = Math.sin(rl), cosL = Math.cos(rl);
  const proj = (la, lo) => { const p = la * Math.PI / 180, l = (lo - lon0) * Math.PI / 180; const x = Math.cos(p) * Math.sin(l), y = cosL * Math.sin(p) - sinL * Math.cos(p) * Math.cos(l), z = sinL * Math.sin(p) + cosL * Math.cos(p) * Math.cos(l); return [cx + x * Rg, cy - y * Rg, z]; };
  c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
  for (let lo = -180; lo < 180; lo += 30) { c.beginPath(); let st = 0; for (let la = -90; la <= 90; la += 5) { const [x, y, z] = proj(la, lo); if (z > 0) { st ? c.lineTo(x, y) : c.moveTo(x, y); st = 1; } else st = 0; } c.stroke(); }
  const sel = t >= s + 1.2;
  GDOTS.forEach(([la, lo, col], i) => { const [x, y, z] = proj(la, lo); if (z <= 0) return; const k = E.o(seg(ap, (i % 50) / 50 * .5, (i % 50) / 50 * .5 + .5)); if (k <= 0) return;
    const isKr = col === '#FF6FA5'; c.fillStyle = col ? (sel && !isKr ? col + '66' : col) : '#4A5048'; c.globalAlpha = (.35 + .65 * z) * k;
    c.beginPath(); c.arc(x, y, (col ? 3.1 : 2.3) * (isKr && sel ? 1.3 : 1) * k, 0, 7); c.fill(); });
  c.globalAlpha = 1;
  const pin = E.o5(seg(t, s + 1.8, s + 2.1));
  if (pin > 0) { const [x, y] = proj(37, 127.5); for (let r = 0; r < 2; r++) { const ph = ((t - s) * 1.4 + r * .5) % 1; c.strokeStyle = `rgba(255,111,165,${.8 * (1 - ph)})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 8 + ph * 40, 0, 7); c.stroke(); }
    c.strokeStyle = '#EAFF00'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 60 * pin); c.stroke(); c.fillStyle = '#EAFF00'; c.beginPath(); c.arc(x, y - 60 * pin, 13, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '700 18px Inter'; c.fillText('South Korea', x + 22, y - 54 * pin); }
  const kr = hoverState($('#c_kr'), t);
  CTRY.forEach(k => { const el = $('#c_' + k[0]); el.className = 'cchip' + (k[0] === 'kr' && sel ? ' on' : (k[0] === 'kr' && kr.hv ? ' hv' : '')); if (k[0] === 'kr') el.style.transform = `scale(${1 - kr.pr * .05})`; });
  const res = $('#ctryRes'), rq = E.o5(seg(t, s + 1.35, s + 1.8)); res.style.opacity = rq; res.style.transform = `translateY(${(1 - rq) * 16}px)`;
  $$('.cbar', res).forEach((b, i) => b.style.width = (b.dataset.v / 24 * 100 * E.o(seg(t, s + 1.5 + i * .06, s + 2.0 + i * .06))) + '%');
  const hb = E.io(seg(t, s + 2.1, s + 2.4)); $('#krBtc').style.background = `rgba(234,255,0,${.18 * hb})`; $('#krBtc').style.boxShadow = hb ? `inset 0 0 0 ${2 * hb}px #EAFF00` : 'none';
}
function pMap(t) {
  const s = T.map, Wd = 1156, Hh = 620, c = mctx; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, Wd, Hh);
  const fz = E.io(seg(t, s + 1.8, s + 2.9)), z = 1 + 1.15 * fz, tg = NODES[TGT], fx = lerp(Wd / 2, tg.x, fz), fy = lerp(Hh / 2, tg.y, fz), drift = Math.sin(t * .4) * 4 * (1 - fz * .6);
  c.translate(Wd / 2, Hh / 2); c.scale(z, z); c.translate(-fx + drift, -fy);
  const ap = i => E.o(seg(t, s - .05 + (i % 60) * .009 + Math.floor(i / 60) * .04, s + .35 + (i % 60) * .009 + Math.floor(i / 60) * .04)), hl = seg(t, s + 2.1, s + 3.0);
  c.lineWidth = 1.2 / z;
  EDGES.forEach(([a, b]) => { const A = NODES[a], Bn = NODES[b], k = Math.min(ap(a), ap(b)); if (k <= 0) return; c.strokeStyle = `rgba(200,210,190,${.12 * k * (1 - .6 * hl)})`; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bn.x, Bn.y); c.stroke(); });
  HE.forEach((j, k) => { const q = E.o(seg(t, s + 2.15 + k * .045, s + 2.5 + k * .045)); if (q <= 0) return; const Bn = NODES[j];
    c.strokeStyle = 'rgba(234,255,0,.9)'; c.lineWidth = 2.2 / z; c.beginPath(); c.moveTo(Bn.x, Bn.y); c.lineTo(lerp(Bn.x, tg.x, q), lerp(Bn.y, tg.y, q)); c.stroke(); });
  NODES.forEach((n, i) => { const k = ap(i); if (k <= 0) return; c.fillStyle = n.c; c.globalAlpha = k * (hl > 0 && i !== TGT && !HE.includes(i) ? 1 - .6 * hl : 1); c.beginPath(); c.arc(n.x, n.y, n.r * k, 0, 7); c.fill(); });
  c.globalAlpha = 1;
  if (t > s + 1.85) { const pulse = seg(t, s + 1.85, s + 5); for (let r = 0; r < 2; r++) { const ph = (pulse * 2.6 + r * .5) % 1; c.strokeStyle = `rgba(234,255,0,${.6 * (1 - ph)})`; c.lineWidth = 2.5 / z; c.beginPath(); c.arc(tg.x, tg.y, 16 + ph * 40, 0, 7); c.stroke(); }
    c.fillStyle = '#EAFF00'; c.beginPath(); c.arc(tg.x, tg.y, 15, 0, 7); c.fill(); }
  $('#lgFwd').style.opacity = E.o(seg(t, s + 2.5, s + 2.9));
  const typed = 'Trade Nobody', n = Math.round(typed.length * seg(t, s + .82, s + 1.45)), focused = t >= s + .7;
  $('#mapInp').className = 'inp' + (focused ? ' f' : ''); $('#mapTxt').textContent = n > 0 ? typed.slice(0, n) : 'Search channel name';
  $('#caret').style.opacity = focused && t < s + 1.8 ? 1 : 0;
  const hb = hoverState($('#mapBtn'), t); $('#mapBtn').className = 'btn' + (hb.hv || t > s + 1.75 ? ' lime' : ''); $('#mapBtn').style.transform = `scale(${1 - hb.pr * .08})`;
  const sx = (tg.x - fx + drift) * z + Wd / 2, sy = (tg.y - fy) * z + Hh / 2, ic = E.o5(seg(t, s + 2.85, s + 3.2)), info = $('#mapInfo');
  info.style.left = (sx + 46) + 'px'; info.style.top = (sy - 110) + 'px'; info.style.transform = `translateY(${(1 - ic) * 14}px)`; vis(info, ic);
  const vp = hoverState($('#viewPosts'), t); $('#viewPosts').style.transform = `scale(${1 - vp.pr * .06})`;
  const ex = E.io(seg(t, s + 4.45, T.feed)), exEl = $('#expand');
  if (ex > 0) { const L0 = sx + 46, T0 = sy - 110, W0 = 320, H0 = info.offsetHeight; exEl.style.left = lerp(L0, -30, ex) + 'px'; exEl.style.top = lerp(T0, -84, ex) + 'px'; exEl.style.width = lerp(W0, 1216, ex) + 'px'; exEl.style.height = lerp(H0, 730, ex) + 'px'; exEl.style.borderRadius = lerp(16, 0, ex) + 'px'; vis(exEl, 1); }
  else vis(exEl, 0);
}
function pFeed(t) {
  const s = T.feed, f = E.io(seg(t, s + 1.3, s + 1.85)), star = E.io(seg(t, s + 1.95, s + 2.35)) * (1 - E.io(seg(t, T.top - .35, T.top - .05)));
  let ky = 0;
  feedEls.forEach(({ el, btc, star: isStar, tags }, i) => {
    const appear = E.o(seg(t, s + .02 + i * .05, s + .35 + i * .05));
    const y0 = i * 114, y1 = btc ? (ky++) * 114 : y0;
    el.style.top = lerp(y0, y1, f) + 'px';
    el.style.transform = `translateY(${(1 - appear) * 20}px) scale(${isStar ? 1 + .09 * star : (btc ? 1 : 1 - .05 * f)})`;
    el.style.opacity = appear * (btc ? (isStar ? 1 : 1 - .55 * star) : 1 - f); el.style.zIndex = isStar ? 3 : btc ? 2 : 1;
    tags.forEach(tg => tg.className = 'tag t' + (f > .3 ? ' hot' : ''));
    el.style.boxShadow = isStar && star > 0 ? `0 0 0 ${2 * star}px #EAFF00, 0 20px 40px rgba(0,0,0,${.5 * star})` : 'none';
  });
  const typed = 'BTC', n = Math.round(3 * seg(t, s + .62, s + .9)), focused = t >= s + .55;
  $('#tsInp').className = 'inp' + (focused ? ' f' : ''); $('#tsTxt').textContent = n ? typed.slice(0, n) : 'Search coin (e.g. BTC)';
  $('#tsCaret').style.opacity = focused && t < s + 1.25 ? 1 : 0;
  const hb = hoverState($('#tsBtn'), t); $('#tsBtn').className = 'btn' + (hb.hv || t > s + 1.2 ? ' lime' : ''); $('#tsBtn').style.transform = `scale(${1 - hb.pr * .08})`;
  $('#feedCnt').textContent = f > .5 ? '$BTC · 3 posts' : 'Live · all channels';
}
function pTop(t) {
  const s = T.top;
  pods.forEach(p => { const d = s + .05 + p.ri * .12 + p.j * .03, q = E.ob(seg(t, d, d + .4)); p.el.style.transform = `translateY(${(1 - q) * -80}px)`; p.el.style.opacity = clamp(q * 2);
    p.vEl.textContent = fmt(Math.round(p.v * E.o(seg(t, d + .05, d + .7)))); });
  const cq = E.ob(seg(t, s + .35, s + .7)); $('#crown').style.opacity = clamp(cq); $('#crownP').setAttribute('transform', `translate(150,${100 + (1 - cq) * -30}) scale(${cq}) translate(-150,-100)`);
  $('#crownRays').setAttribute('transform', `rotate(${(t - s) * 30},150,100)`); $('#crownRays').style.opacity = E.o(seg(t, s + .5, s + .9));
}
function pPoly(t) {
  const s = T.poly, mq = E.io(seg(t, s + .5, s + .85));
  $('#mkBtc').style.boxShadow = `0 0 0 ${2 * mq}px #EAFF00`; $('#mkBtc').style.background = `rgba(234,255,0,${.08 * mq})`;
  $$('.mrow', pg_poly).forEach((m, i) => { const q = E.o(seg(t, s + .1 + i * .05, s + .45 + i * .05)); m.style.transform = `translateX(${(1 - q) * 30}px)`; m.style.opacity = q * (i && mq ? 1 - .4 * mq : 1); });
  const hb = hoverState($('#tgBtn'), t), btn = $('#tgBtn'), pushed = t >= s + 1.4;
  btn.style.transform = `scale(${(1 + hb.hv * .04) * (1 - hb.pr * .07)})`; btn.style.background = pushed ? '#FFFFFF' : '#EAFF00';
  $('#tgLbl').textContent = pushed ? 'Opening Telegram…' : 'GramFi-Polymarket TG Bot';
}

function renderPhone(t) {
  const P = phonePose(t);
  if (!P) { vis(phone, 0); chips.forEach(c => vis(c.el, 0)); return; }
  setW(phone, P.x, P.y, P.z, 450, 940, `rotateX(${P.rx}deg) rotateY(${P.ry}deg) rotateZ(${P.rz}deg) scale(${P.s})`); vis(phone, P.op);
  stEls.forEach((s, i) => {
    const next = stEls[i + 1], gap = next ? next.t : 99;
    const inn = seg(t, s.t + .04, s.t + .34), out = seg(t, gap - .03, gap + .07), op = (t >= s.t ? E.o(inn) : 0) * (1 - out);
    vis(s.el, op); s.el.style.transform = `translateY(${(1 - E.o5(inn)) * 22 - out * 8}px)`;
    if (op <= 0) return;
    s.btns.forEach((b, j) => { const q = E.o(seg(t, s.t + .06 + j * .02, s.t + .32 + j * .02)), hs = hoverState(b, t); b.classList.toggle('hv', !!hs.hv);
      b.style.transform = `translateY(${(1 - q) * 10}px) scale(${1 - hs.pr * .05})`; b.style.opacity = q; });
    $$('.lr', s.el).forEach((r, j) => { const q = E.o5(seg(t, s.t + .15 + j * .07, s.t + .45 + j * .07)); r.style.opacity = q; r.style.transform = `translateX(${(1 - q) * 24}px)`; });
  });
  const placing = t >= D + 5.97 && t < D + 6.65, opening = t >= T.perp + 3.02 && t < T.perp + 3.7;
  $('#placeLbl').style.display = placing ? 'none' : 'inline'; $('#placeSp').style.display = placing ? 'inline-flex' : 'none'; $('#b_place').classList.toggle('dk', placing);
  $('#openLbl').style.display = opening ? 'none' : 'inline'; $('#openSp').style.display = opening ? 'inline-flex' : 'none'; $('#b_open').classList.toggle('dk', opening);
  $('#spin1').style.transform = $('#spin2').style.transform = `rotate(${t * 900}deg)`;
  const ad = hoverState($('#a_add'), t); Object.assign($('#a_add').style, { background: ad.hv ? '#EAFF00' : 'transparent', color: ad.hv ? '#12140F' : '', borderRadius: '6px', padding: '1px 4px' });
  const lt = E.o(seg(t, T.alert + 2.55, T.alert + 2.8)) * (1 - seg(t, T.alert + 3.6, T.alert + 3.9)); vis($('#later'), lt);
  const pu = E.o5(seg(t, T.alert + 3.0, T.alert + 3.35)); $('#push').style.transform = `translateY(${(1 - pu) * -140}px)`; vis($('#push'), clamp(pu * 1.5));
  chips.forEach((c, ci) => {
    const qq = seg(t, c.t, c.t + .6), out = E.io(seg(t, c.out, c.out + .3));
    if (qq <= 0 || out >= 1) { vis(c.el, 0); return; }
    const e = E.o5(qq), x = P.x + c.dx * e, y = P.y + c.dy * e - Math.sin(qq * Math.PI) * 50, z = P.z + 180 * e + out * 120;
    c.el.style.transform = `translate3d(${x - 170}px,${y - 60}px,${z}px) rotateY(${16 * (1 - e)}deg) scale(${(.5 + .5 * e) * (1 - out * .2)})`;
    vis(c.el, clamp(qq * 3) * (1 - out));
    if (ci === 2) { const b = E.io(seg(t, c.t + .3, c.t + 1.0)), a = lerp(60, 80, b), bb = lerp(84, 96, b), X = v => 10 + (v - 50) / 50 * 326;
      $('#bandL').setAttribute('x1', X(a)); $('#bandL').setAttribute('x2', X(bb)); $('#bandA').setAttribute('cx', X(a)); $('#bandB').setAttribute('cx', X(bb));
      $('#bandTa').setAttribute('x', X(a)); $('#bandTb').setAttribute('x', X(bb)); $('#bandTa').textContent = Math.round(a) + '¢'; $('#bandTb').textContent = Math.round(bb) + '¢'; }
    if (ci === 4) $('#bell').style.transform = `rotate(${Math.sin((t - T.alert - 3.0) * 18) * 14 * Math.exp(-Math.max(0, t - T.alert - 3.0) * 1.5) * (t > T.alert + 3 ? 1 : 0)}deg)`;
  });
}

window.renderAt = renderAt; window.EVENTS = EVENTS.sort((a, b) => a.t - b.t); window.DUR = DUR;
window.READY = document.fonts.ready.then(() => { renderAt(0); return true; });
