// Render selected timestamps to PNG for review:  node preview.js out_dir t1 t2 ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, 'index.html'));
  await p.evaluate(() => window.READY);
  for (const t of ts) { await p.evaluate(t => renderAt(+t), t); await p.screenshot({ path: `${out}/t${(+t).toFixed(2).padStart(6, '0')}.png` }); }
  await b.close();
})();
