---
Purpose: Single source of truth for every AI development session on We Alll Office.
Scope: Platform-wide active work pointer. Update this file whenever feature, phase, milestone, or branch changes.
Owner: Lead Architect / Session Lead
Status: Active
Last Updated: 2026-07-27
---

# Active Development

**Every AI coding or documentation session must read this file first.**

---

| Field | Value |
|-------|--------|
| **Current Feature** | Payroll & Salary Management System V2 |
| **Current Phase** | Enterprise baseline on `develop` (post R0–R9 consolidation) |
| **Current Milestone** | **Develop source-of-truth** — continue from [NEXT_DEVELOPMENT_QUEUE.md](./IMPLEMENTATION_PLANS/Payroll/NEXT_DEVELOPMENT_QUEUE.md) |
| **Current Branch** | **`develop`** |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | Payroll V2 tip `66c9c42` lives on `develop`. `main` remains production. Keep `PAYROLL_V2_ENGINE=false` and `PAYROLL_EMPLOYER_STATUTORY=false`. See [DEVELOP_BRANCH_STATUS.md](./IMPLEMENTATION_PLANS/Payroll/DEVELOP_BRANCH_STATUS.md). |
| **Last Updated** | 2026-07-27 |

---

## Session start checklist

1. Read this file (`docs/ACTIVE_DEVELOPMENT.md`).
2. Read the Implementation Workspace / product spec.
3. Confirm work starts from **`develop`** (`git checkout develop && git pull`).
4. Cut a feature branch from `develop` for new Payroll work; do not reopen historical M*/R* tip branches.

---

## Rules

* **`develop` is the only source of truth for Payroll V2.**
* Do **not** set `PAYROLL_V2_ENGINE=true` without dual-run sign-off (R3) and cutover runbook gates.
* Do **not** set `PAYROLL_EMPLOYER_STATUTORY=true` in production without Finance approval.
* Do not merge Payroll V2 to `main` without the [RELEASE_CHECKLIST.md](./IMPLEMENTATION_PLANS/Payroll/RELEASE_CHECKLIST.md).

---

## Out of scope for casual sessions

* Enabling the V2 engine
* Breaking `/api/salary-*` contracts
* Database migrations that rewrite slips
* Deleting Payroll V1
