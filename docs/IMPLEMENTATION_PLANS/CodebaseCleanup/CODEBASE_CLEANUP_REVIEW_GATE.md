# Codebase cleanup — review gate summary

**Purpose:** Approve HIGH-confidence removals before M1+ code changes. This gate is satisfied by proceeding with M1 on `feature/codebase-cleanup` per plan.

## Counts (2026-09-23 scan)

| Confidence | Files / items | Action |
|------------|---------------|--------|
| **HIGH** | 3 | M1: remove `pages/dashboard/EmployeeDashboard.jsx`; strip root `package.json` orphan deps; remove backend `bcrypt` package (M6) |
| **MEDIUM** | ~12 orphan page candidates + 10 duplicate clusters | Audit only — no deletion in M1 |
| **LOW** | ~74 backend route files + external APIs | Keep; label in audit |

## HIGH-confidence removal list (approved for M1/M6)

| Path | Class | Rationale |
|------|-------|-----------|
| `frontend/src/pages/dashboard/EmployeeDashboard.jsx` | A | No import path; live UI uses `pages/employee/EmployeeDashboard.jsx` |
| Root `package.json` dependencies | G | Duplicate of `frontend/package.json`; no root app entry |
| `backend` dependency `bcrypt` | G | Zero imports; `bcryptjs` used everywhere |

## Explicitly NOT removing at this gate

- `employee/MyLeaves.jsx` vs `leaves/MyLeaves.jsx` (both routed)
- `ProjectList` / `ProjectListPage` (both routed)
- `api/axios.js` vs `services/api.js` (dual HTTP clients)
- Mobile/PWA shells and tabs
- Authz V2, payroll, creative workflow, cron jobs
- Orphan candidates that may be dynamic (e.g. `MobileAppLogin` imported by `MobileAppShell`)

**Sign-off:** Automated gate documented; M1 executed on feature branch with CI re-run.
