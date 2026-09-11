# Optimization Log

Each change requires a completed OPT packet (baseline → hypothesis → implementation → after measurement → regression → rollback).

| OPT ID | Title | Status | Branch commit |
|--------|-------|--------|---------------|
| — | Phase 0 baseline capture | In progress (UAT login measured; auth pages pending) | — |
| OPT-A1 | In-flight dedupe on `getAllUsers` | Implemented — pending re-measure | 12625be |
| OPT-A2 | Dashboard fetch consolidation | Implemented — pending re-measure | — |
| OPT-A3 | Self-host Inter fonts (300–800) | Implemented — pending re-measure | — |

---

### OPT-A1: In-flight dedupe on `getAllUsers`

**Baseline measurement**
- Date: 2026-09-11
- Environment: UAT + code review
- Page: HR/Admin dashboards (multiple parallel `getAllUsers` on mount)
- Metrics: Duplicate `/api/users` count pending authenticated DevTools capture

**Hypothesis**
Centralizing in-flight dedupe at `userApi.getAllUsers` collapses concurrent identical requests from dashboard widgets/modals into one HTTP call without changing freshness (no TTL).

**Implementation**
- [`frontend/src/api/userApi.js`](../../frontend/src/api/userApi.js) — wrap `baseCrudApi.getAll` with `apiOptimizer.deduplicate` keyed by sorted params.

**After measurement**
- Pending: DevTools network count on HR dashboard before/after deploy.

**Regression verification**
- Pending: smoke login + dashboard load + user list modals.

**Rollback consideration**
Revert `getAllUsers` export to `baseCrudApi.getAll` direct assignment.

---

### OPT-A2: Dashboard fetch consolidation

**Baseline measurement**
- Date: 2026-09-11
- Environment: Code review
- Page: Admin + HR dashboards
- Metrics: Duplicate `/api/users` on mount (active + excludePast + QuickStatsWidgets self-fetch)

**Hypothesis**
Batch `excludePast` user fetch in dashboard `Promise.all`, pass to `QuickStatsWidgets`, and reuse `activeUsersCache` for modal/chart handlers to eliminate redundant user list requests.

**Implementation**
- [`QuickStatsWidgets.jsx`](../../frontend/src/components/hr/QuickStatsWidgets.jsx) — optional `users` prop; uses `userApi` instead of raw `api.get`.
- [`AdminDashboard.jsx`](../../frontend/src/pages/dashboard/AdminDashboard.jsx) — shared caches + batched excludePast fetch.
- [`HRDashboard.jsx`](../../frontend/src/pages/dashboard/HRDashboard.jsx) — same pattern.

**After measurement**
- Pending: DevTools network count on dashboard mount.

**Regression verification**
- Pending: Quick stats cards, employee modals, chart segment clicks.

**Rollback consideration**
Remove cache state/props; restore QuickStatsWidgets self-fetch and handler re-fetches.

---

### OPT-A3: Self-host Inter fonts

**Baseline measurement**
- Date: 2026-09-11
- Environment: UAT login Lighthouse desktop
- Page: `/login`
- Metrics: Render-blocking Google Fonts CSS from `fonts.googleapis.com`; CLS 1.226

**Hypothesis**
Self-hosting Inter 300–800 via `@fontsource/inter` removes third-party font latency and render-blocking external CSS while preserving the same weight range.

**Implementation**
- [`frontend/src/main.jsx`](../../frontend/src/main.jsx) — import Inter weights 300–800.
- [`frontend/index.html`](../../frontend/index.html) — remove Google Fonts preconnect/stylesheet links.

**After measurement**
- Pending: Lighthouse login re-run + visual comparison screenshot.

**Regression verification**
- Pending: Login + dashboard typography check (weights 300–800).

**Rollback consideration**
Restore Google Fonts links in `index.html`; remove `@fontsource/inter` imports from `main.jsx`.

---

<!-- Template for new entries:

### OPT-001: [Title]

**Baseline measurement**
- Date:
- Environment:
- Page:
- Metrics:

**Hypothesis**

**Implementation**

**After measurement**

**Regression verification**

**Rollback consideration**

-->
