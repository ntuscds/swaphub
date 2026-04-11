import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

const nextConfig: NextConfig = {
  // Required for `page.mdx` / `page.md` routes in the App Router
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
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
