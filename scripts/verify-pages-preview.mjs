import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('dist');
assert(fs.existsSync(path.join(root, 'index.html')), 'Run npm run build first.');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const prefix = home.match(/(?:src|href)="([^"\s]*)\/_astro\//)?.[1] || '';
const routes = ['', 'about', 'clients', 'collaborators', 'contact', 'services', ...fs.readdirSync('src/content/services').filter((f) => f.endsWith('.md')).map((f) => `services/${f.slice(0, -3)}`)];
const content = new Map();
const decode = (text) => text.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
function localFile(pathname) {
  assert(!prefix || pathname.startsWith(`${prefix}/`) || pathname === prefix, `Unprefixed local URL: ${pathname}`);
  const logical = prefix ? pathname.slice(prefix.length) : pathname;
  let file = path.join(root, decodeURIComponent(logical));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  assert(file.startsWith(`${root}/`) && fs.existsSync(file), `Missing local file: ${pathname}`);
  return file;
}
for (const locale of ['en', 'ar']) for (const route of routes) {
  const file = path.join(root, locale === 'ar' ? 'ar' : '', route, 'index.html');
  assert(fs.existsSync(file), `Missing route: ${locale}/${route}`);
  const html = fs.readFileSync(file, 'utf8');
  assert(html.includes(`lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
  assert(!/TODO|Arabic translation —/.test(html));
  content.set(file, html);
}
content.set(path.join(root, '404.html'), fs.readFileSync(path.join(root, '404.html'), 'utf8'));
content.set(path.join(root, 'ar/404/index.html'), fs.readFileSync(path.join(root, 'ar/404/index.html'), 'utf8'));
let checked = 0;
for (const [file, raw] of content) {
  const html = raw.replace(/<!--[\s\S]*?-->/g, '');
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const link = decode(match[1]);
    if (!link.startsWith('/') && !link.startsWith('#') || link.startsWith('//')) continue;
    const url = new URL(link, `https://preview.invalid${prefix}/${path.relative(root, file).replace(/index\.html$/, '')}`);
    const target = link.startsWith('#') ? file : localFile(url.pathname);
    if (url.hash && path.extname(target) === '.html') {
      const targetHTML = content.get(target) || fs.readFileSync(target, 'utf8');
      assert(targetHTML.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Missing section anchor: ${link}`);
    }
    checked++;
  }
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) for (const item of decode(match[1]).split(',')) {
    const src = item.trim().split(/\s+/)[0];
    if (src.startsWith('/')) { localFile(new URL(src, 'https://preview.invalid').pathname); checked++; }
  }
}
assert(!fs.existsSync('src/pages/api'), 'API routes must not be included.');
assert(!fs.existsSync(path.join(root, 'server')), 'Server output found.');
assert(!fs.existsSync(path.join(root, 'client')), 'Adapter output found; this should be a static build.');
assert(fs.existsSync(path.join(root, '.nojekyll')));
console.log(`PASS: ${content.size} static pages, ${checked} local links/assets/anchors, base=${prefix || '/'}, no APIs or server output.`);
