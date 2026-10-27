// GramFi product motion — deterministic timeline. Every visual is a pure function of time `t` (seconds).
// window.renderAt(t) draws the frame; window.EVENTS lists sound/sync events for the audio builder.
'use strict';
const DUR = 44;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const H = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  io: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  o: u => 1 - Math.pow(1 - u, 3),
  o5: u => 1 - Math.pow(1 - u, 5),
  i: u => u * u * u,
  ob: u => { const c1 = 1.45, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  s: u => u * u * (3 - 2 * u),
};
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
// Hermite spline through time-stamped keys (continuous velocity; duplicate a key to make a hold).
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
const LOGO = s => `<svg width="${s}" height="${s}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#E2FB3C"/><circle cx="20" cy="20" r="19" fill="none" stroke="#12140F" stroke-opacity=".12"/><path d="M9 19.6 L29.5 11 L25.8 29.2 L19.6 24.6 L16.4 28.1 L16.7 22.7 L26.2 14.3 L14.5 21.5 Z" fill="#12140F"/></svg>`;

/* ======================================================================
   EVENTS (single source of truth for picture + sound)
   ====================================================================== */
const EVENTS = [];
const ev = (t, type, extra = {}) => EVENTS.push({ t, type, ...extra });

/* ======================================================================
   WORLD
   ====================================================================== */
const cam = $('#cam');
// ---- environment: chat bubbles that carry the Telegram motif through depth
const BUBS = [
  ['$BTC to 90k? 👀', ''], ['gm ☀️', ''], ['<b>$PUMP</b> +18% mentions', 'g'], ['who is buying CAP?', ''], ['ETH breakout 🔥', 'l'],
  ['<b>$SUI</b> trending in KR', ''], ['wen airdrop', ''], ['📈 RAY −0.9%', 'r'], ['narrative: Layer 1', ''], ['🐋 whale alert', 'l'],
  ['Polymarket: YES 43¢', 'g'], ['copy sharp_sports?', ''], ['long BTC ×3', 'l'], ['<b>$QUACK</b> +7.7%', 'g'], ['channel map 🗺', ''],
  ['TON community 💎', ''], ['$HYPE?', ''], ['DeFi mindshare 7.2%', ''], ['wagmi', 'l'], ['ser, chart?', ''],
  ['📉 ritual −8%', 'r'], ['top10 channels', ''], ['info-fi 🧠', 'l'], ['<b>$MON</b> new listing', ''], ['GM from Vietnam 🇻🇳', ''],
  ['BTC vs attention', ''], ['Telegram alpha 🔑', 'g'], ['pump.fun meta', ''],
];
const R = rng(7);
const bubs = BUBS.map(([txt, cls], i) => {
  const el = H(`<div class="w"><div class="bub ${cls}">${txt}</div></div>`); cam.appendChild(el);
  const ang = R() * Math.PI * 2, rad = 650 + R() * 1250;
  return { el, x: Math.cos(ang) * rad * 1.25, y: Math.sin(ang) * rad * .72, z: -2600 + R() * 4100, ph: R() * 6.28, sp: .25 + R() * .4, s: .9 + R() * .6 };
});

/* ---------------- BROWSER (web app) ---------------- */
const SIDE = [['sb_popular', 'Most Popular Coin', '◆'], ['sb_narr', 'Narrative Mindshare', '◐'], ['sb_bubbles', 'Crypto Bubbles', '●'], ['sb_corr', 'Correlation', '∿'],
  ['sb_map', 'Channel Map', '✳'], ['sb_lead', 'Channels Leaderboard', '★'], ['sb_feeds', 'Telegram Feeds', '☰'], ['sb_tele', 'Telescope', '◎']];
const browser = H(`<div class="w"><div id="browser">
  <div class="bbar"><span class="dot" style="background:#FF6058"></span><span class="dot" style="background:#FFBD2E"></span><span class="dot" style="background:#28C941"></span><div class="url mono" id="url">gramfi.ai/insight?tab=popular</div></div>
  <div class="nav"><div class="logo">${LOGO(30)}GramFi</div>
    <span class="it on" id="nav_insight">Insight</span><span class="it" id="nav_poly">Polymarket</span><span class="it">Airdrops</span><span class="it">Voting</span><span class="it">About</span>
    <span class="gp">100 GP</span><span class="me"><span class="av"></span>My Page</span></div>
  <div class="side"><div class="h">INSIGHT · KOL</div>${SIDE.map(([id, n, ic]) => `<div class="s" id="${id}"><i>${ic}</i>${n}</div>`).join('')}</div>
  <div class="content" id="content"></div>
</div></div>`);
cam.appendChild(browser);
const content = $('#content');

