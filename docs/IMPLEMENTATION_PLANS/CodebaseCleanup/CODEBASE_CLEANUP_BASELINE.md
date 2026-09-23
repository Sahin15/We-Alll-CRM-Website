# Codebase cleanup — baseline (pre-change)

| Field | Value |
|-------|--------|
| **Branch** | `feature/codebase-cleanup` |
| **Base commit** | `fb9244a` (from `develop` at kickoff) |
| **Recorded** | 2026-09-23 |

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Backend CI tests | `cd backend && npm run test:ci` | **PASS** — 106 suites, 745 tests |
| Authz validate | `cd backend && npm run authz:validate` | **PASS** — 9 passed, 10 warnings (pre-existing) |
| Backend lint | `cd backend && npm run lint` | **FAIL (pre-existing)** — ESLint 9 expects `eslint.config.js`; no flat config in repo |
| Frontend build | `cd frontend && npm run build` | **PASS** |
| Frontend lint | `cd frontend && npm run lint` | **FAIL (pre-existing)** — 4497 errors / 193 warnings (legacy ESLint debt) |
| Frontend test | `cd frontend && npm test` | **PASS (placeholder)** — echo only, no vitest suite wired |

## Pre-existing authz warnings (not introduced by cleanup)

- `team.user.update` not in legacy role mapping
- Legacy `protect()`-only route files: `documentRoutes`, `fixRoutes`, `holidayRoutes`, `notificationRoutes`, `todoRoutes`, `workCalendarRoutes`, `workloadRoutes`
- Legacy `authorize()` on `fixRoutes`, `holidayRoutes`

## Inventory snapshot

| Area | Count |
|------|------:|
| Repo files (excl. `node_modules`, `frontend/dist`) | ~1,663 |
| `backend/src` files | 382 |
| `frontend/src` files | 678 |
| `frontend/src/pages/**/*.jsx` | 161 |
| Lazy route imports (`lazyPages.js` + `index.jsx`) | ~149 |
| `frontend/src/api/*.js` | 54 |
| `backend/src/routes/*.js` | 74 |

## Regression gate (post-milestone)

After each cleanup milestone on this branch, re-run at minimum:

- `backend`: `npm run test:ci`, `npm run authz:validate`
- `frontend`: `npm run build`
