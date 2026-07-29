import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveLocale,
  type Locale,
} from "@/i18n/locale";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";

/**
 * Which language to show this visitor, in order of preference:
 *
 *   1. the language saved on their account, once they have signed in
 *   2. the language they picked from the switcher, kept in a cookie
 *   3. Italian
 */
export async function getLocale(): Promise<Locale> {
  const session = await auth();
  if (session?.user?.locale) {
    return resolveLocale(session.user.locale);
  }

  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (chosen) {
    return resolveLocale(chosen);
  }

  return DEFAULT_LOCALE;
}

/** The translated text for this visitor. */
export async function getText(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}

export async function getLocaleAndText(): Promise<{
  locale: Locale;
  t: Dictionary;
}> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
