---
Purpose: Live status of Payroll V2 work (post M1–M8 → R-milestones).
Last Updated: 2026-07-27
---

# Payroll V2 — Status

| Field | Value |
|-------|--------|
| **Feature** | Payroll & Salary Management System V2 |
| **Phase** | Integration / Hardening |
| **Milestone** | R2 — Hygiene |
| **Branch** | `fix/payroll-hygiene` |
| **Base** | `fix/payroll-double-lop-prorata` (R1 tip) |
| **Code implementation** | R2 complete — **awaiting review** |
| **Engine flag** | Keep `PAYROLL_V2_ENGINE` **false** |
| **Next** | R3 — Dual-run validation — **not started** |

---

## Progress

| Area | Status |
|------|--------|
| R0 — Integration | Done on `integrate/payroll-v2-stack` |
| R1 — Correctness | Done on `fix/payroll-double-lop-prorata` |
| R2 — DELETE `/all` removed | Done |
| R2 — Slip route order | Done |
| R2 — Notify deploy check | Done |
| R2 — Tests | Done (`payrollHygiene.r2.unit.test.js`) |
| R3+ | Not started |

---

## R2 deliverables

| Artifact | Path |
|----------|------|
| Structures | `salaryStructureRoutes.js` — no `DELETE /all` |
| Controller | `deleteAllSalaryStructures` removed |
| Frontend | `salaryApi.js` — `deleteAll` client removed |
| Slips | `salarySlipRoutes.js` — static GETs before `/:id` |
| Tests | `payrollHygiene.r2.unit.test.js` |

### Deploy note

Generate / bulk-generate must keep calling `NotificationService.sendSalarySlipNotification` with type `salary_slip_generated` (enum on notification model). Failures remain non-blocking.

---

## Blockers

1. Human review before R3.
