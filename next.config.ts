import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon — keep it out of the bundler (Next 16
  // moved this out of experimental). Used by src/db and better-auth's adapter.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
