---
Purpose: Comprehensive discovery, gap analysis, and modular V2 architecture design for We Alll Office Payroll & Salary Management.
Scope: Full stack payroll calculation engine, statutory compliance, audit logging, and approvals.
Owner: Chief Software Architect
Update Trigger: Approval to begin Phase 1 development of Payroll V2.
Dependencies: docs/CORE/PROJECT_ARCHITECTURE.md, docs/CORE/AUTHORIZATION_V2.md
Related Documents: docs/MODULES/PAYROLL.md, docs/MODULES/ATTENDANCE.md, docs/MODULES/LEAVE.md
Status: Under Review
Version: v2.0.0
Last Updated: 2026-07-17
---

# Payroll & Salary Management System V2: Architecture & Implementation Plan

This document establishes the comprehensive discovery, gap analysis, modular system design, and phased rollout plan for the **We Alll Office Payroll & Salary Management System V2**.

---

## 1. Phase 1: Current Payroll System Discovery

### 1.1 Current Workflow
The existing payroll flow is HR-driven, beginning with active salary structure definition, proceeding through mid-month preview generation, allowing employee feedback, and culminating in payslip distribution:

```
[HR defines structure/template] ──> [Generate monthly preview] ──> [Employee ack/query] ──> [HR finalizes] ──> [Generate payslip] ──> [Email PDF] ──> [Mark paid]
```

### 1.2 Database Schema Analysis
The current V1 database operates on four primary Mongoose collections:
* **`SalaryStructure`:** Maps base pay components per user. Schema uses flat numeric properties: `basicSalary`, `hra`, `specialAllowance`, `transportAllowance`, `medicalAllowance`, `providentFund`, `professionalTax`, `tds`, `esi`.
* **`SalaryStructureTemplate`:** Designation/department templates that auto-calculate HRA/PF percentages on structure creation.
* **`SalarySlip`:** Stores finalized monthly payouts, tracking unique `{ employee, month, year }` configurations.
* **`SalaryPreview`:** Mid-month drafts storing attendance audits and feedback queries.
* **`ApprovalWorkflow`:** A schema mapping multi-tier approvals (`hr_review` $\rightarrow$ `finance_approval` $\rightarrow$ `management_signoff`) which is defined in code but **has no routes and is unused**.

### 1.3 Salary Calculations & LOP Deductions
* **Absence/LOP Divisor:** The system computes the daily salary rate using a **fixed 30-day divisor**:
  $$\text{Per Day Rate} = \frac{\text{Gross Monthly Salary}}{30}$$
  It does not adjust for actual calendar days in the month (e.g. 28, 31) or active working days (e.g. 26).
* **Double LOP Risk:** The system triggers LOP deductions in two parallel calculator paths:
  1. `LeaveImpactCalculator` logs unpaid days, multiplying by the per-day rate to output `lossOfPay` deductions.
  2. The slip generation controller calls `unpaidLeaveDeductionCalculator` to set a separate `unpaidLeaveDeduction`.
  * *Critical Issue:* Running both concurrently results in **double deductions** for the same unpaid leave events.
* **Pro-Rata Adjustments:** The system contains a `proRataSalaryCalculator` to handle mid-month salary structure changes. However, it expects structures formatted with nested component maps (`{ earnings: {}, deductions: {} }`), whereas the live `SalaryStructure` stores them as flat fields, causing calculated outputs to fall back to default full-month gross values.

### 1.4 Integration Points
* **Attendance Integration:** The `LeaveImpactCalculator` scans attendance collections to identify absent days where no clock-in or approved leave exists.
* **Leave Integration:** Evaluates leave collections, treating all categories as paid except `unpaid`, `loss_of_pay`, `lop`, and `leave_without_pay`.
* **Holiday & Calendar Integration:** `WorkingDaysCalculator` queries the `Holiday` collection to exclude holidays from absent-day counts. It supports 5-day (Sat/Sun off) and 6-day (Sun off) calendars.
* **Overtime & Allowances:** Overtime is recorded in attendance collections, but the payroll system has no automated math rules. All OT and bonus amounts are manual rupee values input during slips generation.
* **Notifications:** The backend contains code referencing `sendSalarySlipNotification` to send alerts, but this method is missing from the communication service and has no matching key in the notification type enum, causing silence.
* **Permissions Catalog:** Relies on three V1 RBAC keys: `payroll.structure.manage`, `payroll.slip.manage`, and `payroll.slip.view_self`.

