import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Prisma client is generated as TypeScript source under src/generated/prisma
  // and must run on the Node.js runtime, never bundled for the browser.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
