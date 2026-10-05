/// <reference types="vite/client" />
import { beforeEach, afterEach, vi } from "vitest";

// Synthetic values satisfy server validation without reading local credentials.
Object.assign(process.env, {
  API_KEY: "convex-test-api-key",
  ENCRYPTION_KEY: "convex-test-encryption-key",
  BOT_KEY: "e2e-telegram-token",
  TELEGRAM_WEBHOOK_SECRET: "convex-test-webhook-secret",
  UPSTASH_REDIS_REST_TOKEN: "convex-test-token",
  UPSTASH_REDIS_REST_URL: "http://127.0.0.1:8079",
  CONVEX_JWT_AUDIENCE: "convex-test",
  CONVEX_JWT_ISSUER: "http://127.0.0.1:3000",
  CONVEX_JWT_PRIVATE_KEY: "convex-test-private-key",
  CONVEX_JWT_PUBLIC_KEY: "convex-test-public-key",
  CONVEX_JWT_KID: "convex-test",
  CONVEX_JWT_JWKS_URL: "http://127.0.0.1:3000/api/.well-known/jwks.json",
  NEXT_APP_URL: "http://127.0.0.1:3000",
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => {
    throw new Error("External fetch is forbidden in isolated Convex tests");
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
