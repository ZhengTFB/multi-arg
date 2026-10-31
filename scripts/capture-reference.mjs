// 抓取 Natural Organic 展示页的源码（渲染后 DOM、全部样式表、类名清单）。
// 页面是 Next.js + Tailwind，服务端 HTML 里类名已经完整，但样式表是运行时注入的，
// 所以要等渲染完再取 styleSheets，拿到的才是最终生效的那份。
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PAGE_URL = 'https://www.stylekit.top/styles/natural-organic/showcase';
const OUT = path.resolve('设计参考/natural-organic/source');

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

const html = await page.evaluate(() => document.documentElement.outerHTML);
fs.writeFileSync(path.join(OUT, 'page.html'), html);

const sheets = await page.evaluate(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules = '';
    try {
      rules = [...sheet.cssRules].map((r) => r.cssText).join('\n');
    } catch {
      rules = '';
    }
    out.push({ href: sheet.href, owner: sheet.ownerNode?.tagName || '', length: rules.length, rules });
  }
  return out;
});

sheets.forEach((s, i) => {
  if (!s.length) return;
  const name = s.href
    ? path.basename(new URL(s.href, PAGE_URL).pathname).replace(/[^\w.-]/g, '_')
    : `inline-${i}.css`;
  fs.writeFileSync(path.join(OUT, `css-${String(i).padStart(2, '0')}-${name}`), s.rules);
});

const info = await page.evaluate(() => {
  const counts = new Map();
  const add = (c) => {
    for (const t of c.split(/\s+/)) if (t) counts.set(t, (counts.get(t) || 0) + 1);
  };
  for (const el of document.querySelectorAll('[class]')) add(el.getAttribute('class'));

  const props = new Map();
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of rules) {
      if (!r.style) continue;
      for (let i = 0; i < r.style.length; i++) {
        const p = r.style[i];
        if (p.startsWith('--')) props.set(p, r.style.getPropertyValue(p).trim());
      }
    }
  }

  const sections = [...document.querySelectorAll('section')].map((s) => ({
    id: s.id,
    text: (s.innerText || '').replace(/\s+/g, ' ').slice(0, 80),
    html: s.outerHTML,
  }));

  return {
    classes: [...counts.entries()].sort((a, b) => b[1] - a[1]),
    vars: [...props.entries()],
    sections,
  };
});

fs.writeFileSync(
  path.join(OUT, 'classes.tsv'),
  info.classes.map(([k, v]) => `${v}\t${k}`).join('\n'),
);
fs.writeFileSync(path.join(OUT, 'variables.css'), `:root{\n${info.vars.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`);

const comp = info.sections.find((s) => s.text.startsWith('COMPONENTS'));
if (comp) fs.writeFileSync(path.join(OUT, 'section-components.html'), comp.html);

console.log('page.html', html.length);
console.log('css files', sheets.filter((s) => s.length).length);
console.log('classes', info.classes.length);
console.log('css vars', info.vars.length);
console.log('sections', info.sections.map((s) => s.text.slice(0, 20)).join(' | '));
console.log('top classes', info.classes.slice(0, 30).map(([k, v]) => `${k}:${v}`).join(' '));

await browser.close();
