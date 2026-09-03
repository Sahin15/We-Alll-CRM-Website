---
Purpose: Rollback strategy for Production Hardening and engine cutover.
Last Updated: 2026-07-27
---

# Production Hardening — Rollback Strategy

## Principles

1. **Prefer env kill switch over code revert** for cutover incidents.
2. **No schema migrations** for cutover — rollback must not require data migration.
3. **V1 APIs remain** — never remove `/api/salary-*` as a “rollback.”
4. **Document every rollback** in CHANGELOG + decision log.

---

## Levels

### L0 — Feature flag (seconds–minutes)

| Action | When |
|--------|------|
| Set `PAYROLL_V2_ENGINE=false` | Any V2 persist anomaly after PH-01/PH-12 |
| Restart API processes | Required for env pickup |
| Set `PAYROLL_EMPLOYER_STATUTORY=false` | If ER CTC lines confuse Finance |
| Set `PAYROLL_PERIOD_GATES=false` | **Only** with CTO exception (weakens lock) |

See `../ENGINE_KILL_SWITCH.md`.

### L1 — Stop generation (minutes)

| Action | When |
|--------|------|
| Freeze/lock period (gates on) | Stop further generates |
| Disable job enqueue (ops) | Pause async bulk |
| Communicate to HR/Finance | Halt bank export |

### L2 — Code revert (hours)

| Action | When |
|--------|------|
| Revert specific PH PR on `develop` | Bug isolated to that change |
| Redeploy previous known-good commit | Staging/prod |
| Re-generate only `draft`/`generated` slips if amounts wrong | Never rewrite `paid`/`sent` without Finance |

### L3 — Data remediation (days, Finance-led)

| Action | When |
|--------|------|
| Manual slip corrections under approval | Wrong nets already approved |
| Re-export bank file | Wrong NEFT sent/not sent |
| Employee communications | Over/under pay |

**Never** bulk-delete historical slips to “fix” payroll.

---

## Per-phase rollback defaults

| Phase | Primary rollback |
|-------|------------------|
| PH-01–05 (calc/wiring) | L0 flag false + L2 revert PR |
| PH-06–08, PH-13 (controls) | L2 revert control PR; keep gates on if possible |
| PH-09 (jobs) | L2 revert reclaim; manual job status fix |
| PH-10–11 | Do not proceed to PH-12 |
| PH-12 cutover | **L0 immediately**; then L1; Finance decides L3 |

---

## Dual-run after rollback

After any L0/L2 during a cycle:

1. Re-run month dual-run CSV.
2. Confirm persisted path matches expected source (V1).
3. Update `DUAL_RUN_DECISION_LOG.md`.

---

## Ownership

| Role | Responsibility |
|------|----------------|
| On-call Eng | Execute L0/L1 |
| Tech Lead | Approve L2 |
| Finance | Approve L3 pay corrections |
| CTO | Approve disabling period gates or re-enable after incident |
