import fs from 'node:fs';
import { parse, stringify } from 'yaml';
const read = (file) => JSON.parse(fs.readFileSync(file));
const write = (file, value) => fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const en = read('src/content/pages/en.json'), ar = read('src/content/pages/ar.json');
const enUI = read('src/i18n/en.json'), arUI = read('src/i18n/ar.json');
const additions = read('src/content/translations/ar-additions.json');
const supplied = read('src/content/translations/ar-supplied.json').strings;
const norm = (s) => s.replace(/\*\*/g, '').replace(/[’‘]/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const valid = (s) => s && !s.startsWith('TODO');
const known = new Map();
for (const [key, value] of Object.entries({ ...ar.strings, ...arUI })) if (valid(value) && norm(key) !== norm(value)) known.set(norm(key).toLowerCase(), value);
for (const [key, value] of Object.entries(supplied)) known.set(norm(key).toLowerCase(), value);
for (const [key, value] of Object.entries({ ...additions.ui, ...additions.copy })) if (!known.has(norm(key).toLowerCase())) known.set(norm(key).toLowerCase(), value);
for (const key of additions.unchangedIdentifiers) known.set(norm(key).toLowerCase(), key);
// Reuse the exact supplied wording when equivalent English labels differ.
for (const [key, equivalent] of Object.entries({
  'Arc Flash & Mitigation': 'Arc Flash & Mitigation Techniques',
  'Civil and Structural Design': 'Civil & Structural Design',
})) {
  if (known.has(norm(equivalent).toLowerCase())) known.set(norm(key).toLowerCase(), known.get(norm(equivalent).toLowerCase()));
}
// These are verbatim parts of the supplied contact address.
for (const [key, value] of Object.entries({
  'Axion Smart Company LLC': 'شركة أكسيون سمارت ذ.م.م',
  'Qais Bin Al Husain St': 'شارع قيس بن الحسين',
  'Qais Bin Al Husain St, Al Rawabi': 'شارع قيس بن الحسين، الروابة',
  'Al Rawabi, Al Khobar': 'الروابة، الخبر',
  'Saudi Arabia': 'المملكة العربية السعودية',
})) known.set(norm(key).toLowerCase(), value);
// Full supplied bullet translations also cover labels/descriptions split by markup.
for (const [key, value] of [...known]) {
  const enSplit = key.indexOf(': '), arSplit = value.indexOf(': ');
  if (enSplit > 0 && arSplit > 0) {
    known.set(key.slice(0, enSplit + 1), value.slice(0, arSplit + 1));
    known.set(key.slice(enSplit + 2), value.slice(arSplit + 2));
  }
}
const gaps = new Set();
const translate = (source) => {
  const key = norm(source), value = known.get(key.toLowerCase());
  if (value) return value;
  if (!key || !/[A-Za-z]/.test(key) || key.includes('@')) return source;
  gaps.add(key);
  return source; // Explicitly authorized English fallback, never UI placeholders.
};
for (const key of new Set([...Object.keys(en.strings), ...Object.keys(ar.strings), ...Object.keys(additions.copy)])) {
  en.strings[key] = key;
  ar.strings[key] = translate(key);
}
for (const key of new Set([...Object.keys(enUI), ...Object.keys(arUI), ...Object.keys(additions.ui)])) {
  enUI[key] = key; arUI[key] = translate(key);
  delete en.strings[key]; delete ar.strings[key];
}
// Non-rendered entity artifacts are not editorial copy.
for (const dictionary of [en.strings, ar.strings]) for (const key of Object.keys(dictionary)) if (key.includes('&copy;')) delete dictionary[key];

const translateMarkdown = (text) => text.split('\n').map((line) => {
  const m = line.match(/^(\s*(?:#{1,6} |\* |- )?)(.*)$/);
  if (!m[2].trim()) return line;
  const value = translate(m[2]);
  return m[1] + (m[1].trim() === '*' && /[\u0600-\u06ff]/.test(value) ? value.replace(/^([^:]+:)/, '**$1**') : value);
}).join('\n');
for (const file of fs.readdirSync('src/content/services').filter((f) => f.endsWith('.md'))) {
  const raw = fs.readFileSync(`src/content/services/${file}`, 'utf8');
  const [, front, body] = raw.split('---');
  const data = parse(front);
  data.locale = 'ar'; data.translationKey = file.replace(/\.md$/, '');
  for (const key of ['title', 'metaDescription', 'eyebrow']) data[key] = translate(data[key]);
  if (data.sections) data.sections = data.sections.map((s) => ({ ...s, title: translate(s.title), body: translateMarkdown(s.body) }));
  if (data.features) data.features = data.features.map(translate);
  if (data.crossLinks) data.crossLinks = data.crossLinks.map((s) => ({ ...s, text: translate(s.text) }));
  write(`src/content/services/ar/${file}`, `---\n${stringify(data, { blockQuote: 'literal' })}---\n${translateMarkdown(body)}`);
}
write('src/content/pages/en.json', en); write('src/content/pages/ar.json', ar);
write('src/i18n/en.json', enUI); write('src/i18n/ar.json', arUI);
fs.mkdirSync('docs', { recursive: true });
write('docs/arabic-editorial-additions.json', { ...additions, unresolvedInputStrings: [...gaps].filter((s) => !s.includes('&copy;')).sort() });
write('src/i18n/import-coverage.json', { source: 'Axion_Smart_Website_Arabic_Translation.md', note: 'Supplied translations plus user-authorized Arabic additions. Any unavailable translation retains English; no visible placeholders.', unresolvedInputStrings: [...gaps].filter((s) => !s.includes('&copy;')).sort() });
console.log(`Arabic dictionaries and service entries completed. ${gaps.size} unmatched input strings recorded for review.`);
