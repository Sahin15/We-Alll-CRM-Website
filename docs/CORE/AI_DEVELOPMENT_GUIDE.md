---
Purpose: Define prompt conventions, development pipelines, git steps, and documentation synchronization rules for AI coding assistants.
Scope: Platform-wide AI developer guidelines.
Owner: Lead AI Integrations Engineer / Architect
Update Trigger: Major change in repository strategy or introducing new AI development tools.
Dependencies: docs/CORE/GIT_WORKFLOW.md, docs/CORE/CODING_STANDARDS.md, docs/ACTIVE_DEVELOPMENT.md
Related Documents: docs/CORE/DEVELOPMENT_PROCESS.md
Status: Active
Version: v1.1.0
Last Updated: 2026-07-17
---

# AI Development Guide: We Alll Office

This document serves as the mandatory operational manual for all AI coding assistants (Cursor, Antigravity, etc.) developing software for We Alll Office. It guarantees that AI agents operate safely, consistently, and maintain documentation synchronization.

---

## 0. Development Session Rules

**Mandatory for every AI session (documentation or coding).**

1. **Read first:** [`docs/ACTIVE_DEVELOPMENT.md`](../ACTIVE_DEVELOPMENT.md)  
   This file is the single source of truth for Current Feature, Phase, Milestone, Branch, Implementation Workspace, and Status.

2. **Read second:** the **Implementation Workspace** named in `ACTIVE_DEVELOPMENT.md`  
   Example (Payroll V2): `docs/IMPLEMENTATION_PLANS/Payroll/` — start with that folder’s `README.md` and `STATUS.md`.

3. **Never use archived implementation plans.**  
   Anything under `docs/ARCHIVE/` is historical only and must not guide design or code.

4. **Never guess which implementation plan is newer.**  
   If `ACTIVE_DEVELOPMENT.md` and the workspace disagree, stop and write a conflict report. Wait for human approval.

5. **Never combine multiple implementation plans.**  
   Do not merge content from archived plans, old chat prompts, or duplicate docs into the active workspace unless a human explicitly requests a migration.

6. **Scope lock:** Implement only the Current Milestone. Do not start the next milestone automatically.

7. **Before ending a session:** Update the implementation workspace (`STATUS.md`, `TASKS.md`, `CHANGELOG.md`) and `docs/ACTIVE_DEVELOPMENT.md` when phase/milestone/branch changed.

---

## 1. Standard AI Development Workflow

AI coding assistants must strictly adhere to the following sequence for every task:

```
[1. Discovery] ──> [2. Plan & Approve] ──> [3. Feature Branch] ──> [4. Implement & Test] ──> [5. Sync Docs] ──> [6. PR & Merge]
```

### 1.1 Discovery
Before writing code, scan the codebase:
* Search models (`backend/src/models/`) and controllers (`backend/src/controllers/`) to verify field constraints and existing handlers.
* Respect V2 Authorization catalog rules to map the correct permission scopes.
* Do not make code assumptions. If legacy slots or parameters exist, research their historical context.

### 1.2 Implementation Plan
For the feature named in `docs/ACTIVE_DEVELOPMENT.md`, update only that feature’s **Implementation Workspace** (e.g. `docs/IMPLEMENTATION_PLANS/Payroll/`).
* Do not create parallel competing plans for the same feature.
* Specify all files to modify inside the workspace (`TASKS.md`, `MILESTONES.md`, `DECISIONS.md`).
* Document design trade-offs, scope mappings, and schema definitions.
* **Stop and wait for human developer approval** before writing or modifying any application codebase files.

### 1.3 Feature Branching
Create a dedicated feature branch off the clean `develop` branch.
* Branch namespace: `feature/<milestone-name>` (e.g. `feature/pip-v2-database`).
* Never commit code directly onto `develop` or `main`.

### 1.4 Implementation & Verification
* Write code adhering to the [Coding Standards](file:///c:/Users/Sahin%20Mondal/OneDrive/Desktop/crm-website/docs/CORE/CODING_STANDARDS.md) (ESM import file extensions, lean queries, try-catch models).
* Verify compile states: Run `npm run build` in the frontend and backend syntax checks.

### 1.5 Documentation Synchronization (Mandatory)
Before pushing the branch, synchronize documentation:
* If modifying an existing module, update the corresponding `docs/MODULES/<module>.md`.
* If implementing a new standalone feature, create a new sub-folder `docs/FEATURES/<feature-name>/` populated with the default feature documentation templates (`README.md`, `DATABASE.md`, `API.md`, `WORKFLOW.md`, `PERMISSIONS.md`, `TESTING.md`, `RELEASE_NOTES.md`, `IMPLEMENTATION_PLAN.md`).
* Record the modifications in `docs/CHANGELOG/` if a release version is tagged.

### 1.6 PR submission & Merge Strategy
* Force-stage documentation files to bypass `.gitignore` settings using `git add -f`.
* Open a pull request targeting `develop`.
* Use the squash or non-fast-forward merge option to maintain stable commit histories.

---

## 2. Coding Standards Cheatsheet for AI

* **Backend Modules:** Enforce `import ... from "./filename.js"` with file extensions.
* **Controller Layout:** Wrap logic in `try-catch` structures. Return unified JSON envelopes: `{ success: true, data: ... }` or `{ success: false, message: ... }`.
* **Database Performance:** Use `.lean()` for read-only Mongoose calls.
* **Branding Themes:** Do not style elements inline. Use vanilla CSS rules nested under dynamic body triggers (e.g. `.pip-active`).
* **Console Cleanliness:** Replace `console.log` with Winston log mappings in staging and production paths.
