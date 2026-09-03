---
Purpose: Staging → prod procedure to enable PAYROLL_V2_ENGINE after R3 sign-off.
Status: Active prep (R6) — flag remains false until explicit env change
Last Updated: 2026-07-27
---

# Payroll V2 engine cutover runbook (R6)

**Goal:** Persist V2 totals on newly generated slips by setting `PAYROLL_V2_ENGINE=true` on a named environment, only after R3 dual-run CTO sign-off.

**Code path (PH-01):** `selectPersistableTotals` + `resolveSlipFieldsFromEngine` (`persistableSlipMapper.js`) — when the flag is true, `generateSalarySlip` / bulk generate persist V2-mapped earnings/deductions; when false, V1 maps (including pro-rata) are unchanged. Dual-run logging continues.

**This milestone does not flip the flag in git.** Default remains false (see `backend/.env.example`).

---

## 0. Hard gates (do not skip)

- [ ] R3 full-month dual-run on staging/clone completed (`DUAL_RUN_OPS_RUNBOOK.md`)
- [ ] Summary: mismatched = 0 **or** every mismatch has an entry in `DUAL_RUN_DECISION_LOG.md` with disposition + approval
- [ ] Written CTO / Finance lead approval to enable V2 persist on **named env**
- [ ] R1 correctness (single LOP + flat pro-rata) and R2 hygiene are on the deployed build
- [ ] Kill-switch owner identified (see `ENGINE_KILL_SWITCH.md`)
- [ ] Rollback window agreed (same payroll cycle)

If any box is unchecked → **stop**. Leave `PAYROLL_V2_ENGINE` unset/`false`.

---

## 1. Pre-flight (staging)

1. Confirm current env: `PAYROLL_V2_ENGINE` is false.
2. Note optional related flags: `PAYROLL_PERIOD_GATES` (R5) — enable independently; recommend gates **on** in staging before cutover so locked periods cannot mutate after review.
3. Snapshot / backup DB (or confirmed staging restore point).
4. Record cohort month/year that will be the first V2-persisted generate (prefer a non-prod month or a small pilot set).
5. Re-run dual-run for that month (`mismatchesOnly=true`); attach CSV to the decision log.

---

## 2. Enable on staging

1. Set in staging secrets / `.env` (not committed):

   ```bash
   PAYROLL_V2_ENGINE=true
   ```

2. Restart API processes so `isPayrollV2EngineEnabled()` picks up the change.
3. Generate **one** pilot slip (or small bulk) for the agreed month.
4. Verify slip net matches dual-run V2 within ₹1; spot-check gross / LOP / statutory lines.
5. Run bank/register export dry-run if Accounts will use Exports tab (period must allow export if gates are on).

---

## 3. One-cycle monitoring

For the remainder of the staging payroll cycle, watch:

| Signal | Action |
|--------|--------|
| Dual-run logs / month CSV new mismatches | Triage; kill-switch if systematic |
| Employee / HR pay disputes | Pause further generates; kill-switch if V2-caused |
| Generate / mark-paid errors | Check period gates + structure data first |
| Export totals vs prior V1 month | Investigate before prod |

Document outcomes in CHANGELOG / decision log.

---

## 4. Production criteria (separate change)

Only after staging cycle sign-off:

- [ ] Staging cutover cycle clean
- [ ] New written approval for **production**
- [ ] Kill-switch owner on-call for payday window
- [ ] Prod `PAYROLL_V2_ENGINE=true` via secrets manager (never commit)
- [ ] Same pilot → full cohort sequence as staging

Prod enable is an **ops ticket**, not a code merge.

---

## 5. What this runbook does not do

- Does not migrate historical paid slips to V2 amounts
- Does not replace V1 structure flat fields (that is R7+)
- Does not auto-enable period gates (R5 flag is separate)

---

## Related docs

- [DUAL_RUN_OPS_RUNBOOK.md](./DUAL_RUN_OPS_RUNBOOK.md)
- [DUAL_RUN_DECISION_LOG.md](./DUAL_RUN_DECISION_LOG.md)
- [ENGINE_KILL_SWITCH.md](./ENGINE_KILL_SWITCH.md)
