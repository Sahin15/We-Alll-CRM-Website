---
Purpose: Immediate rollback when PAYROLL_V2_ENGINE=true causes incorrect persisted slips.
Status: Active (R6)
Last Updated: 2026-07-27
---

# Payroll V2 engine kill-switch (R6)

**Owner (fill at cutover):** _________________  
**Escalation:** CTO / Finance lead / on-call backend

---

## When to pull the kill-switch

Pull immediately if any of the following occur after `PAYROLL_V2_ENGINE=true`:

- Systematic dual-run net diffs > ₹1 on new generates
- Multiple employees with wrong net vs agreed V1 baseline
- Formula / component mapping bug suspected in V2 path
- Inability to explain diffs via `DUAL_RUN_DECISION_LOG.md`

Do **not** wait for a full investigation to unset the flag.

---

## Kill-switch steps (order matters)

1. **Set flag false** in the affected environment secrets / `.env`:

   ```bash
   PAYROLL_V2_ENGINE=false
   ```

   Or remove the variable (unset = false).

2. **Restart** API workers / containers so the process env reloads.

3. **Confirm** via a safe check (e.g. dual-run preview / logs showing `v2Enabled: false`, or generate a test slip on staging and confirm V1 totals persist).

4. **Stop** further V2-persisted generates for the cycle.

5. **Notify** HR/Accounts: new slips may need recalculation / regeneration under V1.

6. **Open** an incident note: env, time, month/year, sample employee IDs, dual-run CSV link.

---

## After the flag is false

| Situation | Guidance |
|-----------|----------|
| Draft / generated slips created while V2 was on | Prefer **recalculate** (if period allows) or delete+regenerate under V1; do not silently edit paid slips |
| Paid / locked period | Do **not** mass-mutate; use controlled unlock (R5) + Finance approval, or adjustment slips in a later cycle |
| Root cause unknown | Keep flag false; fix in code; re-run R3 dual-run before any re-enable |

---

## What not to do

- Do not commit `PAYROLL_V2_ENGINE=true` to the repo
- Do not “fix forward” by editing net amounts manually in DB
- Do not re-enable the same day without a fresh dual-run sample and written approval
- Do not confuse this with `PAYROLL_PERIOD_GATES` — leaving gates on during kill-switch is fine and often desirable

---

## Re-enable checklist

Re-enable only via [ENGINE_CUTOVER_RUNBOOK.md](./ENGINE_CUTOVER_RUNBOOK.md) hard gates (R3 + written approval again).
