---
Purpose: Per-blocker acceptance criteria, regression tests, manual cases, rollback.
Last Updated: 2026-07-27
---

# Production Hardening — Verification Checklist

For each PH item: **Acceptance Criteria** · **Regression Tests** · **Manual Test Cases** · **Rollback Plan**

---

## PH-01 — Engine persist wiring

**Acceptance**
- [ ] Flag false: generate/bulk nets identical to pre-change V1 (golden fixtures)
- [ ] Flag true: persisted net == dual-run V2 totals within ₹1
- [ ] Cutover runbook describes actual code path
- [ ] Dual-run still logs when configured

**Regression**
- [ ] Extend `payrollEngine.unit.test.js` for `selectPersistableTotals`
- [ ] Controller-level or service test: persist mapping with flag on/off

**Manual**
- [ ] Staging: one employee generate flag off → record net
- [ ] Staging: same employee delete draft only if allowed / use next month; flag on → net matches dual-run API

**Rollback**
- [ ] Set `PAYROLL_V2_ENGINE=false` + restart (immediate)
- [ ] Revert PR if mapping buggy; no migration required

---

## PH-02 — Absent → LOP

**Acceptance**
- [ ] Attendance `absent` (and agreed statuses) counts as unpaid day
- [ ] `present` / `half_day` / WFH policies per PH-03 unchanged until PH-03 lands
- [ ] No double-count with approved unpaid leave same day

**Regression**
- [ ] Unit fixtures in leave impact / correctness tests for absent status

**Manual**
- [ ] Create absent attendance for working day → generate → LOP amount > 0

**Rollback**
- [ ] Revert PR; document temporary overpay risk if rolled back mid-cycle

---

## PH-03 — Half-day / OT alignment

**Acceptance**
- [ ] Documented policy matrix (status → money effect)
- [ ] Generate and `processEmployeePayroll` apply same matrix
- [ ] Dual-run for fixture within ₹1 when flag paths aligned

**Regression**
- [ ] Shared helper unit tests; generate integration with mocked attendance

**Manual**
- [ ] Half-day day; OT hours day — compare slip vs dual-run JSON

**Rollback**
- [ ] Feature flag or revert to prior generate-only behaviour if needed

---

## PH-04 — Proration standardize

**Acceptance**
- [ ] Written proration policy in DECISIONS
- [ ] LOP base == persisted earnings gross (or explicit exception logged)
- [ ] Component amount `0` does not fall back to full structure

**Regression**
- [ ] Golden mid-month + absence cases; nullish coalescing test

**Manual**
- [ ] Employee with structure change mid-month + 1 absent day

**Rollback**
- [ ] Revert PR; re-generate only draft/generated slips if any wrong

---

## PH-05 — Negative net

**Acceptance**
- [ ] Policy chosen (fail closed **preferred**)
- [ ] Generate rejects or clamps with audit field
- [ ] Bank export never sees negative net as payable without review

**Regression**
- [ ] Engine + model tests for net < 0

**Manual**
- [ ] Force high LOP + deductions > gross → observe reject/clamp

**Rollback**
- [ ] Revert guard only after confirming no invalid slips in DB for cycle

---

## PH-06 — Mandatory period gates

**Acceptance**
- [ ] Staging/prod go-live env has `PAYROLL_PERIOD_GATES=true`
- [ ] Locked period blocks generate/export/mark-paid
- [ ] `.env.example` + ops docs state mandatory for go-live

**Regression**
- [ ] Existing `payrollPeriodGates.r5.unit.test.js` green; add “prod recommendation” doc test if any

**Manual**
- [ ] Freeze/lock period → attempt generate → blocked

**Rollback**
- [ ] Set gates false only with CTO written exception (temporary)

---

## PH-07 — Bank export approval

**Acceptance**
- [ ] NEFT endpoint rejects non-`approved` status
- [ ] UI cannot select `generated` for bank export
- [ ] Compliance registers policy documented (may differ)

**Regression**
- [ ] Report service/controller unit tests for status enforcement

**Manual**
- [ ] Export month with only generated slips → fail; approve one → succeeds for that set

**Rollback**
- [ ] Revert hard-require only with Finance exception

---

## PH-08 — Slip update after lock

**Acceptance**
- [ ] Locked (+ optionally frozen per policy): PUT/recalc blocked
- [ ] Open period: draft/generated editable

**Regression**
- [ ] Controller tests with gates on

**Manual**
- [ ] Lock period → edit slip → blocked

**Rollback**
- [ ] Revert gate on update; keep generate gates if possible

---

## PH-09 — Job crash recovery

**Acceptance**
- [ ] Stale `running` jobs reclaimable (TTL/heartbeat)
- [ ] Re-run does not duplicate slips (unique index + skip)
- [ ] Multi-instance limitation documented if still in-process

**Regression**
- [ ] Job service unit tests for reclaim

**Manual**
- [ ] Kill process mid-job → restart → reclaim → complete

**Rollback**
- [ ] Disable reclaim if false positives; manual status fix

---

## PH-10 — Staging dual-run

**Acceptance**
- [ ] Full month CSV produced
- [ ] Mismatches = 0 or all in decision log with disposition
- [ ] Attached to go-live packet

**Regression**
- [ ] N/A (ops); tooling tests already exist

**Manual**
- [ ] Follow `DUAL_RUN_OPS_RUNBOOK.md` end-to-end

**Rollback**
- [ ] Do not enable engine; remain on V1 persist

---

## PH-11 — Finance sign-off

**Acceptance**
- [ ] Named Finance (+ HR if required) signature/date
- [ ] Scope: month, env, residual accepted risks

**Manual**
- [ ] Review dual-run packet + sample slips + export dry-run

**Rollback**
- [ ] Withhold PH-12

---

## PH-12 — Production cutover

**Acceptance**
- [ ] All GO_LIVE_GATE items green
- [ ] CTO approval recorded
- [ ] Pilot then full cohort
- [ ] Kill-switch owner on-call

**Manual**
- [ ] Per `ENGINE_CUTOVER_RUNBOOK.md`

**Rollback**
- [ ] `PAYROLL_V2_ENGINE=false` + restart immediately (`ENGINE_KILL_SWITCH.md`)

---

## PH-13 — bulkApprove control

**Acceptance**
- [ ] bulkApprove restricted (role, dual control, or disabled)
- [ ] Stage `act` still works for rightful approvers

**Regression**
- [ ] Approval service tests

**Manual**
- [ ] Non-privileged / policy-violating bulkApprove denied

**Rollback**
- [ ] Re-enable with Finance exception only
