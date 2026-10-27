// Deterministic frame renderer: node render.js <outDir> [fps=120] [workers=3]
// Renders every frame at t = i/fps, then build.sh blends subframe pairs into 60 fps with motion blur.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2], fps = +(process.argv[3] || 120), W = +(process.argv[4] || 3);
  fs.mkdirSync(out, { recursive: true });
  const url = 'file://' + path.resolve(__dirname, 'index.html');
  let dur = 0;
  const work = async k => {
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(url); await p.evaluate(() => window.READY);
    if (k === 0) { const ev = await p.evaluate(() => ({ dur: window.DUR, events: window.EVENTS })); dur = ev.dur; fs.writeFileSync(path.join(__dirname, 'events.json'), JSON.stringify(ev, null, 1)); }
    const d = await p.evaluate(() => window.DUR), N = Math.round(d * fps);
    for (let i = k; i < N; i += W) {
      const f = path.join(out, `f${String(i).padStart(5, '0')}.jpg`);
      if (fs.existsSync(f)) continue;
      await p.evaluate(t => renderAt(t), i / fps);
      await p.screenshot({ path: f, type: 'jpeg', quality: 94 });
      if (i % 600 < W) console.log(`worker ${k}: frame ${i}/${N}`);
    }
    await b.close();
  };
  await Promise.all([...Array(W).keys()].map(work));
  console.log('done');
})();
