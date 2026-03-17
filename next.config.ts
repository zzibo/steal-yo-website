import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["framer-motion", "shiki", "cheerio"],
  },
  serverExternalPackages: ["@swc/core"],
};

export default nextConfig;
