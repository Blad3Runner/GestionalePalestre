import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proof that the refusal happens on the server, **and that it is scope-aware**.
 *
 * `requireAccess` is what every protected page calls before it renders anything. These
 * tests stand in for a visitor who has typed a forbidden address directly into the
 * browser: no menu is involved, nothing is merely hidden — the page's own code turns
 * them away.
 *
 * Since Step 3 the question is no longer "does this person hold role X?" but "do they
 * hold it **here**?" A trainer at one gym is not a trainer at another, and the tests at
 * the bottom of this file are what stop that from quietly becoming true.
 *
 * Below this sits a second, independent lock — Row-Level Security in the database. See
 * src/lib/tenancy/wall.test.ts.
 */

const sessionMock = vi.fn();
let chosenScope: string | undefined;

vi.mock("@/auth", () => ({
  auth: () => sessionMock(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "scope" && chosenScope !== undefined
        ? { value: chosenScope }
        : undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  // The real `redirect` works by throwing. So does this one, so the test can see it.
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const { PATHS, currentUser, requireAccess } = await import("@/lib/auth/guard");

type TestScope = {
  companyId: string;
  companyName: string;
  gymId: string | null;
  gymName: string | null;
  role: string;
  level: string;
};

const SEREGNO: TestScope = {
  companyId: "company-a",
  companyName: "Studio Seregno",
  gymId: "gym-a",
  gymName: "Seregno",
  role: "TRAINER",
  level: "WORKER",
};

const NORD_MEMBER: TestScope = {
  companyId: "company-b",
  companyName: "Circuito Nord",
  gymId: "gym-b",
  gymName: "Monza",
  role: "MEMBER",
  level: "CLIENT",
};

function signedIn(platformRoles: string[], scopes: TestScope[] = []) {
  return {
    user: {
      id: "person-1",
      name: "Test Person",
      email: "test@example.com",
      roles: platformRoles,
      scopes,
      locale: "it",
    },
  };
}

beforeEach(() => {
  sessionMock.mockReset();
  chosenScope = undefined;
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
    sessionMock.mockResolvedValue(signedIn([], [NORD_MEMBER]));

    await expect(requireAccess(PATHS.admin)).rejects.toThrow(
      "REDIRECT:/denied?from=%2Fadmin",
    );
  });

  it("is refused when the session carries roles that do not exist", async () => {
    sessionMock.mockResolvedValue(
      signedIn(["SUPERUSER", "root"], [{ ...SEREGNO, role: "ADMIN" }]),
    );

    await expect(requireAccess(PATHS.admin)).rejects.toThrow("REDIRECT:/denied");
  });

  it("is refused when they belong nowhere and hold nothing", async () => {
    sessionMock.mockResolvedValue(signedIn([], []));

    await expect(requireAccess(PATHS.trainer)).rejects.toThrow("REDIRECT:/denied");
  });
});

describe("a visitor signed in with the right role", () => {
  it("is let through and handed their details", async () => {
    sessionMock.mockResolvedValue(signedIn(["PLATFORM_ADMIN"]));

    await expect(requireAccess(PATHS.admin)).resolves.toMatchObject({
      id: "person-1",
      email: "test@example.com",
    });
  });

  it("is let into the area their role in the active place covers", async () => {
    sessionMock.mockResolvedValue(signedIn([], [SEREGNO]));

    await expect(requireAccess(PATHS.trainer)).resolves.toBeTruthy();
  });

  it("still cannot reach areas that role does not cover", async () => {
    sessionMock.mockResolvedValue(signedIn([], [SEREGNO]));

    await expect(requireAccess(PATHS.admin)).rejects.toThrow("REDIRECT:/denied");
    await expect(requireAccess(PATHS.owner)).rejects.toThrow("REDIRECT:/denied");
    await expect(requireAccess(PATHS.member)).rejects.toThrow("REDIRECT:/denied");
  });
});

/**
 * The point of Step 3.
 *
 * The same person, holding different roles at different companies, must carry only the
 * role of the place they are actually looking at. Before Step 3 the roles were global
 * and this distinction did not exist.
 */
describe("a person who is one thing here and another thing there", () => {
  const bothPlaces = [SEREGNO, NORD_MEMBER];

  it("is a trainer while looking at the company where they train", async () => {
    sessionMock.mockResolvedValue(signedIn([], bothPlaces));
    chosenScope = "company-a:gym-a";

    await expect(requireAccess(PATHS.trainer)).resolves.toBeTruthy();
  });

  it("is NOT a trainer while looking at the company where they are only a member", async () => {
    sessionMock.mockResolvedValue(signedIn([], bothPlaces));
    chosenScope = "company-b:gym-b";

    await expect(requireAccess(PATHS.trainer)).rejects.toThrow("REDIRECT:/denied");
  });

  it("is a member there instead", async () => {
    sessionMock.mockResolvedValue(signedIn([], bothPlaces));
    chosenScope = "company-b:gym-b";

    await expect(requireAccess(PATHS.member)).resolves.toBeTruthy();
  });

  it("and is NOT a member back at the company where they train", async () => {
    sessionMock.mockResolvedValue(signedIn([], bothPlaces));
    chosenScope = "company-a:gym-a";

    await expect(requireAccess(PATHS.member)).rejects.toThrow("REDIRECT:/denied");
  });

  it("carries a badge naming the place they are looking at, and only that place", async () => {
    sessionMock.mockResolvedValue(signedIn([], bothPlaces));
    chosenScope = "company-b:gym-b";

    const viewer = await currentUser();
    expect(viewer?.badge).toEqual({
      level: "CLIENT",
      companyId: "company-b",
      gymId: "gym-b",
      personId: "person-1",
    });
  });

  it("falls back to their first place when the chosen one is nonsense", async () => {
    sessionMock.mockResolvedValue(signedIn([], bothPlaces));
    chosenScope = "company-does-not-exist";

    const viewer = await currentUser();
    expect(viewer?.activeScope?.companyId).toBe("company-a");
  });
});

describe("the platform admin's badge", () => {
  it("names no company, because they see across all of them", async () => {
    sessionMock.mockResolvedValue(signedIn(["PLATFORM_ADMIN"]));

    const viewer = await currentUser();
    expect(viewer?.badge).toEqual({
      level: "PLATFORM",
      companyId: null,
      gymId: null,
      personId: "person-1",
    });
  });

  it("stays PLATFORM even after picking one company to look at", async () => {
    sessionMock.mockResolvedValue(signedIn(["PLATFORM_ADMIN"], [SEREGNO]));
    chosenScope = "company-a:gym-a";

    const viewer = await currentUser();
    expect(viewer?.badge.level).toBe("PLATFORM");
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

  it("survives scopes that are malformed rather than trusting them", async () => {
    sessionMock.mockResolvedValue(
      signedIn([], [{ nonsense: true } as unknown as TestScope]),
    );

    const viewer = await currentUser();
    expect(viewer?.scopes).toEqual([]);
    expect(viewer?.effectiveRoles).toEqual([]);
  });
});
