---
Purpose: Go-live gate checklist for Payroll V2 engine enablement (real pay).
Last Updated: 2026-07-27
Current audit verdict: NO GO — do not tick "Enable engine" until all Hard Gates pass.
---

# Payroll V2 — Go-Live Checklist

Use with `PRODUCTION_READINESS_REPORT.md`, `RISK_REGISTER.md`, `ENGINE_CUTOVER_RUNBOOK.md`, and `RELEASE_CHECKLIST.md`.

**Rule:** If any **Hard Gate** is unchecked → leave `PAYROLL_V2_ENGINE=false`.

---

## A. Hard gates (blocking)

| # | Gate | Owner | Done |
|---|------|-------|------|
| H1 | Generate/bulk/recalc **persist** selected engine totals when flag true (wiring verified in code + pilot slip) | Eng | [ ] |
| H2 | Cutover runbook matches actual code path (no overclaim) | Eng | [ ] |
| H3 | Fix LOP for attendance `status: absent` (and agreed statuses) | Eng | [ ] |
| H4 | Single attendance/leave money policy for generate + dual-run | Eng | [ ] |
| H5 | LOP base aligned with persisted (pro-rata) earnings | Eng | [ ] |
| H6 | Negative net: reject or documented clamp | Eng | [ ] |
| H7 | Staging full-month dual-run completed; mismatches logged | Ops/Finance | [ ] |
| H8 | CTO + Finance written approval for named env | CTO/Finance | [ ] |
| H9 | `PAYROLL_PERIOD_GATES=true` on target env | Ops | [ ] |
| H10 | Bank export hard-requires `approved` (remove/forbid `generated` for NEFT) | Eng/Finance | [ ] |
| H11 | Slip update gated when period locked | Eng | [ ] |
| H12 | Kill-switch owner + rollback window agreed | Ops | [ ] |
| H13 | Pilot cohort (≤50) one full cycle on staging with V2 persist | HR/Eng | [ ] |

---

## B. Strongly recommended before >300 employees

| # | Item | Done |
|---|------|------|
| S1 | Job `running` reclaim after restart | [ ] |
| S2 | Job dedupe by type+month+year | [ ] |
| S3 | Disable or serialize sync bulk when jobs enabled | [ ] |
| S4 | Restrict `bulkApprove` / dual control | [ ] |
| S5 | Notify on approve (not generate) or status-gated | [ ] |
| S6 | Integration tests for generate → approve → export → mark-paid | [ ] |
| S7 | Load test target headcount | [ ] |

---

## C. Pre-enable day

| # | Item | Done |
|---|------|------|
| C1 | Confirm `PAYROLL_V2_ENGINE=false` currently | [ ] |
| C2 | DB backup / restore point | [ ] |
| C3 | Re-run dual-run `mismatchesOnly` for go-live month | [ ] |
| C4 | HR/Finance on-call for payday window | [ ] |
| C5 | Monitoring: dual-run warnings, generate errors, export totals | [ ] |

---

## D. Enable sequence (only after A)

1. Set `PAYROLL_V2_ENGINE=true` in **staging** secrets → restart.  
2. Generate **one** pilot slip → compare to dual-run V2 within ₹1.  
3. Complete staging cycle.  
4. Separate written approval for **production**.  
5. Enable prod → pilot → full cohort.  
6. Keep kill switch rehearsed (`ENGINE_KILL_SWITCH.md`).

---

## E. Explicit non-goals for go-live day

- Do not enable `PAYROLL_EMPLOYER_STATUTORY` unless Finance asked (net-safe but CTC changes).  
- Do not merge unfinished F&F / cron / Redis as blockers for small staging pilot (they block scale).  
- Do not delete V1 APIs.

---

## F. Decision log

| Date | Env | Decision | Approver | Notes |
|------|-----|----------|----------|-------|
| 2026-07-27 | — | **NO GO** (audit) | Architect audit | See PRODUCTION_READINESS_REPORT.md |
| | | | | |
