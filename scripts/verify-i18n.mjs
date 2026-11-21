import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { parse as yaml } from 'yaml';

const indexable = process.env.ARABIC_INDEXABLE === 'true';
const inventory = process.argv.includes('--inventory');
const baselineFile = '/tmp/opencode/english-baseline.json';
const baseline = JSON.parse(fs.readFileSync(fs.existsSync(baselineFile) ? baselineFile : 'docs/english-seo-baseline.json'));
const root = path.resolve('dist/client');
const normalize = (s) => s.replace(/[\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim();
const pages = ['', 'about', 'clients', 'collaborators', 'contact', 'services', ...fs.readdirSync('src/content/services').filter((s) => s.endsWith('.md')).map((s) => `services/${s.slice(0, -3)}`)];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream';
  res.setHeader('Content-Type', type); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const errors = [];
const enCopy = JSON.parse(fs.readFileSync('src/content/pages/en.json'));
const arCopy = JSON.parse(fs.readFileSync('src/content/pages/ar.json'));
const ui = JSON.parse(fs.readFileSync('src/i18n/ar.json'));
const suppliedPhrases = Object.values(JSON.parse(fs.readFileSync('src/content/translations/ar-supplied.json')).strings);
const suppliedFile = suppliedPhrases.join('\n');
const coverage = [];
const snapshots = '/tmp/opencode/rtl-shots'; fs.mkdirSync(snapshots, { recursive: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  for (const key of pages) {
    const file = key ? `${key}/index.html` : 'index.html';
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    if (baseline) {
      for (const [name, re] of Object.entries({ title: /<title>[\s\S]*?<\/title>/, canonical: /<link rel="canonical"[^>]*>/, description: /<meta name="description"[^>]*>/, robots: /<meta name="robots"[^>]*>/ })) {
        assert.equal(html.match(re)?.[0] ?? null, baseline[file][name], `English ${name} changed: ${key}`);
      }
    }
    assert(!/noto-sans-arabic|Noto Sans Arabic/.test(html), `Arabic font in English head: ${key}`);
    assert(html.includes('lang="en" dir="ltr"'));
    const arHTML = fs.readFileSync(path.join(root, 'ar', file), 'utf8');
    assert(arHTML.includes('lang="ar" dir="rtl"'));
    assert.equal(arHTML.includes('name="robots"'), !indexable);
    assert.equal(/hreflang="x-default"/.test(arHTML), indexable);
    assert.equal(/hreflang="x-default"/.test(html), indexable);

    await page.goto(`${base}/${key}`);
    if (baseline[file]?.html) {
      const unchanged = await page.evaluate((oldHTML) => {
        function text(doc) {
          const body = doc.body.cloneNode(true);
          body.querySelectorAll('script,style,[data-language]').forEach((e) => e.remove());
          return body.textContent.replace(/\s+/g, ' ').trim();
        }
        return { before: text(new DOMParser().parseFromString(oldHTML, 'text/html')), after: text(document) };
      }, baseline[file].html);
      assert.equal(unchanged.after, unchanged.before, `English visible copy changed: ${key}`);
    }
    const englishSwitch = await page.locator('.header-actions [data-language]').getAttribute('href');
    assert.equal(englishSwitch.replace(/\/$/, ''), `/ar${key ? `/${key}` : ''}`);
    const sourceStrings = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const strings = []; let node;
      while (node = walker.nextNode()) {
        if (node.parentElement.closest('script,style,[data-language]')) continue;
        const value = node.textContent.replace(/\s+/g, ' ').trim();
        if (/[A-Za-z]/.test(value)) strings.push(value);
      }
      return [...new Set(strings)];
    });
    for (const en of sourceStrings) {
      const exempt = /@|^Axion Smart Company$/.test(en);
      const address = ['Qais Bin Al Husain St', 'Al Rawabi, Al Khobar', 'Saudi Arabia', 'Axion Smart Company LLC', 'Qais Bin Al Husain St, Al Rawabi'].includes(en);
      const copyright = en.match(/^(©\s*\d{4})\s+(.+)$/);
      const ar = exempt ? en : address ? arCopy.strings['Axion Smart Company LLC Qais Bin Al Husain St, Al Rawabi Al Khobar, Saudi Arabia'] : copyright ? `${copyright[1]} ${ui[copyright[2]]}` : ui[en] ?? arCopy.strings[en];
      const status = exempt || ar === en && /^(?:ANSI\/TIA|Uptime)/.test(en) ? 'unchanged identifier' : ar ? suppliedFile.includes(ar) ? 'supplied' : 'additional Arabic translation / supplied-copy variant' : 'English fallback: translation needed';
      coverage.push({ route: `/${key}`, english: en, arabic: ar ?? en, status, ...(address ? { note: 'Address rendered as a single paragraph using supplied Arabic copy.' } : {}) });
      if (inventory && !exempt && !(en in ui)) {
        enCopy.strings[en] = en;
        arCopy.strings[en] ??= en;
      }
    }
    await page.goto(`${base}/ar/${key}`);
    assert(!/TODO|Arabic translation —/.test(await page.locator('body').textContent()), `Visible placeholder: ${key}`);
    const enCanonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const arCanonical = await page.locator('link[rel=canonical]').getAttribute('href');
    assert.equal(arCanonical, enCanonical.replace('https://axion-s.com/', 'https://axion-s.com/ar/'));
    if (indexable) {
      for (const [lang, href] of Object.entries({ en: enCanonical, ar: arCanonical, 'x-default': enCanonical })) {
        assert.equal(await page.locator(`link[rel=alternate][hreflang="${lang}"]`).getAttribute('href'), href);
        const englishAlternates = html.match(new RegExp(`<link rel="alternate" hreflang="${lang}" href="([^"]+)"`));
        assert.equal(englishAlternates?.[1], href, `Non-reciprocal hreflang: ${key}/${lang}`);
      }
    }
    assert.equal((await page.locator('.header-actions [data-language]').getAttribute('href')).replace(/\/$/, ''), key ? `/${key}` : '');
    const links = await page.locator('a[href^="/"]').evaluateAll((links) => links.filter((a) => !a.matches('[data-language]') && !a.getAttribute('href').startsWith('/ar')).map((a) => a.getAttribute('href')));
    assert.deepEqual(links, [], `Unlocalized internal Arabic links: ${key}`);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert(!overflow, `Horizontal overflow: /ar/${key} at ${width}px`);
    }
  }

  const sitemap = fs.readdirSync(root).filter((s) => /^sitemap.*\.xml$/.test(s)).map((s) => fs.readFileSync(path.join(root, s), 'utf8')).join('');
  assert.equal(sitemap.includes('https://axion-s.com/ar/'), indexable);
  assert(!sitemap.includes('https://axion-s.com/ar/404'));
  for (const file of fs.readdirSync('src/content/services').filter((s) => s.endsWith('.md'))) {
    const enRaw = fs.readFileSync(`src/content/services/${file}`, 'utf8').split('---');
    const arRaw = fs.readFileSync(`src/content/services/ar/${file}`, 'utf8').split('---');
    const original = yaml(enRaw[1]), translated = yaml(arRaw[1]);
    assert.equal(translated.translationKey, file.slice(0, -3));
    assert.deepEqual(translated.sections?.map((s) => s.id), original.sections?.map((s) => s.id));
    assert.equal(translated.features?.length, original.features?.length);
    assert.equal(translated.crossLinks?.length, original.crossLinks?.length);
    assert.equal(translated.sections?.length, original.sections?.length);
    assert(!arRaw.join('').includes('TODO'));
  }
  for (const key of pages) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/ar/${key}${key.includes('data-center') ? '#certification' : ''}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.querySelectorAll('.reveal').forEach((e) => e.classList.add('visible'));
        await Promise.all([...document.images].map(async (img) => { img.loading = 'eager'; await img.decode().catch(() => {}); }));
      });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${snapshots}/${key.replaceAll('/', '-') || 'home'}-${width}.png`, fullPage: true });
    }
  }
  // Tab DOM, hash entry and mouse/keyboard behavior in Arabic.
  await page.goto(`${base}/ar/services/data-center-it#certification`);
  await assert.doesNotReject(() => page.locator('#certification').waitFor({ state: 'visible' }));
  assert(await page.locator('#panel-overview').isHidden());
  assert.equal(await page.locator('[role=tabpanel]').count(), 2);
  await page.locator('#tab-overview').click();
  assert(await page.locator('#certification').isHidden());
  await page.locator('#tab-certification').click();
  assert(await page.locator('#certification').isVisible());
  await page.locator('#tab-certification').press('ArrowRight');
  assert(await page.locator('#panel-overview').isVisible());
  await page.locator('#tab-overview').press('ArrowLeft');
  assert(await page.locator('#certification').isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  const tableSizes = await page.locator('#certification table').evaluateAll((tables) => tables.map((table) => ({ table: table.scrollWidth, box: table.parentElement.clientWidth, overflow: getComputedStyle(table.parentElement).overflowX })));
  assert(tableSizes.every((s) => s.table > s.box && s.overflow === 'auto'));
  const arabicHTML = await page.content();
  assert(/\u2066/.test(arabicHTML), 'Mixed direction isolation missing');
  await page.goto(`${base}/ar/`);
  await page.locator('#mobile-menu-btn').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#mobile-menu-btn').getAttribute('aria-expanded'), 'true');
  assert(await page.locator('#nav-drawer').evaluate((e) => e.getBoundingClientRect().left >= -1 && e.getBoundingClientRect().right <= innerWidth));
  await page.locator('#mobile-menu-close').click();

  // Shared endpoint is mocked: never send real test emails.
  await page.route('**/api/contact', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  await page.goto(`${base}/ar/contact`);
  await page.locator('#name').evaluate((field) => field.reportValidity());
  assert.equal(await page.locator('#name').evaluate((field) => field.validationMessage), ui['Please fill out this field.']);
  await page.locator('#name').fill('اختبار');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#subject').fill('اختبار');
  await page.locator('#message').fill('اختبار');
  await page.locator('button[type=submit]').click();
  await page.waitForTimeout(250);
  assert.equal(await page.locator('form [role=status]').textContent().then(normalize), ui["Message sent — we'll get back to you soon."]);
  assert.equal(await page.locator('#email').getAttribute('dir'), 'ltr');
  await page.route('**/api/contact', (route) => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'Failed to send message. Please try again or contact us directly.' }) }));
  await page.locator('#name').fill('اختبار');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#subject').fill('اختبار');
  await page.locator('#message').fill('اختبار');
  await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('form [role=alert]').textContent().then(normalize), ui['Failed to send message. Please try again or contact us directly.']);

  // A real user choice persists across pages; no preference means no redirect.
  const human = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/145.0 Safari/537.36' });
  const visitor = await human.newPage();
  await visitor.goto(`${base}/services/design-engineering`);
  await visitor.locator('.header-actions [data-language]').click();
  await visitor.waitForURL((url) => url.pathname.replace(/\/$/, '') === '/ar/services/design-engineering');
  await visitor.goto(`${base}/about`);
  await visitor.waitForURL((url) => url.pathname.replace(/\/$/, '') === '/ar/about');
  await visitor.locator('.header-actions [data-language]').click();
  await visitor.waitForURL((url) => url.pathname.replace(/\/$/, '') === '/about');
  await human.close();
  const bot = await browser.newContext({ userAgent: 'Googlebot' });
  await bot.addInitScript(() => localStorage.setItem('axion-locale', 'ar'));
  const crawler = await bot.newPage(); await crawler.goto(`${base}/about`); await crawler.waitForTimeout(100);
  assert(!crawler.url().includes('/ar/'), 'Crawler redirected'); await bot.close();

  assert.deepEqual(errors, [], 'Browser script errors');
  for (const [english, arabic] of Object.entries(ui)) {
    coverage.push({ route: '(shared UI, validation and messages)', english, arabic, status: suppliedFile.includes(arabic) ? 'supplied' : 'additional Arabic translation' });
  }
  if (inventory) {
    fs.writeFileSync('src/content/pages/en.json', JSON.stringify(enCopy, null, 2) + '\n');
    fs.writeFileSync('src/content/pages/ar.json', JSON.stringify(arCopy, null, 2) + '\n');
  }
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/translation-coverage.json', JSON.stringify(coverage, null, 2) + '\n');
  console.log(`PASS: ${pages.length} English/Arabic pairs, unchanged English SEO, ${pages.length * 5} RTL viewports, menus/tables/tabs/form/switcher/preference/crawler. ARABIC_INDEXABLE=${indexable}`);
  console.log(`Coverage: ${new Set(coverage.filter((s) => s.status.startsWith('English fallback')).map((s) => s.english)).size} unique untranslated strings. Screenshots: ${snapshots}`);
} finally { await browser.close(); server.close(); }
