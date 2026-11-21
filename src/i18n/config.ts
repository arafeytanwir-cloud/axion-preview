/** Set ARABIC_INDEXABLE=true at BUILD time only when Arabic copy is approved. */
declare const __ARABIC_INDEXABLE__: boolean;
// Astro config reads the environment once; Vite embeds that exact value in the
// Cloudflare/prerender bundle, whose runtime does not inherit Node's process.env.
export const ARABIC_INDEXABLE = typeof __ARABIC_INDEXABLE__ !== "undefined"
  ? __ARABIC_INDEXABLE__
  : process.env.ARABIC_INDEXABLE === "true";
export const SITE = "https://axion-s.com";