// ---- page 1: Most Popular Coin treemap
const COINS = [ // name, glyph, price, ch1H, ch24H, w1H, w24H, share1H, share24H
  ['Cap', 'C', '$0.0956', -4.1, -6.3, 30, 17, 12.2, 9.7],
  ['Pump.fun', 'P', '$0.004141', -1.1, 3.9, 14, 27, 6.1, 18.4],
  ['Raydium', 'R', '$1.79', -0.9, -0.9, 9, 8, 4.0, 3.6],
  ['Re', 'R', '$0.3650', 2.1, 1.4, 6, 4, 2.6, 1.9],
  ['Irys', 'I', '$0.0272', 4.3, 2.0, 5, 6, 2.3, 2.6],
  ['0x Protocol', '0', '$0.1024', 3.5, 1.1, 5, 3, 2.2, 1.4],
  ['Sui', 'S', '$0.9044', 2.2, 4.8, 4.5, 7, 2.0, 3.1],
  ['Gram', 'G', '$1.21', -1.3, 0.6, 4.5, 3.5, 2.0, 1.5],
  ['Ritual', 'R', '$0.0243', -8.1, -3.0, 4, 2.5, 1.9, 1.1],
  ['Quant', 'Q', '$200.01', 1.2, 0.8, 3.5, 2.5, 1.6, 1.1],
  ['SoSoValue', 'S', '$0.3090', 3.4, 2.6, 3.5, 3, 1.5, 1.3],
  ['Monad', 'M', '$0.0214', -2.2, 6.4, 3, 6, 1.3, 2.7],
  ['Quack AI', 'Q', '$0.1312', 7.7, 9.6, 3, 9, 1.3, 4.0],
  ['Aster', 'A', '$0.7056', 5.1, 4.1, 3, 5, 1.2, 2.2],
  ['Meteora', 'M', '$0.3120', 2.6, -1.2, 2.5, 2, 1.1, .9],
  ['Ondo', 'O', '$0.4064', 1.2, 0.5, 2.5, 2, 1.0, .9],
  ['Uniswap', 'U', '$7.02', 0.4, -0.7, 2, 2, .9, .8],
  ['Pepe', 'P', '$0.0000092', -2.1, 1.7, 2, 3, .8, 1.3],
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
const L1 = squarify(COINS.map(c => ({ name: c[0], v: c[5] })).sort((a, b) => b.v - a.v), 0, 0, 800, 640);
const L24 = squarify(COINS.map(c => ({ name: c[0], v: c[6] })).sort((a, b) => b.v - a.v), 0, 0, 800, 640);
const pg_tm = H(`<div class="page" id="pg_tm">
  <div class="ptitle"><h2>Most Popular Coin <span style="color:var(--muted);font-weight:600">(Alt)</span></h2>
   <div class="tabs"><span class="tab on" id="tab1">1H</span><span class="tab" id="tab24">24H</span><span class="tab">7D</span><span class="tab">30D</span></div>
   <span class="pill">Exclude Top 20 ✓</span><span class="pill" style="margin-left:auto">Telegram mentions · Global</span></div>
  <div id="tm"></div>
  <div id="movers"><div class="hd"><span>Top Movers</span><span>Share</span><span>24H</span></div></div>
</div>`);
content.appendChild(pg_tm);
const tmEl = $('#tm', pg_tm);
const tiles = COINS.map(c => { const el = H(`<div class="tile" id="tile_${c[0].replace(/[^a-z0-9]/gi, '')}"><div class="n"><i>${c[1]}</i>${c[0]}</div><div class="p">${c[2]}</div><div class="c"></div></div>`); tmEl.appendChild(el); return { c, el, cEl: $('.c', el) }; });
const tip = H(`<div id="tmTip"><div style="font-weight:700;font-size:16px;margin-bottom:8px">Pump.fun · PUMP</div>
  <div class="k">Telegram mention share · 24H</div><div class="v">18.4%</div>
  <div style="display:flex;justify-content:space-between;margin-top:8px"><span class="k">vs 1H window</span><b style="color:#7CE0A6">+12.3 pts</b></div>
  <div style="display:flex;justify-content:space-between;margin-top:4px"><span class="k">Price</span><b>$0.004141</b></div></div>`);
tmEl.appendChild(tip);
const MOV = COINS.slice(0, 13);
const ord1 = [...MOV].sort((a, b) => b[7] - a[7]).map(c => c[0]);
const ord24 = [...MOV].sort((a, b) => b[8] - a[8]).map(c => c[0]);
const moverRows = MOV.map(c => { const el = H(`<div class="row"><b>${c[0]}</b><span class="mono sh"></span><span class="mono ch"></span></div>`); $('#movers', pg_tm).appendChild(el); return { c, el, sh: $('.sh', el), ch: $('.ch', el) }; });

// ---- page 2: Correlation analysis
const pg_corr = H(`<div class="page" id="pg_corr">
  <div class="ptitle"><h2>Correlation analysis</h2><span class="pill" style="background:#FFF3D6;border-color:#F5DFA6">₿ Bitcoin</span>
   <div class="tabs"><span class="tab">7D</span><span class="tab on" id="tab30">30D</span><span class="tab" id="tab90">90D</span><span class="tab">180D</span><span class="tab">1Y</span></div></div>
  <div class="kpis">
   <div class="kpi"><div class="k">Latest BTC close</div><div class="v" id="k0"></div><div class="s">end of window</div></div>
   <div class="kpi"><div class="k">Period price change</div><div class="v dn" id="k1"></div><div class="s">visible period</div></div>
   <div class="kpi"><div class="k">BTC Telegram mentions</div><div class="v" id="k2"></div><div class="s">all tracked channels</div></div>
   <div class="kpi"><div class="k">Price × attention</div><div class="v" id="k3"></div><div class="s">weak negative</div></div>
   <div class="kpi"><div class="k">Same-day reaction</div><div class="v" id="k4"></div><div class="s">return vs attention</div></div>
   <div class="kpi"><div class="k">Price leads</div><div class="v" id="k5"></div><div class="s">return vs next-day</div></div></div>
  <div id="chartCard"><div class="ct">BTC price vs Telegram attention</div><div class="cs" id="cs">Daily · mentions bars, close line</div>
   <div class="lg"><span class="pill"><b style="color:#12140F">━</b> BTC</span><span class="pill"><b style="color:#5AA9E6">▮</b> Mentions</span></div>
   <svg id="chart" width="1120" height="420" style="position:absolute;left:20px;top:80px"></svg>
   <div id="chartTip"><div style="color:#A7AD9F;font-size:11px">Oct 3 · daily</div><div><b>1,450</b> mentions</div><div>BTC <b>$86,400</b></div></div></div>
</div>`);
content.appendChild(pg_corr);
const NB = 46, svg = $('#chart', pg_corr), SVGNS = 'http://www.w3.org/2000/svg';
const datA = [], datB = [], prA = [], prB = [];
for (let i = 0; i < NB; i++) {
  datA.push(.25 + .2 * Math.sin(i * .7) + .15 * Math.sin(i * 1.9 + 1) + .1 * Math.sin(i * .21));
  datB.push(clamp(.3 + .28 * Math.sin(i * .43 + .5) * Math.sin(i * .11 + .3) + .22 * Math.abs(Math.sin(i * 1.37)) + (i > 26 && i < 34 ? .3 : 0), .08, .98));
  prA.push(.55 + .12 * Math.sin(i * .3) + .05 * Math.sin(i * 1.3));
  prB.push(.45 + .25 * Math.sin(i * .16 + 1.2) + .08 * Math.sin(i * .9) - i * .004);
}
for (let g = 0; g < 5; g++) { const l = document.createElementNS(SVGNS, 'line'); l.setAttribute('x1', 0); l.setAttribute('x2', 1120); l.setAttribute('y1', 20 + g * 95); l.setAttribute('y2', 20 + g * 95); l.setAttribute('stroke', '#EEF0E9'); svg.appendChild(l); }
const bars = [];
for (let i = 0; i < NB; i++) { const r = document.createElementNS(SVGNS, 'rect'); r.setAttribute('id', 'bar' + i); r.setAttribute('x', 8 + i * 24.2); r.setAttribute('width', 15); r.setAttribute('rx', 4); r.setAttribute('fill', '#9CCDF2'); svg.appendChild(r); bars.push(r); }
const pline = document.createElementNS(SVGNS, 'path'); pline.setAttribute('fill', 'none'); pline.setAttribute('stroke', '#12140F'); pline.setAttribute('stroke-width', 3.5); pline.setAttribute('stroke-linejoin', 'round'); pline.setAttribute('stroke-linecap', 'round'); svg.appendChild(pline);
const pdot = document.createElementNS(SVGNS, 'circle'); pdot.setAttribute('r', 8); pdot.setAttribute('fill', '#E2FB3C'); pdot.setAttribute('stroke', '#12140F'); pdot.setAttribute('stroke-width', 3); svg.appendChild(pdot);
const vline = document.createElementNS(SVGNS, 'line'); vline.setAttribute('y1', 10); vline.setAttribute('y2', 410); vline.setAttribute('stroke', '#12140F'); vline.setAttribute('stroke-dasharray', '4 5'); svg.appendChild(vline);
const linePath = pr => pr.map((v, i) => `${i ? 'L' : 'M'}${15.5 + i * 24.2},${400 - v * 360}`).join(' ');

// ---- page 3: Channel map
const pg_map = H(`<div class="page" id="pg_map">
  <div class="ptitle"><h2>Channel Map</h2><span class="pill">Forwarding network · 90D</span>
   <div class="search"><div class="inp" id="mapInp"><span id="mapTxt">Search channel name</span><span id="caret" style="width:2px;height:20px;background:#12140F;margin-left:2px"></span></div><div class="btn" id="mapBtn">Search</div></div></div>
  <div id="mapWrap"><canvas id="map" width="2312" height="1280" style="width:1156px;height:640px"></canvas>
   <div class="legend"><span><i style="background:#5B8DEF"></i>EN</span><span><i style="background:#9B6BEF"></i>RU</span><span><i style="background:#EF6B9B"></i>KR</span><span><i style="background:#F0A24A"></i>VN</span><span><i style="background:#3FBF8F"></i>IR</span><span><i style="background:#D9B52C"></i>ID</span></div>
   <div id="mapInfo"><div class="t"><span class="av" style="width:34px;height:34px;background:linear-gradient(135deg,#5B8DEF,#9CCDF2)"></span>Activity News<span class="yn y" style="margin-left:auto">A</span></div>
    <div class="g"><div><span>Subscribers</span><b>4,153,639</b></div><div><span>Points</span><b>93,710</b></div><div><span>Forwarded by</span><b>16 ch.</b></div><div><span>Reach</span><b>5 regions</b></div></div></div></div>
</div>`);
content.appendChild(pg_map);
const mapCv = $('#map', pg_map), mctx = mapCv.getContext('2d');
const CL = [['#5B8DEF', 360, 300, 170], ['#9B6BEF', 760, 210, 150], ['#EF6B9B', 900, 470, 120], ['#F0A24A', 560, 520, 120], ['#3FBF8F', 180, 500, 110], ['#D9B52C', 1000, 120, 90]];
const MR = rng(42), NODES = [], EDGES = [];
CL.forEach(([col, cx, cy, sp], ci) => { const n = [70, 55, 40, 40, 35, 25][ci]; for (let k = 0; k < n; k++) { const a = MR() * 6.283, r = Math.pow(MR(), .7) * sp; NODES.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .8, c: col, ci, r: 2.5 + Math.pow(MR(), 3) * 9 }); } });
const TGT = 3; NODES[TGT].x = 430; NODES[TGT].y = 300; NODES[TGT].r = 14;
for (let i = 0; i < NODES.length; i++) for (let k = 0; k < 2; k++) { const j = Math.floor(MR() * NODES.length); if (NODES[j].ci === NODES[i].ci || MR() < .25) EDGES.push([i, j]); }
const HE = []; { const pick = rng(9); while (HE.length < 16) { const j = Math.floor(pick() * NODES.length); if (j !== TGT && !HE.includes(j)) HE.push(j); } HE.sort((a, b) => Math.hypot(NODES[a].x - 430, NODES[a].y - 300) - Math.hypot(NODES[b].x - 430, NODES[b].y - 300)); }

// ---- page 4: GramFi-Polymarket
const MK = [['Bitcoin (BTC)', '₿', '#F7931A', [['BTC above $150k by June 30, 2027?', 3], ['BTC all time high by March 31, 2027?', 12], ['Will Saylor sell Bitcoin in 2027?', 6]]],
  ['Ethereum (ETH)', 'Ξ', '#627EEA', [['ETH reach $5,000 by Dec 31, 2026?', 9], ['ETH all time high by Dec 31, 2026?', 7], ['ETH above $4k on Friday?', 38]]],
  ['Solana (SOL)', 'S', '#14C08A', [['SOL all time high by June 30, 2027?', 11], ['SOL reach $500 by Dec 31, 2026?', 4], ['SOL above $200 on Friday?', 46]]]];
