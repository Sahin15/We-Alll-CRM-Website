# Phase 0 — Performance Baseline

**Branch:** `feature/lighthouse-90-plus`  
**Date:** 2026-09-11  
**Build:** `frontend` production (`npm run build`) — Vite 5.4.21, app v5.2.9  
**Environment:** Local production build + UAT (`https://uat.wealll.cloud`)

## Lighthouse scores

| Source | Page | Perf | A11y | Best | SEO | Notes |
|--------|------|------|------|------|-----|-------|
| User-reported (pre-work) | Unknown | 48 | 79 | 100 | 66 | Starting baseline |
| Lab — UAT desktop (pre-a11y) | `/login` | 37 | 86 | 100 | 66 | `uat-login-desktop.report.json`, Lighthouse 12.8.2 headless |
| Lab — local desktop (post OPT-C1) | `/login` | — | **100** | — | — | `login-local-post-a11y.report.json` |
| Lab — local desktop (post OPT-D1) | `/login` | — | — | — | **69** | `login-local-post-seo.report.json` — blocked by `robots.txt` Disallow:/ |
| **Final — local desktop** | `/login` | **68** | **100** | **100** | **69** | `login-final-desktop.report.json` (2026-09-11) |
| **Final — local mobile** | `/login` | **39** | **100** | **100** | **69** | `login-final-mobile.report.json` (2026-09-11) |

See [`../verification-matrix.md`](../verification-matrix.md) for target vs measured summary.
| Lab — UAT mobile | `/login` | — | 86 | 100 | 66 | Performance null (NO_LCP in headless); see `uat-login.report.json` |
| Lab — local preview | `/login` | — | — | — | — | NO_FCP in headless (SPA + preview); not used as score baseline |

**Artifacts:** `uat-login.report.json`, `uat-login.report.html`, `uat-login-desktop`, `login-local-prod-build.report.json`

### Core Web Vitals — UAT `/login` (desktop lab, 2026-09-11)

| Metric | Value |
|--------|-------|
| FCP | 3.6 s |
| LCP | 3.8 s |
| TBT | 0 ms |
| CLS | 1.226 |
| Speed Index | 3.6 s |

### Core Web Vitals — authenticated pages (pending)

| Metric | Login | HR Dashboard | Admin Work Overview |
|--------|-------|--------------|---------------------|
| LCP | 3.8 s (UAT desktop login) | TBD | TBD |
| INP | TBD | TBD | TBD |
| CLS | 1.226 (UAT desktop login) | TBD | TBD |

## Initial load — entry assets (production build, gzip from Vite report)

| Asset | Raw (KB) | Gzip (KB) | Notes |
|-------|----------|-----------|-------|
| `index-CR4MaPY8.js` (main entry) | 269 | 37.5 | Includes eager Login route |
| `ui-gOipSYj4.js` (react-bootstrap + bootstrap) | 274 | 57.0 | Manual chunk |
| `react-vendor-BiPu7Yw3.js` | 216 | 54.4 | React + react-dom |
| `index-DvFhcTCu.css` | 88 | 15.1 | App global CSS |
| `ui-CJO9ZT_W.css` | 232 | 30.7 | Bootstrap CSS chunk |
| `index.html` | 8.4 | 2.9 | Includes Google Fonts link + inline boot script |
| `firebaseConfig-BORFXO8N.js` | 1.7 | 0.75 | Eager firebase config chunk |

**Total `dist/` uncompressed:** ~12.5 MB (includes all lazy route chunks; not all loaded on first paint)

## Largest lazy chunks (loaded on demand)

| Chunk | Raw (KB) | Gzip (KB) |
|-------|----------|-----------|
| pdf-export | 976 | 216 |
| recharts | 878 | 175 |
| xlsx | 847 | 190 |
| admin-tools | 614 | 102 |
| project-workspace | 550 | 83 |
| calendar-libs | 421 | 93 |
| charts (chart.js) | 397 | 91 |

## Network / nginx baseline (2026-09-11)

| Check | Result |
|-------|--------|
| UAT HTML gzip | Yes — `Content-Encoding: gzip` on `/login` |
| UAT JS gzip | **No** — `/assets/js/index--JzHa3km.js` returns raw 269288 bytes, no `Content-Encoding` |
| UAT static cache | `Cache-Control: public, immutable`, `max-age=31536000` on JS |
| nginx version (header) | nginx/1.18.0 (Ubuntu) |
| Duplicate `/api/users` on HR dashboard | **Pending** — requires authenticated DevTools capture |
| Total API requests on Admin dashboard mount | **Pending** |

**Hypothesis H-nginx:** JS/CSS assets may not be gzip-compressed on UAT despite HTML compression. Verify server `gzip_types` includes `application/javascript` and `text/css` before enabling in repo config.

## Profiling baseline (pending — manual)

- [ ] Chrome Performance trace: `/login` cold load (incognito)
- [ ] Chrome Performance trace: HR dashboard mount
- [ ] Chrome Performance trace: Admin Work Overview table scroll/sort (virtualization gate)

## Font reference (pending)

- [ ] Screenshot + computed styles for Inter weights 300–800 on Login and dashboard

## Measurement notes

- Run authenticated page audits in **Chrome incognito** with extensions disabled; clear site data / unregister SW before login baseline.
- Authenticated app keeps `noindex` — SEO target applies to `/login` and public routes only.
- Do not treat speculative Lighthouse gains as success; each optimization requires an OPT packet in [`../optimization-log.md`](../optimization-log.md).
