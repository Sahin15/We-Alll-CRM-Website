---
Purpose: Staging / pre-prod dual-run validation procedure before enabling PAYROLL_V2_ENGINE.
Status: Active (R3)
Last Updated: 2026-07-27
---

# Dual-run ops runbook (R3)

**Goal:** Prove V1 and V2 net totals match within ₹1 for a full payroll month on staging (or a safe non-prod clone). Do **not** set `PAYROLL_V2_ENGINE=true` until CTO sign-off and every mismatch is explained or fixed.

**Permission:** `payroll.run.process` (legacy: admin / superadmin / hr / accounts / manager).

**Tolerance:** ₹1 (`DUAL_RUN_TOLERANCE` in `payrollEngineConfig.js`).

---

## 1. Preconditions

1. Deploy build that includes R0–R2 (integration + correctness + hygiene).
2. Confirm env: `PAYROLL_V2_ENGINE` unset or `false`.
3. Pick a closed calendar month with real structures + attendance/leave data.
4. Ensure active salary structures exist for the cohort under review.

---

## 2. Run month dual-run (JSON triage)

```http
POST /api/payroll/runs/dual-run/month
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 6,
  "year": 2026,
  "mismatchesOnly": true
}
```

- `data.summary` always reflects the **full** month (matched / mismatched / failed).
- `data.results` are sorted: errors first, then largest `|netDiff|`.
- Set `mismatchesOnly: false` (default) to include matches.

Single employee:

```http
POST /api/payroll/runs/dual-run
{ "employeeId": "<id>", "month": 6, "year": 2026 }
```

---

## 3. Export CSV for review

```http
POST /api/payroll/runs/dual-run/month?format=csv&mismatchesOnly=true
Content-Type: application/json

{ "month": 6, "year": 2026 }
```

(`format` / `mismatchesOnly` may be query or body.)

- First line: `# dual-run-month total=… matched=… mismatched=… failed=…`
- Columns: `employeeId,withinTolerance,v1Net,v2Net,netDiff,error`
- Attach CSV + notes to the decision log for sign-off.

---

## 4. Triage mismatches

| Signal | Action |
|--------|--------|
| `error` | Fix data/structure/leave load; re-run employee |
| `\|netDiff\| > 1` | Diff V1 vs V2 lines via single dual-run; log intentional vs bug |
| Systematic skew (many rows, same pattern) | Engine/formula bug — fix before any flag flip |
| Zero mismatched + zero failed | Candidate for CTO sign-off |

Document intentional differences in `DUAL_RUN_DECISION_LOG.md` — never treat “documented” as auto-approval to enable V2 persist.

---

## 5. Sign-off checklist (CTO / Finance lead)

- [ ] Month / year reviewed: ________
- [ ] Environment: staging / clone (not prod cutover)
- [ ] Summary: total ___ matched ___ mismatched ___ failed ___
- [ ] All mismatches explained or fixed (decision log entries)
- [ ] CSV artifact retained
- [ ] Explicit written approval to enable `PAYROLL_V2_ENGINE=true` on a named environment
- [ ] Rollback plan: set flag back to `false` (slips remain V1 until flag on)

**Exit:** Written approval + empty or fully explained mismatch set. R3 does not flip the flag in code.
