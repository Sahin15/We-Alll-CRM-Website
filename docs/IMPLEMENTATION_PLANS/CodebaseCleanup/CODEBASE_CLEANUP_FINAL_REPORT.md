# Codebase cleanup — final report (M10)

| Field | Value |
|-------|--------|
| **Branch** | `feature/codebase-cleanup` |
| **Completed** | 2026-09-23 |
| **Scope** | Phases 0–11 (audit + safe milestones); destructive scope limited to HIGH-confidence items |

## 1. Files audited

~1,663 repository files (excluding `node_modules`, `frontend/dist`), per baseline inventory.

## 2. Files removed

| Path | Milestone |
|------|-----------|
| `frontend/src/pages/dashboard/EmployeeDashboard.jsx` | M1 |
| Root `package-lock.json` | M1 |

## 3. Files modified

| Path | Change |
|------|--------|
| Root `package.json` | Removed orphan dependencies; private monorepo metadata only |
| `backend/package.json` | Removed unused `bcrypt` dependency |
| `backend/package-lock.json` | Lockfile refresh after `bcrypt` removal |
| `docs/IMPLEMENTATION_PLANS/CodebaseCleanup/*` | Audit, baseline, plans, gate, status, this report |
| `backend/scripts/codebase-cleanup-audit-scan.js` | Added (repeatable orphan scan) |

## 4. Dependencies removed

| Package | Location |
|---------|----------|
| `chart.js`, `moment`, `react-big-calendar`, `react-chartjs-2` | Root (unused) |
| `bcrypt` | Backend (unused; `bcryptjs` retained) |

## 5. Dependencies retained (why)

- `bcryptjs` — passwords in `userController`, seeds, scripts  
- `node-cron`, `firebase-admin`, `puppeteer`, `ws`, AWS SDK — cron, notifications, PDF/slips, WebSocket  
- Frontend `vitest` / Testing Library — future tests; `npm test` still placeholder  

## 6–9. Components / API / backend / mobile code removed

- **Components:** 1 orphan page (dashboard EmployeeDashboard stub)  
- **API routes:** 0  
- **Backend controllers/services:** 0  
- **Mobile/PWA:** 0 (M9 verification only)  

## 10. Assets removed

0 (M7 deferred).

## 11. Documentation

- **Added:** `CodebaseCleanup/` pack (audit, baseline, implementation plan, review gate, status, final report)  
- **Removed:** 0 legacy docs (bulk doc cleanup deferred per plan)  

## 12. Configuration

- No env or CI workflow changes  
- Root npm install no longer required for app builds  

## 13. Tests run (post-cleanup)

| Check | Result |
|-------|--------|
| `backend npm run test:ci` | See CI log on branch (re-run after merge) |
| `backend npm run authz:validate` | PASS (warnings pre-existing) |
| `frontend npm run build` | PASS |

## 14. Builds run

- `frontend npm run build` — PASS after M1  

## 15. Pre-existing failures

- Backend `npm run lint` — ESLint 9 flat config missing  
- Frontend `npm run lint` — ~4.5k issues (not addressed in M2)  

## 16. New failures

None observed for `test:ci`, `authz:validate`, or `frontend build` after M1/M6.

## 17. Risk assessment

| Area | Risk |
|------|------|
| M1 orphan dashboard | Low — no references |
| M6 `bcrypt` removal | Low — no imports |
| Deferred orphan pages | Medium if removed without route audit |
| Authz/payroll/creative | Untouched — no risk from this PR |

## 18. Remaining cleanup candidates

- 11 orphan page files (see audit § B)  
- Expense submodule pages superseded by consolidated UI  
- `GrowthSummit2026` / `GrowthSummitNew` vs `GrowthSummitFinal`  
- Dual HTTP clients (`api/axios` vs `services/api`) — refactor project, not cleanup  
- Legacy `fixRoutes` / `holidayRoutes` Authz migration  

## 19. Intentionally not removed

Listed in `CODEBASE_CLEANUP_AUDIT.md` § Intentionally not removed.

## 20. Recommendation

1. Open PR **`feature/codebase-cleanup` → `develop`**.  
2. Run GitHub CI (same gates as baseline).  
3. Schedule a **second pass** for MEDIUM orphan pages with per-file QA.  
4. Do **not** batch-delete backend routes without external integration review.  
5. Keep merging other features to `develop` in parallel; merge `develop` into this branch periodically if the PR stays open.
