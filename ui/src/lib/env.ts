import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    BOT_KEY: z.string(),
    ENCRYPTION_KEY: z.string(),
    /** Used to verify webhook POSTs are from Telegram. Set the same value in setWebhook(..., { secret_token }). */
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    UPSTASH_REDIS_REST_URL: z.string(),

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
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
  },
  runtimeEnv: {
    BOT_KEY: process.env.BOT_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    // BREVO_API_KEY: process.env.BREVO_API_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,

    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,

    CONVEX_JWT_AUDIENCE: process.env.CONVEX_JWT_AUDIENCE,
    CONVEX_JWT_ISSUER: process.env.CONVEX_JWT_ISSUER,
    CONVEX_JWT_PRIVATE_KEY: process.env.CONVEX_JWT_PRIVATE_KEY,
    CONVEX_JWT_PUBLIC_KEY: process.env.CONVEX_JWT_PUBLIC_KEY,
    CONVEX_JWT_KID: process.env.CONVEX_JWT_KID,
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
