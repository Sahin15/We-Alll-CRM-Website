# Deployment runbook — Production & UAT

## Overview

| Environment | URL | Git branch | Server path | PM2 process | Backend port | MongoDB db |
|-------------|-----|------------|-------------|-------------|--------------|------------|
| Production | https://wealll.cloud | `main` | `/var/www/crm-app` | `crm-api` | 5000 | `crm-database` |
| UAT | https://uat.wealll.cloud | `staging` | `/var/www/crm-uat` | `crm-uat-api` | 5001 | `crm-uat` |

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
**Script on VPS:** `bash deploy-uat.sh`

### First-time UAT VPS setup

1. **DNS:** Add `A` record `uat.wealll.cloud` → same VPS IP as production.

2. **Clone app:**
   ```bash
   sudo mkdir -p /var/www/crm-uat
   sudo chown $USER:$USER /var/www/crm-uat
   git clone https://github.com/Sahin15/We-Alll-CRM-Website.git /var/www/crm-uat
   cd /var/www/crm-uat
   git checkout staging
   ```

3. **Backend env:** Copy template and edit on server only:
   ```bash
   cp backend/.env.uat.example backend/.env
   # Set MONGO_URI .../crm-uat, unique JWT_SECRET, AWS keys, etc.
   ```

4. **MongoDB Atlas:** Create database `crm-uat` on the same cluster (different db name in URI).

5. **PM2:**
   ```bash
   cd /var/www/crm-uat/backend
   pm2 start src/server.js --name crm-uat-api
   pm2 save
   ```

6. **nginx:** Use [`deploy/nginx/uat.wealll.cloud.conf`](../deploy/nginx/uat.wealll.cloud.conf):
   ```bash
   sudo cp deploy/nginx/uat.wealll.cloud.conf /etc/nginx/sites-available/uat.wealll.cloud
   sudo ln -sf /etc/nginx/sites-available/uat.wealll.cloud /etc/nginx/sites-enabled/
   sudo certbot --nginx -d uat.wealll.cloud
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. **Build & seed:**
   ```bash
   cd /var/www/crm-uat/frontend && npm install && npm run build:uat
   cd /var/www/crm-uat/backend && npm run seed:uat
   ```

8. **GitHub secrets** (repo or `uat` environment): `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

### UAT safety flags

Set on server `backend/.env`:

- `APP_ENV=uat`
- `PAYROLL_V2_ENGINE=false`
- `PAYROLL_PERIOD_GATES=false`

The app also suppresses outbound email and FCM when `APP_ENV=uat`. Frontend shows an orange UAT banner when built with `npm run build:uat`.

### Refresh UAT seed data

```bash
cd /var/www/crm-uat/backend
npm run seed:uat
```

Demo users use `@demo.wealll.local` emails. Password documented in internal runbook only (see seed script output on server).

---

## CD — Production (manual approval)

**Trigger:** push to `main` (after GitHub Environment approval)  
**Workflow:** `.github/workflows/deploy-production.yml`  
**Script on VPS:** `bash deploy.sh`

### GitHub Environment `production`

- Add required reviewers under **Settings → Environments → production**
- Same SSH secrets as UAT

### Manual deploy (fallback)

```bash
ssh user@YOUR_VPS_IP
cd /var/www/crm-app
bash deploy.sh
```

---

## Branch sync after production hotfixes

When fixing directly on `main`:

```bash
git checkout develop && git merge origin/main && git push origin develop
git checkout staging && git merge origin/develop && git push origin staging
```

---

## Rollback

1. Identify last good commit/tag on the target branch.
2. On VPS, in the app directory:
   ```bash
   git fetch origin
   git checkout <commit-sha>
   bash deploy.sh    # or deploy-uat.sh for UAT
   ```
3. Fix forward on the branch and redeploy through normal CI/CD.

---

## Checklist after pipeline rollout

- [ ] CI green on a test PR to `develop`
- [ ] Branch protection enabled on `main` and `develop`
- [ ] GitHub Environments `uat` and `production` configured
- [ ] UAT DNS + SSL live
- [ ] `crm-uat-api` running on port 5001
- [ ] UAT seed script run once
- [ ] Production deploy tested with approval gate
