#!/bin/sh
set -eu

admin_key="$(convex-generate-key "$INSTANCE_NAME" "$INSTANCE_SECRET")"
export CONVEX_SELF_HOSTED_URL="${CONVEX_SELF_HOSTED_URL:-http://convex:3210}"
export CONVEX_SELF_HOSTED_ADMIN_KEY="$admin_key"

set_env() {
  pnpm exec convex env set "$1" "$2"
}

set_env API_KEY "$API_KEY"
set_env ENCRYPTION_KEY "$ENCRYPTION_KEY"
set_env BOT_KEY "$BOT_KEY"
set_env TELEGRAM_WEBHOOK_SECRET "$TELEGRAM_WEBHOOK_SECRET"
set_env UPSTASH_REDIS_REST_TOKEN "$UPSTASH_REDIS_REST_TOKEN"
set_env UPSTASH_REDIS_REST_URL "$UPSTASH_REDIS_REST_URL"
set_env CONVEX_JWT_AUDIENCE "$CONVEX_JWT_AUDIENCE"
set_env CONVEX_JWT_ISSUER "$CONVEX_JWT_ISSUER"
set_env CONVEX_JWT_PRIVATE_KEY e2e-unused-by-convex
set_env CONVEX_JWT_PUBLIC_KEY e2e-unused-by-convex
set_env CONVEX_JWT_KID "$CONVEX_JWT_KID"
set_env CONVEX_JWT_JWKS_URL "$CONVEX_JWT_JWKS_URL"
set_env NEXT_APP_URL "$NEXT_APP_URL"

pnpm exec convex deploy --yes --typecheck disable
pnpm exec convex run e2e:resetAndSeed "{\"apiKey\":\"$API_KEY\"}"
