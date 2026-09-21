# UI
Main application UI.

## End-to-end tests

The E2E suite uses a disposable self-hosted Convex stack and local adapters for
Microsoft auth, Telegram, Upstash locks, and PostHog. Docker Desktop (or Docker
Engine with Compose) and pnpm are required.

```sh
cp .env.e2e.example .env.e2e
pnpm e2e:up
pnpm exec playwright install chromium # first run only
pnpm e2e:test
pnpm e2e:down
```

Run `docker compose -f docker-compose.e2e.yml --profile debug up --wait -d dashboard`
to expose the optional Convex dashboard at `http://localhost:6791`.

## External Services Required
- [Posthog](https://posthog.com/) for telemetry.
- [Azure AD / Entra ID](https://www.microsoft.com/en-sg/security/business/identity-access/microsoft-entra-id) for Authentication, Microsoft SSO.
- [Convex](https://www.convex.dev/) for backend.
- [Upstash]() for cache.