const pg_poly = H(`<div class="page" id="pg_poly">
  <div class="hero"><div><div class="kick">TELEGRAM NATIVE PREDICTION MARKETS</div>
    <h1 id="polyH">Bet on Polymarket directly through Telegram.</h1>
    <p>GramFi turns market discovery, wallet readiness, portfolio checks and copy trading into a simple Telegram bot flow — without leaving the chat.</p>
    <div id="tgBtn">${LOGO(26)}<span id="tgLbl">GramFi-Polymarket TG Bot</span><span>↗</span></div></div>
   <div class="stats"><div class="stat"><div class="k">Polymarket</div><div class="v" id="s0">$9.9B</div><div class="s">share of prediction markets volume</div></div>
    <div class="stat"><div class="k">Polymarket volume</div><div class="v" id="s1">$171M+</div><div class="s">active liquidity and trading demand</div></div>
    <div class="stat"><div class="k">Prediction markets</div><div class="v" id="s2">#1</div><div class="s">fastest growing crypto sector</div></div></div></div>
  <div class="mkts">${MK.map(([n, g, col, qs]) => `<div class="mk"><div class="h"><i style="background:${col}">${g}</i>${n}</div>${qs.map(([q, y]) => `<div class="q"><span>${q}</span><span><span class="yn y">Yes ${y}%</span><span class="yn n">No ${100 - y}%</span></span></div>`).join('')}</div>`).join('')}</div>
</div>`);
content.appendChild(pg_poly);
const PAGES = [[pg_tm, -1, 7.6, 'popular'], [pg_corr, 7.6, 12.65, 'correlationanalysis'], [pg_map, 12.65, 17.8, 'channelmap'], [pg_poly, 17.8, 99, '']];

/* ---------------- PHONE (Telegram bot) ---------------- */
const KB = rows => `<div class="kb">${rows.map(r => `<div class="rw" style="grid-template-columns:repeat(${r.length},1fr)">${r.map(b => { const [lbl, id] = Array.isArray(b) ? b : [b, '']; return `<div class="kbtn"${id ? ` id="${id}"` : ''}>${lbl}</div>`; }).join('')}</div>`).join('')}</div>`;
const MAIN = (bal, pos, idc, idp) => `<div class="bm"><span class="demo">DEMO</span><br>👋 <b>Alex</b> — Your Polymarket trading companion.<br><br>💵 <b>Demo pUSD:</b> <span class="mono">${bal}</span><br>📊 ${pos}<br>🤖 No traders tracked<br><br><i>💡 Paste a Polymarket link or type keywords to search any market.</i><span class="tm">12:00</span></div>` +
  KB([[['🎯 Markets', idc === 'm' ? 'b_markets' : ''], ['👥 Copy Trading', idc === 'c' ? 'b_copy' : '']], ['🤖 Autotrading'], [['⚡ Perps', idp ? 'b_perps' : '']], ['📊 Portfolio', '💼 Wallet'], ['⚙️ Settings', '💬 Support']]);
const SPARK = (w, h, col) => { const p = []; for (let i = 0; i <= 40; i++) p.push(`${i ? 'L' : 'M'}${(i / 40 * w).toFixed(1)},${(h * .8 - (Math.sin(i * .35) * .18 + i / 40 * .55 + Math.sin(i * 1.7) * .06) * h * .9).toFixed(1)}`); return `<svg width="${w}" height="${h}"><path d="${p.join(' ')}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/></svg>`; };
const ST = [
  ['st0', 22.0, MAIN('$100.00', 'No open positions', 'm', 0)],
  ['st1', 23.55, `<div class="bm">🎯 <b>Polymarket</b><br><br>Choose a section below to get started<span class="tm">12:00</span></div>` + KB([['📊 Select Category'], [['🔥 Trending Now', 'b_trending']], ['📈 Volume', '💧 Liquidity', '🆕 Newest'], ['⏳ Ending soon', '🏆 Competitive'], ['⚡ Fast Bets · 5 min'], ['⬅️ Back']])],
  ['st2', 24.85, `<div class="bm">📝 <b>Will BTC close above $90k on Friday?</b><br><br>💰 Current prices:<br>✅ Yes: <b>43¢</b><br>❌ No: <b>59¢</b><span class="tm">12:00</span></div>` + KB([[['✅ Yes 43¢', 'b_yes']], ['❌ No 59¢'], ['📜 History'], ['🔖 Watch', '🔔 Set Alert'], ['🌐 View on Polymarket'], ['⬅️ Back']])],
  ['st3', 27.1, `<div class="bm">💰 <b>Buying ✅ Yes</b><br><br>📋 <b>Will BTC close above $90k on Friday?</b><br>📈 Current price: <b>43¢</b><br><br>How much would you like to bet?<span class="tm">12:00</span></div>` + KB([['$2', '$5', ['$10', 'b_10']], ['$50', '$100'], ['🔢 Custom amount'], ['⬅️ Back']])],
  ['st4', 28.4, `<div class="bm"><span class="demo">DEMO</span> · ⚡ <b>Confirm your bet</b><br><br>Will BTC close above $90k on Friday?<br><br>✅ Outcome: <b>Yes</b><br>💰 Amount: <b>10.00 demo pUSD</b><br>💲 Current Price: <b>43.0¢</b><br>📊 Est. Shares: <b>23.26</b><br>🏆 If it wins: <b>23.26 (+133%)</b><br><br>Demo balance after: 90.00 demo pUSD<span class="tm">12:00</span></div>` + KB([[['<span id="placeLbl">Place demo order</span><span id="placeSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin1"></span>Placing order…</span>', 'b_place']], ['⬅️ Back']])],
  ['st5', 30.5, `<div class="bm">✅ <b>Bet filled</b> · 23.26 shares @ 43¢<br><br>📊 <b>My Portfolio</b> 🔄 · DEMO<br>💼 <b>1</b> position · 💰 <b>90.00</b> demo pUSD<br><br>1. <b>Will BTC close above $90k on Friday?</b><br>✅ YES · 23.26 shares · 43¢<br><span class="lnk">Show</span> · <span class="lnk">Sell</span> · <span class="lnk">📤 PnL</span><span class="tm">12:00</span></div>` + KB([['◉ Open', '○ History', '○ Stats'], ['○ 👁 Watch', '○ 🔔 Alerts'], [['⬅️ Back', 'b_back1']]])],
  ['st6', 32.2, MAIN('$90.00', '1 open position', 'c', 0)],
  ['st7', 32.95, `<div class="bm">🔍 <b>Discover Traders</b><br><br>Browse top-performing wallets on Polymarket. Follow the best traders and copy their bets automatically.<span class="tm">12:00</span></div>` + KB([[['🏆 Highest PnL', 'b_pnl'], '🎯 Best Win Rate'], ['📈 Most Active', '🥇 Top Ranked'], ['💵 By my budget'], ['⬅️ Back']])],
  ['st8', 33.85, `<div class="bm">📊 <b>Top Traders</b> · by PnL<br><i>1–6 of 6 · page 1/1</i><br><br>1. <b>sharp_sports</b> · <span class="mono lnk">0x1111…1111</span><br>💰 PnL 30d: <b>+$7,120</b> ↗ ROI: <b>71%</b><br>📈 Win: <b>84%</b> · ✅ In profit 5 of 5 weeks<br>└ <span class="lnk" id="a_add">➕ Add</span> &nbsp;👀 <span class="lnk">View</span><br><br>2. <b>macro_mind</b> · <span class="mono lnk">0x2222…2222</span><br>💰 PnL 30d: <b>+$4,380</b> ↗ ROI: <b>14%</b><br>📈 Win: <b>65%</b> · 📅 In profit 9 of 15 weeks<br>└ <span class="lnk">➕ Add</span> &nbsp;👀 <span class="lnk">View</span><br><br>3. <b>nba_nights</b> · <span class="mono lnk">0x3333…3333</span><br>💰 PnL 30d: <b>+$3,910</b> ↗ ROI: <b>22%</b><span class="tm">12:00</span></div>` + KB([[['⬅️ Back', 'b_back2']]])],
  ['st9', 36.15, MAIN('$90.00', '1 open position', '', 1)],
  ['st10', 36.8, `<div class="bm">⚡ <b>BTC 86,458</b> 🟢 <b style="color:var(--green)">+1.48%</b> <span class="lnk">15m</span><div style="margin:10px 0 6px;background:#F3F7EE;border-radius:12px;padding:10px">${SPARK(360, 90, '#17A45E')}</div>Leverage up to <b>×50</b><span class="tm">12:00</span></div>` + KB([[['📈 Rise · Long', 'b_long'], '📉 Fall · Short'], ['⬅️ Back', '🕒 15m', '🔄']])],
  ['st11', 37.7, `<div class="bm"><span class="demo">DEMO</span><br>📈 <b>Long BTC ×3</b> — bets on a rise · $22.50<br>Position <b>$67.50</b> · liquidation ≈ <b>57,639</b><span class="tm">12:00</span></div>` + KB([['$10', '$25', '$50', 'Max'], ['×1', '✓ ×3', '×10', '×50'], ['✏️ Other amount', 'Other leverage'], [['<span id="openLbl">✅ Open long</span><span id="openSp" style="display:none;align-items:center;gap:8px"><span class="spin" id="spin2"></span>Opening…</span>', 'b_open']], ['⬅️ Back']])],
  ['st12', 39.2, `<div class="bm"><span class="demo">DEMO</span><br>⚡ <b>Perps account</b><br><br>✅ Opened 📈 <b>Long BTC</b> — $22.50 margin at 3×.<br>Filled at <b>86,460.0</b> · fee 0.02 demo pUSD<span class="tm">12:00</span></div>` + KB([['📍 My positions'], ['⬅️ Back']])],
];
const phone = H(`<div class="w"><div id="phone"><div id="screen"><div class="wall"></div><div class="island"></div>
  <div class="status"><span>9:41</span><span>●●● ▮</span></div>
  <div class="tgh"><span class="bk">‹</span>${LOGO(42)}<div><div class="nm">GramFi</div><div class="sb">bot</div></div><span style="margin-left:auto;color:var(--tg);font-size:22px">⋮</span></div>
  <div id="chat"><div class="umsg" id="u_start" style="top:18px">/start<small>12:00 ✓✓</small></div>${ST.map(([id, , html]) => `<div class="st" id="${id}">${html}</div>`).join('')}
   <div id="toast" style="position:absolute;left:30px;right:30px;top:14px;background:rgba(18,20,15,.92);color:#fff;border-radius:16px;padding:14px 16px;font-size:15px;font-weight:600;text-align:center">✅ Now copying <span style="color:var(--lime)">sharp_sports</span><div style="font-weight:400;font-size:12px;color:#B9BEB2;margin-top:3px">new bets will be mirrored automatically</div></div></div>
  <div class="inbar"><span class="menuBtn">☰ Menu</span><div class="ph">Message</div><span style="font-size:22px">🎤</span></div>
</div></div></div>`);
cam.appendChild(phone);
const stEls = ST.map(([id, t]) => ({ el: $('#' + id), t, btns: $$('.kbtn', $('#' + id)), bm: $('.bm', $('#' + id)) }));

