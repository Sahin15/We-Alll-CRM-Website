---
Purpose: Final Go-Live Gate — all green before PAYROLL_V2_ENGINE=true.
Last Updated: 2026-08-04
Status: AMBER — code hardening landed; dual-run / sign-off still open
---

# Production Hardening — Go-Live Gate

**Payroll V2 cannot be enabled until every row below is green.**

Only then may: `PAYROLL_V2_ENGINE=true` on a named environment.

**Status key:** `[x]` = code/unit evidence on develop/staging · `[ ]` = still needs staging ops / human sign-off

---

## Gate checklist

| # | Gate | PH | Status |
|---|------|-----|--------|
| G1 | Engine wiring complete (persist uses flag) | PH-01 | [x] |
| G2 | Payroll calculations verified (engine + generate aligned) | PH-01,03 | [x] code; confirm in PH-10 cohort |
| G3 | Attendance verified (incl. absent to LOP) | PH-02 | [x] code; confirm in PH-10 cohort |
| G4 | Leave verified (unpaid codes; no double LOP) | PH-02,03 | [x] code; confirm in PH-10 cohort |
| G5 | Proration verified | PH-04 | [x] code; confirm in PH-10 cohort |
| G6 | LOP verified (base aligned) | PH-02,04 | [x] code; confirm in PH-10 cohort |
| G7 | Employer statutory verified (net unchanged when flag on) | existing R8 | [ ] spot-check during PH-10 |
| G8 | No duplicate payroll slips (unique + skip) + job reclaim | existing + PH-09 | [x] |
| G9 | No duplicate payments (export only approved; mark-paid controls) | PH-07,06 | [x] |
| G10 | Period locking verified (gates on; update protected) | PH-06,08 | [x] |
| G11 | Approval workflow verified (incl. bulkApprove policy) | PH-13 | [x] |
| G12 | Export verified (bank hard-gate) | PH-07 | [x] |
| G13 | Notifications verified (acceptable policy for go-live) | PH-14 or accepted | [ ] accept or fix |
| G14 | Full dual-run completed + mismatches dispositioned | PH-10 | [ ] NEXT |
| G15 | Finance approved | PH-11 | [ ] |
| G16 | CTO approved | PH-12 prep | [ ] |
| G17 | Negative net policy enforced | PH-05 | [x] |
| G18 | Job recovery acceptable for target scale | PH-09 | [x] |
| G19 | Kill-switch rehearsed | PH-12 | [ ] |
| G20 | Rollback strategy acknowledged | — | [ ] |

---

## Enablement rule

```
IF any gate unchecked → PAYROLL_V2_ENGINE must remain false
IF all gates green + written CTO/Finance approval → enable per ENGINE_CUTOVER_RUNBOOK
```

---

## Sign-off

| Role | Name | Date | Signature / ticket |
|------|------|------|--------------------|
| Engineering Lead | | | |
| QA / Architect | | | |
| Finance | | | |
| HR | | | |
| CTO | | | |

---

## Current decision

| Date | Decision | By |
|------|----------|-----|
| 2026-07-27 | **NO GO** — gates red; hardening program opened | Production readiness audit |
| 2026-08-04 | **AMBER** — PH-01…09 + PH-13 on develop/staging; PH-10 dual-run next | Hardening waves |