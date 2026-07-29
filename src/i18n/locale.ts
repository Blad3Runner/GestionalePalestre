/**
 * Languages the interface speaks. Italian is the default everywhere
 * (docs/decisions.md, 2026-07-29).
 */
export const LOCALES = ["it", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "it";

/** The cookie that remembers a visitor's choice before they have signed in. */
export const LOCALE_COOKIE = "locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Falls back to Italian for anything unrecognised, missing or malformed. */
export function resolveLocale(value: unknown): Locale {
  if (isLocale(value)) {
    return value;
  }
  if (typeof value === "string" && isLocale(value.slice(0, 2).toLowerCase())) {
    return value.slice(0, 2).toLowerCase() as Locale;
  }
  return DEFAULT_LOCALE;
}

/** Turns the database's `IT` / `EN` into the app's `it` / `en`. */
export function localeFromLanguage(language: string | null | undefined): Locale {
  return resolveLocale(language?.toLowerCase());
}
