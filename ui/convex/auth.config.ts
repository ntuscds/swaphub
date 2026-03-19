import type { AuthConfig } from "convex/server";

/**
 * Custom JWT auth for Telegram Mini App.
 *
 * This expects your app server (Next.js) to mint RS256 JWTs with:
 * - iss = CONVEX_JWT_ISSUER
 * - aud = CONVEX_JWT_AUDIENCE (Convex "applicationID")
 * - sub = Telegram user id (string)
 *
 * And to expose a JWKS endpoint at:
 * - CONVEX_JWT_JWKS_URL
 */
export default {
  providers: [
    {
      type: "customJwt",
      applicationID: process.env.CONVEX_JWT_AUDIENCE!,
      issuer: process.env.CONVEX_JWT_ISSUER!,
      jwks: process.env.CONVEX_JWT_JWKS_URL!,
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
