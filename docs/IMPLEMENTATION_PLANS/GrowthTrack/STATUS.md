# Growth Track (PIP v2) — Status

| Field | Value |
|-------|--------|
| **Branch** | `feature/pip-v2` |
| **Target merge** | `develop` (no staging/main in this cycle) |
| **Completion** | ~95% feature-complete; pending PR merge |
| **Last verified** | 2026-09-23 (LOCAL_QA 14/14 via `run-growth-track-local-qa.js`) |

## Delivered

- Model, 9 API routes, scope helper (`growthTrackScope.js`), Authz V2 keys + Wave 4 rollout manifest entry
- Frontend: API wrapper, theme sync, employee + management pages, sidebar + lazy route
- In-app + FCM notifications (`growth_track` type)
- Unit tests: `authzGrowthTrack.unit.test.js`, `growthTrackScope.unit.test.js`
- Integration tests: `growthTrackRoutes.integration.test.js` (local Mongo; excluded from `test:ci`)

## Optional / gated

- **Email notifications (M7b):** Skipped for develop QA — see `ROLLOUT.md`
- **Authz enforce flags:** `AUTHZ_V2_GROWTH_TRACK` / `VITE_AUTHZ_V2_GROWTH_TRACK` remain off; legacy role fallbacks on routes

## Pointer

Master recovery narrative: [`docs/PIP_V2_IMPLEMENTATION_PLAN.md`](../../PIP_V2_IMPLEMENTATION_PLAN.md) (§2–4 updated to reference this folder).
