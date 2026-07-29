import { describe, expect, it } from "vitest";
import { ROLES, type Role } from "@/lib/auth/roles";
import {
  canOpen,
  isPublicPath,
  rolesAllowedFor,
  ROUTE_POLICY,
} from "@/lib/auth/route-policy";

/**
 * The authorisation rules of the whole application, checked exhaustively.
 *
 * The build plan's requirement for Step 2 is that "pasting a forbidden page's address
 * into the browser is refused, not merely hidden". These tests describe the rule the
 * server applies when that happens — every role against every protected area, with no
 * combination left untried.
 */

/** Who is supposed to get in where. Written out by hand, on purpose. */
const EXPECTED: Record<string, readonly Role[]> = {
  "/admin": ["PLATFORM_ADMIN"],
  "/owner": ["GYM_OWNER"],
  "/desk": ["GYM_OWNER", "STAFF"],
  "/trainer": ["TRAINER"],
  "/me": ["MEMBER"],
};

const PROTECTED_PATHS = Object.keys(EXPECTED);

describe("the policy table itself", () => {
  it("protects exactly the areas this test knows about", () => {
    expect(ROUTE_POLICY.map((rule) => rule.prefix).sort()).toEqual(
      PROTECTED_PATHS.slice().sort(),
    );
  });

  it("only ever allows real roles", () => {
    for (const rule of ROUTE_POLICY) {
      for (const role of rule.roles) {
        expect(ROLES).toContain(role);
      }
    }
  });

  it("never leaves an area open to nobody", () => {
    for (const rule of ROUTE_POLICY) {
      expect(rule.roles.length).toBeGreaterThan(0);
    }
  });
});

describe("every role against every protected area", () => {
  for (const path of PROTECTED_PATHS) {
    for (const role of ROLES) {
      const shouldPass = EXPECTED[path].includes(role);

      it(`${role} ${shouldPass ? "may" : "may NOT"} open ${path}`, () => {
        expect(canOpen(path, [role])).toEqual(
          shouldPass ? { allowed: true } : { allowed: false, reason: "wrong-role" },
        );
      });

      it(`${role} ${shouldPass ? "may" : "may NOT"} open a page inside ${path}`, () => {
        const deep = `${path}/something/deeper?x=1`.split("?")[0];
        expect(canOpen(deep, [role]).allowed).toBe(shouldPass);
      });
    }
  }
});

describe("signed out", () => {
  it.each(PROTECTED_PATHS)("is sent to sign in when asking for %s", (path) => {
    expect(canOpen(path, null)).toEqual({
      allowed: false,
      reason: "not-signed-in",
    });
  });

  it.each(["/", "/health", "/signin", "/forgot-password", "/reset-password"])(
    "may still open the public page %s",
    (path) => {
      expect(canOpen(path, null)).toEqual({ allowed: true });
    },
  );
});

describe("holding several roles", () => {
  it("lets the owner-trainer into both of their areas", () => {
    const held: Role[] = ["GYM_OWNER", "TRAINER"];
    expect(canOpen("/owner", held).allowed).toBe(true);
    expect(canOpen("/trainer", held).allowed).toBe(true);
    expect(canOpen("/desk", held).allowed).toBe(true);
  });

  it("still refuses the areas none of their roles covers", () => {
    const held: Role[] = ["GYM_OWNER", "TRAINER"];
    expect(canOpen("/admin", held)).toEqual({
      allowed: false,
      reason: "wrong-role",
    });
    expect(canOpen("/me", held)).toEqual({ allowed: false, reason: "wrong-role" });
  });

  it("gives the platform admin no special pass into a gym's areas", () => {
    // Deliberate: the founders administer the platform, they are not staff of a gym.
    expect(canOpen("/owner", ["PLATFORM_ADMIN"]).allowed).toBe(false);
    expect(canOpen("/trainer", ["PLATFORM_ADMIN"]).allowed).toBe(false);
  });

  it("refuses somebody signed in who holds no role at all", () => {
    for (const path of PROTECTED_PATHS) {
      expect(canOpen(path, [])).toEqual({ allowed: false, reason: "wrong-role" });
    }
  });
});

describe("addresses that merely look like a protected one", () => {
  it.each([
    ["/administrator", "/admin"],
    ["/ownership", "/owner"],
    ["/desklamp", "/desk"],
    ["/trainers-guide", "/trainer"],
    ["/media", "/me"],
  ])("%s is not treated as %s", (lookalike) => {
    expect(rolesAllowedFor(lookalike)).toBeNull();
  });

  it("does not make a lookalike public either — it still needs a sign-in", () => {
    expect(canOpen("/administrator", null)).toEqual({
      allowed: false,
      reason: "not-signed-in",
    });
  });
});

describe("a page nobody has classified yet", () => {
  it("is private by default, never accidentally public", () => {
    expect(isPublicPath("/something-new")).toBe(false);
    expect(canOpen("/something-new", null)).toEqual({
      allowed: false,
      reason: "not-signed-in",
    });
  });

  it("opens for any signed-in person once they are through the door", () => {
    expect(canOpen("/something-new", ["MEMBER"]).allowed).toBe(true);
  });
});

describe("public paths", () => {
  it("treats the home page as public without opening everything below it", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/admin")).toBe(false);
  });
});
