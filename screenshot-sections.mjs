import { createRequire } from 'module';
const require = createRequire('file:///C:/Users/archidat/puppeteer-install/');
const puppeteer = require('puppeteer');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const CHROME = 'C:/Users/archidat/.cache/puppeteer/chrome/win64-145.0.7632.77/chrome-win64/chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

// Scroll to trigger animations / lazy elements
await page.evaluate(async () => {
  await new Promise(resolve => {
    let y = 0;
    const step = () => { window.scrollBy(0, 400); y += 400; if (y < document.body.scrollHeight) requestAnimationFrame(step); else { window.scrollTo(0,0); resolve(); } };
    requestAnimationFrame(step);
  });
});
await new Promise(r => setTimeout(r, 600));

// Collect all sections + nav + footer + banner <a>
const elements = await page.evaluate(() => {
  const labels = {
    'nav':                   '00-nav',
    '#process-section':      '06-process',
    '#ayc-banner':           '07-banner',
  };

  const sectionNames = [
    '01-hero',
    '02-social-media',
    '03-quote',
    '04-comparison',
    '05-leadmagnet',
    '06-process',       // skipped via id above, but kept as fallback
    '08-platform',
    '09-analytics',
    '10-security',
    '11-features',
    '12-why-aycaramba',
    '13-faq',
  ];

  const results = [];

  // Nav
  const nav = document.querySelector('nav');
  if (nav) {
    const r = nav.getBoundingClientRect();
    results.push({ label: '00-nav', y: r.top + window.scrollY, height: r.height });
  }

  // All sections in order
  const sections = Array.from(document.querySelectorAll('section, footer, #ayc-banner'));
  let sIdx = 1;
  sections.forEach(el => {
    const r = el.getBoundingClientRect();
    const y = r.top + window.scrollY;
    const h = r.height;
    let label;
    if (el.id === 'process-section') label = '06-process';
    else if (el.id === 'ayc-banner')  label = '07-banner';
    else if (el.tagName === 'FOOTER') label = '14-footer';
    else { label = String(sIdx).padStart(2,'0') + '-section'; sIdx++; }
    results.push({ label, y, height: h });
  });

  return results;
});

console.log('Found elements:', elements.map(e => e.label));

for (const el of elements) {
  const pad = 0;
  const y   = Math.max(0, Math.round(el.y) - pad);
  const h   = Math.round(el.height) + pad * 2;
  const filename = `section-${el.label}.png`;
  const filepath  = path.join(dir, filename);

  await page.screenshot({
    path: filepath,
    clip: { x: 0, y, width: 1440, height: Math.min(h, 6000) },
  });
  console.log(`Saved: temporary screenshots/${filename}`);
}

await browser.close();
console.log('\nAll done.');
