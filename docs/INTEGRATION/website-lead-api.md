# Website lead ingestion API (wealll.com → We Alll Office)

Marketing and landing-page forms on **wealll.com** submit leads to We Alll Office. Each form/campaign can set its own **`source`** (e.g. campaign or landing-page name). If omitted, the server defaults to `"Website"`.

## Endpoints

| Environment | URL |
|-------------|-----|
| Production | `https://wealll.cloud/api/leads/website` |
| UAT | `https://uat.wealll.cloud/api/leads/website` |
| Local (via Vite proxy) | `http://127.0.0.1:3000/api/leads/website` |

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Authentication:** None (browser submissions). Protected by **Origin allowlist** and **rate limiting**.

## Request body

| Field | Required | Description |
|-------|----------|-------------|
| `fullName` | Yes | Contact name |
| `phone` | Yes | String or number; normalized server-side (e.g. `+91 98765 43210` → 10-digit storage) |
| `source` | No | Campaign / channel label stored on the lead. Defaults to `"Website"` if omitted. Use a distinct value per campaign or landing page (e.g. `"Google Ads - Bridal"`, `"Facebook - Growth"`). Free text — not limited to CRM dropdown presets. |
| `email` | No | |
| `companyName` | No | |
| `service` | No | String or array of strings |
| `budget` | No | |
| `notes` | No | Free-text message |
| `reference` | No | Extra campaign / landing page detail (optional; can mirror or complement `source`) |
| `landingPage` | No | Alias for `reference` when `reference` is empty |
| `_hp` | No | Honeypot — must be empty |

## Responses

| Status | Meaning |
|--------|---------|
| **201** | New lead created (`status: "New"`, `source` from body or `"Website"`) |
| **200** | Duplicate phone or email — existing lead updated; resubmission appended to `notesHistory` |
| **400** | Validation error or honeypot filled |
| **403** | `Origin` / `Referer` not on allowlist |
| **429** | Rate limited (20 requests per 15 minutes per IP on this route) |

Duplicate submissions do **not** create a second lead row; sales sees one lead with an additional history note.

## Browser example (`fetch`)

```javascript
await fetch("https://wealll.cloud/api/leads/website", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "Jane Doe",
    phone: "+91 98765 43210",
    source: "Google Ads - Bridal",
    email: "jane@example.com",
    companyName: "Acme Pvt Ltd",
    service: ["Branding", "Website"],
    budget: "5–10 L",
    notes: "Interested in a discovery call",
    reference: "Bridal LP - March 2026",
    _hp: "",
  }),
});
```

Per-campaign example: set a different `source` on each landing page / ad campaign so CRM filters and reporting can separate them.

## cURL (server-side / debugging)

Browser ingest requires an allowed origin. For local debugging from a terminal, use UAT with a matching `Origin` header:

```bash
curl -X POST "https://uat.wealll.cloud/api/leads/website" \
  -H "Content-Type: application/json" \
  -H "Origin: https://wealll.com" \
  -d '{"fullName":"Jane Doe","phone":"9876543210","reference":"Test"}'
```

Requests **without** `Origin` or `Referer` receive **403** on this route.

## Allowed origins (backend)

Set on the API host (comma-separated):

```env
WEBSITE_LEAD_ALLOWED_ORIGINS=https://wealll.com,https://www.wealll.com,http://localhost
```

Default (if unset) matches the list above. Local dev may use `http://localhost:*` or `http://127.0.0.1:*`.

## CORS (browser preflight)

The global API CORS config must include wealll.com origins **and** the We Alll Office app:

```env
CORS_ORIGIN=https://wealll.cloud,https://wealll.com,https://www.wealll.com
```

On UAT, include `https://uat.wealll.cloud` instead of or in addition to production frontend URLs as needed.

## Deployment checklist (UAT → production)

1. Merge feature branch to `develop`, deploy to **UAT**.
2. Set `WEBSITE_LEAD_ALLOWED_ORIGINS` and `CORS_ORIGIN` on the UAT API service.
3. From browser devtools on `https://wealll.com` (or UAT marketing preview), POST a test lead; confirm **201** and lead appears in CRM with source **Website**.
4. Submit the same phone again; confirm **200** and `notesHistory` grows (not a second lead).
5. After UAT sign-off, merge to `main`, deploy production API, set the same env vars on production VPS/Render.
6. Smoke test production URL from an allowed origin.

## Related routes (unchanged)

- `POST /api/leads/public` — other public forms (e.g. Growth Summit); duplicate policy remains **reject with 400**.
- Authenticated `POST /api/leads` — internal CRM create.

## Implementation note — public route vs 401 (mount order)

### Symptom
`POST /api/leads/website` (and `/public`) without a JWT returned:

`401 { "message": "No token, authorization denied" }`

from `protect()` in `authMiddleware.js`, even though `leadRoutes.js` registers `/website` **before** `router.use(protect)`.

### Root cause
In `server.js`, several project routers are mounted at **`/api`** with `router.use(protect)`:

- `projectExpectationRoutes`
- `projectCommitmentRoutes`
- `projectMonthRoutes`
- `businessDocumentRoutes`
- `projectActivityRoutes`

Those mounts were registered **before** `app.use("/api/leads", leadRoutes)`. Express enters the first `/api` router for every `/api/*` request; blanket `protect` runs and returns 401 before `/api/leads` is reached. The lead router stack was correct; it never saw the request.

`auditMiddleware` only logs when `req.user` is set and does not authenticate.

### Fix
Mount `/api/leads` **before** the `/api` catch-all project routers in `server.js`. Do not remove `protect` from CRM lead routes. Public website protections (origin allowlist, rate limit, honeypot, validation) stay on `POST /website`.

### Regression
`backend/tests/websiteLeadPublicAccess.unit.test.js` covers wrong vs correct mount order, origin 403, validation, duplicates, and that protected lead routes still require JWT.
