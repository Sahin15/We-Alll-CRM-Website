# Simplified Payroll Model — Implementation Plan

> **For agentic workers:** Implement task-by-task. Keep `PAYROLL_V2_ENGINE=false`. Additive only — do not break legacy flat structures.

**Goal:** Ship SMB-simple payroll (Monthly Salary − auto −/+ adjustments − TDS = Net) behind an additive path without removing V1 allowance fields yet.

**Architecture:** New `payrollMode: legacy | simple` on structures; `monthlySalary` + `tdsEnabled`; `PayrollAdjustment` collection; pure calc service `simplePayrollCalculator.js`. Generate/preview wiring comes in later tasks.

**Tech Stack:** Node/Express/Mongoose (JS only), Jest unit tests, React later.

**Spec:** `docs/PAYROLL_SIMPLIFIED_MODEL.md`

**Branch:** `feature/payroll-simplified-model` (from `develop`)

## Global Constraints

- Pure JavaScript only (no TypeScript)
- Additive schema — legacy `basicSalary`/HRA fields remain required for old records
- No `PAYROLL_V2_ENGINE=true`
- No mass refactor of salarySlipController in SP-01/SP-02
- Tests in `backend/tests/`

---

## File map

| File | Responsibility |
|------|----------------|
| `backend/src/models/payrollAdjustmentModel.js` | Adjustment docs + audit entries |
| `backend/src/services/payroll/simplePayrollCalculator.js` | Pure formula helpers |
| `backend/src/models/salaryStructureModel.js` | Add `payrollMode`, `monthlySalary`, `tdsEnabled` |
| `backend/src/controllers/payrollAdjustmentController.js` | CRUD + approve |
| `backend/src/routes/payrollAdjustmentRoutes.js` | Routes |
| `backend/src/server.js` | Mount `/api/payroll/adjustments` |
| `backend/tests/simplePayrollCalculator.unit.test.js` | Formula tests |
| `backend/tests/payrollAdjustment.model.unit.test.js` | Model shape / sign helpers if pure |

---

## Task SP-01 — Calculator + adjustment model

**Deliverable:** Pure calc + Mongoose model + passing unit tests.

- [x] Create `simplePayrollCalculator.js` with: `perDaySalary`, `amountForDays`, `sumAdjustments`, `computeSimpleNet`
- [x] Write failing/passing Jest tests for ÷30, 1-day/2-day late, net formula, negative guard
- [x] Create `payrollAdjustmentModel.js` (types, amounts, reason, auditTrail, status draft/approved/rejected/void)
- [x] Run `npx jest simplePayrollCalculator`

---

## Task SP-02 — Structure fields + adjustment HTTP API

**Deliverable:** Additive structure fields; authenticated adjustment routes.

- [x] Add optional `payrollMode` (`legacy` default), `monthlySalary`, `tdsEnabled` to salary structure schema
- [x] When `payrollMode === 'simple'`, allow create with `monthlySalary` and mirror into `basicSalary` for legacy compatibility (shadow)
- [x] Controller + routes: list by employee/month, create, approve, void
- [x] Mount in `server.js` with `payroll.slip.manage` (or new permission if catalog easy)
- [x] Unit test approve sign / list filter helpers if extracted (`simpleStructurePrepare`)

---

## Task SP-03 — Preview breakdown service (next session)

Wire simple mode into a read-only preview DTO (auto lines + adjustments + TDS + net). No full UI rewrite yet.

---

## Task SP-04 — Generate path (next session)

Optional flag or structure mode: persist simple net into slip fields safely.

---

## Task SP-05 — HR UI (next session)

Simplified structure form + preview expandable sections + adjustments panel.

---

## Done when (this session)

SP-01 + SP-02 on feature branch; docs pointer updated; tests green. **Met 2026-07-28.**
