import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.sofascore.com",
        pathname: "/api/v1/**",
      },
      {
        protocol: "https",
        hostname: "touargaclub.ma",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "r2.thesportsdb.com",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
