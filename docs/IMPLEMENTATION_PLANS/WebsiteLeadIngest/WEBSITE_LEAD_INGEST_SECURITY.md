# Website lead ingest — security & middleware architecture

## 1. Endpoint purpose

`POST /api/leads/website` accepts marketing-form leads from **wealll.com** into We Alll Office CRM. It is a **public** browser endpoint (no JWT). Abuse controls are Origin allowlist, rate limit, honeypot, and validation — not authentication.

## 2. Public vs protected routes

| Route | Auth |
|-------|------|
| `POST /api/leads/public` | Public (Growth Summit / legacy forms) |
| `POST /api/leads/website` | Public (wealll.com ingest) |
| `POST /api/leads/`, `GET /api/leads/`, `GET|PUT|DELETE /api/leads/:id`, meetings, follow-ups, contacts, etc. | **JWT `protect` + Authz V2 / legacy gates** |

## 3. Middleware order (correct / post-fix)

```
REQUEST
  ↓ helmet
  ↓ cors (CORS_ORIGIN)
  ↓ express.json
  ↓ sanitizeInput          — no auth
  ↓ s3ProxyMiddleware      — path-specific; otherwise next()
  ↓ auditMiddleware        — logs only if req.user already set; no 401
  ↓ X-Robots-Tag / cache headers
  ↓ app.use("/api/leads", apiLimiter, leadRoutes)   ← BEFORE /api catch-alls
        ↓ apiLimiter (noop next)
        ↓ leadRoutes
              ↓ POST /public → createLead
              ↓ POST /website
                    ↓ websiteLeadOriginCheck   (403 if Origin not allowlisted)
                    ↓ websiteLeadRateLimit     (429)
                    ↓ createWebsiteLead
              ↓ router.use(protect)            ← CRM routes only after this
              ↓ router.use(attachDepartmentForAuthz)
              ↓ protected CRM lead routes + Authz V2
  ↓ app.use("/api", projectExpectationRoutes)  ← router.use(protect) inside
  ↓ … other /api catch-alls and specific mounts
```

## 4. Authentication boundary

- **Public lead ingest** must be mounted so no earlier `app.use("/api", …)` router with `router.use(protect)` can run first.
- **CRM lead routes** remain behind `router.use(protect, attachDepartmentForAuthz)` inside `leadRoutes.js`.

## 5. Origin validation (`WEBSITE_LEAD_ALLOWED_ORIGINS`)

Separate from CORS. Checked in `websiteLeadOriginCheck`. Missing / disallowed Origin or Referer → **403**.

## 6. Rate limiting

`websiteLeadRateLimit`: 20 requests / 15 minutes / IP on `POST /website` only.

## 7. Validation

Required: `fullName`, `phone` (normalized). Optional: `source` (default `"Website"`), email, company, service, budget, notes, reference/landingPage. Honeypot `_hp` must be empty → else **400**.

## 8. Duplicate handling

Same phone (or email if provided): **200** + append `notesHistory` (not a second lead). New lead: **201**.

## 9. Audit behavior

Global `auditMiddleware` does not authenticate. It only appends audit log when `req.user` is already present. Public website leads are typically unauthenticated → no user audit entry from this middleware.

## 10–12. Environment configuration (names only; no secrets)

| Env | `CORS_ORIGIN` (concept) | `WEBSITE_LEAD_ALLOWED_ORIGINS` |
|-----|-------------------------|--------------------------------|
| Local | CRM local origins + marketing if testing | `https://wealll.com,https://www.wealll.com,http://localhost` |
| UAT | `https://uat.wealll.cloud` + wealll.com | wealll.com + optional localhost for tooling |
| Production | `https://wealll.cloud` + wealll.com | `https://wealll.com,https://www.wealll.com` (no localhost) |

See `backend/.env.example`, `.env.uat.example`, `.env.production.example`.

## 13. Testing commands

```bash
cd backend
npm test -- tests/websiteLeadPublicAccess.unit.test.js tests/websiteLeadIngest.unit.test.js
```

## 14. Deployment

1. Merge fix to `develop` → `staging` (UAT auto-deploy) → smoke test.
2. Set/confirm env vars on UAT API, `pm2 restart crm-uat-api`.
3. After UAT sign-off → `main` + production env + `pm2 restart crm-api`.
4. **No nginx change required** for this fix. **No Mongo migration.**

## 15. Security considerations

- Public ≠ open: Origin allowlist + rate limit + honeypot.
- Do not skip JWT globally when Authorization header is missing.
- Do not mount routers with `router.use(protect)` at bare `/api` **before** public mounts under `/api/...`.
- Authz V2 on CRM lead routes unchanged.

## 16. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `401 No token, authorization denied` on POST /website | `/api` catch-all with `protect` mounted before `/api/leads` (or stale PM2 process without fix) |
| `403 Origin not allowed` | Missing/wrong Origin; fix `WEBSITE_LEAD_ALLOWED_ORIGINS` |
| Browser CORS error | Fix `CORS_ORIGIN` (separate from website Origin check) |
| `429` | Rate limit; wait or adjust IP only for that route |

### Historical root cause (proven)

`projectExpectationRoutes` (and sibling project routers) use `router.use(protect)` and were mounted at `app.use("/api", …)` **before** `app.use("/api/leads", …)`. Express entered those routers for every `/api/*` request; `protect()` returned 401 before `leadRoutes` ran. `leadRoutes.js` order was already correct.

**Fix:** Mount `/api/leads` before those `/api` catch-alls in `server.js`.
