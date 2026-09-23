# We Alll Office — CRM / ERP

Enterprise CRM and ERP for **We Alll** and **Kolkata Digital**: clients, projects, work, HR, attendance, leave, payroll, procurement, billing, and role-based dashboards on the **MERN** stack (JavaScript only — React `.jsx`, backend `.js`).

| | |
|---|---|
| **App version** | `5.4.0` (frontend + backend `package.json`) |
| **Production** | [https://wealll.cloud](https://wealll.cloud) — branch `main` |
| **UAT** | [https://uat.wealll.cloud](https://uat.wealll.cloud) — branch `staging` |
| **Integration** | branch `develop` |

---

## Platform highlights

- **Multi-company** clients, projects, and billing (We Alll / Kolkata Digital)
- **Authorization v2** — page access, route guards, permission catalog (`docs/CORE/AUTHORIZATION_V2.md`)
- **Projects & work** — workspaces, slots, work items, assign work, My Work / Assigned Work
- **Creative workflow** — design/video pipeline, QA, revisions, **posting handoff** to Posting department (`docs/WORKFLOW/`)
- **HR** — attendance, leave, holidays, meetings, documents, hiring (modules vary by role)
- **Payroll** — simplified + Payroll v2 engine (feature-flagged; see `docs/IMPLEMENTATION_PLANS/Payroll/`)
- **Procurement, assets, licenses, support, CRM leads**, subscriptions, reports
- **PWA** — service worker + installable frontend (Vite PWA plugin)

For business context and roles, see [`docs/CORE/PROJECT_OVERVIEW.md`](docs/CORE/PROJECT_OVERVIEW.md).

---

## Tech stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 18, Vite 5, React Bootstrap 5, React Router 6, Axios, Context API, Chart.js, Firebase (push), `vite-plugin-pwa` |
| **Backend** | Node.js 20+, Express, MongoDB Atlas, Mongoose, JWT, bcrypt, Multer, AWS S3, Winston |
| **Ops** | GitHub Actions (CI/CD), Ubuntu VPS, Nginx, PM2 |

**Conventions:** ES modules everywhere; backend imports use `.js` extensions; UI uses Bootstrap (not Tailwind/MUI). See [`.cursor/rules/project.mdc`](.cursor/rules/project.mdc) and [`docs/CORE/CODING_STANDARDS.md`](docs/CORE/CODING_STANDARDS.md).

---

## Local development

### Prerequisites

- **Node.js** 20.19+ or 22.12+ (LTS recommended)
- **npm** 10+
- MongoDB (Atlas URI or local)
- AWS S3 credentials if testing uploads

### Backend

```bash
git clone https://github.com/Sahin15/We-Alll-CRM-Website.git
cd We-Alll-CRM-Website/backend
npm install
cp .env.example .env   # set MONGO_URI, JWT_SECRET, AWS_*, etc.
npm run dev            # http://127.0.0.1:5000 — API under /api
```

Useful scripts: `npm test`, `npm run authz:validate`, `npm run seed:departments`, `npm run create-superadmin`.

### Frontend

```bash
cd ../frontend
npm install
# Optional: .env with VITE_API_URL=http://127.0.0.1:5000/api
npm run dev            # http://127.0.0.1:3000 (see vite.config.js)
```

Build: `npm run build` (production), `npm run build:uat` (UAT mode).

### Health check

`GET http://127.0.0.1:5000/api/health`

Do not use default or shared credentials in production. Create admins via `npm run create-superadmin` in each environment.

---

## Repository layout

```
crm-website/
├── backend/src/          # Express app (models, controllers, routes, services)
├── backend/tests/        # Jest unit/integration tests
├── backend/scripts/      # Seeds, authz, ops helpers
├── frontend/src/         # React app (api/, pages/, components/, routes/)
├── docs/CORE/            # Architecture, deploy, authz, API standards
├── docs/WORKFLOW/        # Creative workflow specs
├── docs/IMPLEMENTATION_PLANS/
├── .github/workflows/    # CI + deploy-uat + deploy production
├── deploy.sh             # Production deploy on VPS
├── deploy-uat.sh         # UAT deploy on VPS
├── GIT-WORKFLOW.md       # Branch flow (summary)
└── README.md
```

---

## Git workflow & deployments

```
feature/fix → PR → develop → staging (UAT auto-deploy) → main (production + approval)
```

| Topic | Document |
|--------|-----------|
| Branches, hotfix sync | [`GIT-WORKFLOW.md`](GIT-WORKFLOW.md) |
| VPS paths, PM2, nginx, secrets | [`docs/CORE/DEPLOYMENT.md`](docs/CORE/DEPLOYMENT.md) |
| CI on PRs | `.github/workflows/ci.yml` — backend tests, `authz:validate`, frontend build |

**CI runs on PRs** to `develop` and `main`. **UAT** deploys on push to `staging`. **Production** deploys on push to `main` with GitHub Environment approval.

UAT uses database `crm-uat` and `npm run seed:uat` — never copy production Mongo data into UAT.

### Active remote feature branches (not on `main` yet)

As of repo maintenance in March 2026, these still carry unique work:

- `feature/pip-v2` — Growth Track (PIP v2)
- `feature/lighthouse-90-plus` — performance / Lighthouse
- `feature/hr-document-generator`
- `feature/premium-dark-mode`
- `feature/mobile-responsive-platform`

Merged feature branches are removed from GitHub after promotion to `main`; use `develop` / `staging` / `main` for current code.

---

## Testing & quality

```bash
# Backend (from backend/)
npm test
npm run authz:validate

# Frontend production build smoke check (from frontend/)
npm run build
npm run lint
```

---

## Documentation index

| Area | Path |
|------|------|
| Overview & architecture | `docs/CORE/PROJECT_OVERVIEW.md`, `PROJECT_ARCHITECTURE.md` |
| Deployment | `docs/CORE/DEPLOYMENT.md` |
| Authorization v2 | `docs/CORE/AUTHORIZATION_V2.md` |
| Creative / posting workflow | `docs/WORKFLOW/CREATIVE_WORKFLOW_SPECIFICATION.md`, `CREATIVE_POSTING_HANDOFF.md` |
| Payroll program | `docs/IMPLEMENTATION_PLANS/Payroll/README.md` |
| API patterns | `docs/CORE/API_STANDARDS.md` |
| Database | `docs/CORE/DATABASE_SCHEMA.md` |

---

## Security

- Secrets only in server `.env` — never commit credentials.
- JWT, CORS, and role/permission checks on sensitive routes.
- Filter sensitive employee fields in API responses.
- HTTPS on production and UAT via Nginx + Let’s Encrypt.

---

## Contributing

1. Branch from **`develop`**: `feature/short-name` or `fix/short-name`
2. Keep changes focused; match existing MVC / feature-folder patterns.
3. Open a PR to **`develop`**; ensure CI passes.
4. After UAT on **`staging`**, promote to **`main`** per [`GIT-WORKFLOW.md`](GIT-WORKFLOW.md).

---

## License & contact

Proprietary — We Alll / internal use. Contact maintainers via GitHub Issues on this repository.

**Maintainer:** [Sahin Mondal](https://github.com/Sahin15)

---

## Recent release notes (5.x)

### 5.4.0 (current)

- Creative workflow and **posting handoff** (assign Posting team member, My Work filters, edit modal)
- Graphic department canonical naming (`Graphic` / aliases)
- Work tab **Assign Work** aligned with slot history
- Authorization and payroll modules continued on `develop`/`main` per implementation plans
- UI fixes: My Work stat cards, work table status selector responsiveness

Older README content (v2.1.0, January 2024) referred to a previous documentation snapshot; use **`main`** and `docs/` for the source of truth.

*Last updated: March 2026*
