---
Purpose: Locked decisions for Payroll V2. Do not reopen without a new DECISIONS entry.
Last Updated: 2026-07-17
---

# Payroll V2 — Decisions

## D-2026-07-17-01 — Documentation workspace is sole plan source

* **Decision:** `docs/IMPLEMENTATION_PLANS/Payroll/` is the only Payroll implementation documentation going forward.
* **Rationale:** Multiple overlapping plans caused AI/session conflicts.
* **Consequence:** All other Payroll implementation plans are Archived (not deleted).

## D-2026-07-17-02 — Active development pointer

* **Decision:** Every AI session must read `docs/ACTIVE_DEVELOPMENT.md` first.
* **Rationale:** Single source of truth for feature, phase, milestone, and branch.
* **Consequence:** Agents must not guess which plan is current.

## D-2026-07-17-03 — No Payroll code in documentation standardization session

* **Decision:** This session creates documentation only (no DB, API, UI, engines).
* **Rationale:** Stabilize source of truth before Milestone 1.
* **Consequence:** Coding waits for explicit approval.

## D-2026-07-17-04 — Dual-run migration (from plan v2.0.0)

* **Decision:** Implement V2 engine beside V1; log variance; keep persisted slips on V1 until variance is verified near zero.
* **Feature flag:** `PAYROLL_V2_ENGINE=false` by default; `true` enables V2 generation path; toggle back for rollback.

## D-2026-07-17-05 — Modular 14-engine architecture (from plan v2.0.0)

* **Decision:** Split payroll into isolated engines (Payroll, Component, Formula, Attendance, Leave, OT, Loan, Reimbursement, Statutory, Audit, Approval, Payslip, Reporting, Notification).
* **Rationale:** Reduce oversized controllers; enable independent milestone branches.

## D-2026-07-17-06 — Formula safety (from plan v2.0.0)

* **Decision:** Formula Engine uses a safe AST parser. JavaScript `eval` is forbidden.

## D-2026-07-17-07 — Milestone order (from plan v2.0.0)

* **Decision:** Coding order is Pay Period → Components → Formula → Engine → Attendance → Approval → Payslip → Reporting.
* **Rationale:** Period lock must exist before engine persistence and approvals.

## D-2026-07-17-08 — Obsolete plans are Archived, not deleted

* **Decision:** Move superseded Payroll plans to `docs/ARCHIVE/`.
* **Rationale:** Preserve history; prevent accidental use as active guidance.

## D-2026-07-17-09 — Period status machine (Milestone 1)

* **Decision:** Period statuses are `open` → `frozen` → `locked` → `paid`.
* **Actions:** freeze / unfreeze / lock / unlock / markPaid (named actions; unlock requires `unlockReason`).
* **Unlock:** `locked` → `frozen` only (not straight to `open`).
* **Paid:** terminal for Milestone 1 (no reopen).

## D-2026-07-17-10 — Component catalog (Milestone 2)

* **Decision:** Components are catalog entries with unique `code`, `type` (`earning|deduction|employer`), `taxable`, `statutory`, `calcMethod`.
* **Permission:** `payroll.component.manage`.
* **Deletes:** Soft-deactivate via DELETE (sets `isActive: false`); codes are immutable after create.
* **Seed:** `POST /seed-defaults` inserts V1-mapped defaults without overwriting existing codes.
* **Deferred:** Assigning components onto `SalaryStructure` and formula evaluation (Milestones 3–4).

## D-2026-07-17-11 — Formula engine safety (Milestone 3)

* **Decision:** Formulas are compiled to an AST and evaluated in a custom interpreter. JavaScript `eval` / `Function` are forbidden.
* **Allowlisted functions:** `min`, `max`, `round`, `if`, `percent`.
* **Variables:** Uppercase identifiers supplied at evaluation time (e.g. `BASIC`, `GROSS`, `LOP_DAYS`).
* **Limits:** Max length 500 chars; max AST depth 32; reserved names blocked (`eval`, `constructor`, …).

## D-2026-07-17-12 — Dual-run engine (Milestone 4)

* **Decision:** Always compute V1 (flat structure) and V2 (component-mapped) totals; log/report diffs.
* **Persist:** Use V1 unless `PAYROLL_V2_ENGINE=true`.
* **Tolerance:** Absolute diffs ≤ ₹1 count as match.
* **Permission:** `payroll.run.process` for dual-run APIs.

## D-2026-07-17-13 — Attendance pay rules (Milestone 5)

* **Leave unpaid codes:** `unpaid`, `loss_of_pay`, `lop`, `lwp`, `leave_without_pay`, `extended_sick`, `personal`.
* **OT:** `gross / (30 × 8) × hours × 1.5` (configurable).
* **Half-day:** +0.5 LOP day when `applyHalfDayDeduction` (default on).
* **Late:** tracked; auto LOP off by default (`applyLateDeduction: false`).
* **Caller overrides:** Explicit `overtime` / `lossOfPay` / `lopDays` on process still win where provided.

## D-2026-07-17-14 — Approval workflow API (Milestone 6)

