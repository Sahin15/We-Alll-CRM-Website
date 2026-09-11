# Optimization Log

Each change requires a completed OPT packet (baseline → hypothesis → implementation → after measurement → regression → rollback).

| OPT ID | Title | Status | Branch commit |
|--------|-------|--------|---------------|
| — | Phase 0 baseline capture | In progress (UAT login measured; auth pages pending) | — |
| OPT-A1 | In-flight dedupe on `getAllUsers` | Implemented — pending re-measure | 12625be |
| OPT-A2 | Dashboard fetch consolidation | Implemented — pending re-measure | — |
| OPT-A3 | Self-host Inter fonts (300–800) | Implemented — pending re-measure | 771f619 |
| OPT-B1 | Lazy MainLayout + defer datepicker CSS | Implemented — pending re-measure | — |
| OPT-B2 | Defer SW registration + IndexedDB cleanup | Implemented — pending re-measure | — |
| OPT-B3 | nginx gzip for JS/CSS (UAT config) | Config added — pending VPS deploy verify | 473b4d2 |
| OPT-C1 | Login form labels + submit button + landmarks | Implemented — local a11y 100 | — |
| OPT-C2 | Navbar search + Sidebar nav semantics | Implemented — pending re-measure | — |
| OPT-C3 | DataTable / VirtualizedDataTable a11y | Implemented — pending re-measure | afd76f0 |
| OPT-D1 | Route document meta + login SEO | Implemented — SEO capped by robots.txt | c1265e7 |
| OPT-E1 | Table virtualization | **Skipped** — profiling gate not passed | — |
| OPT-F1 | Tier F login Lighthouse re-measure | Complete (local preview) | — |
| OPT-G1 | `app-core` manualChunk for auth/notification | Complete — entry no longer imports feature chunks | — |
| OPT-G2 | Split `authenticatedRoutes.jsx` from login entry | Complete — JS 507→214 KB on /login | — |
| OPT-G3 | Login boot shell + critical CSS (CLS) | Partial — CLS 1.82→1.27 desktop; target <0.1 not met | — |
| OPT-G4 | Defer dashboard CSS + Inter 300/500/700/800 | Complete — CSS 51→39 KB blocking | — |

---

### OPT-G1/G2: Login JS dependency boundary

**Baseline:** Desktop login 507 KB JS, 14 modulepreloads including charts/dashboard/attendance.  
**After:** 214 KB JS, 6 modulepreloads (react-vendor, react-router, axios, app-core, ui, icons).  
**See:** `docs/PERFORMANCE/login-phase2-results.md`

---

### OPT-G3/G4: CLS + login CSS critical path

**Baseline:** CLS 1.82 desktop, 5 render-blocking CSS files.  
**After:** CLS 1.27 desktop (0.79 mobile), 2 render-blocking CSS files.  
**Remaining:** Font FOUT + Bootstrap form cascade — next iteration.

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

### OPT-D1: Route document meta + login SEO

**Baseline measurement**
- Date: 2026-09-11
- Environment: UAT + local preview
- Page: `/login`
- Metrics: SEO 66 (UAT desktop); `is-crawlable` blocked by meta + `robots.txt`

**Hypothesis**
Per-route `document.title`, meta description, and login-only `index,follow` robots meta improve Lighthouse SEO audits without changing `robots.txt` or authenticated noindex policy.

**Implementation**
- [`documentMeta.js`](../../frontend/src/utils/documentMeta.js) — meta helpers + route title map.
- [`RouteDocumentMeta.jsx`](../../frontend/src/components/common/RouteDocumentMeta.jsx) — updates on navigation.
- [`App.jsx`](../../frontend/src/App.jsx) — mount `RouteDocumentMeta`.
- Removed duplicate `document.title` effect from `EnhancedAdminWorkOverview.jsx`.

**After measurement**
- Local desktop `/login` SEO: **69** (`login-local-post-seo.report.json`).
- Only remaining failure: `is-crawlable` — blocked by **`robots.txt` `Disallow: /`** (line 4), not meta tags.
- Authenticated routes still receive `noindex, nofollow, noarchive, nosnippet` at runtime.

**Regression verification**
- Pending: login title in browser tab; dashboard title updates on navigation; view-source on dashboard shows noindex after load.

**Rollback consideration**
Remove `RouteDocumentMeta` from `App.jsx`; delete `documentMeta.js` / `RouteDocumentMeta.jsx`.

**Policy note:** Login SEO ≥ 90 target requires product approval to add `Allow: /login` (and optional public paths) in `robots.txt`. Plan §0.4 forbids weakening robots policy without explicit approval.

---

### OPT-E1: Table virtualization (gate not passed)

**Baseline measurement**
- Date: 2026-09-11
- Environment: Not profiled
- Page: Admin Work Overview / `VirtualizedDataTable`
- Metrics: No Chrome Performance trace captured in Phase 0

**Decision:** **Do not implement.** Plan requires profiling proof of DOM/long-task bottleneck before virtualization.

---

### OPT-F1: Tier F verification — login re-measure

**After measurement (local prod preview, 2026-09-11)**

| Device | Perf | A11y | Best | SEO |
|--------|------|------|------|-----|
| Desktop | 68 | 100 | 100 | 69 |
| Mobile | 39 | 100 | 100 | 69 |

**Gaps vs target:** Performance (desktop 68, mobile 39); SEO blocked by `robots.txt`.  
**Artifacts:** [`verification-matrix.md`](verification-matrix.md), `login-final-*.report.json`

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
