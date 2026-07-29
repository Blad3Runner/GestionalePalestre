import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proof that the refusal happens on the server.
 *
 * `requireAccess` is what every protected page calls before it renders anything. These
 * tests stand in for a visitor who has typed a forbidden address directly into the
 * browser: no menu is involved, nothing is merely hidden — the page's own code turns
 * them away.
 */

const sessionMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => sessionMock(),
}));

vi.mock("next/navigation", () => ({
  // The real `redirect` works by throwing. So does this one, so the test can see it.
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const { PATHS, currentUser, requireAccess } = await import("@/lib/auth/guard");

function signedIn(roles: string[]) {
  return {
    user: {
      id: "person-1",
      name: "Test Person",
      email: "test@example.com",
      roles,
      locale: "it",
    },
  };
}

beforeEach(() => {
  sessionMock.mockReset();
});

describe("a visitor who is not signed in", () => {
  it.each(Object.values(PATHS))(
    "is sent to the sign-in page when typing %s directly",
    async (path) => {
      sessionMock.mockResolvedValue(null);

      await expect(requireAccess(path)).rejects.toThrow(
        `REDIRECT:/signin?callbackUrl=${encodeURIComponent(path)}`,
      );
    },
  );

  it("is nobody, as far as currentUser is concerned", async () => {
    sessionMock.mockResolvedValue(null);
    await expect(currentUser()).resolves.toBeNull();
  });
});

describe("a visitor signed in with the wrong role", () => {
  it("is refused the platform administration area", async () => {
    sessionMock.mockResolvedValue(signedIn(["MEMBER"]));

    await expect(requireAccess(PATHS.admin)).rejects.toThrow(
      "REDIRECT:/denied?from=%2Fadmin",
    );
  });

  it("is refused the owner's area even holding every other role", async () => {
    sessionMock.mockResolvedValue(
      signedIn(["PLATFORM_ADMIN", "STAFF", "TRAINER", "MEMBER"]),
    );

    await expect(requireAccess(PATHS.owner)).rejects.toThrow(
      "REDIRECT:/denied?from=%2Fowner",
    );
  });

  it("is refused when the token carries roles that do not exist", async () => {
    sessionMock.mockResolvedValue(signedIn(["SUPERUSER", "ADMIN", "root"]));

    await expect(requireAccess(PATHS.admin)).rejects.toThrow("REDIRECT:/denied");
  });

  it("is refused when the token carries no roles at all", async () => {
    sessionMock.mockResolvedValue(signedIn([]));

    await expect(requireAccess(PATHS.trainer)).rejects.toThrow("REDIRECT:/denied");
  });
});

describe("a visitor signed in with the right role", () => {
  it("is let through and handed their details", async () => {
    sessionMock.mockResolvedValue(signedIn(["PLATFORM_ADMIN"]));

    await expect(requireAccess(PATHS.admin)).resolves.toMatchObject({
      id: "person-1",
      email: "test@example.com",
      roles: ["PLATFORM_ADMIN"],
    });
  });

  it("is let into every area one of their roles covers", async () => {
    sessionMock.mockResolvedValue(signedIn(["GYM_OWNER", "TRAINER"]));

    await expect(requireAccess(PATHS.owner)).resolves.toBeTruthy();
    await expect(requireAccess(PATHS.desk)).resolves.toBeTruthy();
    await expect(requireAccess(PATHS.trainer)).resolves.toBeTruthy();
  });

  it("still cannot reach the areas their roles do not cover", async () => {
    sessionMock.mockResolvedValue(signedIn(["GYM_OWNER", "TRAINER"]));

    await expect(requireAccess(PATHS.admin)).rejects.toThrow("REDIRECT:/denied");
    await expect(requireAccess(PATHS.member)).rejects.toThrow("REDIRECT:/denied");
  });
});

describe("a session that is damaged or half-built", () => {
  it("is treated as not signed in when the id is missing", async () => {
    sessionMock.mockResolvedValue({ user: { roles: ["PLATFORM_ADMIN"] } });

    await expect(requireAccess(PATHS.admin)).rejects.toThrow("REDIRECT:/signin");
  });

  it("is treated as not signed in when there is no user at all", async () => {
    sessionMock.mockResolvedValue({});

    await expect(requireAccess(PATHS.admin)).rejects.toThrow("REDIRECT:/signin");
  });
});
