# Git workflow — We Alll CRM

Production (`wealll.cloud`) deploys from **`main`** with GitHub Actions approval.  
UAT (`uat.wealll.cloud`) auto-deploys from **`staging`**.

Full deploy runbook: [`docs/CORE/DEPLOYMENT.md`](docs/CORE/DEPLOYMENT.md)

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only |
| `develop` | Integration branch for features |
| `staging` | Pre-production / client UAT (deploys to uat.wealll.cloud) |
| `feature/*` | Feature work |
| `fix/*` | Bug fixes |

## Flow

```
feature/fix → PR → develop → staging → (client UAT) → PR → main → production
```

1. Open PRs into `develop`. **CI must pass** (backend tests, authz validate, frontend build).
2. Merge tested work `develop` → `staging`. Push triggers **automatic UAT deploy**.
3. After client sign-off, merge `staging` → `main`. Push triggers **production deploy** (requires GitHub Environment approval).

## After a production hotfix on `main`

Sync downstream so UAT and develop stay current:

```bash
git checkout develop && git pull && git merge origin/main && git push origin develop
git checkout staging && git pull && git merge origin/develop && git push origin staging
```

## New feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
# ... work, commit ...
git push -u origin feature/your-feature-name
```

Open a Pull Request on GitHub → target **`develop`**.

## Production bugfix

```bash
git checkout main
git pull origin main
git checkout -b fix/short-description
# ... fix, commit ...
git push -u origin fix/short-description
```

Merge to `main` → approve production deploy → back-merge to `develop` and `staging` as above.

## Deploy (automated)

| Target | Trigger |
|--------|---------|
| UAT | Push to `staging` |
| Production | Push to `main` + approver in GitHub Environment `production` |

Manual fallback on VPS:

```bash
# Production
cd /var/www/crm-app && bash deploy.sh

# UAT
cd /var/www/crm-uat && bash deploy-uat.sh
```

## UAT data

UAT uses an isolated MongoDB database (`crm-uat`) and **`npm run seed:uat`** dummy data.  
**Do not** copy production database into UAT.

## Rules

1. Do **not** push half-done features to `main`.
2. Do **not** edit code only on the server — merge via GitHub first.
3. Keep `backend/.env` only on the server (never commit secrets).
4. After frontend changes, the server must run `npm run build` (`deploy.sh` / `deploy-uat.sh` do this).
5. Enable branch protection per [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md).
