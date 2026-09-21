import assert from "node:assert/strict";
import test from "node:test";

process.env.API_KEY = "integration-test-api-key";
process.env.ENCRYPTION_KEY = "integration-test-encryption-key";
process.env.BOT_KEY = "e2e-telegram-token";
process.env.TELEGRAM_WEBHOOK_SECRET = "integration-test-webhook-secret";
process.env.UPSTASH_REDIS_REST_TOKEN = "integration-test-token";
process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:8079";
process.env.CONVEX_JWT_AUDIENCE = "integration-test";
process.env.CONVEX_JWT_ISSUER = "http://127.0.0.1:3000";
process.env.CONVEX_JWT_PRIVATE_KEY = "integration-test-private-key";
process.env.CONVEX_JWT_PUBLIC_KEY = "integration-test-public-key";
process.env.CONVEX_JWT_KID = "integration-test";
process.env.CONVEX_JWT_JWKS_URL = "http://127.0.0.1:3000/api/.well-known/jwks.json";
process.env.NEXT_APP_URL = "http://127.0.0.1:3000";

test("a failed contender cannot release another owner's lock", async () => {
  const { createLock } = await import("../../src/db/lock");
  const owner = createLock("swap-decision:request-1");
  const contender = createLock("swap-decision:request-1");

  assert.equal(await owner.acquire(), true);
  assert.equal(await contender.acquire(), false);

  await contender.release();

  const laterContender = createLock("swap-decision:request-1");
  assert.equal(await laterContender.acquire(), false);

  await owner.release();
  assert.equal(await laterContender.acquire(), true);
  await laterContender.release();
});

test("concurrent operations admit exactly one lock owner", async () => {
  const { createLock } = await import("../../src/db/lock");
  const contenders = Array.from({ length: 8 }, () =>
    createLock("send-swap-request:target-1")
  );

  const results = await Promise.all(
    contenders.map((contender) => contender.acquire())
  );

  assert.equal(results.filter(Boolean).length, 1);

  const ownerIndex = results.findIndex(Boolean);
  await contenders[ownerIndex]!.release();

  const nextOperation = createLock("send-swap-request:target-1");
  assert.equal(await nextOperation.acquire(), true);
  await nextOperation.release();
});
