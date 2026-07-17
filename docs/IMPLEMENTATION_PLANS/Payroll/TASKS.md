---
Purpose: Task checklist for the current Payroll V2 phase and upcoming milestones.
Last Updated: 2026-07-17
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

## Milestone 7 — Payslip (not started)

- [ ] S3 PDF upload helpers
- [ ] Fix salary notification method + enum

## Milestone 8 — Reporting (not started)

- [ ] Bank NEFT / CSV export
- [ ] Compliance registries

## Known V1 defects to address in coding milestones (tracked)

- [ ] Eliminate double LOP path
- [ ] Fix pro-rata flat-structure adapter
- [ ] Restrict or audit `DELETE /salary-structures/all`
- [ ] Populate YTD on slips
