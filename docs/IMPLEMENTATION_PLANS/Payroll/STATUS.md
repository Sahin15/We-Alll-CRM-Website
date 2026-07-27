---
Purpose: Live status of Payroll V2 work (post M1–M8 → R-milestones).
Last Updated: 2026-07-27
---

# Payroll V2 — Status

| Field | Value |
|-------|--------|
| **Feature** | Payroll & Salary Management System V2 |
| **Phase** | Integration / Hardening |
| **Milestone** | R8 — Employer statutory foundation |
| **Branch** | `feature/payroll-statutory-fnf` |
| **Base** | `feature/payroll-structure-components` (R7 tip) |
| **Code implementation** | R8 foundation complete — **awaiting review** |
| **Engine flag** | Keep `PAYROLL_V2_ENGINE` **false** |
| **Employer statutory** | `PAYROLL_EMPLOYER_STATUTORY` default **false** |
| **Next** | R9 — Jobs / scale — **not started** (or F&F follow-on) |

---

## Progress

| Area | Status |
|------|--------|
| R0–R7 | Done |
| R8 — PF_ER / ESI_ER catalog | Done |
| R8 — Helpers + V2 employer lines | Done |
| R8 — Tests | Done |
| R8 — F&F | Not started |
| R9+ | Not started |

---

## R8 deliverables

| Artifact | Path |
|----------|------|
| Helpers | `backend/src/services/payroll/employerStatutory.js` |
| Catalog | `PF_ER`, `ESI_ER` in `salaryComponentCatalog.js` |
| Engine | `buildV2Result` → `employerLines` + CTC totals when flag on |
| Tests | `employerStatutory.r8.unit.test.js` |
| Flag | `backend/.env.example` |

### Rates (defaults)

* PF_ER = 12% of BASIC  
* ESI_ER = 3.25% of (BASIC+HRA+SPECIAL+TRANSPORT+MEDICAL) when EE ESI > 0  
* Override: `PAYROLL_PF_ER_RATE`, `PAYROLL_ESI_ER_RATE`

---

## Blockers

1. Human review before F&F / R9.
