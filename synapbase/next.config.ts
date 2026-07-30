import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
};

export default nextConfig;
