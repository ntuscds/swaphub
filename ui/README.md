# UI
Main application UI.

## Local tests

Run from `ui/` with Node.js 24 LTS (recommended) or Node.js 22.12+ within 22.x,
and pnpm 10. Vitest declares support for `^22.12.0 || ^24.0.0 || >=26.0.0`;
Node.js 23 and 25 are outside that range.

```sh
pnpm install --frozen-lockfile
pnpm test
```

`pnpm test` runs the existing Node lock tests followed by isolated Convex domain
tests. A failure exits nonzero. Run `pnpm test:integration` for the two lock tests,
or `pnpm test:convex` for the backend suite; append a filename to select one file,
for example `pnpm test:convex tests/integration/convex/preferences.test.ts`.

The backend suite uses [convex-test](https://docs.convex.dev/testing/convex-test)
with the actual schema and handlers. Every test seeds a fresh in-memory database
and uses synthetic identities and environment values; `.env` files are not loaded
and external fetches throw. Docker, deployed Convex, Microsoft, Telegram and
Upstash credentials are unnecessary. The existing lock tests exercise the local
lock adapter, rather than distributed Upstash behavior.

| Scenarios | Location |
| --- | --- |
| Wanted-index count boundary, duplicate/invalid edits, authorization | `tests/integration/convex/preferences.test.ts` |
| Exact ICC/non-ICC matches and pending-request retention after school edits | `tests/integration/convex/matches.test.ts` |
| Duplicate filing, direct/three-way decisions, cancellation and participant checks | `tests/integration/convex/requests.test.ts` |
| Lock ownership and concurrent contenders | `tests/integration/lock.test.ts` |

School-change tests file an ICC three-way request through the authenticated
handler before changing the initiator's, target's, or middleman's school. Every
participant must still see the sent request with its original roles and pending
acceptance flags. Unsent matches are excluded after the same school changes, as
required by [the product test plan](../plans/E2E_TESTS.md).

These fast tests validate backend state and handler checks. The browser suite
below covers deployed auth, onboarding and UI journeys. Neither suite alone
implements the full product test plan.

## End-to-end tests

The E2E suite uses a disposable self-hosted Convex stack and local adapters for
Microsoft auth, Telegram, Upstash locks, and PostHog. Docker Desktop (or Docker
Engine with Compose) and pnpm are required.

```sh
export COMPOSE_PROJECT_NAME="swaphub-test-$(git rev-parse --short HEAD)-$(date +%s)"
cp .env.e2e.example .env.e2e
pnpm e2e:up
pnpm exec playwright install chromium # first run only
pnpm e2e:test
pnpm e2e:down
```

Use the same `COMPOSE_PROJECT_NAME` for startup, testing, dashboard and teardown.
Choose a fresh name: startup resets/seeds that project's database, and teardown
removes its volumes. Compose currently uses fixed host ports, so run one local
E2E stack at a time. Keep the exported name if teardown will run in a new shell.

Run `docker compose -f docker-compose.e2e.yml --profile debug up --wait -d dashboard`
to expose the optional Convex dashboard at `http://localhost:6791`.

## External Services Required
- [Posthog](https://posthog.com/) for telemetry.
- [Azure AD / Entra ID](https://www.microsoft.com/en-sg/security/business/identity-access/microsoft-entra-id) for Authentication, Microsoft SSO.
- [Convex](https://www.convex.dev/) for backend.
- [Upstash]() for cache.
