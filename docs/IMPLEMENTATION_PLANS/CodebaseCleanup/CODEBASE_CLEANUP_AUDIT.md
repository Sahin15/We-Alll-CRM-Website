# Codebase cleanup audit (Phases 0–9)

**Branch:** `feature/codebase-cleanup`  
**Scanned:** 2026-09-23  
**Scanner:** `backend/scripts/codebase-cleanup-audit-scan.js` (orphan pages), manual ripgrep, `authz:validate`

## Architecture summary

| Layer | Path | Notes |
|-------|------|--------|
| Backend API | `backend/src` | Express 5; mounts in `server.js` (~70 prefixes) |
| Web UI | `frontend/src` | Vite 5, React 18, Bootstrap |
| Mobile | `frontend/src/pages/mobileapp`, `frontend/src/pages/app` | PWA + `/mobileapp` — **no separate native repo** |
| CI | `.github/workflows/ci.yml` | `test:ci`, `authz:validate`, `frontend build` |

---

## Classification legend

| Code | Meaning |
|------|---------|
| A | Definitely safe to remove |
| B | Very likely unused — verify |
| C | Potentially used dynamically |
| D | Deprecated but still referenced |
| E | Duplicate implementation |
| F | Duplicate business logic |
| G | Unused dependency |
| H | Potentially required configuration |
| I | Generated / cache |
| J | Documentation obsolete |
| K | Unknown — human decision |

---

## A — Definitely safe to remove (HIGH)

| Path | Type | Why unused | Search | References | Dynamic risk | Safe? | Confidence |
|------|------|------------|--------|------------|--------------|-------|------------|
| `frontend/src/pages/dashboard/EmployeeDashboard.jsx` | Page | Superseded stub (~286 lines) | `rg pages/dashboard/EmployeeDashboard` | **0** (live: `pages/employee/EmployeeDashboard.jsx` in `lazyPages.js`) | Low | Yes | **HIGH** |
| Root `package.json` deps (`chart.js`, `moment`, `react-big-calendar`, `react-chartjs-2`) | G | No root entry; dup `frontend/package.json` | Root vs `frontend/package.json` | Frontend imports only | Low | Yes | **HIGH** |

---

## G — Unused dependencies (HIGH / MEDIUM)

| Package | Location | Why | Search | Confidence | Action |
|---------|----------|-----|--------|------------|--------|
| `bcrypt` | `backend/package.json` | No `from "bcrypt"` | `rg bcrypt` in backend | **HIGH** | Remove (M6) |
| `bcryptjs` | backend | Used in controllers + scripts | — | Keep | — |
| Root chart stack | root `package.json` | Orphan | — | **HIGH** | Remove (M1) |
| `vitest`, `@testing-library/*` | frontend devDeps | No test files wired; `npm test` is echo | `package.json` scripts | MEDIUM | Keep for future |
| `fast-check` | frontend + backend devDeps | Used in property tests (some ignored in CI) | jest patterns | MEDIUM | Keep |
| `tslib` | backend deps | No direct import in `src/` | `rg tslib` | MEDIUM | Keep (transitive/tooling) |
| `node-fetch` | backend deps | No direct import in `src/` | `rg node-fetch` | MEDIUM | Keep until traced in scripts |

---

## B / C — Orphan page candidates (route-string scan)

Automated scan: **12** `pages/**/*.jsx` not matched in `index.jsx` + `lazyPages.js` import strings.

| Path | Class | Notes | Confidence |
|------|-------|-------|------------|
| `pages/employees/EnhancedEmployeeWorkView_Fixed.jsx` | B | Likely abandoned fix copy | MEDIUM |
| `pages/expenses/BudgetTracking.jsx` | B | Consolidated expense UI may supersede | MEDIUM |
| `pages/expenses/ExpenseAnalytics.jsx` | B | Same | MEDIUM |
| `pages/expenses/ExpenseApprovals.jsx` | B | Same | MEDIUM |
| `pages/expenses/ExpenseReports.jsx` | B | Same | MEDIUM |
| `pages/expenses/ExpenseSearch.jsx` | B | Same | MEDIUM |
| `pages/expenses/ReimbursementTracking.jsx` | B | Same | MEDIUM |
| `pages/GrowthSummit2026.jsx` | B | `GrowthSummitFinal` routed at `/growth-summit-2026` | MEDIUM |
| `pages/GrowthSummitNew.jsx` | B | Superseded candidate | MEDIUM |
| `pages/mobileapp/MobileAppLogin.jsx` | C | **Used** — static import in `MobileAppShell.jsx` (scan false positive) | LOW remove |
| `pages/procurement/vendors/VendorForm.jsx` | C | May be nested route | LOW |
| `pages/wfh/MyWFHRequests.jsx` | B | Check WFH routes | MEDIUM |

