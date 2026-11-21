# English / Arabic implementation

## Routing and rendering

- Astro i18n is configured for `en` (unprefixed default) and `ar` (`/ar/`).
- `src/pages/[...path].astro` generates both route sets. Templates live in `src/templates/`; no language-specific page copies exist.
- Both languages use the same layouts and components, including the header, footer, service renderer, certification tab, and contact form.
- Service translations live in the existing `services` collection at `src/content/services/ar/`. `translationKey` retains the English slug for routes and image lookup; section anchors are identical in both languages.
- Page copy entries are `src/content/pages/en.json` and `ar.json`. English source strings are the message IDs. Shared UI strings are in `src/i18n/en.json` and `ar.json`.

## Copy and provenance

The supplied bilingual Markdown has been ingested into `src/content/translations/ar-supplied.json`. Its Arabic wording is retained. The user subsequently authorized professional translations of missing English source strings and explicitly prohibited visible placeholders.

Additional translations are recorded in `src/content/translations/ar-additions.json`. They cover shared UI, validation/status messages, service bullet lists, certification tables/advisory details/steps, and other English copy absent from the supplied document. Technical identifiers and logo artwork retain their original form.

- `docs/translation-coverage.json`: English-to-Arabic mapping by route, including translation provenance.
- `docs/arabic-editorial-additions.json`: additional translations for editorial review and any unresolved import strings.
- `src/i18n/import-coverage.json`: import completion summary.

There are currently no unresolved visible translations. For future missing strings, retain the existing English text and report the gap; never display placeholder labels or omit content.

When reimporting an updated source document, run both commands:

```bash
node scripts/import-arabic.mjs ../Axion_Smart_Website_Arabic_Translation.md
npm run i18n:complete
```

Rebuild and run the verification below after editing copy. Ordinary builds only use checked-in content; the parent Markdown is not a deployment dependency.

## Indexing: one build-time flag

`ARABIC_INDEXABLE`, defined in `src/i18n/config.ts`, defaults to **false**. Both the HTML head and sitemap use this single value.

```bash
# Default: Arabic noindex; Arabic excluded from sitemap
npm run build
npm run test:i18n

# Publish Arabic indexing only after editorial approval
ARABIC_INDEXABLE=true npm run build
ARABIC_INDEXABLE=true npm run test:i18n
```

With the flag false, English indexing metadata is unchanged and Arabic pages have `noindex, follow`. With it true, Arabic is indexable, every public pair has reciprocal `en` / `ar` hreflang links and English `x-default`, and the sitemap includes both languages. Each page always has a self-referencing canonical. Error pages are excluded from the sitemap.

The checked-in `docs/english-seo-baseline.json` records English titles, descriptions, canonical tags, and robots tags from before localization. Tests compare the built English output to this baseline in either flag state.

## RTL and preferences

- Arabic pages render `lang="ar" dir="rtl"`; English renders `lang="en" dir="ltr"`.
- A self-hosted Noto Sans Arabic font is referenced only by Arabic heads. Inter remains the Latin font. No Arabic font is requested by English pages.
- Logical spacing/alignment, mirrored directional icons, an RTL-aware mobile drawer, and directional isolation for Latin runs keep text and controls readable. Logos, maps, photographs, and schematic artwork are not mirrored.
- Tables scroll within their containers on narrow screens. Both data-center tabs remain server-rendered in the DOM; `#certification` selects the certification tab. Tab arrow-key behavior follows the current text direction.
- The header switcher targets the current page's twin, or the target language's home if there is no twin. Query strings and hashes are retained on clicks.
- Only an explicit switch is saved to `localStorage`. There is no browser-language detection or server redirect. Saved choices are applied client-side on return visits; crawler user agents are excluded, and a crawler without an explicit saved choice cannot be redirected.
- Both forms submit to the unchanged `/api/contact` endpoint. Arabic validation, errors, and confirmation messages are localized client-side.

## Verification

```bash
npm run check
npm run build
npm run test:i18n
```

The browser suite uses installed Chrome (`/usr/bin/google-chrome` by default; override with `CHROME_PATH`). It starts a temporary static server, checks all 14 public language pairs at 320/390/768/1024/1440px, tests menus/tabs/table overflow/form submission/language preference/crawler behavior, and refreshes the translation coverage report. Contact requests are mocked; no email is sent. Screenshots are saved under `/tmp/opencode/rtl-shots/` for visual review.

After testing the indexable mode, rebuild without `ARABIC_INDEXABLE=true` to leave the deliverable in its default non-indexable Arabic state.
