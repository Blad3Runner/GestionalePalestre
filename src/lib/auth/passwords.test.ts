import { describe, expect, it } from "vitest";
import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  checkPassword,
  hashPassword,
  normaliseEmail,
  verifyPassword,
} from "@/lib/auth/passwords";

describe("checkPassword", () => {
  it("accepts a reasonable password", () => {
    expect(checkPassword("Palestra2026!")).toBeNull();
  });

  it("refuses one that is too short", () => {
    expect(checkPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe("too-short");
  });

  it("accepts one exactly at the minimum", () => {
    expect(checkPassword("a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });

  it("refuses one past bcrypt's limit, which would silently ignore the rest", () => {
    expect(checkPassword("a".repeat(MAX_PASSWORD_BYTES + 1))).toBe("too-long");
  });

  it("counts bytes rather than characters, so accents are measured honestly", () => {
    // "à" is two bytes, so 40 of them is 80 bytes — past the limit despite being
    // only 40 characters long.
    expect(checkPassword("à".repeat(40))).toBe("too-long");
  });
});

describe("hashing and verifying", () => {
  it("accepts the right password", async () => {
    const hash = await hashPassword("Palestra2026!");
    await expect(verifyPassword("Palestra2026!", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("Palestra2026!");
    await expect(verifyPassword("Palestra2027!", hash)).resolves.toBe(false);
  });

  it("is case-sensitive", async () => {
    const hash = await hashPassword("Palestra2026!");
    await expect(verifyPassword("palestra2026!", hash)).resolves.toBe(false);
  });

  it("never stores the password itself", async () => {
    const hash = await hashPassword("Palestra2026!");
    expect(hash).not.toContain("Palestra2026!");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("produces a different hash every time, so two equal passwords do not look equal", async () => {
    const first = await hashPassword("Palestra2026!");
    const second = await hashPassword("Palestra2026!");
    expect(first).not.toBe(second);
  });

  it("refuses to hash a password that would be unacceptable", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
  });

  it("treats a corrupt stored hash as a wrong password rather than crashing", async () => {
    await expect(verifyPassword("anything", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
  });
});

describe("normaliseEmail", () => {
  it("lower-cases and trims, so signing in is not case-sensitive", () => {
    expect(normaliseEmail("  Titolare@Example.COM ")).toBe("titolare@example.com");
  });
});