---

## E — Duplicate implementation clusters

| Cluster | Paths | Confidence | Action |
|---------|-------|------------|--------|
| Employee dashboards | `pages/employee/EmployeeDashboard.jsx` vs `pages/dashboard/EmployeeDashboard.jsx` | HIGH dead stub | Remove stub only |
| My Leaves | `employee/MyLeaves.jsx` vs `leaves/MyLeaves.jsx` | E — both in `lazyPages` | **Keep** |
| Project list UIs | `ProjectList` vs `ProjectListPage` | E — both routed | **Keep** |
| Work calendars | `AdminWorkCalendarOverview` vs `EnhancedAdminWorkCalendarOverview` | E | **Keep** |
| HTTP clients | `services/api.js` vs `api/axios.js` | E | **Keep** — merge is refactor, not cleanup |
| Password hashing | `bcrypt` vs `bcryptjs` packages | E | Remove unused `bcrypt` only |

---

## D — Deprecated but referenced

| Path | Notes | Confidence |
|------|-------|------------|
| `backend/src/routes/fixRoutes.js` | Legacy `authorize()`; mounted | Keep |
| `backend/src/routes/holidayRoutes.js` | Legacy `authorize()`; mounted | Keep |
| `documentRoutes`, `notificationRoutes`, `todoRoutes`, `workCalendarRoutes`, `workloadRoutes` | `protect()` without Authz V2 per validator | Keep |

---

## H — Configuration (do not delete)

- `backend/.env.example`, `frontend` Vite env modes, PWA in `vite.config.js`
- `backend/src/config/cronJobs.js` — `node-cron` schedules (attendance, notifications, payroll jobs)
- Firebase service account path, AWS S3, Render deploy scripts
- Authz rollout env flags (`AUTHZ_V2_*`, `VITE_AUTHZ_V2_*`)

---

## I — Generated

| Path | Action |
|------|--------|
| `frontend/dist/`, `node_modules/` | Gitignored — never commit |
| Local `frontend/dist` from build | Not tracked |

---

## J — Documentation

| Area | Action |
|------|--------|
| `docs/IMPLEMENTATION_PLANS/Payroll/**` | **KEEP** |
| `docs/IMPLEMENTATION_PLANS/GrowthTrack/**` | **KEEP** (on `feature/pip-v2`, not on this branch base) |
| `docs/CORE/`, `docs/WORKFLOW/` | **KEEP** |
| This `CodebaseCleanup/` folder | **UPDATE** during project |

---

## Mobile cleanup risk assessment

| Component | Risk | Policy |
|-----------|------|--------|
| `MobileAppShell.jsx`, `MobileAppLogin.jsx` | Critical | No removal |
| `components/mobileapp/*` (15 files) | Critical | No removal M1–M8 |
| `/mobileapp`, PWA `/app` in `routes/index.jsx` | Critical | No route changes |
| Mobile API via `api/axios.js` | High | Keep both HTTP layers |

**M9:** Verification only — no file deletions this cycle.

---

## Backend route inventory (Phase 5)

All mounts registered in `backend/src/server.js` including: users, authz, admin, clients, projects, leads, departments, leaves, attendance, payments, notifications, meetings, hiring, work-items, creative-workflow, worklogs, payroll/*, procurement/*, growth-tracks (on pip-v2 branch only — **not** on cleanup branch base), raw-data, assets, etc.

**Policy:** Endpoints without a frontend `api/*` caller are class **C** (website ingest, cron, mobile tabs, external).

---

## API cross-check (Phase 6)

| Metric | Value |
|--------|------:|
| Frontend API modules | 54 |
| Backend route files | 74 |

Full method-level matrix is **deferred** (high effort). Priority: do not delete backend routes without product sign-off.

---

## Summary counts

| Metric | Count |
|--------|------:|
| Files audited (approx.) | 1,663 |
| HIGH-confidence removals | 3 |
| MEDIUM orphan / duplicate candidates | ~22 |
| LOW / external / cron APIs | 200+ (retain) |

---

## Intentionally not removed

- Authorization V2 (`backend/src/authz/**`)
- Payroll engine services
- Creative workflow + slots
- Cron + Firebase + WebSocket
- All mobile/PWA shells
- Legacy route files until Authz migration project