---

## 2. Phase 2: Gap Analysis & Technical Debt

### 2.1 Completed (Working)
* Per-employee `SalaryStructure` versioning lifecycle (Draft $\rightarrow$ Active $\rightarrow$ Superseded).
* Automatic generation of matching designation templates.
* Mid-month employee review dashboard with query loops.
* Auto-generated PDF slips compiled via `PDFKit` and dispatched via Nodemailer.

### 2.2 Partially Implemented (Wired but incomplete)
* **ApprovalWorkflows:** Schema exists but lacks API routes and controller integrations. Generated slips are automatically marked as approved.
* **YTD Accumulators:** Slip schema allocates Year-To-Date (YTD) blocks, but the calculation values are not populated.

### 2.3 Missing Features
* **Pay Periods Calendar:** No concept of closed payroll periods or calendar freeze/lock controls.
* **Dynamic Formula Engine:** No custom component calculations (all PF, ESI, and TDS values are static, stored numbers).
* **Statutory Compliance Rules:** No automated India-specific statutory rules (e.g. PF wage limits, ESI eligibility, PT slabs, TDS tax deductions).
* **Audit Logs:** Slips can be recalculated or updated after generation with no immutable log record.
* **Payment Files:** No automated bank NEFT/CSV generation tools.

### 2.4 Technical Debt & Risks
* **Double LOP bug:** High risk of incorrect employee payouts.
* **Oversized Controllers:** `salarySlipController.js` and `salaryStructureController.js` handle database queries, LOP math, PDF compilation, and emails in single files exceeding 40 KB.
* **Sequential Processing Limits:** Generating bulk slips uses a synchronous loop that can cause HTTP gateway timeouts.
* **Security Gaps:** A global `DELETE /api/salary-structures/all` endpoint exists, allowing a single call to wipe all company salary structures.

---

## 3. Phase 3: Modular Payroll V2 Design

To achieve an enterprise-grade framework, We Alll Office V2 divides the payroll process into 14 isolated, single-responsibility **Engines**:

```
[Attendance Engine]   [Leave Engine]   [Loan Engine]   [Reimbursement Engine]
       │                    │                │                   │
       └────────────────────┼────────────────┼───────────────────┘
                            ▼
                     [Formula Engine]
                            ▼
              [Salary Component Engine] ──> [Tax / Statutory Engine]
                            ▼
                     [Payroll Engine]
                            ▼
                     [Approval Engine] ──> [Payslip Engine]
                            ▼
                      [Audit Engine]
                            ▼
             [Reporting / Notification Engines]
```

### 3.1 Core Computation Engines
1. **Payroll Engine:**
   * *Responsibility:* The central orchestrator. Resolves the active pay period, queries employee records, triggers the sub-engines in sequence, and generates the final slip dataset.
2. **Salary Component Engine:**
   * *Responsibility:* Maintains the component catalog (earnings vs deductions) and resolves structure revisions.
3. **Formula Engine:**
   * *Responsibility:* Evaluates math variables (`BASIC`, `LOP_DAYS`) using a safe Abstract Syntax Tree (AST) parser (avoiding JavaScript `eval`).

### 3.2 Input Processing Engines
4. **Attendance Engine:**
   * *Responsibility:* Pulls clock-in logs and computes active work hours, late flags, and overtime hours.
5. **Leave Engine:**
   * *Responsibility:* Analyzes approved leaves to determine Loss of Pay (LOP) days based on unpaid leave rules.
6. **Overtime Engine:**
   * *Responsibility:* Multiplies overtime hours by the designation's configured overtime pay rate.
7. **Loan & Advance Engine:**
   * *Responsibility:* Queries the employee loan ledger to determine monthly EMI deductions.
8. **Reimbursement Engine:**
   * *Responsibility:* Queries approved and unpaid expenses to append them to the slip's earnings section.

### 3.3 Compliance & Validation Engines
9. **Tax & Statutory Engine:**
   * *Responsibility:* Automates calculation of PF, ESI, PT, and TDS deductions according to government regulations.
