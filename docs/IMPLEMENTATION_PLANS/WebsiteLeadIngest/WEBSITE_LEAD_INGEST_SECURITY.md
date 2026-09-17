# Website lead ingest — security & middleware architecture

## 1. Endpoint purpose

`POST /api/leads/website` accepts marketing-form leads from **wealll.com** into We Alll Office CRM. It is a **public** browser endpoint (no JWT). Abuse controls: Origin allowlist, rate limit, honeypot, validation.

## 2. Public vs protected routes

| Route | Auth |
|-------|------|
| `POST /api/leads/public` | Public |
| `POST /api/leads/website` | Public |
| All other `/api/leads/*` CRM ops | JWT `protect` + Authz V2 / legacy |

## 3. Middleware order

```
REQUEST
  → helmet / cors / json / sanitize / s3Proxy / audit
  → app.use("/api/leads", …)   # BEFORE /api catch-alls that use router.use(protect)
        → POST /website → origin check → rate limit → createWebsiteLead
        → router.use(protect) → CRM routes
  → app.use("/api", project*Routes)  # protect inside; must not precede /api/leads
```

## 4–9. Security layers

- **Origin:** `WEBSITE_LEAD_ALLOWED_ORIGINS` (not CORS alone)
- **Rate limit:** 20 / 15 min / IP; `trust proxy` = 1
- **Validation:** fullName, phone (normalized); optional source/email/etc.; `_hp` honeypot
- **Duplicates:** update existing lead + `notesHistory`; HTTP 200 `duplicate: true`
- **Audit:** global audit middleware only logs when `req.user` is set
- **Production startup:** `validateWebsiteLeadProductionConfig()` — refuse start if allowlist missing or contains localhost when `isProduction()`

## 10–12. Environment contract

| Env | `CORS_ORIGIN` | `WEBSITE_LEAD_ALLOWED_ORIGINS` |
|-----|---------------|--------------------------------|
| Local | CRM local + optional wealll.com | defaults OK (includes localhost) |
| UAT | `https://uat.wealll.cloud` + wealll.com | wealll.com + optional localhost |
| Production | `https://wealll.cloud` + wealll.com | **`https://wealll.com,https://www.wealll.com` only** |

See `backend/.env.*.example` and [`docs/CORE/DEPLOYMENT.md`](../../CORE/DEPLOYMENT.md).

## 13. Tests

```bash
cd backend
npm test -- tests/websiteLeadPublicAccess.unit.test.js tests/websiteLeadIngest.unit.test.js
```

## 14. Deployment

`feature → develop → staging → UAT → main → production`  
Prod: `/root/crm-website`, PM2 `wealll-office-backend`, `deploy.sh`.  
**NO DATABASE MIGRATION REQUIRED.**

## 15. CORS note (follow-up)

Global CORS currently allows rejected origins through for mobile compatibility. Website lead still enforces Origin via `websiteLeadOriginCheck` (403). Tightening global CORS is a **separate** security task — do not conflate with lead ingest.

## 16. Troubleshooting / smoke / rollback

See [`docs/CORE/DEPLOYMENT.md`](../../CORE/DEPLOYMENT.md) for production smoke tests and rollback.

### Historical 401 root cause

`/api` catch-all routers with `router.use(protect)` were mounted before `/api/leads`. Fixed by remounting leads first (`707d6ff`).
