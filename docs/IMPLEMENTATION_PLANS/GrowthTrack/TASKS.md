# Growth Track — Task checklist

## Phase 0 — Branch hygiene

- [x] Work on `feature/pip-v2`
- [x] Merge latest `main` before PR
- [x] Push branch for CI (on PR open)

## Phase 1 — Hardening

- [x] `GrowthTrackManagement` uses `canAccess` + company `/all` vs `/manager` list
- [x] `GrowthTrackDetails` critical `pip-active` sync + empty `my-active` without error toast
- [x] Initiate employee dropdown filtered via `growthTrackAccess.js`

## Phase 2 — Tests

- [x] `growthTrackScope.unit.test.js`
- [x] `growthTrackRoutes.integration.test.js`
- [x] Keep `authzGrowthTrack.unit.test.js` green

## Phase 3 — Notification UX

- [x] `growth_track` in `NotificationToast` + `NotificationBell`
- [x] Deep link via existing `actionUrl: '/growth-track'`

## Phase 4 — Email gate

- [x] **Option A:** Skip email; in-app + FCM only (documented in `ROLLOUT.md`)

## Phase 5 — Local QA

- [x] Checklist in `LOCAL_QA_CHECKLIST.md` (14/14 passed 2026-09-23, `run-growth-track-local-qa.js`)

## Phase 6 — Docs

- [x] This folder (`STATUS`, `TASKS`, `ROLLOUT`, `LOCAL_QA_CHECKLIST`)
- [x] Refresh `PIP_V2_IMPLEMENTATION_PLAN.md` §2–4

## Phase 7 — Merge

- [ ] PR `feature/pip-v2` → `develop`, CI green