10. **Audit Engine:**
    * *Responsibility:* Records immutable, append-only logs for structural changes, period locks, and slip modifications.

### 3.4 Approval & Distribution Engines
11. **Approval Engine:**
    * *Responsibility:* Coordinates the multi-tiered sign-off process using the `ApprovalWorkflow` schema.
12. **Payslip Engine:**
    * *Responsibility:* Generates the secure PDF payslip and streams it to S3.
13. **Reporting Engine:**
    * *Responsibility:* Generates payroll registers, cost center breakdowns, and NEFT bank files.
14. **Notification Engine:**
    * *Responsibility:* Dispatches targeted notifications (in-app badges and emails) when slips are generated or verified.

---

## 4. Phase 4: Implementation Plan

### 4.1 Business Goals
* Deliver 100% correct payroll runs, with zero double-deductions.
* Secure payroll data using role-scoped permissions.
* Automate statutory tax calculations to guarantee compliance.

### 4.2 Database Changes
We will introduce 6 new collections and extend existing models:
* **`payrollperiods` (New):** Cycles setup (`month`, `year`, `cutoffDate`, `status: open/frozen/locked/paid`).
* **`salarycomponents` (New):** Component definitions (`code`, `type`, `taxable`, `statutory`).
* **`loans` (New):** Tracking user loan balances and EMIs.
* **`payrollauditlogs` (New):** Append-only audit logging.
* **`SalaryStructure` (Extend):** Add `components[]` array, keeping flat fields denormalized for V1 compatibility.
* **`SalarySlip` (Extend):** Link to `periodId` and add an `isLocked` flag.

### 4.3 API Surface Extensions
* **`/api/payroll/periods`:** Open, freeze, lock, and unlock pay periods.
* **`/api/payroll/components`:** Manage the salary components catalog.
* **`/api/payroll/loans`:** Request loans and track EMI payments.
* **`/api/payroll/runs`:** Initiate, approve, and finalize bulk payroll runs.

### 4.4 Permission Adjustments
Register new keys in `permissionCatalog.js`:
* `payroll.period.manage` (Open/close/lock periods)
* `payroll.run.process` (Generate/recalculate slips)
* `payroll.run.approve_finance` (Sign off on payroll payments)
* `payroll.bank.export` (Download bank NEFT files)

### 4.5 Migration & Rollback Strategy
* **Parallel Execution (Dual-Run):** Implement the V2 engine beside V1. Calculate both and log any variance. Slips will remain on V1 calculations until the dual-run variance is verified as zero.
* **Feature Flag:** Introduce `PAYROLL_V2_ENGINE=false` in `.env`. Setting it to `true` switches the generation endpoint to V2 calculation.
* **Rollback Action:** If V2 calculations display errors, toggling the feature flag to `false` instantly reverts to V1 logic.

---

## 5. Phase 5: Phased Milestones & Branches

To ensure each step is independently deployable and low-risk, the work is split into 8 milestones:

| Milestone | Feature Branch | Scope of Work |
| :--- | :--- | :--- |
| **Milestone 1** | `feature/payroll-v2-pay-period` | Create `payrollPeriodModel.js`, define `/api/payroll/periods` routes, and build the UI calendar lock page. |
| **Milestone 2** | `feature/payroll-v2-components` | Register `salarycomponents` collection and build catalog CRUD APIs. |
| **Milestone 3** | `feature/payroll-v2-formula` | Write AST formula evaluation compiler helper classes. |
| **Milestone 4** | `feature/payroll-v2-engine` | Develop `PayrollEngine.js` and wire the dual-run difference logging logic. |
| **Milestone 5** | `feature/payroll-v2-attendance` | Integrate leave impact codes and late arrival/overtime pay rules. |
| **Milestone 6** | `feature/payroll-v2-approval` | Mount and wire the `ApprovalWorkflow` APIs. |
| **Milestone 7** | `feature/payroll-v2-payslip` | Build S3 PDF upload helpers and fix the notifications triggers. |
| **Milestone 8** | `feature/payroll-v2-reporting` | Generate bank NEFT exports and compliance registries. |
