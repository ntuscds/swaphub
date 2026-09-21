import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
  } https://telegram.org`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://api.dicebear.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site${
    process.env.NEXT_PUBLIC_E2E_MODE === "true"
      ? " http://localhost:3210 ws://localhost:3210"
      : ""
  }`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Required for `page.mdx` / `page.md` routes in the App Router
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/relay-AQvm/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/relay-AQvm/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      // {
      //   source: "/",
      //   destination: "/swap",
      // },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withNextIntl(withMDX(nextConfig));
