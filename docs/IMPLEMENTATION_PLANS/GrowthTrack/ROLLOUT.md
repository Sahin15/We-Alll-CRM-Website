# Growth Track — Rollout & flags

## Wave 4 module

Growth Track is registered in `backend/src/authz/rolloutManifest.js` (Wave 4) with frontend mirror in `frontend/src/utils/authzFlags.js`.

| Environment variable | Purpose |
|---------------------|---------|
| `AUTHZ_V2_GROWTH_TRACK` | Backend shadow/enforce for `growth_track.*` permissions |
| `VITE_AUTHZ_V2_GROWTH_TRACK` | Frontend `canAccess` for Growth Track UI |

**Develop / local QA:** Flags may stay **off**. Routes still allow legacy roles via `requireModulePermission(..., { legacyRoles })`.

## Rollout sequence (post-develop)

1. Enable shadow on staging → compare deny/allow logs
2. Enable enforce on staging after UAT
3. Production: enable enforce during maintenance window
4. Rollback: set `AUTHZ_V2_GROWTH_TRACK=false` (and frontend flag) — legacy role gates remain

## Email notifications (M7b)

**Decision for this cycle: Option A — no email.**

In-app and push (FCM) notifications are sent from `growthTrackController.js` on initiate, targets, acknowledge, finalize, and escalation paths.

To add email later (Option B): reuse the shared mail utility from leave/salary flows, wrap sends in non-blocking `try/catch`, and obtain HR/legal template sign-off before enabling.
