# Git workflow — We Alll CRM

Production (`wealll.cloud`) deploys **only** from `main`. The server should match the latest commit you intentionally deployed.

## Branches (after cleanup)

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only (matches last VPS deploy) |
| `feature/hiring-management` | Hiring system + offer letters (WIP, not on main) |
| `feature/hr-document-generator` | HR document PDF generation on employee profiles (WIP) |
| `feature/mobile-responsive-platform` | Full mobile-first responsive platform (WIP, separate from hiring) |
| `fix/profile-api-refresh-on-load` | Refresh `/users/me` on app load for profile pictures (ready to merge when you deploy) |
| `backup/main-before-cleanup` | Snapshot of `main` before cleanup (2025) |

**Note:** Hiring and HR documents were developed in overlapping commits (`31dfc0d`, `11b6798`). Both feature branches currently point to `11b6798`. Finish hiring first, merge to `main`, deploy, then finish HR docs (or merge both in one PR when both are ready).

## Daily workflow

### New feature

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
# ... work, commit ...
git push -u origin feature/your-feature-name
```

Open a Pull Request on GitHub → merge to `main` only when tested.

### Production bugfix

```bash
git checkout main
git pull origin main
git checkout -b fix/short-description
# ... fix, commit ...
git push -u origin fix/short-description
# merge to main → deploy on server
```

### Deploy to Hostinger VPS

```bash
ssh root@YOUR_VPS_IP
cd ~/crm-website   # or /var/www/crm-app
bash deploy.sh
```

## What was removed from `main`

These commits are **not** on `main` anymore (they live on feature/fix branches):

- `31dfc0d` — Hiring Management System + offer letters
- `11b6798` — Hiring HoD access + HR document module
- `680bb34` — Profile API refresh on load → branch `fix/profile-api-refresh-on-load`

Production baseline: `bc3e74e` — Fix profile picture display using direct S3 URLs

## Merging a feature when ready

```bash
git checkout main
git pull origin main
git merge feature/hiring-management   # example
git push origin main
# then on VPS: bash deploy.sh
```

## Rules

1. Do **not** push half-done features to `main`.
2. Do **not** edit code only on the server — always merge via GitHub first.
3. Keep `backend/.env` only on the server (never commit secrets).
4. After frontend changes, the server must run `npm run build` (`deploy.sh` does this).
