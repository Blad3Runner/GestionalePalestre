import { describe, expect, it } from "vitest";
import { shortenPostgresVersion } from "@/lib/health";

describe("shortenPostgresVersion", () => {
  it("keeps only the product and the version number", () => {
    const raw =
      "PostgreSQL 17.2 on x86_64-windows, compiled by msvc-19.42.34433, 64-bit";
    expect(shortenPostgresVersion(raw)).toBe("PostgreSQL 17.2");
  });

  it("handles a packaged build that puts the distribution in brackets", () => {
    const raw =
      "PostgreSQL 16.4 (Debian 16.4-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc 12.2.0";
    expect(shortenPostgresVersion(raw)).toBe("PostgreSQL 16.4");
  });

  it("returns anything it does not recognise unchanged", () => {
    expect(shortenPostgresVersion("  something else  ")).toBe("something else");
  });
});
