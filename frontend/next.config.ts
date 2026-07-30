import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "plotly.js/dist/plotly": path.resolve(__dirname, "node_modules/plotly.js-dist-min"),
    };
    return config;
  },
  async rewrites() {
    // In production on Vercel, routing is handled by vercel.json rewrites.
    // These rewrites are only needed in local development to proxy API calls
    // to the locally-running FastAPI backend.
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: "/api/v1/health",
        destination: "http://localhost:8000/health",
      },
      {
        source: "/api/v1/models",
        destination: "http://localhost:8000/models",
      },
      {
        source: "/api/v1/config",
        destination: "http://localhost:8000/config",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
