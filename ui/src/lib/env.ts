import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    API_KEY: z.string(),
    ENCRYPTION_KEY: z.string(),

    AZURE_AD_CLIENT_ID: z.string().default(""),
    AZURE_AD_CLIENT_SECRET: z.string().default(""),
    AZURE_AD_TENANT_ID: z.string().default(""),

    CONVEX_JWT_AUDIENCE: z.string(),
    CONVEX_JWT_ISSUER: z.string(),
    CONVEX_JWT_PRIVATE_KEY: z
      .string()
      .transform((val) => val.replaceAll("\\\\n", "\n")),
    CONVEX_JWT_PUBLIC_KEY: z
      .string()
      .transform((val) => val.replaceAll("\\\\n", "\n")),
    CONVEX_JWT_KID: z.string(),

    SECURE_COOKIES: z
      .string()
      .default("true")
      .transform((val) => val === "true"),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),

    NEXT_PUBLIC_CONVEX_URL: z.string(),
    NEXT_PUBLIC_CONVEX_SITE_URL: z.string(),

    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().default("Findex_ntu_bot"),
    NEXT_PUBLIC_ALLOW_MOCK_USER: z
      .string()
      .default("false")
      .transform((val) => val === "true"),
  },
  runtimeEnv: {
    API_KEY: process.env.API_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
    NEXT_PUBLIC_ALLOW_MOCK_USER: process.env.NEXT_PUBLIC_ALLOW_MOCK_USER,

    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,

    CONVEX_JWT_AUDIENCE: process.env.CONVEX_JWT_AUDIENCE,
    CONVEX_JWT_ISSUER: process.env.CONVEX_JWT_ISSUER,
    CONVEX_JWT_PRIVATE_KEY: process.env.CONVEX_JWT_PRIVATE_KEY,
    CONVEX_JWT_PUBLIC_KEY: process.env.CONVEX_JWT_PUBLIC_KEY,
    CONVEX_JWT_KID: process.env.CONVEX_JWT_KID,

    SECURE_COOKIES: process.env.SECURE_COOKIES,
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
});
