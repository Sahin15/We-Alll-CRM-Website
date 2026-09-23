# Codebase cleanup — implementation plan (M1–M10)

Branch: **`feature/codebase-cleanup`** → PR to **`develop`** when complete.

## M1 — Safe dead-code cleanup (LOW risk)

| Item | Files | Verification | Rollback |
|------|-------|--------------|----------|
| Orphan employee dashboard stub | Delete `frontend/src/pages/dashboard/EmployeeDashboard.jsx` | `frontend npm run build` | `git revert` |
| Root orphan deps | `package.json` → private meta only; remove root `package-lock.json` | No CI uses root install | Restore files |

## M2 — Unused imports / locals (LOW risk)

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| ESLint autofix | **Deferred** — 4.5k pre-existing frontend lint errors | Documented in baseline | N/A |
| Targeted fixes | Only files touched in M1 | Build | Revert commit |

## M3 — Verified unused frontend modules (MEDIUM)

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| Orphan pages | **Deferred** — 12 candidates need manual route/sidebar check | Per-file PR | Revert |
| `GrowthSummit2026.jsx`, `GrowthSummitNew.jsx` | Keep until product confirms superseded by `GrowthSummitFinal` | — | — |
| `frontend/convert-routes.js` | Keep — migration helper; not in CI | — | — |

## M4 — Verified unused backend utilities (MEDIUM)

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| Routes/models/controllers | **No removal** this cycle | `test:ci` | — |
| `codebase-cleanup-audit-scan.js` | **Add** (tooling) | Node run | — |

## M5 — API client dead methods (MEDIUM–HIGH)

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| Backend route deletion | **Out of scope** | — | — |
| Orphan API consumers | Documented in audit | Manual QA | — |

## M6 — Dependency cleanup (MEDIUM)

| Item | Files | Verification | Rollback |
|------|-------|--------------|----------|
| Remove `bcrypt` | `backend/package.json` + lockfile | `npm run test:ci` | Revert |

## M7 — Asset cleanup (MEDIUM)

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| Public/assets | **Deferred** — requires per-file reference scan | — | — |

## M8 — Documentation (LOW)

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| This folder | `STATUS.md`, audit, baseline, final report | Review | Git |

## M9 — Mobile / PWA (HIGH risk)

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| File removal | **None** | Manual: `/mobileapp`, `/app` routes | — |
| Assessment | Documented in audit § Mobile | — | — |

## M10 — Final regression + report

| Item | Scope | Verification | Rollback |
|------|-------|--------------|----------|
| CI parity | `test:ci`, `authz:validate`, `frontend build` | Green | Stop merge |
| Deliverable | `CODEBASE_CLEANUP_FINAL_REPORT.md` | — | — |