// result chips that fly out of the phone (world space, closer to camera)
const chips = [
  { t: 30.6, out: 32.0, el: H(`<div class="w"><div class="chip"><div class="k">IF YES WINS</div><div class="v" style="color:var(--green)">+133%</div><div style="font-size:14px;color:var(--muted);margin-top:4px">23.26 shares · 10 pUSD · demo</div></div></div>`), dx: -470, dy: 330, dz: 180, r: -6 },
  { t: 35.1, out: 36.0, el: H(`<div class="w"><div class="chip" style="display:flex;gap:16px;align-items:center"><span class="av" style="width:56px;height:56px"></span><div><div class="k">COPYING</div><div style="font-family:Unbounded;font-weight:700;font-size:24px;margin:2px 0">sharp_sports</div><div style="font-size:14px"><b class="up">+$7,120</b> PnL 30d · <b>84%</b> win</div></div></div></div>`), dx: -500, dy: 340, dz: 180, r: -5 },
  { t: 39.25, out: 40.2, el: H(`<div class="w"><div class="chip"><div class="k">LONG BTC ×3 · FILLED</div><div class="v">86,460.0</div><div style="margin-top:6px">${SPARK(240, 56, '#17A45E')}</div></div></div>`), dx: -480, dy: 330, dz: 180, r: -6 },
];
chips.forEach(c => cam.appendChild(c.el));

/* ---------------- OVERLAY: captions ---------------- */
const CAPS = [
  { in: .2, out: 1.45, k: '', t: 'Crypto talks on <em>Telegram</em>.', cls: 'intro' },
  { in: 1.6, out: 2.55, k: '', t: 'GramFi turns it into <em>signal</em>.', cls: 'intro' },
  { in: 3.25, out: 7.55, k: '01 · INSIGHT · MOST POPULAR COIN', t: 'See which coins Telegram <em>talks</em> about' },
  { in: 8.15, out: 12.55, k: '02 · CORRELATION ANALYSIS', t: 'Price vs. Telegram <em>attention</em>' },
  { in: 13.15, out: 17.65, k: '03 · CHANNEL MAP', t: 'Find who <em>moves</em> the conversation' },
  { in: 18.25, out: 20.55, k: '04 · GRAMFI × POLYMARKET', t: 'Bet on Polymarket <em>through Telegram</em>' },
  { in: 21.05, out: 22.3, k: 'MOBILE · TELEGRAM BOT', t: 'Now — right <em>in the chat</em>.', cls: 'capside' },
  { in: 22.45, out: 26.75, k: '05 · MARKETS', t: 'Every market, <em>inside</em> Telegram', cls: 'capside' },
  { in: 27.0, out: 31.85, k: '06 · BET', t: 'Three taps to a <em>filled</em> bet', cls: 'capside' },
  { in: 32.15, out: 35.85, k: '07 · COPY TRADING', t: 'Copy the <em>best wallets</em> automatically', cls: 'capside' },
  { in: 36.05, out: 39.9, k: '08 · PERPS', t: 'Long or short BTC up to <em>×50</em>', cls: 'capside' },
];
const capsEl = $('#caps');
CAPS.forEach(c => {
  const words = c.t.replace(/<em>(.*?)<\/em>/g, (m, g) => '<em>' + g.replace(/ /g, '\u0001') + '</em>').split(' ').map(w => w.replace(/\u0001/g, ' '));
  const el = H(`<div class="cap ${c.cls || ''}"><div class="cp"><div class="kk"><i></i><span class="kt"></span></div><div class="tt">${words.map((w, j) => `<span>${w}${j < words.length - 1 ? ' ' : ''}</span>`).join('')}</div></div></div>`);
  if (c.cls === 'intro') { el.style.cssText = 'left:0;right:0;width:auto;top:430px;text-align:center'; $('.tt', el).style.fontSize = '92px'; $('.kk', el).style.display = 'none'; }
  if (c.cls === 'capside') { el.style.top = '360px'; el.style.width = '700px'; $('.tt', el).style.fontSize = '56px'; }
  capsEl.appendChild(el); c.el = el; c.cp = $('.cp', el); c.words = $$('.tt > span', el); c.kt = $('.kt', el); c.ems = $$('em', el);
  ev(c.in, 'caption');
});
// outro lockup
const lock = H(`<div style="position:absolute;left:0;right:0;top:150px;text-align:center">
  <div id="lkLogo" style="display:inline-flex;align-items:center;gap:26px">${LOGO(120)}<span style="font-family:Unbounded;font-weight:800;font-size:128px;letter-spacing:-.03em" id="lkWord">GramFi</span></div>
  <div id="lkTag" style="font-family:Unbounded;font-weight:600;font-size:44px;margin-top:18px;letter-spacing:-.01em">Info-Fi on <span style="background:linear-gradient(transparent 55%,#E2FB3C 55%,#E2FB3C 92%,transparent 92%)">Telegram</span></div>
  <div id="lkUrl" style="display:inline-block;margin-top:28px;font-family:'JetBrains Mono';font-weight:700;font-size:26px;background:#12140F;color:#E2FB3C;border-radius:999px;padding:14px 30px">gramfi.ai</div></div>`);
$('#ov').insertBefore(lock, $('#rips'));

/* ======================================================================
   CAMERA + OBJECT TRACKS
   ====================================================================== */
