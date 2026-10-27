import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false, // every page reads the session + DB; render dynamically
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
};

export default nextConfig;
