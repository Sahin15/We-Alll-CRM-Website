---
Purpose: Define the code branching pipeline, commit styling, PR policies, and release workflows.
Scope: Repository management and git policies.
Owner: Lead DevOps Engineer / Team Leads
Update Trigger: Major change in repository strategy or introducing continuous integration (CI) tools.
Dependencies: None
Related Documents: docs/CORE/DEVELOPMENT_PROCESS.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Git Workflow: We Alll Office

This document specifies the branching pipeline, commit message rules, code review conventions, and deployment standards enforced for We Alll Office.

---

## 1. Branching Strategy

The repository follows a modified GitFlow approach to ensure stable releases while allowing parallel feature developments:

```
main (Production, matches VPS live code)
  ▲
  │ (Release Tagging / Hotfix)
staging (Pre-Production Testing)
  ▲
  │ (Release Candidate Merges)
develop (Active Integration Branch)
  ▲
  ├── feature/attendance-v2 (Isolated Feature Branch)
  └── feature/pip-v2-ui     (Isolated Feature Branch)
```

* **`main`:** Reflects production code running live on the Hostinger VPS. Direct pushes to `main` are strictly forbidden.
* **`staging`:** Used for pre-production quality audits and client testing reviews. Matches the staging environment database settings.
* **`develop`:** The main integration branch. All feature branches merge here first. Must always compile cleanly.
* **Feature Branches (`feature/`):** Created from `develop` for specific tasks, bug fixes, or roadmap milestones. Deleted after code merge.

---

## 2. Branch Naming Conventions

* **Features:** `feature/<milestone-name>` (e.g. `feature/pip-v2-authz`)
* **Bug Fixes:** `bugfix/<issue-description>` (e.g. `bugfix/clock-in-timezone`)
* **Hotfixes (Direct fixes targeting main/production crashes):** `hotfix/<description>` (e.g. `hotfix/ssl-expiry`)

---

## 3. Commit Message Formatting

Commits must follow the **Conventional Commits** standard to enable automatic changelog generation:

```
<type>(<scope>): <short description>
```

### 3.1 Types:
* `feat`: A new user-facing feature.
* `fix`: A backend or frontend bug fix.
* `docs`: Documentation-only modifications.
* `style`: Code style changes (formatting, missing semicolons, no logic change).
* `refactor`: Restructuring code without changing behavior or adding features.
* `test`: Adding missing unit tests or correcting existing tests.
* `chore`: Package updates, build configs, or pipeline revisions.

### 3.2 Examples:
* `feat(authz): map growth track permissions in legacyRoleMapping`
* `fix(attendance): resolve negative hours calculation on overnight shifts`
* `docs(readme): update local installation steps for Node 22`

---

## 4. Pull Request & Merging Policy

1. **Branch Isolation:** Never write code directly on `develop`. Always execute your work in a separate feature branch.
2. **Mandatory Documentation Step:** Prior to initiating a PR, developers/AI must update any affected modules (`docs/MODULES/`) or architecture logs (`docs/CORE/`). For new modules, create a `docs/FEATURES/<feature-name>/` directory.
3. **Compilation Check:** The branch must pass local compilation audits (`npm run build` in the frontend, server syntax tests in the backend) before submitting the PR.
4. **Merge Process:** All merges into `develop` or `staging` must use the Squash or non-fast-forward merge (`--no-ff`) method to preserve the integrity of integration points.
