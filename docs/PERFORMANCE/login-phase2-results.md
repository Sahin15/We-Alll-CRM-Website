# Login Phase 2 — Results

**Branch:** `feature/lighthouse-90-plus`  
**Environment:** Local prod preview (`vite preview` @ `127.0.0.1:4173`)  
**Date:** 2026-09-11

---

## Before

| Run | Performance | CLS | FCP | LCP | TBT | JS | CSS | Scripts |
|-----|-------------|-----|-----|-----|-----|----|----|---------|
| Desktop | 69 | 1.82 | 1.12s | 1.32s | 0ms | 507 KB | 51 KB | 30 |
| Mobile | 38 | 1.30 | 5.73s | 6.40s | 0ms | 507 KB | 51 KB | 30 |
| Mobile Slow 4G | — | 1.34 | 5.74s | — | — | 507 KB | 51 KB | 30 |

**modulepreload (14):** react-vendor, react-router, icons, ui, axios, **hiring**, **employee-profile**, date-fns, **attendance-pages**, **charts**, **projects**, **reports**, **dashboard-superadmin**, **dashboard-admin**

**Render-blocking CSS (5):** ui, employee-profile, attendance-pages, dashboard-admin, index

---

## After

| Run | Performance | CLS | FCP | LCP | TBT | JS | CSS | Scripts |
|-----|-------------|-----|-----|-----|-----|----|----|---------|
| Desktop | **74** | **1.27** | **0.72s** | **0.86s** | 0ms | **214 KB** | **39 KB** | **14** |
| Mobile | **57** | **0.79** | **3.17s** | **3.94s** | 77ms | **214 KB** | **39 KB** | **14** |
| Mobile Slow 4G | **57** | **0.93** | **3.18s** | **3.94s** | 44ms | **214 KB** | **39 KB** | **14** |

**modulepreload (6):** react-vendor, react-router, axios, **app-core**, ui, icons

**Render-blocking CSS (2):** ui (Bootstrap), index

**Artifacts:** `lighthouse-baseline/login-phase2-after-*.report.json`

---

## Dependency Graph — Removed from login initial graph

| Removed from login preload | Fix |
|----------------------------|-----|
| charts (~89 KB) | Route table split — `lazyPages` moved to `authenticatedRoutes.jsx` |
| dashboard-admin (~38 KB) | `app-core` manualChunk for NotificationContext |
| dashboard-superadmin (~38 KB) | Route table split |
| employee-profile (~37 KB) | `app-core` manualChunk for AuthContext |
| attendance-pages (~40 KB) | Route table split (no `__vitePreload` in entry) |
| hiring (~25 KB) | Route table split |
| projects (~32 KB) | Route table split |
| reports (~5 KB) | Route table split |
| date-fns (side-effect) | Route table split |
| Route CSS (employee-profile, attendance, dashboard-admin) | Entry no longer imports feature chunks |

**Login now loads:** react, react-router, axios, app-core (auth + notification providers), ui (Bootstrap), icons, login pages, index CSS (responsive + toast + a11y only).

**Deferred until authenticated navigation:** `authenticatedRoutes.jsx` chunk (~all app routes), MainLayout, dashboard CSS, extended Inter weights (300/500/700/800).

---

## Functional Verification

| Workflow | Status |
|----------|--------|
| Production build (`npm run build`) | Pass |
| `/login` serves 200 on preview | Pass |
| modulepreload contains no dashboard/chart/attendance chunks | Pass |
| Public routes preserved in slim `routes/index.jsx` | Pass |
| Protected routes in lazy `authenticatedRoutes.jsx` | Pass |
| Auth API / AuthContext logic unchanged | Pass |
| ProtectedRoute / PermissionRoute unchanged | Pass |
| PWA `/app`, `/mobileapp` routes preserved | Pass |
| `/register`, `/growth-summit-2026` preserved | Pass |

*Full login/logout/dashboard smoke requires running backend — manual verification recommended before UAT deploy.*

---

## Visual Verification

| Area | Status |
|------|--------|
| Login gradient (brand 3-stop) | Preserved |
| Login card layout (380px, logo, form) | Preserved — boot shell matches geometry |
| slideUp entrance removed (containerGlow only) | Minor change — no vertical slide on first paint |
| Authenticated app shell background | Moved to `.app-shell` on MainLayout |
| Dashboard typography weights | Loaded after MainLayout mount via `loadExtendedInterFonts()` |

---

## Success Criteria vs Measured

| Criterion | Target | Result |
|-----------|--------|--------|
| CLS | < 0.1 | **Not met** — desktop 1.27, mobile 0.79 (improved ~30–40%) |
| No unrelated JS preload | Yes | **Met** — 14 → 6 preloads, no feature chunks |
| Login JS reduced | Significant | **Met** — 507 → 214 KB (−58%) |
| Login CSS reduced | Significant | **Met** — 51 → 39 KB, 5 → 2 blocking sheets |
| Mobile Slow 4G improved | Substantial | **Met** — perf null/38 → 57, FCP 5.7s → 3.2s |
| No functional/auth changes | Yes | **Met** |
| No route/workflow changes | Yes | **Met** |

---

## Remaining Bottlenecks (next iteration)

1. **CLS still high (1.27 desktop)** — Many small shifts (~0.03 each), likely Inter font FOUT on form labels/headings and Bootstrap control re-style. Next: `font-display: optional` with size-adjust, subset Bootstrap for auth-only imports, or inline form control styles in critical CSS.

2. **Desktop Performance 74 (not 90+)** — CLS metric score still ~0; fixing CLS to < 0.1 would unlock large perf gain. FCP/LCP already strong (0.72s / 0.86s).

3. **Mobile Performance 57** — Improved but limited by remaining CLS (0.79) and Bootstrap + app-core JS parse on Slow 4G.

4. **Local redirect audit (~950ms)** — vite preview HTTP artifact; verify on UAT HTTPS.

5. **UAT gzip on JS assets** — Not measured this phase (local preview only).

---

## Files Changed

- `frontend/vite.config.js` — `app-core` manualChunk
- `frontend/src/routes/index.jsx` — slim public routes
- `frontend/src/routes/authenticatedRoutes.jsx` — **new** protected route table
- `frontend/index.html` — boot shell + critical login CSS
- `frontend/src/pages/auth/Login.jsx` — logo eager, no slideUp, deferred sparkles
- `frontend/src/index.css` — scoped body background, removed dashboard @imports
- `frontend/src/components/layout/MainLayout.jsx` — dashboard CSS + extended fonts
- `frontend/src/main.jsx` — Inter 400/600 only
- `frontend/src/utils/loadExtendedFonts.js` — **new**
