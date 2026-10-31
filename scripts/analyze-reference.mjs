// 从抓下来的 page.html 里统计真实取值、抽出可直接抄的片段，生成 recipes.md。
// 这个页面把颜色和圆角写在行内 style 上、把版式写在 Tailwind 类上，两边都要收。
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('设计参考/natural-organic/source');
const html = fs.readFileSync(path.join(SRC, 'page.html'), 'utf8');

const tags = [...html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)];
console.log('elements', tags.length);

const decls = new Map();
const perProp = new Map();
for (const [, tag, attrs] of tags) {
  const m = attrs.match(/style="([^"]*)"/i);
  if (!m) continue;
  for (const d of m[1].split(';')) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const k = d.slice(0, i).trim().toLowerCase();
    const v = d.slice(i + 1).trim();
    if (!k) continue;
    if (/^(opacity|transform|transition)$/.test(k)) continue;
    const key = `${k}: ${v}`;
    decls.set(key, (decls.get(key) || 0) + 1);
    if (!perProp.has(k)) perProp.set(k, new Map());
    const sub = perProp.get(k);
    sub.set(v, (sub.get(v) || 0) + 1);
  }
}

const cls = new Map();
for (const [, , attrs] of tags) {
  const m = attrs.match(/class="([^"]*)"/i);
  if (!m) continue;
  for (const t of m[1].split(/\s+/)) if (t) cls.set(t, (cls.get(t) || 0) + 1);
}

const byFreq = (m, n = 30) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

// 抓完整元素，便于直接复制
const grab = (re, n = 4) => {
  const out = [];
  for (const m of html.matchAll(re)) {
    const s = m[0].replace(/\s+/g, ' ');
    if (!out.includes(s)) out.push(s);
    if (out.length >= n) break;
  }
  return out;
};

const lines = [];
lines.push('# Natural Organic · 源码配方');
lines.push('');
lines.push('全部来自 https://www.stylekit.top/styles/natural-organic/showcase 渲染后的真实 DOM。');
lines.push('颜色和圆角写在行内 `style`，版式写在 Tailwind 类。按这里的值写，不要看截图重新配。');
lines.push('');

lines.push('## 颜色（行内声明，按出现次数）');
lines.push('```');
for (const [k, v] of byFreq(perProp.get('background-color') || new Map(), 12)) lines.push(`${String(v).padStart(3)}×  ${k}`);
lines.push('---');
for (const [k, v] of byFreq(perProp.get('color') || new Map(), 12)) lines.push(`${String(v).padStart(3)}×  ${k}`);
lines.push('---');
for (const [k, v] of byFreq(perProp.get('border') || new Map(), 10)) lines.push(`${String(v).padStart(3)}×  ${k}`);
lines.push('```');
lines.push('');

lines.push('## 圆角（这个风格的签名，成对的不等角）');
lines.push('```');
for (const [k, v] of byFreq(perProp.get('border-radius') || new Map(), 14)) lines.push(`${String(v).padStart(3)}×  ${k}`);
lines.push('```');
lines.push('');

lines.push('## 阴影');
lines.push('```');
for (const [k, v] of byFreq(perProp.get('box-shadow') || new Map(), 8)) lines.push(`${String(v).padStart(3)}×  ${k}`);
lines.push('```');
lines.push('');

lines.push('## 版式类名（Tailwind，按出现次数）');
lines.push('```');
for (const [k, v] of byFreq(cls, 60)) lines.push(`${String(v).padStart(3)}×  ${k}`);
lines.push('```');
lines.push('');

lines.push('## 可直接复制的元素');
lines.push('');
const blocks = [
  ['主按钮（深土褐，不等角）', /<button[^>]*background-color:#5c4033[^>]*>[\s\S]{0,200}?<\/button>/g],
  ['次按钮（亚麻底）', /<button[^>]*background-color:#e9e0d4[^>]*>[\s\S]{0,160}?<\/button>/g],
  ['鼠尾草按钮', /<button[^>]*background-color:#8b9d77[^>]*>[\s\S]{0,160}?<\/button>/g],
  ['白卡容器', /<div[^>]*background-color:#fff;[^>]*>/g],
  ['输入框', /<input[^>]*>/g],
  ['标签胶囊', /<span[^>]*border-radius:9999px[^>]*>/g],
  ['小徽章 / 圆点', /<span[^>]*background-color:#(d4a373|8b9d77)[^>]*>/g],
];
for (const [label, re] of blocks) {
  const hits = grab(re, 3);
  if (!hits.length) continue;
  lines.push(`### ${label}`);
  for (const h of hits) lines.push('```html\n' + h + '\n```');
  lines.push('');
}

fs.writeFileSync(path.join(SRC, 'recipes.md'), lines.join('\n'));
console.log('recipes.md', lines.length, 'lines');
console.log('distinct decls', decls.size, 'classes', cls.size);
