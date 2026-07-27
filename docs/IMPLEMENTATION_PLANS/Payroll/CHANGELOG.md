---
Purpose: Changelog for the Payroll V2 implementation workspace.
Last Updated: 2026-07-17
---

# Payroll V2 — Changelog

## 2026-07-27 — R1 Correctness hotfix (double LOP + pro-rata)

* Slip generate/bulk/recalculate: attendance money only via `lossOfPay` from LeaveImpactCalculator; `unpaidLeaveDeduction` forced to 0 (stops double count).
* Added `payrollCorrectnessHelpers` (`toProRataComponentMaps`, `resolveAttendanceMoneyDeductions`).
* Pro-rata calculator now normalizes flat SalaryStructure fields before day-weighting.
* Deprecated slip-path use of `unpaidLeaveDeductionCalculator` (module kept for legacy scripts).
* Tests: `payrollCorrectness.r1.unit.test.js`.

## 2026-07-27 — R0 Integration baseline

* Created `integrate/payroll-v2-stack` from `feature/payroll-v2-reporting`.
* Merged `origin/develop` (authz test fixture updates; clean merge).
* Confirmed `PAYROLL_V2_ENGINE` remains opt-in (`true` only); `.env.example` documents default false.
* Verified mounts: `/api/payroll/periods|components|runs|approvals|reports`.
* Smoke tests: 89 passed (payroll suites + finance authz).

## 2026-07-17 — Milestone 8 Reporting / Bank Export

* Added reporting package under `services/payroll/reporting/` (CSV utils, bank format registry, compliance builders, export manifest).
* Generic bank NEFT CSV; default slip status `approved`; optional `?status=` / `?format=`.
* Compliance register CSVs: PF, ESI, PT, TDS.
* `PayrollExportHistory` model + non-blocking CSV file store via `documentStorageService`.
* Routes `/api/payroll/reports/*` with permission `payroll.bank.export`.
* Documented future lifecycle statuses without migrating SalarySlip enum.
* Tests: `payrollReporting.unit.test.js` (+ authz).

## 2026-07-17 — Milestone 7 Payslip Storage & Notifications

* Added reusable `documentStorageService` (S3 when configured; local fallback with diagnostic logs).
* Added `payslipStorage` helper; wired download / email / bulk email PDF paths.
* Extended `SalarySlip` with `pdfStorage` metadata (`provider`, `key`, `path`, `generatedAt`, `generatedBy`, `version`).
* Implemented `NotificationService.sendSalarySlipNotification`; enum types `salary_slip`, `salary_slip_generated`, `salary_slip_sent`.
* Notifications on single and bulk generate; failures never block payroll.
* Tests: document storage, payslip helpers, notification method presence.

## 2026-07-17 — Milestone 6 Approval Workflow

* Wired existing `ApprovalWorkflow` model to `/api/payroll/approvals`.
* Create workflow for salary slips; HR → Finance → Management stages.
* Act (approve/reject current stage), pending-for-me, bulk-approve.
* Permission `payroll.approval.manage`.
* On completion/rejection, updates linked salary slip status.
* Tests: `payrollApprovalHelpers.unit.test.js`.

## 2026-07-17 — Milestone 5 Attendance & Leave Pay Rules

* Added shared `leaveImpactCodes` (paid vs unpaid including LOP / personal / extended_sick).
* Added `payrollAttendanceRules`: OT pay (1.5× hourly), half-day LOP (0.5), optional late deduction (off by default).
* `processEmployeePayroll` loads month attendance and merges OT + extra LOP into dual-run overrides.
* `LeaveImpactCalculator.isLeaveTypePaid` delegates to shared codes.
* Tests: `payrollAttendanceRules.unit.test.js` (+ leave/engine suites green).

## 2026-07-17 — Milestone 4 Payroll Engine

* Added `payrollEngine.js`: `buildV1Result`, `buildV2Result`, `dualRunPayroll`, `processEmployeePayroll`, `selectPersistableTotals`.
* Feature flag `PAYROLL_V2_ENGINE` (default off) — persisted slips stay on V1.
* Dual-run APIs under `/api/payroll/runs` with permission `payroll.run.process`.
* `generateSalarySlip` logs V1 vs V2 diffs without changing stored amounts.
* Tests: `payrollEngine.unit.test.js`.

## 2026-07-17 — Milestone 3 Formula Engine

* Added safe AST formula engine: tokenize → parse → evaluate (no `eval` / `Function`).
* Allowlisted functions: `min`, `max`, `round`, `if`, `percent`.
* Caps: expression length 500, AST depth 32; reserved identifiers blocked.
* Public API: `compileFormula`, `evaluateFormula`, `validateFormula`.
* Tests: `formulaEngine.unit.test.js` (11 cases).
* Wiring into payroll run / component defaults deferred to Milestone 4.

## 2026-07-17 — Milestone 2 Salary Components

* Added `SalaryComponent` model (`code`, `type`, `taxable`, `statutory`, `calcMethod`, `v1Field`, …).
* Mounted `/api/payroll/components` (list, get, create, update, soft-deactivate, seed-defaults).
* Registered `payroll.component.manage` for admin/superadmin/hr/accounts/manager.
* Default seed maps V1 fields: BASIC, HRA, SPECIAL_ALLOWANCE, TRANSPORT_ALLOWANCE, MEDICAL_ALLOWANCE, PF_EE, PROFESSIONAL_TAX, TDS, ESI_EE.
* Tests: `salaryComponentCatalog.unit.test.js`; authz finance pilot extended.
* Structure `components[]` wiring and formula evaluation deferred.

## 2026-07-17 — Milestone 1 Pay Period (implementation)

* Added `payrollPeriodTransitions` status machine (`open` → `frozen` → `locked` → `paid`).
* Added `PayrollPeriod` model with unique `{ year, month }`.
* Mounted `/api/payroll/periods` (list, open, get, freeze, unfreeze, lock, unlock, mark-paid).
* Registered permission `payroll.period.manage` for admin/superadmin/hr/accounts/manager.
* Added Salary Management **Pay Periods** tab UI + `payrollPeriodApi.js`.
* Tests: `payrollPeriodTransitions.unit.test.js`; authz finance pilot extended.
* Slip generation is **not** gated on period status yet (engine milestone).

## 2026-07-17 — v2.0.0 workspace established

* Created `docs/IMPLEMENTATION_PLANS/Payroll/` as the sole active Payroll implementation workspace.
* Migrated content from `docs/IMPLEMENTATION_PLANS/PAYROLL_V2_IMPLEMENTATION_PLAN.md` (v2.0.0) into:
  * `README.md` — discovery, gaps, architecture, planned APIs/DB
  * `STATUS.md` — live status
  * `MILESTONES.md` — Milestone 0 + Milestones 1–8
  * `TASKS.md` — checklists
  * `DECISIONS.md` — locked decisions
  * `CHANGELOG.md` — this file
* Created `docs/ACTIVE_DEVELOPMENT.md` as the session entry point.
* Archived obsolete Payroll plans under `docs/ARCHIVE/` (see ARCHIVE index).
* Updated `docs/CORE/AI_DEVELOPMENT_GUIDE.md` with Development Session Rules.
* **No application code changes.**

## Prior history (Archived)

Earlier monolithic plan versions and agent-generated plans are preserved under `docs/ARCHIVE/` and must not be used for implementation.
