---
Purpose: Phased milestones and feature branches for Payroll V2.
Source: Migrated from PAYROLL_V2_IMPLEMENTATION_PLAN.md v2.0.0
Last Updated: 2026-07-17
---

# Payroll V2 — Milestones

Each milestone is independently deployable and low-risk. **Do not start a milestone until `docs/ACTIVE_DEVELOPMENT.md` points to it and a human approves.**

---

## Milestone 0 — Architecture Discovery

| Field | Value |
|-------|--------|
| Branch | `feature/payroll-v2-analysis` |
| Scope | Discover V1; design V2; create this workspace; archive obsolete plans |
| Status | **Complete** |

---

## Milestone 1 — Pay Period (current)

| Field | Value |
|-------|--------|
| Branch | `feature/payroll-v2-pay-period` |
| Scope | `payrollPeriodModel`, `/api/payroll/periods`, UI lock calendar, `payroll.period.manage`, transition tests |
| Status | **Complete — awaiting review** |

---

## Implementation milestones

| Milestone | Feature Branch | Scope of Work | Status |
| :--- | :--- | :--- | :--- |
| **1** | `feature/payroll-v2-pay-period` | Period model, APIs, UI, permission, tests | Complete — review |
| **2** | `feature/payroll-v2-components` | Register `salarycomponents` collection and catalog CRUD APIs | Not started |
| **3** | `feature/payroll-v2-formula` | AST formula evaluation compiler (no `eval`) | Not started |
| **4** | `feature/payroll-v2-engine` | `PayrollEngine.js` + dual-run difference logging | Not started |
| **5** | `feature/payroll-v2-attendance` | Leave impact codes; late / overtime pay rules | Not started |
| **6** | `feature/payroll-v2-approval` | Mount and wire `ApprovalWorkflow` APIs | Not started |
| **7** | `feature/payroll-v2-payslip` | S3 PDF helpers; fix notification triggers | Not started |
| **8** | `feature/payroll-v2-reporting` | Bank NEFT exports and compliance registries | Not started |

---

## Rules

1. Never implement more than the current milestone.
2. Never continue to the next milestone automatically.
3. Update `STATUS.md`, `TASKS.md`, and `CHANGELOG.md` before closing a milestone.
4. Update `docs/ACTIVE_DEVELOPMENT.md` when switching milestones or branches.
