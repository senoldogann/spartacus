import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server in .next/standalone/ suitable for Docker.
  // Copy .next/static and public/ alongside standalone/server.js at deploy time.
  output: "standalone",
};

export default nextConfig;
