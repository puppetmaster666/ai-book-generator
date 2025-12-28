import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include font files in serverless function bundles
  outputFileTracingIncludes: {
    '/api/**/*': ['./assets/fonts/**/*'],
  },
};

export default nextConfig;
