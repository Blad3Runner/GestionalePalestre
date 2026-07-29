import { describe, expect, it } from "vitest";
import { LOCALES, DEFAULT_LOCALE, localeFromLanguage, resolveLocale } from "@/i18n/locale";
import { fill, getDictionary } from "@/i18n/dictionaries";
import { ROLES } from "@/lib/auth/roles";

/** Walks a nested object and lists every leaf, as "section.key". */
function leaves(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("the default language", () => {
  it("is Italian", () => {
    expect(DEFAULT_LOCALE).toBe("it");
  });
});

describe("both dictionaries", () => {
  it("carry exactly the same phrases, so nothing falls back to Italian by accident", () => {
    const italian = leaves(getDictionary("it")).sort();
    const english = leaves(getDictionary("en")).sort();
    expect(english).toEqual(italian);
  });

  it.each(LOCALES)("names all five roles in %s", (locale) => {
    const t = getDictionary(locale);
    for (const role of ROLES) {
      expect(t.roles[role]).toBeTruthy();
    }
  });

  it.each(LOCALES)("leaves no phrase empty in %s", (locale) => {
    const dictionary = getDictionary(locale);
    for (const path of leaves(dictionary)) {
      const text = path
        .split(".")
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], dictionary);
      expect(String(text).trim(), `${locale}: ${path} is empty`).not.toBe("");
    }
  });

  it("actually differs between the two languages", () => {
    expect(getDictionary("it").signIn.title).not.toBe(getDictionary("en").signIn.title);
  });
});

describe("resolveLocale", () => {
  it("keeps a language we speak", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("it")).toBe("it");
  });

  it("understands a full browser tag", () => {
    expect(resolveLocale("en-GB")).toBe("en");
    expect(resolveLocale("it-IT")).toBe("it");
  });

  it.each([
    ["a language we do not speak", "de"],
    ["nonsense", "!!"],
    ["nothing", null],
    ["undefined", undefined],
    ["a number", 3],
  ])("falls back to Italian for %s", (_label, value) => {
    expect(resolveLocale(value)).toBe("it");
  });
});

describe("localeFromLanguage", () => {
  it("turns the database's IT and EN into it and en", () => {
    expect(localeFromLanguage("IT")).toBe("it");
    expect(localeFromLanguage("EN")).toBe("en");
  });

  it("falls back to Italian for anything unexpected", () => {
    expect(localeFromLanguage(null)).toBe("it");
    expect(localeFromLanguage("FR")).toBe("it");
  });
});

describe("fill", () => {
  it("puts values into a translated phrase", () => {
    expect(fill("almeno {min} caratteri", { min: 10 })).toBe("almeno 10 caratteri");
  });

  it("leaves an unknown placeholder alone rather than printing 'undefined'", () => {
    expect(fill("ciao {nome}", {})).toBe("ciao {nome}");
  });
});
