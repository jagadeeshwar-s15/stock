import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard reads the ML pipeline's output at request time. Those files
  // live outside app/, so they must be traced explicitly to be included in a
  // standalone or serverless deployment.
  outputFileTracingIncludes: {
    "/*": ["./ml/results/*.json"],
    "/api/artifacts/[file]": ["./ml/results/*.csv", "./ml/results/*.png", "./ml/results/*.json"],
    "/api/dashboard": ["./ml/results/*.json"],
  },
};

export default nextConfig;