const CAM = [ // x,y: look-at in world; d: dolly (+ closer); rx/ry/rz degrees
  { t: 0, x: 0, y: -120, d: -3300, rx: 16, ry: -20, rz: -3 },
  { t: 2.3, x: 0, y: -120, d: -2850, rx: 14, ry: -16, rz: -2.5 },
  { t: 3.25, x: -40, y: -150, d: -230, rx: 9, ry: -8, rz: -1 },
  { t: 4.2, x: -140, y: -230, d: 230, rx: 7, ry: -4, rz: 0, hold: 0 },
  { t: 5.75, x: -230, y: -130, d: 170, rx: 5, ry: 5, rz: .5 },
  { t: 7.0, x: -180, y: -130, d: 40, rx: 6, ry: 8, rz: .5 },
  { t: 7.6, x: -320, y: -120, d: -60, rx: 6, ry: 11, rz: 1 },
  { t: 8.75, x: -110, y: -190, d: 160, rx: 7, ry: -6, rz: -.5 },
  { t: 9.7, x: -260, y: 90, d: 270, rx: 9, ry: 9, rz: .5 },
  { t: 11.0, x: 260, y: 90, d: 280, rx: 8, ry: -9, rz: -.5 },
  { t: 12.0, x: 120, y: 0, d: 80, rx: 6, ry: -5, rz: 0 },
  { t: 12.6, x: -280, y: -90, d: -40, rx: 6, ry: 10, rz: 1 },
  { t: 13.85, x: 160, y: -190, d: 170, rx: 7, ry: -8, rz: -.5 },
  { t: 15.15, x: 260, y: -170, d: 180, rx: 6, ry: -9, rz: -.5 },
  { t: 16.3, x: 20, y: 40, d: 330, rx: 4, ry: 2, rz: 0 },
  { t: 17.1, x: -40, y: 20, d: 300, rx: 5, ry: 7, rz: .5 },
  { t: 17.75, x: -230, y: -190, d: 60, rx: 7, ry: 10, rz: 1 },
  { t: 18.8, x: 0, y: -100, d: -140, rx: 8, ry: -8, rz: -.5 },
  { t: 20.4, x: -170, y: 40, d: 120, rx: 6, ry: 6, rz: .5 },
  { t: 21.3, x: 40, y: -20, d: -380, rx: 5, ry: -10, rz: -1 },
  { t: 22.2, x: 110, y: 0, d: -250, rx: 4, ry: -14, rz: -1 },
  { t: 23.45, x: 220, y: 110, d: 90, rx: 4, ry: -10, rz: -.5 },
  { t: 24.75, x: 230, y: 140, d: 110, rx: 5, ry: -6, rz: 0 },
  { t: 26.4, x: 210, y: 10, d: 60, rx: 4, ry: -12, rz: -.5 },
  { t: 28.3, x: 220, y: 170, d: 120, rx: 6, ry: -6, rz: 0 },
  { t: 29.7, x: 230, y: 230, d: 120, rx: 6, ry: -9, rz: 0 },
  { t: 31.0, x: 120, y: 120, d: -20, rx: 5, ry: -15, rz: -1 },
  { t: 32.85, x: 230, y: 120, d: 90, rx: 5, ry: -8, rz: 0 },
  { t: 33.75, x: 220, y: 110, d: 90, rx: 4, ry: -11, rz: -.5 },
  { t: 35.0, x: 190, y: 10, d: 70, rx: 4, ry: -6, rz: 0 },
  { t: 36.7, x: 230, y: 110, d: 90, rx: 5, ry: -12, rz: -.5 },
  { t: 37.6, x: 220, y: 160, d: 120, rx: 5, ry: -7, rz: 0 },
  { t: 38.6, x: 220, y: 220, d: 110, rx: 6, ry: -10, rz: 0 },
  { t: 39.6, x: 130, y: 120, d: -30, rx: 5, ry: -15, rz: -1 },
  { t: 41.6, x: 0, y: -190, d: -560, rx: 9, ry: -3, rz: 0 },
  { t: 43.2, x: 0, y: -185, d: -590, rx: 9, ry: -1.5, rz: 0, hold: 1 },
  { t: 44, x: 0, y: -185, d: -590, rx: 9, ry: -1.5, rz: 0, hold: 1 },
];
const BTN_W = { x: -310, y: 150, z: 20 };       // approx world position of the "TG bot" button
const PH = { x: 330, y: 0, z: 300 };             // phone rest position (mobile half)
function browserPose(t) {
  const a = E.io(seg(t, 20.55, 21.9)), b = E.io(seg(t, 40.0, 41.7));
  let x = lerp(0, -880, a), y = lerp(0, 80, a), z = lerp(0, -1500, a), ry = lerp(0, 26, a), op = lerp(1, .55, a), bl = lerp(0, 7, a);
  x = lerp(x, -420, b); y = lerp(y, 160, b); z = lerp(z, -260, b); ry = lerp(ry, 15, b); op = lerp(op, 1, b); bl = lerp(bl, 0, b);
  return { x, y, z, ry, op, bl };
}
function phonePose(t) {
  if (t < 20.5) return null;
  const f = seg(t, 20.5, 21.95), fe = E.o5(f);
  let x = lerp(BTN_W.x, PH.x, E.io(f)), y = lerp(BTN_W.y, PH.y, E.io(f)) - Math.sin(f * Math.PI) * 110, z = lerp(BTN_W.z, PH.z, fe);
  let s = lerp(.08, 1, E.ob(seg(t, 20.5, 22.05))), ry = lerp(-70, -6, fe), rz = lerp(14, 0, fe), rx = lerp(30, 0, fe);
  const bob = seg(t, 22, 23); y += Math.sin(t * 1.3) * 6 * bob; rz += Math.sin(t * .9) * .4 * bob;
  const o = E.io(seg(t, 40.0, 41.7));
  x = lerp(x, 520, o); y = lerp(y, 200, o); z = lerp(z, 60, o); ry = lerp(ry, -16, o); s = lerp(s, .86, o);
  return { x, y, z, s, rx, ry, rz, op: clamp(seg(t, 20.5, 20.62)) };
}

/* ======================================================================
   CURSOR
   ====================================================================== */
const CUR = [
  { t: 3.0, pt: [2060, 1180] },
  { t: 4.2, sel: '#tab24', c: 1 },
  { t: 5.75, sel: '#tile_Pumpfun', fx: .42, fy: .6 },
  { t: 7.55, sel: '#sb_corr', fx: .3, c: 1 },
  { t: 8.75, sel: '#tab90', c: 1 },
  { t: 11.0, sel: '#bar31', fy: .25 },
  { t: 12.6, sel: '#sb_map', fx: .3, c: 1 },
  { t: 13.85, sel: '#mapInp', fx: .25, c: 1 },
  { t: 15.15, sel: '#mapBtn', c: 1 },
  { t: 16.9, sel: '#mapInfo', fx: .78, fy: .9 },
  { t: 17.75, sel: '#nav_poly', c: 1 },
  { t: 20.4, sel: '#tgBtn', fx: .4, c: 1 },
  { t: 22.6, sel: '#u_start', fx: .2, fy: 2.5 },
  { t: 23.45, sel: '#b_markets', c: 1 },
  { t: 24.75, sel: '#b_trending', c: 1 },
  { t: 26.35, sel: '#b_yes', fx: .66 },
  { t: 27.0, sel: '#b_yes', fx: .62, c: 1 },
  { t: 28.3, sel: '#b_10', c: 1 },
  { t: 29.7, sel: '#b_place', fx: .62, c: 1 },
  { t: 31.2, sel: '#st5 .bm', fx: .8, fy: .7 },
  { t: 32.1, sel: '#b_back1', fx: .6, c: 1 },
  { t: 32.85, sel: '#b_copy', c: 1 },
  { t: 33.75, sel: '#b_pnl', c: 1 },
  { t: 35.0, sel: '#a_add', fx: .55, c: 1 },
  { t: 36.0, sel: '#b_back2', fx: .6, c: 1 },
  { t: 36.7, sel: '#b_perps', fx: .56, c: 1 },
  { t: 37.6, sel: '#b_long', c: 1 },
  { t: 38.6, sel: '#b_open', fx: .62, c: 1 },
  { t: 40.4, pt: [2080, 1220] },
];
CUR.forEach(e => { e.arr = e.c ? e.t - .3 : e.t; e.el = e.sel ? $(e.sel) : null; if (e.c) ev(e.t, 'click'); });
const curEl = $('#cursor'), ripsEl = $('#rips');
const ripEls = CUR.filter(e => e.c).map(e => { const r = H('<div class="rip"></div>'); ripsEl.appendChild(r); return { e, r }; });
function tpos(e) {
  if (e.pt) return e.pt;
  const r = e.el.getBoundingClientRect();
  return [r.left + r.width * (e.fx ?? .5), r.top + r.height * (e.fy ?? .55)];
}
function cursorAt(t) {
  let i = 0; while (i < CUR.length - 1 && CUR[i + 1].arr <= t) i++;
  const a = CUR[i], b = CUR[i + 1];
  const pa = tpos(a);
  if (!b) return pa;
  const leaveA = (a.c ? a.t + .14 : a.arr);
  const travel = Math.min(.8, (b.arr - leaveA) * .9);
  const dep = b.arr - travel;
  if (t <= dep) return pa;
  const pb = tpos(b), u = E.io(seg(t, dep, b.arr));
  const dx = pb[0] - pa[0], dy = pb[1] - pa[1], dist = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * u) * Math.min(90, dist * .14);
  return [lerp(pa[0], pb[0], u) + (-dy / dist) * arc, lerp(pa[1], pb[1], u) + (dx / dist) * arc];
}
// hover/press state of a target element at time t
function hoverState(el, t) {
  let hv = 0, pr = 0;
  for (const e of CUR) { if (e.el !== el) continue; if (t >= e.arr - .06 && t <= (e.c ? e.t + .3 : e.arr + .9)) hv = 1; if (e.c) pr = Math.max(pr, Math.sin(Math.PI * seg(t, e.t - .02, e.t + .16))); }
  return { hv, pr };
}

