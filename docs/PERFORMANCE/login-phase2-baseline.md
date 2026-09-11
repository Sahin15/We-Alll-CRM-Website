# Login Phase 2 — Pre-change Baseline (2026-09-11)

**Branch:** `feature/lighthouse-90-plus`  
**Environment:** Local prod preview (`npm run build` + `vite preview` @ `127.0.0.1:4173`)

## Lighthouse scores

| Run | Perf | CLS | FCP | LCP | TBT | JS | CSS | Scripts |
|-----|------|-----|-----|-----|-----|----|----|---------|
| Desktop | 69 | 1.82 | 1.12s | 1.32s | 0ms | 507 KB | 51 KB | 30 |
| Mobile | 38 | 1.30 | 5.73s | 6.40s | 0ms | 507 KB | 51 KB | 30 |
| Mobile Slow 4G | 0* | 1.34 | 5.74s | — | — | 507 KB | 51 KB | 30 |

*Slow 4G run hit Lighthouse `NO_LCP` LanternError; metrics from partial report.

**Artifacts:** `lighthouse-baseline/login-phase2-before-*.report.json`

## modulepreload (14 links)

1. react-vendor
2. react-router
3. icons
4. ui
5. axios
6. **hiring**
7. **employee-profile**
8. date-fns
9. **attendance-pages**
10. **charts**
11. **projects**
12. **reports**
13. **dashboard-superadmin**
14. **dashboard-admin**

## Render-blocking CSS (5)

- ui (Bootstrap)
- employee-profile
- attendance-pages
- dashboard-admin
- index
