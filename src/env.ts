/**
 * Environment configuration.
 *
 * Every value the application reads from the environment is declared here, so there is
 * one place to look when something is missing. `.env.example` is the committed list of
 * what has to be set; the real `.env` is never committed.
 *
 * These are functions, not constants, so that a missing value produces a clear message
 * on the page that needed it rather than a crash at startup.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Environment variable ${name} is not set. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export function databaseUrl(): string {
  return requireEnv("DATABASE_URL");
}
