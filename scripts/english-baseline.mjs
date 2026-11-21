import fs from 'node:fs';
import path from 'node:path';
const root = 'dist/client';
if (process.argv.includes('--export-seo')) {
  const original = JSON.parse(fs.readFileSync('/tmp/opencode/english-baseline.json', 'utf8'));
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/english-seo-baseline.json', JSON.stringify(Object.fromEntries(Object.entries(original).map(([key, { html, ...seo }]) => [key, seo])), null, 2) + '\n');
  console.log('Exported the pre-localization English SEO fixture.');
  process.exit(0);
}
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((f) => f.isDirectory() ? walk(path.join(dir, f.name)) : f.name.endsWith('.html') ? [path.join(dir, f.name)] : []); }
const pages = Object.fromEntries(walk(root).map((file) => {
  const html = fs.readFileSync(file, 'utf8');
  return [path.relative(root, file), {
    title: html.match(/<title>[\s\S]*?<\/title>/)?.[0],
    canonical: html.match(/<link rel="canonical"[^>]*>/)?.[0],
    robots: html.match(/<meta name="robots"[^>]*>/)?.[0] ?? null,
    description: html.match(/<meta name="description"[^>]*>/)?.[0],
    html,
  }];
}));
fs.writeFileSync('/tmp/opencode/english-baseline.json', JSON.stringify(pages));
console.log(`Saved ${Object.keys(pages).length} English page baselines.`);
