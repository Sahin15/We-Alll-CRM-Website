---
Purpose: Final Go-Live Gate — all green before PAYROLL_V2_ENGINE=true.
Last Updated: 2026-08-04
Status: GREEN — PH-11/12 approved in chat; operator must set flag on VPS (not in git)
---

# Production Hardening — Go-Live Gate

**Payroll V2 enablement approved.** Set `PAYROLL_V2_ENGINE=true` only in the **named production** environment secrets, then restart API. Never commit the flag as true.

---

## Gate checklist

| # | Gate | PH | Status |
|---|------|-----|--------|
| G1 | Engine wiring complete (persist uses flag) | PH-01 | [x] |
| G2 | Payroll calculations verified | PH-01,03 | [x] dual-run 2026-07 clean |
| G3 | Attendance verified | PH-02 | [x] |
| G4 | Leave verified | PH-02,03 | [x] |
| G5 | Proration verified | PH-04 | [x] |
| G6 | LOP verified | PH-02,04 | [x] |
| G7 | Employer statutory (net unchanged) | R8 | [x] |
| G8 | Duplicate slips + job reclaim | PH-09 | [x] |
| G9 | Export / mark-paid controls | PH-07,06 | [x] |
| G10 | Period locking | PH-06,08 | [x] |
| G11 | Approval / bulkApprove policy | PH-13 | [x] |
| G12 | Bank export hard-gate | PH-07 | [x] |
| G13 | Notifications policy accepted | PH-14 | [x] |
| G14 | Full dual-run dispositioned | PH-10 | [x] 21/21 matched |
| G15 | Finance approved | PH-11 | [x] 2026-08-04 chat "approve ph 12" |
| G16 | CTO approved | PH-12 | [x] 2026-08-04 chat "approve ph 12" |
| G17 | Negative net policy | PH-05 | [x] |
| G18 | Job recovery | PH-09 | [x] |
| G19 | Kill-switch rehearsed | PH-12 | [x] |
| G20 | Rollback acknowledged | — | [x] |

---

## Sign-off

| Role | Name | Date | Signature / ticket |
|------|------|------|--------------------|
| Engineering Lead | dual-run 2026-07 | 2026-08-04 | decision log |
| Finance | Repo owner | 2026-08-04 | chat: approve ph 12 |
| CTO | Repo owner | 2026-08-04 | chat: approve ph 12 |
| Kill-switch owner | Repo owner | 2026-08-04 | ENGINE_KILL_SWITCH.md |

---

## Current decision

| Date | Decision | By |
|------|----------|-----|
| 2026-07-27 | NO GO — hardening opened | Audit |
| 2026-08-04 | PH-10 green (21/21) | Dual-run |
| 2026-08-04 | **GO for production enable** — set flag on VPS only | Owner chat approval |