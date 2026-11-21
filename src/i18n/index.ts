import { getRelativeLocaleUrl } from "astro:i18n";
import enUI from "./en.json";
import arUI from "./ar.json";
import enPages from "../content/pages/en.json";
import arPages from "../content/pages/ar.json";
import { isolateLatin } from "./bidi";

export type Locale = "en" | "ar";
const basePrefix = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Strip a hosting prefix from the actual browser/Astro URL. */
export function stripBase(path: string): string {
  return basePrefix && (path === basePrefix || path.startsWith(`${basePrefix}/`))
    ? path.slice(basePrefix.length) || "/"
    : path;
}
/** Add the hosting prefix to a logical site-root path. */
export function withBase(path: string): string { return `${basePrefix}${path}`; }
export function localeFromPath(path: string): Locale { return /^\/ar(?:\/|$)/.test(stripBase(path)) ? "ar" : "en"; }
export function unlocalizedPath(path: string) { return stripBase(path).replace(/^\/ar(?=\/|$)/, "") || "/"; }
export function localizePath(path: string, locale: Locale): string;
export function localizePath(path: undefined, locale: Locale): undefined;
export function localizePath(path: string | undefined, locale: Locale): string | undefined;
export function localizePath(path: string | undefined, locale: Locale): string | undefined {
  if (!path) return path;
  if (!path.startsWith("/") || path.startsWith("//") || /^\/(?:api|_astro|_image)\b/.test(path)) return path;
  // Callers pass logical paths; Astro's helper already includes base for Arabic.
  // Separate fragments/queries so the helper never appends '/' to an anchor ID.
  const [, pathname, suffix = ""] = path.match(/^([^?#]*)(.*)$/)!;
  const raw = pathname.replace(/^\/ar(?=\/|$)/, "") || "/";
  if (locale === "en") return withBase(raw) + suffix;
  return getRelativeLocaleUrl(locale, raw.replace(/^\//, "")) + suffix;
}
export const routeKeys = ["", "about", "clients", "collaborators", "contact", "services", "services/design-engineering", "services/etap-network-study", "services/substation-automation", "services/data-center-it", "services/software-services", "services/video-surveillance", "services/civil-works-landscaping", "services/specialised-services"];
export function twinPath(path: string, locale: Locale) {
  const key = unlocalizedPath(path).replace(/^\/|\/$/g, "");
  return localizePath(routeKeys.includes(key) ? unlocalizedPath(path) : "/", locale);
}
export const normalize = (text: string) => text.replace(/\*\*/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
export function translator(locale: Locale) {
  return (source: string): string => {
    if (!source) return source;
    const key = normalize(source);
    if (locale === "en") return (enUI as Record<string, string>)[key] ?? (enPages.strings as Record<string, string>)[key] ?? source;
    if (/[\u0600-\u06ff]/.test(source)) return isolateLatin(source);
    const ui = arUI as Record<string, string>;
    const copy = arPages.strings as Record<string, string>;
    const exact = ui[key] ?? copy[key];
    return isolateLatin(exact ?? source);
  };
}
export { enUI, arUI, enPages, arPages };
