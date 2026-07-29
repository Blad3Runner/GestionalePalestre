import { describe, expect, it } from "vitest";
import { Role as PrismaRole, Language as PrismaLanguage } from "@/generated/prisma/enums";
import { ROLES, hasAnyRole, isRole, parseRoles } from "@/lib/auth/roles";
import { LOCALES } from "@/i18n/locale";

describe("the role list", () => {
  it("matches the database exactly, so the two can never drift apart", () => {
    expect([...ROLES].sort()).toEqual(Object.values(PrismaRole).sort());
  });

  it("covers the five roles the build plan names", () => {
    expect(ROLES).toHaveLength(5);
  });
});

describe("the language list", () => {
  it("matches the database, lower-cased", () => {
    expect([...LOCALES].sort()).toEqual(
      Object.values(PrismaLanguage)
        .map((value) => value.toLowerCase())
        .sort(),
    );
  });
});

describe("isRole", () => {
  it("accepts a real role", () => {
    expect(isRole("TRAINER")).toBe(true);
  });

  it.each([
    ["a made-up role", "SUPERUSER"],
    ["the wrong case", "trainer"],
    ["a number", 7],
    ["nothing", null],
    ["undefined", undefined],
    ["an object", { role: "TRAINER" }],
  ])("rejects %s", (_label, value) => {
    expect(isRole(value)).toBe(false);
  });
});

describe("parseRoles", () => {
  it("keeps the valid roles and silently drops the rest", () => {
    expect(parseRoles(["TRAINER", "NONSENSE", 5, null, "MEMBER"])).toEqual([
      "TRAINER",
      "MEMBER",
    ]);
  });

  it("returns nothing when the token carries no roles at all", () => {
    expect(parseRoles(undefined)).toEqual([]);
    expect(parseRoles("TRAINER")).toEqual([]);
    expect(parseRoles({})).toEqual([]);
  });
});

describe("hasAnyRole", () => {
  it("is true when one of the required roles is held", () => {
    expect(hasAnyRole(["STAFF", "TRAINER"], ["TRAINER"])).toBe(true);
  });

  it("is false when none is held", () => {
    expect(hasAnyRole(["MEMBER"], ["GYM_OWNER", "STAFF"])).toBe(false);
  });

  it("is false when the person holds no roles", () => {
    expect(hasAnyRole([], ["MEMBER"])).toBe(false);
  });

  it("is false when nothing is required — an empty list grants nothing", () => {
    expect(hasAnyRole(["PLATFORM_ADMIN"], [])).toBe(false);
  });
});
