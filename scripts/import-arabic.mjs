/** Import supplied bilingual copy. Run complete-arabic.mjs afterwards for editorial additions. */
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as yaml } from 'yaml';

const source = fs.readFileSync(process.argv[2] || '../Axion_Smart_Website_Arabic_Translation.md', 'utf8');
const normalize = (s) => s.replace(/\*\*/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const pairs = new Map();
const add = (en, ar) => { if (en && ar) pairs.set(normalize(en), normalize(ar)); };
// Prose and image captions, including inline <div> captions.
for (const m of source.matchAll(/\*\*EN:\*\*\s*([^\n]+)[\s\S]*?\*\*AR:\*\*\s*([^\n<]+)/g)) add(m[1], m[2]);
// Headings (including each page's metadata title).
for (const m of source.matchAll(/^(#{2,6}) ([^\n]+)\n\s*<div dir="rtl" align="right">\n#{2,6} ([^\n]+)/gm)) {
  add(m[2].replace(/^Page \d+\s*\|\s*/, ''), m[3].replace(/^الصفحة \d+\s*\|\s*/, ''));
}
// Paired lists; no item may be invented if a translated list is absent.
for (const m of source.matchAll(/\*\*EN:\*\*\s*\n((?:\s*- [^\n]+\n)+)\s*<div[^>]*>\s*\*\*AR:\*\*\s*\n((?:\s*- [^\n]+\n)+)/g)) {
  const lines = (s) => s.trim().split('\n').map((x) => x.trim().replace(/^- /, ''));
  const en = lines(m[1]), ar = lines(m[2]);
  en.forEach((item, i) => add(item, ar[i]));
}
const rows = source.split('\n');
for (let i = 0; i < rows.length - 1; i++) {
  if (rows[i].startsWith('| ') && rows[i + 1].startsWith('| ') && /[\u0600-\u06ff]/.test(rows[i + 1])) {
    const cells = (s) => s.split('|').slice(1, -1).map((x) => x.trim());
    const en = cells(rows[i]), ar = cells(rows[i + 1]);
    en.forEach((item, j) => add(item, ar[j]));
  }
}
// Reuse supplied labels for the same navigation concept (no new Arabic copy).
for (const [key, from] of Object.entries({
  'About': 'Who We Are', 'About Us': 'Who We Are', 'Clients': 'Our Clients',
  'Collaborators': 'Our Collaborators', 'Contact': 'Get in Touch', 'Services': 'Our Services',
  'Power & Automation': 'Power & Automation Engineering', 'Civil & Structural Engineering': 'Structural & Civil Engineering',
  'Civil & Structural Design': 'Civil & Structural Design', 'IT & Smart Building Infrastructure': 'IT & Smart Building Infrastructure',
  'Civil & Structural Design Services': 'Civil & Structural Design', 'Specialised Software': 'Specialised Software Services',
  'Data Center & IT': 'Data Center & IT Services',
})) if (pairs.has(from)) pairs.set(key, pairs.get(from));

const uiKeys = [
  'Home', 'About', 'Services', 'Clients', 'Collaborators', 'Contact', 'Get in Touch',
  'Main navigation', 'Mobile navigation', 'Open menu', 'Close menu', 'Menu', 'Language',
  'Power & Automation Engineering', 'IT & Smart Building Infrastructure', 'Civil & Structural Engineering',
  'Power & Automation', 'Civil & Structural Design', 'Design & Engineering', 'ETAP Network Study',
  'Substation Automation', 'Specialised Services', 'Data Center & IT Services', 'Specialised Software Services',
  'ELV, BMS & Smart Building Systems', 'Data Center & IT', 'Specialised Software',
  'Request a Quote', 'Explore Our Services', 'Learn more', 'View all clients →', 'Section navigation',
  'Jump to section...', 'Overview', 'Certification', 'Data center page sections',
  'Name', 'Email', 'Phone', '(optional)', 'Subject', 'Message', 'Submit', 'Sending...', 'Dismiss',
  "Message sent — we'll get back to you soon.", 'Something went wrong.',
  'Network error — please try again.', 'Something went wrong — please try again or email us directly.',
  'Missing required fields', 'Failed to send message. Please try again or contact us directly.', 'Internal server error',
  'Please fill out this field.', 'Please enter a valid email address.',
  'Address', 'Contact details', 'Request a readiness assessment', 'Discuss your project',
];
const missing = new Set();
const lookup = (s) => {
  const key = normalize(s);
  if (!key || /[\u0600-\u06ff]/.test(key) || /^[\d\s+.,:/—–-]+$/.test(key)) return s;
  if (pairs.has(key)) return pairs.get(key);
  missing.add(key);
  return s;
};
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
};
const existing = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const oldUI = existing('src/i18n/ar.json');
const enUI = { ...existing('src/i18n/en.json'), ...Object.fromEntries(uiKeys.map((s) => [s, s])) };
const arUI = { ...oldUI, ...Object.fromEntries(uiKeys.map((s) => [s, pairs.get(normalize(s)) ?? oldUI[s] ?? lookup(s)])) };
write('src/i18n/en.json', enUI);
write('src/i18n/ar.json', arUI);
write('src/content/pages/en.json', { locale: 'en', strings: { ...existing('src/content/pages/en.json').strings, ...Object.fromEntries([...pairs.keys()].map((s) => [s, s])) } });
write('src/content/pages/ar.json', { locale: 'ar', strings: { ...existing('src/content/pages/ar.json').strings, ...Object.fromEntries(pairs) } });
write('src/content/translations/ar-supplied.json', { source: 'Axion_Smart_Website_Arabic_Translation.md', strings: Object.fromEntries(pairs) });

// Localized service entries keep the existing schema, section IDs and image mapping.
const translateMarkdown = (text) => text.split('\n').map((line) => {
  const m = line.match(/^(\s*(?:#{1,6} |\* |- )?)(.*)$/);
  return m[2].trim() ? m[1] + lookup(m[2]) : line;
}).join('\n');
for (const file of fs.readdirSync('src/content/services').filter((f) => f.endsWith('.md'))) {
  const raw = fs.readFileSync(`src/content/services/${file}`, 'utf8');
  const [, front, body] = raw.split('---');
  const data = parseYaml(front);
  const slug = file.replace(/\.md$/, '');
  data.locale = 'ar'; data.translationKey = slug;
  for (const key of ['title', 'metaDescription', 'eyebrow']) data[key] = lookup(data[key]);
  if (data.sections) data.sections = data.sections.map((s) => ({ ...s, title: lookup(s.title), body: translateMarkdown(s.body) }));
  if (data.features) data.features = data.features.map((s) => lookup(s));
  if (data.crossLinks) data.crossLinks = data.crossLinks.map((s) => ({ ...s, text: lookup(s.text) }));
  write(`src/content/services/ar/${file}`, `---\n${yaml(data)}---\n${translateMarkdown(body)}`);
}
write('src/i18n/import-coverage.json', {
  source: 'Axion_Smart_Website_Arabic_Translation.md', suppliedPairs: pairs.size,
  missing: [...missing].sort(),
  note: 'Source omissions recorded here. Run complete-arabic.mjs to apply user-authorized editorial translations; never show placeholders.',
});
console.log(`Imported ${pairs.size} reviewed translation pairs. ${missing.size} missing source strings recorded.`);
