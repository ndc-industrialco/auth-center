import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for running behind Cloudflare Tunnel / reverse proxy
  // AUTH_TRUST_HOST=true in .env handles next-auth header trust
  poweredByHeader: false,
};

export default nextConfig;
