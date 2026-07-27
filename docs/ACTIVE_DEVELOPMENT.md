---
Purpose: Single source of truth for every AI development session on We Alll Office.
Scope: Platform-wide active work pointer. Update this file whenever feature, phase, milestone, or branch changes.
Owner: Lead Architect / Session Lead
Status: Active
Last Updated: 2026-07-27
---

# Active Development

**Every AI coding or documentation session must read this file first.**

---

| Field | Value |
|-------|--------|
| **Current Feature** | Payroll & Salary Management System V2 |
| **Current Phase** | Integration / Hardening (Enterprise R-milestones) |
| **Current Milestone** | **R1 — Correctness hotfix** (**complete — awaiting review**) |
| **Current Branch** | `fix/payroll-double-lop-prorata` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | Double LOP removed; flat pro-rata adapter added. Keep `PAYROLL_V2_ENGINE=false`. Do **not** start R2 until R1 approved. |
| **Last Updated** | 2026-07-27 |

---

## Session start checklist

1. Read this file (`docs/ACTIVE_DEVELOPMENT.md`).
2. Read the Implementation Workspace / product spec.
3. Confirm **Current Branch** matches `git branch --show-current`.
4. Implement **only** the Current Milestone (if coding is approved).

---

## Rules

* Do not start the next R-milestone until this file is updated **and** a human approves.
* Do **not** set `PAYROLL_V2_ENGINE=true` without dual-run sign-off (R3).

---

## R1 scope (this milestone)

* Single attendance money path: `LeaveImpactCalculator` → `lossOfPay` only
* Stop writing `unpaidLeaveDeduction` on generate / bulk / recalculate (legacy field forced to 0)
* `toProRataComponentMaps` adapter for flat SalaryStructure in pro-rata calculator
* Golden unit tests (`payrollCorrectness.r1.unit.test.js`)

**Next (not started):** R2 — Hygiene (`DELETE /all`, route order, notify on deploy)

**Out of scope for R1:** Period gates, ops UI, historical auto bulk-recalc of all paid slips (use recalculate APIs opt-in).
