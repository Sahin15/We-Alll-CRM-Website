---
Purpose: Outline local environment setup, testing procedures, syntax compilation checks, and verification pipelines.
Scope: Development execution workflow.
Owner: Lead Developer / QA Engineer
Update Trigger: Addition of new build scripts or testing suites.
Dependencies: docs/CORE/GIT_WORKFLOW.md
Related Documents: docs/CORE/PROJECT_OVERVIEW.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Development Process: We Alll Office

This document guides developers through setting up their environment, seeding local databases, compiling syntax, running tests, and preparing builds.

---

## 1. Local Environment Setup

### 1.1 Prerequisites
Enforce the following software versions locally:
* **Node.js:** `v20.19.0+` or `v22.12.0+` (Vite 5/7 compatibility).
* **MongoDB:** Community Edition local service or access to MongoDB Atlas developer cluster.
* **AWS S3 Bucket:** Access credentials for storage bucket (configured in `.env`).

### 1.2 Configuration Files
1. **Backend Configuration:** Copy `backend/.env.example` to `backend/.env` and update the database URIs, JWT secrets, and AWS tokens.
2. **Frontend Configuration:** Create `frontend/.env` and set `VITE_API_URL=http://localhost:5000/api`.

---

## 2. Seed Data Generation

To quickly establish an operative local system, run the default seeding scripts:

```bash
# From workspace root:
cd backend

# Create primary SuperAdmin account
node scripts/createSuperAdmin.js

# (If present) Populate default departments and test users
node scripts/seedDatabase.js
```

---

## 3. Syntax Verification & Quality Checks

Before committing code or submitting pull requests, developers must run the following checks:

### 3.1 Backend Syntax Check
Validate that backend changes compile without import, syntax, or ES Module errors:
```bash
# From backend directory:
node --check src/server.js
node --check src/controllers/*.js
node --check src/routes/*.js
```

### 3.2 Frontend Build Audit
Ensure React modules compile cleanly without bundler or asset loading failures:
```bash
# From frontend directory:
npm run build
```

This compilation step tests React imports, asset resolutions, and CSS syntax under production mode. It must complete with a **zero error code** and output compiled bundles inside `dist/`.

---

## 4. Testing & Verification Checklist

Before pushing a branch to `staging` or `develop`, run through this manual verification checklist:

1. **Authentication Flow:** Clear storage keys, log in, refresh the page, and check if user authorization is retained correctly.
2. **Permission Check:** Test views using accounts with different scopes (e.g. employee vs. manager) to confirm access limits work.
3. **Database States:** Inspect local database tables using a MongoDB GUI (Compass/Robo 3T) to verify new records align with defined models.
4. **Mobile Responsiveness:** View components using browser DevTools set to mobile aspect ratios to verify columns stack and sidebar toggles operate without visual clipping.
