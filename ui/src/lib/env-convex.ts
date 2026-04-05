import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    BOT_KEY: z.string(),
    /** Used to verify webhook POSTs are from Telegram. Set the same value in setWebhook(..., { secret_token }). */
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    UPSTASH_REDIS_REST_URL: z.string(),

    CONVEX_JWT_AUDIENCE: z.string(),
    CONVEX_JWT_ISSUER: z.string(),
    CONVEX_JWT_PRIVATE_KEY: z
      .string()
      .transform((val) => val.replaceAll("\\\\n", "\n")),
    CONVEX_JWT_PUBLIC_KEY: z
      .string()
      .transform((val) => val.replaceAll("\\\\n", "\n")),
    CONVEX_JWT_KID: z.string(),
    CONVEX_JWT_JWKS_URL: z.string(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {},
  runtimeEnv: {
    BOT_KEY: process.env.BOT_KEY,

    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,

    CONVEX_JWT_AUDIENCE: process.env.CONVEX_JWT_AUDIENCE,
    CONVEX_JWT_ISSUER: process.env.CONVEX_JWT_ISSUER,
    CONVEX_JWT_PRIVATE_KEY: process.env.CONVEX_JWT_PRIVATE_KEY,
    CONVEX_JWT_PUBLIC_KEY: process.env.CONVEX_JWT_PUBLIC_KEY,
    CONVEX_JWT_KID: process.env.CONVEX_JWT_KID,
    CONVEX_JWT_JWKS_URL: process.env.CONVEX_JWT_JWKS_URL,
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
