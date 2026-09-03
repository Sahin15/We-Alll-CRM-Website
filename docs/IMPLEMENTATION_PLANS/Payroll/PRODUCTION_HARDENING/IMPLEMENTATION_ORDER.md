---
Purpose: Mandatory implementation sequence for Production Hardening P0.
Last Updated: 2026-07-27
---

# Production Hardening — Implementation Order

**Rule:** Correctness before controls before scale before cutover. Do not skip ahead to PH-12.

```
PH-01  Engine persist wiring
  ├─ PH-02  Absent → LOP          (parallel with PH-01 OK)
  └─ PH-03  Half-day / OT align   (after PH-02)
        └─ PH-04  Proration standardize
              └─ PH-05  Negative net guard
PH-06  Mandatory period gates     (parallel after PH-01 start OK)
  └─ PH-08  Slip update after lock
PH-07  Bank export ≥ approved     (parallel with PH-06 OK)
PH-13  bulkApprove control        (before PH-12)
PH-09  Job crash recovery         (before large staging / multi-instance)
PH-10  Staging dual-run
  └─ PH-11  Finance sign-off
        └─ PH-12  Production cutover
```

---

## Ordered backlog

| Order | ID | Title | Why this order |
|------:|----|-------|----------------|
| 1 | **PH-01** | Wire engine into persistence | Without this, cutover is meaningless / misleading |
| 2 | **PH-02** | Absent → LOP | Critical overpay on live V1 path too |
| 3 | **PH-03** | Half-day / OT alignment | Dual-run must mean generate |
| 4 | **PH-04** | Standardize proration | Depends on attendance/LOP policy |
| 5 | **PH-05** | Negative net | After totals paths stable |
| 6 | **PH-06** | Mandatory period gates | Lock must be real before banking |
| 7 | **PH-07** | Bank export before approval | Payment file integrity |
| 8 | **PH-08** | Protect slip updates after lock | Completes period control with PH-06 |
| 9 | **PH-13** | Restrict bulkApprove | Control bypass before go-live |
| 10 | **PH-09** | Job crash recovery | Before large dual-run / multi-node |
| 11 | **PH-10** | Staging dual-run | Evidence after code correctness |
| 12 | **PH-11** | Finance sign-off | Human gate |
| 13 | **PH-12** | Production cutover | Last |

**Optional hygiene (schedule when capacity):** PH-14 notifications, PH-15 duplicate-key handling.

---

## Parallelization

| Wave | Items | Notes |
|------|-------|-------|
| Wave A | PH-01, PH-02, PH-06, PH-07 | Different modules; careful integration |
| Wave B | PH-03, PH-04, PH-05, PH-08, PH-13 | After Wave A merges |
| Wave C | PH-09 | Before heavy staging load |
| Wave D | PH-10 → PH-11 → PH-12 | Serial ops |

---

## Explicitly deferred (blocked until gate green)

- R7b structure catalog UI  
- R8b F&F calculator  
- R9b cron / Redis productization (beyond PH-09 reclaim)  
- YTD product features  
- New roadmap items outside this folder  

---

## Effort estimate (engineering)

| Band | Items | Days (eng) |
|------|-------|------------:|
| Critical wiring + calc | PH-01–05 | 12–18 |
| Controls | PH-06–08, PH-13 | 5–8 |
| Jobs | PH-09 | 2–4 |
| Ops dual-run + cutover | PH-10–12 | 5–10 calendar (not all eng) |
| **Total eng** | | **~20–30 eng-days** |
| **Calendar (1–2 eng)** | | **~4–7 weeks** |

Assumes focused P0; excludes Redis rewrite.
