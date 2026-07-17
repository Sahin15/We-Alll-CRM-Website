---
Purpose: Canonical entry point for Payroll & Salary Management System V2 implementation workspace.
Scope: Documentation only until an implementation milestone is approved via docs/ACTIVE_DEVELOPMENT.md.
Owner: Chief Software Architect / Lead Finance Developer
Status: Active (workspace)
Version: v2.0.0
Last Updated: 2026-07-17
Source: Migrated from docs/IMPLEMENTATION_PLANS/PAYROLL_V2_IMPLEMENTATION_PLAN.md (now Archived)
---

# Payroll & Salary Management System V2

This folder is the **only** authorized Payroll V2 implementation workspace.

| File | Role |
|------|------|
| [README.md](./README.md) | This overview (discovery + architecture) |
| [STATUS.md](./STATUS.md) | Current phase, branch, blockers |
| [MILESTONES.md](./MILESTONES.md) | Phased milestones and feature branches |
| [TASKS.md](./TASKS.md) | Checklist for the current and upcoming work |
| [DECISIONS.md](./DECISIONS.md) | Locked product/engineering decisions |
| [CHANGELOG.md](./CHANGELOG.md) | Workspace document history |

**Session rule:** Always read `docs/ACTIVE_DEVELOPMENT.md` first, then this workspace. Never use files under `docs/ARCHIVE/` for implementation guidance.

---

## 1. Current V1 System (Discovery)

### 1.1 Workflow

```
[HR defines structure/template]
  → [Generate monthly preview]
  → [Employee ack/query]
  → [HR finalizes]
  → [Generate payslip]
  → [Email PDF]
  → [Mark paid]
```

### 1.2 Database (V1)

| Collection / Model | Role |
|--------------------|------|
| `SalaryStructure` | Flat pay components per employee (`basicSalary`, `hra`, allowances, PF/PT/TDS/ESI) |
| `SalaryStructureTemplate` | Designation/department templates; HRA/PF % on create |
| `SalarySlip` | Monthly payout; unique `{ employee, month, year }` |
| `SalaryPreview` | Mid-month draft with attendance audit and employee queries |
| `ApprovalWorkflow` | Multi-tier schema (`hr_review` → `finance_approval` → `management_signoff`) — HTTP under `/api/payroll/approvals` (Milestone 6) |

### 1.3 Calculations & known defects

* **LOP divisor:** Per-day rate = Gross ÷ **30** (not calendar or working days).
* **Double LOP risk:** `LeaveImpactCalculator` → `lossOfPay` **and** slip controller → `unpaidLeaveDeduction` can both fire.
* **Pro-rata:** Calculator expects nested `{ earnings, deductions }`; live structures are **flat** → often falls back to full-month amounts.

### 1.4 Integrations

| Domain | Behavior |
|--------|----------|
| Attendance | Missing clock-in on working day (no approved leave) → absent / LOP |
| Leave | Paid unless type is unpaid / LOP / LWP variants |
| Holiday / calendar | `WorkingDaysCalculator`; 5-day or 6-day patterns |
| Overtime | Hours on attendance; **₹ amounts are manual** on slip |
| Notifications | Calls missing `sendSalarySlipNotification`; enum gap → silent failure |
| Permissions | `payroll.structure.manage`, `payroll.slip.manage`, `payroll.slip.view_self` |

### 1.5 Gap summary

| State | Items |
|-------|--------|
| Working | Structure lifecycle (draft → active → superseded); templates; preview/query; PDFKit + email |
| Partial | YTD fields (not populated); approval inbox UI (API only in M6) |
| Missing | Pay periods/lock; formula engine; statutory auto-calc; audit log; bank NEFT/CSV |
| Debt | Double LOP; oversized controllers; sequential bulk timeouts; `DELETE /salary-structures/all` |

---

## 2. V2 Modular Design (14 Engines)

```
[Attendance] [Leave] [Loan] [Reimbursement]
        └──────────┬──────────┘
                   ▼
            [Formula Engine]
                   ▼
     [Salary Component] ──> [Tax / Statutory]
                   ▼
            [Payroll Engine]
                   ▼
     [Approval] ──> [Payslip]
                   ▼
            [Audit Engine]
                   ▼
     [Reporting] / [Notification]
```

| Engine | Responsibility |
|--------|----------------|
| Payroll Engine | Orchestrator: period, employees, sub-engines, slip dataset |
| Salary Component Engine | Catalog (earnings/deductions) and structure revisions |
| Formula Engine | Safe AST evaluation (`BASIC`, `LOP_DAYS`); **no `eval`** |
| Attendance Engine | Clock-in, hours, late, OT hours |
| Leave Engine | LOP days from unpaid leave rules |
| Overtime Engine | OT hours × configured rate |
| Loan & Advance Engine | EMI recoveries from ledger |
| Reimbursement Engine | Approved unpaid expenses → earnings |
| Tax & Statutory Engine | PF, ESI, PT, TDS per regulations |
| Audit Engine | Append-only logs |
| Approval Engine | Wired — `/api/payroll/approvals` (Milestone 6) |
| Payslip Engine | PDF + S3 |
| Reporting Engine | Registers, cost centers, NEFT |
| Notification Engine | In-app + email on generate/verify |

---

## 3. Planned Technical Surface (not implemented yet)

### Database

* **New:** `payrollperiods`, `salarycomponents`, `loans`, `payrollauditlogs`
* **Extend:** `SalaryStructure.components[]` (keep flat fields); `SalarySlip.periodId`, `isLocked`

### APIs

* `/api/payroll/periods` — open / freeze / lock / unlock  
* `/api/payroll/components` — catalog CRUD  
* `/api/payroll/loans` — loans / EMI  
* `/api/payroll/runs` — initiate / approve / finalize  

### Permissions (registered so far)

* `payroll.period.manage` (Milestone 1)
* `payroll.component.manage` (Milestone 2)
* `payroll.run.process` (Milestone 4)
* `payroll.approval.manage` (Milestone 6)
* Planned later: `payroll.bank.export`

### Migration

* Dual-run V2 beside V1; log variance; persist V1 until variance ≈ 0  
* Feature flag `PAYROLL_V2_ENGINE=false` by default; toggle for rollback  

---

## 4. Related documents (context only)

* `docs/MODULES/PAYROLL.md` — V1 module overview (not an implementation plan)
* `docs/MODULES/ATTENDANCE.md`, `docs/MODULES/LEAVE.md`
* `docs/CORE/PROJECT_ARCHITECTURE.md`, `docs/CORE/AUTHORIZATION_V2.md`

---

## 5. Explicit non-goals for this documentation session

* No database migrations  
* No APIs  
* No UI  
* No Payroll Engine code  

Implementation starts only when `docs/ACTIVE_DEVELOPMENT.md` opens a coding milestone and a human approves.
