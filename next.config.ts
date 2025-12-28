import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include pdfkit font files in serverless bundle for Vercel deployment
  outputFileTracingIncludes: {
    '/api/books/[id]/download': ['./node_modules/pdfkit/js/data/**/*'],
  },
};

export default nextConfig;
