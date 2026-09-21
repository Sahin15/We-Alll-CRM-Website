# Deployment runbook — Production & UAT

## Overview

| Environment | URL | Git branch | Git / build path | Static / nginx | PM2 process | Backend port | MongoDB db |
|-------------|-----|------------|------------------|----------------|-------------|--------------|------------|
| Production | https://wealll.cloud | `main` | `/root/crm-website` (`deploy.sh`) | Built into app tree; nginx serves site | `wealll-office-backend` | `5000` (or `PORT` in `.env`) | production DB name in `MONGO_URI` |
| UAT | https://uat.wealll.cloud | `staging` | `/root/crm-website-uat` | `/var/www/crm-uat/frontend/dist` | `crm-uat-api` | `5001` | `crm-uat` |

> **Source of truth:** GitHub Actions + `deploy.sh` / `deploy-uat.sh`. Older docs that referenced `/var/www/crm-app` or PM2 `crm-api` are obsolete.

UAT uses **seeded dummy data only** — never mirror production MongoDB into UAT.

---

## CI (every PR)

GitHub Actions workflow `.github/workflows/ci.yml` runs on PRs to `develop` and `main`:

1. Backend unit tests (`npm test`)
2. Authz catalog validation (`npm run authz:validate`)
3. Frontend production build (`npm run build`)

Enable branch protection per [`.github/BRANCH_PROTECTION.md`](../.github/BRANCH_PROTECTION.md).

---

## CD — UAT (automatic)

**Trigger:** push to `staging`  
**Workflow:** `.github/workflows/deploy-uat.yml`  
**Script on VPS:** `bash deploy-uat.sh` (Actions sets `SKIP_GIT_SYNC=1` after resetting to `origin/staging`)

### First-time UAT VPS setup

1. **DNS:** Add `A` record `uat.wealll.cloud` → same VPS IP as production.

2. **Clone app:**
   ```bash
   git clone https://github.com/Sahin15/We-Alll-CRM-Website.git /root/crm-website-uat
   cd /root/crm-website-uat
   git checkout staging
   mkdir -p /var/www/crm-uat/frontend/dist
   ```

3. **Backend env:** Copy template and edit on server only:
   ```bash
   cp backend/.env.uat.example backend/.env
   # Set MONGO_URI .../crm-uat, unique JWT_SECRET, AWS keys, CORS_ORIGIN, WEBSITE_LEAD_ALLOWED_ORIGINS
   ```

4. **MongoDB Atlas:** Create database `crm-uat` on the same cluster (different db name in URI).

5. **PM2:**
   ```bash
   cd /root/crm-website-uat/backend
   pm2 start src/server.js --name crm-uat-api
   pm2 save
   ```

6. **nginx:** Use [`deploy/nginx/uat.wealll.cloud.conf`](../deploy/nginx/uat.wealll.cloud.conf):
   ```bash
   sudo cp deploy/nginx/uat.wealll.cloud.conf /etc/nginx/sites-enabled/crm-uat
   sudo certbot --nginx -d uat.wealll.cloud
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. **Build & seed:**
   ```bash
   cd /root/crm-website-uat
   bash deploy-uat.sh
   cd backend && npm run seed:uat
   ```

8. **GitHub secrets** (repo or `uat` environment): `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

### UAT safety flags

- `APP_ENV=uat`
- `PAYROLL_V2_ENGINE=false`
- `PAYROLL_PERIOD_GATES=false`
- `CORS_ORIGIN=https://uat.wealll.cloud,https://wealll.com,https://www.wealll.com`
- `WEBSITE_LEAD_ALLOWED_ORIGINS=https://wealll.com,https://www.wealll.com,http://localhost`

Frontend: `npm run build:uat` uses `frontend/.env.uat` → `VITE_API_URL=https://uat.wealll.cloud/api`.

---

## CD — Production (manual approval)

**Trigger:** push to `main` (GitHub Environment `production` approval)  
**Workflow:** `.github/workflows/deploy-production.yml`  
**On VPS:** `cd /root/crm-website && bash deploy.sh`

`deploy.sh` does: discard lockfile drift → `git pull origin main` → backend `npm install --production` → frontend clean install + `npm run build` → warn if website-lead env missing → `pm2 restart wealll-office-backend` → reload nginx.

### Production env (server-only — never commit)

Copy from `backend/.env.production.example`. Required for website leads:

```env
APP_ENV=production
NODE_ENV=production
CORS_ORIGIN=https://wealll.cloud,https://wealll.com,https://www.wealll.com
WEBSITE_LEAD_ALLOWED_ORIGINS=https://wealll.com,https://www.wealll.com
```

**Do not** put `localhost` in production `WEBSITE_LEAD_ALLOWED_ORIGINS`. The API **refuses to start** in production if that variable is missing or contains localhost.

Frontend production build (`npm run build`) uses `frontend/.env.production` → `VITE_API_URL=https://wealll.cloud/api`.

### GitHub Environment `production`

- Required reviewers under **Settings → Environments → production**
- Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

### Manual deploy (fallback)

```bash
ssh user@YOUR_VPS_IP
cd /root/crm-website
bash deploy.sh
```

---

## Branch flow

```
feature/* → develop → staging → UAT → main → production
```

After production hotfixes on `main`, sync downstream:

```bash
git checkout develop && git merge origin/main && git push origin develop
git checkout staging && git merge origin/develop && git push origin staging
```

---

## Rollback (production)

1. Note previous good SHA (GitHub Actions deploy log or `git log origin/main` before merge).
2. On VPS:
   ```bash
   cd /root/crm-website
   git fetch origin
   git checkout <previous-sha>
   bash deploy.sh
   ```
3. Or revert the merge commit on `main` and push (triggers deploy with approval).
4. **Database:** Website lead ingest needs **no migration**; rollback is code-only. Do not restore Mongo from backup unless data corruption occurred.

UAT rollback: same idea with `/root/crm-website-uat` and `bash deploy-uat.sh` on `staging` SHA.

---

## Production smoke test (website lead)

After deploy + PM2 online:

1. `POST https://wealll.cloud/api/leads/website` + `Origin: https://wealll.com`, no JWT → **201**
2. Same phone again → **200** `duplicate: true`
3. Bad Origin → **403**
4. `GET` or `POST https://wealll.cloud/api/leads/` without JWT → **401**
5. Optional: browser submit from wealll.com → lead in CRM Leads list
6. `pm2 logs wealll-office-backend --lines 50`

---

## Database / migrations

**NO DATABASE MIGRATION REQUIRED** for the staging release tip that includes website lead ingest and creative workflow (Mongoose creates collections/indexes as needed). Do not run destructive seed scripts against production.

---

## Checklist after pipeline rollout

- [ ] CI green on PRs to `develop` / `main`
- [ ] Branch protection enabled
- [ ] GitHub Environments `uat` and `production` configured
- [ ] UAT DNS + SSL live; `crm-uat-api` on 5001
- [ ] Production `.env` has website-lead allowlist (no localhost)
- [ ] Production smoke tests pass
- [ ] Rollback SHA recorded before merge