* **Decision:** Use existing `ApprovalWorkflow` schema; expose HTTP under `/api/payroll/approvals`.
* **Stages:** `hr_review` → `finance_approval` → `management_signoff`.
* **Permission:** `payroll.approval.manage`.
* **Approvers:** Explicit IDs preferred; otherwise resolve active hr / accounts|admin / admin|superadmin.
* **Completion:** Sets linked slips to `approved` or `rejected` and stores `approvalWorkflowId`.

## D-2026-07-17-15 — Payslip storage & notifications (Milestone 7)

* **Storage:** Reusable `documentStorageService` — S3 when AWS credentials exist; otherwise local under `uploads/`. Upload failures fall back to local and are logged; they never fail payroll generation.
* **Payslip:** PDFKit still generates the file; `payslipStorage` stores via the document service and sets `pdfUrl` + `pdfStorage` metadata.
* **Notifications:** Types `salary_slip`, `salary_slip_generated`, `salary_slip_sent`; `sendSalarySlipNotification` uses `salary_slip_generated` and action URL `/employee/salary-slips`. Single and bulk generate both notify; errors are non-blocking.
* **Out of scope:** PDF layout redesign; bank export.

## D-2026-07-17-16 — Reporting & bank export (Milestone 8)

* **Isolation:** Reporting lives under `services/payroll/reporting/`; Payroll Engine never builds CSV.
* **Bank CSV:** Generic NEFT-ready only; formats registered in `bankExportFormats.js` for future SBI/HDFC/etc.
* **Default status:** Bank (and register) exports default to `approved` — generated still under review; paid already processed. Optional `?status=`.
* **Lifecycle (future):** draft → generated → under_review → approved → exported → payment_processing → paid → reconciled — documented in `REPORTING_LIFECYCLE_STATUSES`; SalarySlip enum not migrated in M8.
* **Audit:** `PayrollExportHistory` stores exportId, period, counts, amounts, actor, timestamps, type, status, fileLocation.
* **Permission:** `payroll.bank.export`.
* **Out of scope:** Bank-specific formats, employer PF/ESI, cost centers, bulk mark-paid, reconciliation UI.

## D-2026-07-27-17 — R0 integration branch

* **Decision:** Land V2 on `integrate/payroll-v2-stack` = V2 tip + merged `develop`, not a rewrite.
* **Engine:** Keep `PAYROLL_V2_ENGINE` unset/false on staging/prod until R3 dual-run sign-off.
* **Next coding:** R1 correctness (double LOP + pro-rata) only after R0 human approval.

## D-2026-07-27-18 — R1 single LOP + flat pro-rata

* **LOP:** `LeaveImpactCalculator.deductionAmount` is the only unpaid/absence money input to slips (`lossOfPay`). Do not also call `unpaidLeaveDeductionCalculator` on generate.
* **Legacy field:** `deductions.unpaidLeaveDeduction` remains on schema for old rows but new/recalc paths set it to **0**.
* **Pro-rata:** Always run structures through `toProRataComponentMaps` so flat V1 fields participate in mid-month revision math.
* **Historical slips:** Use recalculate APIs for draft/generated only; paid slips are not auto-mutated.

## D-2026-07-27-19 — R2 remove DELETE /all

* **Decision:** Permanently remove `DELETE /api/salary-structures/all` (not gated). Single-structure delete remains.
* **Rationale:** Unused in UI; catastrophic data-loss risk; no enterprise payroll product exposes unbuffered mass wipe.
* **Also:** Salary-slip static GET routes must precede `/:id` to avoid Express shadowing.

## D-2026-07-27-20 — R3 dual-run ops (no engine flip)

* **Tooling:** Month dual-run supports CSV export and `mismatchesOnly` triage; summary counts always include the full cohort.
* **Process:** Staging month + decision log + written CTO approval required before `PAYROLL_V2_ENGINE=true`.
* **Non-goal:** R3 does not enable V2 persist or ship a mismatch UI (R4).

## D-2026-07-27-21 — R4 Ops UI on Salary Management hub

* **Decision:** Expose V2 approvals + reporting via new Salary Management tabs (same pattern as Pay Periods), not a separate app shell.
* **Approvals:** Inbox + start-from-slips; do not auto-create workflows on generate in R4.
* **Exports:** Client-side CSV download from existing `/api/payroll/reports/*`; history from `PayrollExportHistory`.

## D-2026-07-27-22 — R5 period gates (opt-in)

* **Flag:** `PAYROLL_PERIOD_GATES` default false for safe rollout.
* **Matrix:** generate/export → open|frozen; mark-paid → locked; missing period → fail closed.
* **Corrections:** Unlock locked → frozen (reason required) before generate/export again.

## D-2026-07-27-23 — R6 cutover is ops, not a code default

* **Decision:** R6 ships runbooks only; never commit `PAYROLL_V2_ENGINE=true`.
* **Enable path:** R3 sign-off → staging secrets → one-cycle monitor → separate prod approval.
* **Rollback:** Kill-switch sets flag false and restarts API; do not mass-edit paid slips.
