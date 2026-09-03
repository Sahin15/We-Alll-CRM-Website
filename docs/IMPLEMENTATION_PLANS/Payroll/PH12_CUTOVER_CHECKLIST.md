---
Purpose: PH-12 cutover execution checklist (do not commit PAYROLL_V2_ENGINE=true).
Status: Ready after PH-11 approval — engine remains false until operator enables
Last Updated: 2026-08-04
---

# PH-12 Cutover execution checklist

## Preconditions

- [x] PH-10 dual-run 2026-07: 21/21 matched
- [ ] PH-11 Finance/CTO named approval recorded
- [x] Kill-switch doc: `ENGINE_KILL_SWITCH.md`
- [x] Cutover doc: `ENGINE_CUTOVER_RUNBOOK.md`
- [ ] Kill-switch owner named
- [ ] DB snapshot / restore point noted

## A. Kill-switch rehearsal (safe — no persist)

On any machine with the backend checkout:

```bash
cd backend
node scripts/rehearse-payroll-kill-switch.js
```

Expect: reports enabled=true then enabled=false. Does not write to Mongo.

## B. Staging / pilot enable (only after PH-11)

On the **named** API host (not via git):

```bash
# 1. Snapshot note
# 2. In server secrets / .env:
PAYROLL_V2_ENGINE=true
# 3. Restart API process / containers
# 4. Generate ONE pilot slip for an agreed employee/month
# 5. Confirm slip net matches dual-run V2 within Rs 1
# 6. Rehearse kill-switch on that host:
PAYROLL_V2_ENGINE=false
# restart; confirm new generate uses V1
# 7. If pilot OK and second approval exists, re-enable for cohort
```

## C. Production (`wealll.cloud`) — separate approval required

```bash
# After deploy.sh has main @ dd15c92+
# Set PAYROLL_V2_ENGINE=true in production secrets only
# Restart API
# Pilot slip → monitor payday window
# Kill-switch owner on-call
```

## Hard rule

Never commit `PAYROLL_V2_ENGINE=true` to the repository. Default in `.env.example` stays false.