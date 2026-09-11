# Tier F — Verification Matrix (2026-09-11)

**Branch:** `feature/lighthouse-90-plus`  
**Build:** `npm run build` + `vite preview` @ `127.0.0.1:4173`  
**Lighthouse:** 12.8.2 headless  
**Note:** UAT not redeployed during this branch — local prod preview only for final login pass. Authenticated pages require UAT credentials (pending manual capture).

## Login `/login` — final local lab scores

| Device | Perf | A11y | Best | SEO | FCP | LCP | TBT | CLS | SI |
|--------|------|------|------|-----|-----|-----|-----|-----|-----|
| Desktop (pre-work UAT) | 37 | 86 | 100 | 66 | 3.6s | 3.8s | 0ms | 1.226 | 3.6s |
| Desktop (final local) | **68** | **100** | **100** | **69** | 1.2s | 1.3s | 0ms | 2.194 | 1.2s |
| Mobile (final local) | **39** | **100** | **100** | **69** | 5.7s | 6.4s | 0ms | 0.787 | 5.7s |

**Artifacts:** `lighthouse-baseline/login-final-desktop`, `lighthouse-baseline/login-final-mobile`

### Target vs measured (login)

| Category | Target | Desktop final | Mobile final | Status |
|----------|--------|---------------|--------------|--------|
| Performance | ≥ 90 | 68 | 39 | **Gap** — CLS + mobile LCP; see remaining audits |
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
