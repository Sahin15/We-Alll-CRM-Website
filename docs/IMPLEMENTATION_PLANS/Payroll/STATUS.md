---
Purpose: Live status of Payroll V2 work (post M1–M8 → R-milestones).
Last Updated: 2026-07-27
---

# Payroll V2 — Status

| Field | Value |
|-------|--------|
| **Feature** | Payroll & Salary Management System V2 |
| **Phase** | Integration / Hardening |
| **Milestone** | R1 — Correctness hotfix |
| **Branch** | `fix/payroll-double-lop-prorata` |
| **Base** | `integrate/payroll-v2-stack` |
| **Code implementation** | R1 complete — **awaiting review** |
| **Engine flag** | Keep `PAYROLL_V2_ENGINE` **false** |
| **Next** | R2 — Hygiene — **not started** |

---

## Progress

| Area | Status |
|------|--------|
| R0 — Integration | Done on `integrate/payroll-v2-stack` |
| R1 — Double LOP removed | Done |
| R1 — Flat pro-rata adapter | Done |
| R1 — Tests | Done (`payrollCorrectness.r1.unit.test.js`) |
| R2+ | Not started |

---

## R1 deliverables

| Artifact | Path |
|----------|------|
| Helpers | `backend/src/services/payroll/payrollCorrectnessHelpers.js` |
| Pro-rata | `backend/src/utils/proRataSalaryCalculator.js` (uses adapter) |
| Slip generate/bulk/recalc | `salarySlipController.js` — no second unpaid path |
| Model note | `unpaidLeaveDeduction` deprecated when LOP includes impact |

### Ops note

Existing slips that already have both `lossOfPay` and `unpaidLeaveDeduction` populated can be fixed via **recalculate** APIs (draft/generated only) — does not auto-mutate paid slips.

---

## Blockers

1. Human review before R2.
