import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.fzr.cards",
        pathname: "/api/v2/media/**",
      },
      {
        protocol: "https",
        hostname: "**.fzr.cards",
      },
    ],
  },
};

export default nextConfig;
