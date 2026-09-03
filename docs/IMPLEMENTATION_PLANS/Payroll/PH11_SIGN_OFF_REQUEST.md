---
Purpose: PH-11 Finance / CTO sign-off request package after clean PH-10 dual-run.
Status: Awaiting named signatures
Date: 2026-08-04
---

# PH-11 Sign-off request

## Evidence summary

| Item | Value |
|------|-------|
| Cohort period | 2026-07 |
| Active structures | 21 |
| Matched (within Rs 1) | 21 |
| Mismatched | 0 |
| Failed | 0 |
| Engine flag | `PAYROLL_V2_ENGINE=false` (required until after PH-12) |
| Artifact | `backend/tmp/ph10/dual-run-2026-07.csv` (local; gitignored) |
| Decision log | `docs/IMPLEMENTATION_PLANS/Payroll/DUAL_RUN_DECISION_LOG.md` |
| Git tip at dual-run | `dd15c92` on `main` / `staging` |

## Requested decision

Approve **cutover prep (PH-12)**:

1. Allow setting `PAYROLL_V2_ENGINE=true` on a **named** environment after kill-switch owner is assigned.
2. Pilot: generate one slip and verify net vs dual-run V2.
3. Production (`wealll.cloud`) only after a **second** explicit approval if staging/pilot is separate; if only prod exists, require explicit "enable production" wording.

## Reply template (paste into chat or ticket)

```
PH-11 APPROVED
Finance: <name> <date>
HR: <name or n/a> <date>
CTO: <name> <date>
Enable scope: staging-pilot-only | production
Kill-switch owner: <name>
```

## Reject template

```
PH-11 REJECTED
Reason: ...
```