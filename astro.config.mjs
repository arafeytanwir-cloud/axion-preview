// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { ARABIC_INDEXABLE } from './src/i18n/config.ts';

// configure-pages supplies the exact values in Actions, including project repos
// and custom domains. Plain local builds default to a root-hosted preview.
const [owner, repository] = (process.env.GITHUB_REPOSITORY || '').split('/');
const site = process.env.PAGES_SITE || (owner ? `https://${owner}.github.io` : 'https://example.github.io');
const base = process.env.PAGES_BASE ?? (repository && repository.toLowerCase() !== `${owner}.github.io`.toLowerCase() ? `/${repository}` : '/');
const prefix = base.replace(/\/$/, '');
/** @param {string} page */
const logicalPath = (page) => {
  const pathname = new URL(page).pathname;
  return prefix && pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
};

export default defineConfig({
  site,
  base,
  i18n: {
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  output: 'static',
  vite: {
    define: { __ARABIC_INDEXABLE__: JSON.stringify(ARABIC_INDEXABLE) },
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['astro:content']
    },
  },
  integrations: [preact(), sitemap({
    filter: (page) => !/\/ar\/404\/?$/.test(logicalPath(page)) && (ARABIC_INDEXABLE || !logicalPath(page).startsWith('/ar/')),
    ...(ARABIC_INDEXABLE ? { i18n: { defaultLocale: 'en', locales: { en: 'en', ar: 'ar' } } } : {}),
  })]
});
