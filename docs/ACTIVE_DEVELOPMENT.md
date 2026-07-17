---
Purpose: Single source of truth for every AI development session on We Alll Office.
Scope: Platform-wide active work pointer. Update this file whenever feature, phase, milestone, or branch changes.
Owner: Lead Architect / Session Lead
Status: Active
Last Updated: 2026-07-17
---

# Active Development

**Every AI coding or documentation session must read this file first.**

---

| Field | Value |
|-------|--------|
| **Current Feature** | Payroll & Salary Management System V2 |
| **Current Phase** | Implementation |
| **Current Milestone** | Milestone 1 — Pay Period (**complete — awaiting review**) |
| **Current Branch** | `feature/payroll-v2-pay-period` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` |
| **Status** | Milestone 1 implemented. Do **not** start Milestone 2 until approved. |
| **Last Updated** | 2026-07-17 |

---

## Session start checklist

1. Read this file (`docs/ACTIVE_DEVELOPMENT.md`).
2. Read the **Implementation Workspace** listed above (start with that folder’s `README.md` and `STATUS.md`).
3. Confirm the **Current Branch** matches `git branch --show-current`.
4. Implement **only** the Current Milestone (if coding is approved).
5. Never open or follow plans under **Superseded Documents**.

---

## Superseded Documents (Archived — do not use)

| Document | Location | Reason |
|----------|----------|--------|
| Payroll V2 monolithic plan (v2.0.0 source copy) | `docs/ARCHIVE/PAYROLL_V2_IMPLEMENTATION_PLAN.md` | Migrated into `docs/IMPLEMENTATION_PLANS/Payroll/` |
| Agent-generated Payroll System V2 plan | `docs/ARCHIVE/PAYROLL_SYSTEM_V2_IMPLEMENTATION_PLAN.md` | Obsolete; superseded by workspace |
| Session conflict report (pre-standardization) | `docs/ARCHIVE/PAYROLL_V2_SESSION_CONFLICT_REPORT.md` | Conflicts resolved by this standardization |

---

## Rules

* Never guess which implementation plan is newer.
* Never combine multiple implementation plans.
* Never use archived implementation plans for decisions or coding.
* Do not start the next milestone until this file is updated **and** a human approves.

---

## Milestone 1 scope

* `payrollPeriodModel.js`
* `/api/payroll/periods` routes
* Permission `payroll.period.manage`
* UI pay-period calendar / lock controls
* Unit tests for period state transitions

**Out of scope:** PayrollEngine, components catalog, formula engine, slip generation changes.
