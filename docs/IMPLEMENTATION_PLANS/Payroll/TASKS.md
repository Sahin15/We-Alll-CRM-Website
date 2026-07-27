---
Purpose: Task checklist for the current Payroll V2 phase and upcoming milestones.
Last Updated: 2026-07-27
---

# Payroll V2 — Tasks

## Milestone 0 — Documentation standardization (this session)

- [x] Create `docs/IMPLEMENTATION_PLANS/Payroll/` workspace
- [x] Add `README.md`, `STATUS.md`, `MILESTONES.md`, `TASKS.md`, `DECISIONS.md`, `CHANGELOG.md`
- [x] Migrate newest plan content into this workspace
- [x] Create `docs/ACTIVE_DEVELOPMENT.md`
- [x] Create `docs/ARCHIVE/` and move obsolete Payroll plans
- [x] Update `docs/CORE/AI_DEVELOPMENT_GUIDE.md` with Development Session Rules
- [x] Human approval to open Milestone 1 coding

## Business goals (track across milestones)

- [ ] 100% correct payroll runs (zero double-deductions)
- [ ] Role-scoped payroll permissions for V2 surfaces
- [ ] Automated statutory calculations (PF/ESI/PT/TDS) where approved

## Milestone 1 — Pay Period

- [x] Create `payrollPeriodModel.js` (`open` / `frozen` / `locked` / `paid`)
- [x] Implement `/api/payroll/periods` routes
- [x] Register `payroll.period.manage` permission
- [x] Build UI calendar lock page (Salary Management → Pay Periods)
- [x] Tests for period state transitions
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [ ] Human review / merge approval

## Milestone 2 — Components

- [x] `salarycomponents` collection + catalog CRUD
- [x] `/api/payroll/components` (+ seed-defaults)
- [x] Register `payroll.component.manage`
- [x] Tests
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [ ] Human review / merge approval

## Milestone 3 — Formula

- [x] Safe AST formula compiler (no `eval`)
- [x] Unit tests for allowlisted variables/functions
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [ ] Human review / merge approval

## Milestone 4 — Engine

- [x] `PayrollEngine.js` orchestrator (V1 + V2 builders)
- [x] Dual-run variance logging / report
- [x] Feature flag `PAYROLL_V2_ENGINE` (default `false`)
- [x] `/api/payroll/runs` dual-run endpoints + `payroll.run.process`
- [x] Hook dual-run log into slip generate (persist still V1)
- [x] Tests
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [ ] Human review / merge approval

## Milestone 5 — Attendance rules

- [x] Shared leave impact codes
- [x] Late / half-day / overtime pay rules
- [x] Wire into `processEmployeePayroll`
- [x] LeaveImpactCalculator uses shared codes
- [x] Tests
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [ ] Human review / merge approval

## Milestone 6 — Approval

- [x] Mount ApprovalWorkflow HTTP APIs
- [x] Create / list / pending / act / bulk-approve
- [x] Permission `payroll.approval.manage`
- [x] Tests
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [x] Human review / merge approval

## Milestone 7 — Payslip

- [x] Reusable document storage service (S3 + local fallback)
- [x] Payslip PDF generate/store helper
- [x] `SalarySlip.pdfStorage` metadata
- [x] Fix `sendSalarySlipNotification` + payroll notification enum
- [x] Notify on single + bulk generate (non-blocking)
- [x] Tests
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [ ] Human review / merge approval

## Milestone 8 — Reporting

- [x] Generic bank NEFT CSV export (default `approved`)
- [x] Format registry for future bank-specific exporters
- [x] Compliance registers PF / ESI / PT / TDS
- [x] `PayrollExportHistory` + fileLocation extension
- [x] Permission `payroll.bank.export`
- [x] Tests
- [x] Update STATUS / CHANGELOG / ACTIVE_DEVELOPMENT
- [ ] Human review / merge approval

## R0 — Integration baseline

- [x] Create `integrate/payroll-v2-stack` from `feature/payroll-v2-reporting`
- [x] Merge `origin/develop` into integration branch
- [x] Verify `/api/payroll/*` mounts + engine default false
- [x] Smoke unit tests (payroll + finance authz)
- [x] Update ACTIVE_DEVELOPMENT / STATUS / MILESTONES
- [x] Human review / push / PR to `develop`
- [ ] Staging deploy smoke (manual)

## R1 — Correctness hotfix

- [x] Eliminate double LOP path (single `lossOfPay` from LeaveImpact)
- [x] Force `unpaidLeaveDeduction` = 0 on generate / bulk / recalculate
- [x] Fix pro-rata flat-structure adapter (`toProRataComponentMaps`)
- [x] Golden / regression unit tests
- [x] Update ACTIVE_DEVELOPMENT / STATUS / CHANGELOG
- [ ] Human review / merge approval

## R2 — Hygiene

- [x] Remove `DELETE /salary-structures/all` (route + controller + FE client)
- [x] Fix salary-slip route ordering (static GETs before `/:id`)
- [x] Confirm notifications on generate/bulk deploy path
- [x] Tests (`payrollHygiene.r2.unit.test.js`)
- [x] Update ACTIVE_DEVELOPMENT / STATUS / CHANGELOG
- [ ] Human review / merge approval

## R3 — Dual-run validation

- [x] Month dual-run `format=csv|json` + `mismatchesOnly` + sort
- [x] `dualRunMonthReport` helpers + unit tests
- [x] Ops runbook + decision log template
- [x] Update ACTIVE_DEVELOPMENT / STATUS / CHANGELOG
- [ ] Human review of tooling
- [ ] Staging full-month dual-run + CTO sign-off (manual)
- [ ] Human approval before R4

## R4 — Ops UI

- [x] `payrollApprovalApi` + Approvals tab (pending, act/reject, bulk, start)
- [x] `payrollReportApi` + Exports tab (NEFT, registers, history)
- [x] Wire tabs in `SalaryManagement.jsx`
- [x] Update ACTIVE_DEVELOPMENT / STATUS / CHANGELOG
- [ ] Human review / merge approval

## R5 — Period gates

- [x] `PAYROLL_PERIOD_GATES` flag (default false) + `payrollPeriodGates.js`
- [x] Wire generate / bulk / recalc / mark-paid / exports
- [x] Fail closed when period missing
- [x] `GET /payroll/periods/gates-status` + UI disables
- [x] Unit tests + `.env.example`
- [x] Update ACTIVE_DEVELOPMENT / STATUS / CHANGELOG
- [ ] Human review / merge approval

## Known V1 defects to address in coding milestones (tracked)

- [x] Eliminate double LOP path
- [x] Fix pro-rata flat-structure adapter
- [x] Restrict or audit `DELETE /salary-structures/all`
- [ ] Populate YTD on slips
