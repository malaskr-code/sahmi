import type { NextConfig } from "next";

const allowedDevOrigins = ["127.0.0.1", "localhost"];
if (process.env.REPLIT_DEV_DOMAIN) {
  allowedDevOrigins.push(process.env.REPLIT_DEV_DOMAIN);
}

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins,
  experimental: { authInterrupts: true },
};

export default nextConfig;
