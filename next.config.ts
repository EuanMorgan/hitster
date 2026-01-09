import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  /** We already do linting and typechecking as separate tasks in CI */
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
