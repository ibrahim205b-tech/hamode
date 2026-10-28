import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// نسخة العرض الثابتة لـ GitHub Pages (scripts/build-static-demo.mjs) — لا تؤثر على التطبيق الكامل
const demo = process.env.NEXT_PUBLIC_DEMO_STATIC === "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(demo ? { basePath: process.env.NEXT_PUBLIC_BASE_PATH || "", distDir: ".next-demo" } : {}),
  serverExternalPackages: ["sharp"],
  images: {
    localPatterns: [{ pathname: "/api/images/**" }],
    formats: ["image/avif", "image/webp"],
    unoptimized: demo,
  },
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
