---
Purpose: Test strategy for Production Hardening P0 (no feature expansion).
Last Updated: 2026-07-27
---

# Production Hardening — Test Plan

## Goals

Prove **pay correctness**, **control integrity**, and **cutover safety** — not new features.

## Layers

| Layer | Scope | Cadence |
|-------|--------|---------|
| Unit | Engine, leave/LOP, gates, export status, jobs reclaim, negative net | Every PH PR |
| Integration | Generate → approve → export → mark-paid with gates on | After Wave B |
| Staging dual-run | Full month V1 vs V2 | PH-10 |
| UAT | HR generate; Finance export; approval path | Before PH-11 |
| Cutover pilot | ≤50 employees flag on | PH-12 staging then prod |

## Required regression packs (must stay green)

| Pack | Files / focus |
|------|----------------|
| R1 correctness | `payrollCorrectness.r1.unit.test.js` + new absent/pro-rata |
| R2 hygiene | `payrollHygiene.r2.unit.test.js` |
| R3 dual-run tooling | `dualRunMonthReport.r3.unit.test.js` |
| R5 gates | `payrollPeriodGates.r5.unit.test.js` + update/recalc |
| R8 employer | `employerStatutory.r8.unit.test.js` (net unchanged) |
| R9 jobs | `payrollJobs.r9.unit.test.js` + reclaim |
| Engine/formula | `payrollEngine`, `formulaEngine`, attendance rules |

## Scenario matrix (manual / integration)

| ID | Scenario | Expect |
|----|----------|--------|
| T1 | Flag off generate | V1 net; dual-run may log |
| T2 | Flag on generate (after PH-01) | V2 net within ₹1 of dual-run |
| T3 | Absent attendance day | LOP > 0 |
| T4 | Half-day / OT | Matches policy matrix |
| T5 | Mid-month structure + absence | Proration + LOP coherent |
| T6 | Deductions > gross | Reject or clamp per PH-05 |
| T7 | Locked period generate | Blocked (gates on) |
| T8 | Locked period PUT | Blocked (PH-08) |
| T9 | Bank export generated status | Rejected (PH-07) |
| T10 | Bank export approved | CSV OK |
| T11 | Unique emp/month/year | No duplicate slip |
| T12 | Job kill mid-run | Reclaim; complete; no dup slips |
| T13 | bulkApprove policy | Denied if restricted |
| T14 | Employer statutory on | Net unchanged; CTC may change |

## Non-goals for this plan

- Load test 5000 employees (document only until Redis)
- Full statutory EPFO engine certification
- Mobile UX

## Exit criteria for PH-10

- All unit packs green on CI/local for payroll pattern
- Staging scenarios T1–T14 executed and signed
- Dual-run packet attached

## Exit criteria for PH-12

- GO_LIVE_GATE 100% green
- Kill-switch drill completed once on staging
