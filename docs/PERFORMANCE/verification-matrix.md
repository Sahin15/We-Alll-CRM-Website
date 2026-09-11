# Tier F — Verification Matrix (2026-09-11)

**Branch:** `feature/lighthouse-90-plus`  
**Build:** `npm run build` + `vite preview` @ `127.0.0.1:4173`  
**Lighthouse:** 12.8.2 headless  
**Note:** UAT not redeployed during this branch — local prod preview only for final login pass. Authenticated pages require UAT credentials (pending manual capture).

## Login `/login` — Phase 2 local lab scores (2026-09-11)

| Device | Perf | JS | CSS | FCP | LCP | TBT | CLS |
|--------|------|----|----|-----|-----|-----|-----|
| Desktop (phase2 before) | 69 | 507 KB | 51 KB | 1.12s | 1.32s | 0ms | 1.82 |
| Desktop (phase2 after) | **74** | **214 KB** | **39 KB** | **0.72s** | **0.86s** | 0ms | **1.27** |
| Mobile (phase2 before) | 38 | 507 KB | 51 KB | 5.73s | 6.40s | 0ms | 1.30 |
| Mobile (phase2 after) | **57** | **214 KB** | **39 KB** | **3.17s** | **3.94s** | 77ms | **0.79** |
| Mobile Slow 4G (after) | **57** | **214 KB** | **39 KB** | **3.18s** | **3.94s** | 44ms | **0.93** |

**Artifacts:** `lighthouse-baseline/login-phase2-before-*`, `login-phase2-after-*`  
**Full report:** `docs/PERFORMANCE/login-phase2-results.md`

### Target vs measured (login)

| Category | Target | Desktop final | Mobile final | Status |
|----------|--------|---------------|--------------|--------|
| Performance | ≥ 90 | 74 | 57 | **Gap** — CLS still high; JS preload fixed |
| Accessibility | ≥ 90 | 100 | 100 | **Met** |
| Best Practices | ≥ 90 | 100 | 100 | **Met** |
| SEO | ≥ 90 | 69 | 69 | **Blocked** — `robots.txt` `Disallow:/` (`is-crawlable`); policy §0.4 |

### Remaining login performance audits (desktop, score 0)

- `cumulative-layout-shift` / `layout-shifts` / `cls-culprits-insight` — high CLS in lab (investigate loader → React mount, font swap)
- `render-blocking-resources` / `render-blocking-insight` — Bootstrap + app CSS on critical path
- `unused-javascript` / `unminified-javascript` — lab opportunities (Vite already minifies; coverage-driven)

## Authenticated pages (pending UAT deploy + manual)

| Page | Perf | A11y | Notes |
|------|------|------|-------|
| HR Dashboard | TBD | TBD | Requires auth session on UAT after deploy |
| Admin Work Overview | TBD | TBD | Tier E profiling gate — no Chrome trace captured yet |
| Employee My Work | TBD | TBD | Mobile Slow 4G matrix |

## Tier E — Virtualization gate

| Gate | Status |
|------|--------|
| Chrome Performance trace on Admin Work Overview scroll/sort | **Not captured** |
| DOM/long-task bottleneck proven | **Not proven** |
| Implement table virtualization | **Skipped** (conditional per plan) |

## Bundle delta (main entry)

| Snapshot | Raw | Gzip |
|----------|-----|------|
| Phase 0 baseline | 269 KB | 37.5 KB |
| After Tier B (lazy MainLayout) | 183 KB | 23.4 KB |
| After Tier D (document meta) | 186 KB | 24.7 KB |

## Policy confirmations

- [x] Authenticated routes set `noindex` at runtime via `RouteDocumentMeta`
- [x] `robots.txt` unchanged (`Disallow: /`)
- [x] No TTL cache on business-critical API data
- [x] In-flight dedupe on `getAllUsers` only (OPT-A1)

## Recommended follow-ups (outside this branch scope unless approved)

1. **CLS:** Measure loader removal in `index.html` vs React mount (OPT packet required)
2. **SEO 90:** Product approval for `Allow: /login` in `robots.txt` only
3. **UAT deploy:** Re-run full matrix on `uat.wealll.cloud` + nginx gzip verify on JS assets
4. **Tier E:** Capture Performance profile on Admin Work Overview before any virtualization work