/* ======================================================================
   SOUND EVENTS (non-click)
   ====================================================================== */
ev(0, 'start'); ev(2.5, 'whoosh', { len: .75, up: 1 }); ev(3.2, 'impact', { g: .6 });
ev(4.25, 'morph'); ev(7.6, 'swish'); ev(8.8, 'build', { len: 1.6 }); ev(12.65, 'swish'); ev(13.1, 'sparkle');
for (let k = 0; k < 13; k++) ev(14.02 + k * .068, 'key');
ev(15.25, 'whoosh', { len: 1.0, up: 0 }); ev(16.2, 'pop'); ev(17.8, 'swish');
ev(20.5, 'riser', { len: 1.5 }); ev(21.55, 'pop'); ev(22.0, 'drop');
ST.forEach(([, t]) => { if (t > 22.5) ev(t, 'pop'); });
ev(29.8, 'tick', { len: .65 }); ev(30.5, 'success'); ev(35.1, 'success'); ev(38.7, 'tick', { len: .5 }); ev(39.2, 'success');
ev(40.0, 'whoosh', { len: 1.2, up: 0 }); ev(40.5, 'logo');

/* ======================================================================
   RENDER
   ====================================================================== */
const curv = { x: 0, y: 0 };
function setW(el, x, y, z, w, h, extra = '') { el.style.transform = `translate3d(${x - w / 2}px,${y - h / 2}px,${z}px) ${extra}`; }
function vis(el, op) { el.style.opacity = op; el.style.visibility = op <= .001 ? 'hidden' : 'visible'; }

