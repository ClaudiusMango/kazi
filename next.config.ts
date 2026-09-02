import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `output: 'export'` — this app ships a server-side route handler.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