function renderAt(t) {
  t = clamp(t, 0, DUR);
  // ---------- camera
  const C = {}; for (const f of ['x', 'y', 'd', 'rx', 'ry', 'rz']) C[f] = spline(CAM, t, f);
  cam.style.transform = `translateZ(${C.d}px) rotateX(${C.rx}deg) rotateY(${C.ry}deg) rotateZ(${C.rz}deg) translate3d(${-C.x}px,${-C.y}px,0)`;
  $('#grid').style.transform = `translate(${(-C.x * .08) % 34}px,${(-C.y * .08) % 34}px)`;
  const focusZ = t < 20.8 ? 0 : t < 40.2 ? PH.z : lerp(PH.z, 0, seg(t, 40.2, 41.6));
  // ---------- environment bubbles (depth of field from distance to focus plane)
  const envOp = 1 - .55 * seg(t, 41, 42.2);
  bubs.forEach((b, i) => {
    const z = b.z, x = b.x + Math.sin(t * b.sp + b.ph) * 30, y = b.y + Math.cos(t * b.sp * .8 + b.ph) * 22 - t * 6;
    const zc = z + C.d;
    const bl = Math.min(16, Math.abs(z - focusZ) * .0065);
    const near = zc > 1700 ? 0 : zc > 1350 ? (1700 - zc) / 350 : 1;
    const intro = seg(t, .0 + i * .02, .6 + i * .02);
    b.el.style.transform = `translate3d(${x}px,${y}px,${z}px) scale(${b.s})`;
    b.el.style.filter = bl > .4 ? `blur(${bl.toFixed(1)}px)` : 'none';
    vis(b.el, near * intro * envOp);
  });

  // ---------- browser
  const B = browserPose(t);
  setW(browser, B.x, B.y, B.z, 1440, 830, `rotateY(${B.ry}deg)`);
  browser.style.filter = B.bl > .2 ? `blur(${B.bl.toFixed(1)}px)` : 'none';
  vis(browser, B.op * E.o(seg(t, 1.9, 2.7)));
  // nav & sidebar & url
  const pageIdx = PAGES.findIndex(p => t >= p[1] && t < p[2]);
  $('#nav_insight').className = 'it' + (t < 17.8 ? ' on' : '');
  const np = hoverState($('#nav_poly'), t); $('#nav_poly').className = 'it' + (t >= 17.8 ? ' on' : np.hv ? ' on' : '');
  $('#nav_poly').style.transform = `scale(${1 - np.pr * .06})`;
  SIDE.forEach(([id]) => {
    const el = $('#' + id), hs = hoverState(el, t);
    const on = (id === 'sb_popular' && t < 7.6) || (id === 'sb_corr' && t >= 7.6 && t < 12.65) || (id === 'sb_map' && t >= 12.65 && t < 17.8);
    el.className = 's' + (on ? ' on' : hs.hv ? ' hv' : ''); el.style.transform = `scale(${1 - hs.pr * .05})`;
  });
  $('#url').textContent = pageIdx === 3 ? 'gramfi.ai/polymarket' : `gramfi.ai/insight?tab=${PAGES[Math.max(0, pageIdx)][3]}`;
  // page transitions
  PAGES.forEach(([el, a, b]) => {
    const inn = E.o5(seg(t, a + .14, a + .62)), out = E.io(seg(t, b, b + .2));
    const x = (1 - inn) * 90 - out * 70;
    el.style.transform = `translateX(${x}px)`; vis(el, Math.min(inn, 1 - out));
  });

  // ---------- page 1: treemap
  if (t < 8.2) {
    const m = E.io(seg(t, 4.22, 5.0)), sw = t >= 4.6;
    $('#tab1').className = 'tab' + (t < 4.2 ? ' on' : '');
    const h24 = hoverState($('#tab24'), t); $('#tab24').className = 'tab' + (t >= 4.2 ? ' on' : h24.hv ? ' hv' : ''); $('#tab24').style.transform = `scale(${1 - h24.pr * .08})`;
    const hvP = t >= 5.65 && t < 7.25 ? E.o(seg(t, 5.65, 5.95)) * (1 - E.io(seg(t, 7.0, 7.25))) : 0;
    tiles.forEach(({ c, el, cEl }, i) => {
      const a = L1[c[0]], b = L24[c[0]], ap = E.o(seg(t, 3.0 + i * .03, 3.5 + i * .03));
      const lag = E.io(seg(t, 4.22 + (i % 5) * .03, 5.0 + (i % 5) * .03));
      const r = { x: lerp(a.x, b.x, lag), y: lerp(a.y, b.y, lag), w: lerp(a.w, b.w, lag), h: lerp(a.h, b.h, lag) };
      const ch = sw ? c[4] : c[3], k = clamp(Math.abs(ch) / 8), up = ch >= 0;
      const isP = c[0] === 'Pump.fun';
      el.style.left = r.x + 'px'; el.style.top = r.y + 'px'; el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
      el.style.background = up ? `rgb(${lerp(228, 140, k)},${lerp(246, 214, k)},${lerp(234, 170, k)})` : `rgb(${lerp(252, 240, k)},${lerp(230, 150, k)},${lerp(228, 146, k)})`;
      el.className = 'tile' + (r.w > 170 && r.h > 110 ? ' big' : '');
      el.style.transform = `scale(${(.85 + .15 * ap) * (isP ? 1 + .025 * hvP : 1)})`;
      el.style.opacity = ap * (hvP && !isP ? 1 - .35 * hvP : 1);
      el.style.zIndex = isP ? 2 : 1;
      el.style.boxShadow = isP && hvP ? `0 ${16 * hvP}px ${36 * hvP}px rgba(20,24,16,${.28 * hvP}), 0 0 0 ${3 * hvP}px #12140F` : 'none';
      cEl.textContent = (up ? '+' : '') + ch.toFixed(2) + '%'; cEl.className = 'c ' + (up ? 'up' : 'dn');
    });
    const pr = L24['Pump.fun'];
    tip.style.left = (pr.x + pr.w * .5 + 20) + 'px'; tip.style.top = (pr.y + pr.h * .5 + 26 + (1 - hvP) * 14) + 'px';
    vis(tip, hvP);
    moverRows.forEach(({ c, el, sh, ch }) => {
      const y1 = ord1.indexOf(c[0]), y2 = ord24.indexOf(c[0]), lag = E.io(seg(t, 4.3 + y2 * .02, 5.0 + y2 * .02));
      el.style.top = (44 + lerp(y1, y2, lag) * 44) + 'px';
      sh.textContent = (sw ? c[8] : c[7]).toFixed(1) + '%'; const v = sw ? c[4] : c[3]; ch.textContent = (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; ch.className = 'mono ch ' + (v >= 0 ? 'up' : 'dn');
      el.style.background = c[0] === 'Pump.fun' && sw ? `rgba(226,251,60,${.55 * E.o(seg(t, 4.9, 5.3))})` : 'transparent';
    });
  }
  // ---------- page 2: correlation
  if (t > 7.4 && t < 13.2) {
    const p = seg(t, 8.8, 10.4), sw = t >= 8.75;
    $('#tab30').className = 'tab' + (sw ? '' : ' on');
    const h9 = hoverState($('#tab90'), t); $('#tab90').className = 'tab' + (sw ? ' on' : h9.hv ? ' hv' : ''); $('#tab90').style.transform = `scale(${1 - h9.pr * .08})`;
    const intro = E.o(seg(t, 7.7, 8.4));
    bars.forEach((r, i) => {
      const q = E.o(seg(p, i / NB * .65, i / NB * .65 + .35)), shrink = E.io(seg(t, 8.78, 9.05));
      const v = p > 0 ? (q > 0 ? datB[i] * E.ob(q) : datA[i] * (1 - shrink)) : datA[i] * E.o(seg(intro, i / NB * .5, i / NB * .5 + .5));
      const h = Math.max(0, v * 330);
      r.setAttribute('y', 400 - h); r.setAttribute('height', h);
      const hot = t > 10.85 && t < 12.4 && i === 31;
      r.setAttribute('fill', hot ? '#12140F' : (sw && i > 26 && i < 34 ? '#5AA9E6' : '#A9D3F2'));
    });
    const lp = p > 0 ? p : 1;
    pline.setAttribute('d', linePath(p > 0 ? prB : prA));
    const L = pline.getTotalLength(); pline.style.strokeDasharray = L; pline.style.strokeDashoffset = L * (1 - (p > 0 ? E.io(p) : intro));
    const di = Math.min(NB - 1, Math.floor((p > 0 ? E.io(p) : intro) * (NB - 1)));
    const pt = pline.getPointAtLength(L * (p > 0 ? E.io(p) : intro));
    pdot.setAttribute('cx', pt.x); pdot.setAttribute('cy', pt.y); pdot.style.opacity = (p > 0 && p < 1) ? 1 : 0;
    const K = (a, b) => lerp(a, b, E.io(p));
    $('#k0').textContent = '$' + fmt(80010); $('#k1').textContent = K(-2.1, -5.3).toFixed(1) + '%';
    $('#k2').textContent = fmt(Math.round(K(11240, 33165))); $('#k3').textContent = K(-.11, -.24).toFixed(2);
    $('#k4').textContent = K(-.18, -.29).toFixed(2); $('#k5').textContent = K(-.06, -.14).toFixed(2);
    $('#cs').textContent = sw ? '2026-07-28 → 2026-10-26 · 90 days' : '2026-09-26 → 2026-10-26 · 30 days';
    const ht = t > 10.85 && t < 12.45 ? E.o(seg(t, 10.85, 11.1)) * (1 - E.io(seg(t, 12.2, 12.45))) : 0;
    const bx = 15.5 + 31 * 24.2; vline.setAttribute('x1', bx); vline.setAttribute('x2', bx); vline.style.opacity = ht;
    const ct = $('#chartTip'); ct.style.left = (20 + bx - 250) + 'px'; ct.style.top = (86 + (1 - ht) * 10) + 'px'; vis(ct, ht);
  }
  // ---------- page 3: channel map
  if (t > 12.4 && t < 18.4) drawMap(t);
  // ---------- page 4: polymarket
  if (t > 17.6 && t < 22.5) {
    const a = seg(t, 17.9, 19.0);
    $('#s0').textContent = '$' + (9.9 * E.o(a)).toFixed(1) + 'B'; $('#s1').textContent = '$' + Math.round(171 * E.o(a)) + 'M+'; $('#s2').textContent = '#' + Math.max(1, Math.round(9 - 8 * E.o(a)));
    $$('.mk', pg_poly).forEach((m, i) => { const q = E.o(seg(t, 18.2 + i * .12, 18.8 + i * .12)); m.style.transform = `translateY(${(1 - q) * 40}px)`; m.style.opacity = q; });
    const hb = hoverState($('#tgBtn'), t), pushed = seg(t, 20.4, 20.55);
    const btn = $('#tgBtn');
    btn.style.transform = `scale(${(1 + hb.hv * .04) * (1 - hb.pr * .07)})`;
    btn.style.background = t >= 20.4 ? '#12140F' : '#E2FB3C'; btn.style.color = t >= 20.4 ? '#E2FB3C' : '#12140F';
    btn.style.boxShadow = `0 ${8 + hb.hv * 10}px ${20 + hb.hv * 16}px rgba(160,190,0,${.35 + hb.hv * .2})`;
    $('#tgLbl').textContent = t >= 20.42 ? 'Opening Telegram…' : 'GramFi-Polymarket TG Bot';
  }

  // ---------- phone
  const P = phonePose(t);
  if (P) {
    setW(phone, P.x, P.y, P.z, 450, 940, `rotateX(${P.rx}deg) rotateY(${P.ry}deg) rotateZ(${P.rz}deg) scale(${P.s})`); vis(phone, P.op);
    let cur = -1; stEls.forEach((s, i) => { if (t >= s.t) cur = i; });
    $('#u_start').style.opacity = E.o(seg(t, 21.55, 21.8)); $('#u_start').style.transform = `translateY(${(1 - E.o(seg(t, 21.55, 21.85))) * 20}px)`;
    stEls.forEach((s, i) => {
      const next = stEls[i + 1];
      const inn = seg(t, s.t + .05, s.t + .37), out = next ? seg(t, next.t - .03, next.t + .08) : 0;
      const op = (t >= s.t ? E.o(inn) : 0) * (1 - out);
      vis(s.el, op);
      s.el.style.transform = `translateY(${(1 - E.o5(inn)) * 26 - out * 10}px) scale(${lerp(.97, 1, E.ob(inn))})`;
      if (op <= 0) return;
      s.bm.style.transformOrigin = '0 100%';
      s.btns.forEach((b, j) => {
        const q = E.ob(seg(t, s.t + .06 + j * .025, s.t + .36 + j * .025));
        const hs = hoverState(b, t);
        b.classList.toggle('hv', !!hs.hv);
        b.style.transform = `translateY(${(1 - q) * 14}px) scale(${(.94 + .06 * q) * (1 - hs.pr * .06)})`; b.style.opacity = clamp(q * 1.3);
      });
    });
    // processing states
    const placing = t >= 29.72 && t < 30.5, opening = t >= 38.62 && t < 39.2;
    $('#placeLbl').style.display = placing ? 'none' : 'inline'; $('#placeSp').style.display = placing ? 'inline-flex' : 'none';
    $('#openLbl').style.display = opening ? 'none' : 'inline'; $('#openSp').style.display = opening ? 'inline-flex' : 'none';
    $('#spin1').style.transform = `rotate(${t * 900}deg)`; $('#spin2').style.transform = `rotate(${t * 900}deg)`;
    if (placing) $('#b_place').classList.add('dk'); else $('#b_place').classList.remove('dk');
    if (opening) $('#b_open').classList.add('dk'); else $('#b_open').classList.remove('dk');
    const ad = hoverState($('#a_add'), t); $('#a_add').style.background = ad.hv || (t > 35 && t < 36) ? '#E2FB3C' : 'transparent'; $('#a_add').style.borderRadius = '6px'; $('#a_add').style.padding = '1px 4px';
    if (t > 35) $('#a_add').textContent = '✅ Copying';
    else $('#a_add').textContent = '➕ Add';
    const to = E.ob(seg(t, 35.1, 35.4)) * (1 - E.io(seg(t, 35.9, 36.1)));
    $('#toast').style.transform = `translateY(${(1 - to) * -30}px) scale(${.9 + .1 * to})`; vis($('#toast'), clamp(to));
    // chips
    chips.forEach(c => {
      const q = seg(t, c.t, c.t + .7), out = E.io(seg(t, c.out, c.out + .35));
      if (q <= 0 || out >= 1) { vis(c.el, 0); return; }
      const e = E.o5(q);
      const x = P.x + c.dx * e, y = P.y + c.dy * e - Math.sin(q * Math.PI) * 60 + Math.sin(t * 1.6) * 6, z = P.z + c.dz * e + out * 120;
      c.el.style.transform = `translate3d(${x - 170}px,${y - 60}px,${z}px) rotateY(${18 * (1 - e)}deg) rotateZ(${c.r * e}deg) scale(${(.3 + .7 * E.ob(q)) * (1 - out * .2)})`;
      vis(c.el, clamp(q * 3) * (1 - out));
    });
  } else { vis(phone, 0); chips.forEach(c => vis(c.el, 0)); vis($('#toast'), 0); }

  // ---------- captions
  CAPS.forEach(c => {
    const vin = t >= c.in - .01 && t <= c.out + .6;
    if (!vin) { vis(c.el, 0); return; }
    vis(c.el, 1);
    c.words.forEach((w, j) => {
      const q = seg(t, c.in + j * .065, c.in + j * .065 + .6), o = seg(t, c.out + j * .03, c.out + j * .03 + .32);
      const e = E.o5(q), eo = E.i(o);
      w.style.transform = `translateY(${(1 - e) * 60 - eo * 46}px) rotateX(${(1 - e) * -75 + eo * 50}deg)`;
      w.style.opacity = clamp(q * 1.6) * (1 - eo); w.style.filter = (1 - e) > .02 || eo > .02 ? `blur(${((1 - e) * 10 + eo * 8).toFixed(1)}px)` : 'none';
    });
    if (c.cls !== 'intro') { const pi = E.o5(seg(t, c.in - .04, c.in + .3)), po = E.io(seg(t, c.out + .15, c.out + .55)); c.cp.style.opacity = pi * (1 - po); c.cp.style.transform = `translateX(${(1 - pi) * -40 - po * 30}px) scale(${.96 + .04 * pi})`; }
    c.ems.forEach(m => { const q = E.io(seg(t, c.in + .35, c.in + .85)); m.style.backgroundSize = `${q * 100}% 100%`; m.style.backgroundRepeat = 'no-repeat'; });
    const n = Math.round(c.k.length * seg(t, c.in, c.in + .45)); c.kt.textContent = c.k.slice(0, n);
    $('.kk', c.el).style.opacity = 1 - seg(t, c.out, c.out + .3);
  });
  // outro lockup
  const lk = seg(t, 40.5, 41.3);
  vis(lock, clamp(lk * 4));
  $('#lkLogo').style.transform = `translateY(${(1 - E.o5(lk)) * 70}px) scale(${lerp(.6, 1, E.ob(lk))})`;
  $('#lkLogo svg').style.transform = `rotate(${(1 - E.o5(seg(t, 40.5, 41.4))) * -200}deg)`;
  $('#lkWord').style.letterSpacing = `${lerp(.25, -.03, E.o5(seg(t, 40.7, 41.6)))}em`;
  const tg = E.o5(seg(t, 41.1, 41.8)); $('#lkTag').style.transform = `translateY(${(1 - tg) * 40}px)`; $('#lkTag').style.opacity = tg;
  const ur = E.ob(seg(t, 41.6, 42.2)); $('#lkUrl').style.transform = `scale(${ur})`; $('#lkUrl').style.opacity = clamp(ur);

  // ---------- cursor (screen-space overlay, hotspot = arrow tip)
  const [cx, cy] = cursorAt(t);
  let press = 0; for (const e of CUR) if (e.c) press = Math.max(press, Math.sin(Math.PI * seg(t, e.t - .04, e.t + .18)));
  const sc = (t > 20.8 && t < 40.3 ? 1.12 : 1) * (1 - press * .14);
  curEl.style.transform = `translate(${cx - 4 * sc}px,${cy - 3 * sc}px) scale(${sc}) rotate(${-press * 4}deg)`;
  let cop = seg(t, 3.0, 3.25) * (1 - seg(t, 40.6, 40.9));
  if (t > 20.55 && t < 22.2) cop = t < 20.75 ? 1 - seg(t, 20.55, 20.75) : seg(t, 21.95, 22.2);
  curEl.style.opacity = cop;
  ripEls.forEach(({ e, r }) => {
    const q = seg(t, e.t, e.t + .5);
    if (q <= 0 || q >= 1) { vis(r, 0); return; }
    const p = tpos(e), s = 18 + E.o(q) * 70;
    r.style.left = (p[0] - s / 2) + 'px'; r.style.top = (p[1] - s / 2) + 'px'; r.style.width = r.style.height = s + 'px'; vis(r, (1 - q) * .9);
  });
  // drop flash (soft, single, not strobe)
  $('#flash').style.opacity = .35 * Math.exp(-Math.max(0, t - 22.0) * 9) * (t >= 22.0 ? 1 : 0) + .25 * Math.exp(-Math.max(0, t - 3.2) * 8) * (t >= 3.2 ? 1 : 0);
}

function drawMap(t) {
  const W = 1156, Hh = 640, c = mctx; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, W, Hh);
  const z = 1 + 1.15 * E.io(seg(t, 15.2, 16.4)), tg = NODES[TGT], fz = E.io(seg(t, 15.2, 16.4));
  const fx = lerp(W / 2, tg.x, fz), fy = lerp(Hh / 2, tg.y, fz);
  const drift = Math.sin(t * .4) * 6;
  c.translate(W / 2, Hh / 2); c.scale(z, z); c.translate(-fx + drift, -fy);
  const ap = i => E.ob(seg(t, 12.9 + (i % 60) * .012 + Math.floor(i / 60) * .05, 13.4 + (i % 60) * .012 + Math.floor(i / 60) * .05));
  const hl = seg(t, 15.5, 16.6);
  c.lineWidth = 1 / z * 1.2;
  EDGES.forEach(([a, b]) => { const A = NODES[a], B = NODES[b], k = Math.min(ap(a), ap(b)); if (k <= 0) return; c.strokeStyle = `rgba(60,70,50,${.13 * clamp(k) * (1 - .5 * hl)})`; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); });
  HE.forEach((j, k) => {
    const q = E.o(seg(t, 15.55 + k * .05, 15.95 + k * .05)); if (q <= 0) return; const B = NODES[j];
    c.strokeStyle = 'rgba(18,20,15,.85)'; c.lineWidth = 2.2 / z; c.beginPath(); c.moveTo(tg.x, tg.y); c.lineTo(lerp(tg.x, B.x, q), lerp(tg.y, B.y, q)); c.stroke();
    if (q > .98) { c.fillStyle = '#E2FB3C'; c.beginPath(); c.arc(B.x, B.y, (B.r + 3.5) / Math.sqrt(z), 0, 7); c.fill(); }
  });
  NODES.forEach((n, i) => {
    const k = ap(i); if (k <= 0) return;
    c.fillStyle = n.c; c.globalAlpha = clamp(k) * (hl > 0 && i !== TGT && !HE.includes(i) ? 1 - .5 * hl : 1);
    c.beginPath(); c.arc(n.x, n.y, n.r * k, 0, 7); c.fill();
  });
  c.globalAlpha = 1;
  const pulse = seg(t, 15.3, 17.8);
  if (pulse > 0) {
    for (let r = 0; r < 2; r++) { const ph = (pulse * 2.2 + r * .5) % 1; c.strokeStyle = `rgba(18,20,15,${.6 * (1 - ph)})`; c.lineWidth = 2.5 / z; c.beginPath(); c.arc(tg.x, tg.y, 16 + ph * 40, 0, 7); c.stroke(); }
    c.fillStyle = '#E2FB3C'; c.strokeStyle = '#12140F'; c.lineWidth = 3 / z; c.beginPath(); c.arc(tg.x, tg.y, 15, 0, 7); c.fill(); c.stroke();
  }
  // search typing
  const typed = 'Activity News', n = Math.round(typed.length * seg(t, 14.0, 14.9));
  const focused = t >= 13.85; $('#mapInp').className = 'inp' + (focused ? ' f' : '');
  $('#mapTxt').textContent = n > 0 ? typed.slice(0, n) : 'Search channel name';
  $('#caret').style.opacity = focused && t < 15.3 && (Math.floor(t * 3) % 2 === 0 || (t > 14 && t < 14.9)) ? 1 : 0;
  const hb = hoverState($('#mapBtn'), t); $('#mapBtn').className = 'btn' + (hb.hv || t > 15.15 ? ' lime' : ''); $('#mapBtn').style.transform = `scale(${1 - hb.pr * .08})`;
  // info card follows the projected node
  const sx = (tg.x - fx + drift) * z + W / 2, sy = (tg.y - fy) * z + Hh / 2;
  const ic = E.ob(seg(t, 16.2, 16.6)), info = $('#mapInfo');
  info.style.left = (sx + 46) + 'px'; info.style.top = (sy - 70) + 'px'; info.style.transform = `scale(${.8 + .2 * ic})`; info.style.transformOrigin = '0 50%'; vis(info, clamp(ic));
}

window.renderAt = renderAt; window.EVENTS = EVENTS.sort((a, b) => a.t - b.t); window.DUR = DUR;
window.READY = document.fonts.ready.then(() => { renderAt(0); return true; });
