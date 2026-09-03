---
Purpose: Staging / pre-prod dual-run validation procedure before enabling PAYROLL_V2_ENGINE.
Status: Active — PH-10 (was R3)
Last Updated: 2026-08-04
---

# Dual-run ops runbook (PH-10)

**Goal:** Prove V1 and V2 net totals match within Rs 1 for a full payroll month on staging (or a safe non-prod clone). Do **not** set `PAYROLL_V2_ENGINE=true` until Finance + CTO sign-off and every mismatch is explained or fixed.

**Permission:** `payroll.run.process` (legacy: admin / superadmin / hr / accounts / manager).

**Tolerance:** Rs 1 (`DUAL_RUN_TOLERANCE` in `payrollEngineConfig.js`).

---

## 0. Hardening preconditions (code complete on develop/staging)

Before running PH-10, confirm deploy includes:

- [x] PH-01…PH-05 calc / persist / negative-net
- [x] PH-06…PH-08 period gates + mutate lock
- [x] PH-07 bank export >= approved
- [x] PH-13 bulkApprove restricted
- [x] PH-09 job reclaim

Env on staging:

- `PAYROLL_V2_ENGINE` unset or `false`
- Recommend `PAYROLL_PERIOD_GATES=true` (prod default on)

---

## 1. Pick the cohort month

1. Prefer a **closed** calendar month with real structures + attendance/leave.
2. Confirm active salary structures exist for the cohort.
3. Record: Environment ______  Month ______  Year ______

---

## 2. Run via Salary Management UI (preferred)

1. Open **Salary Management → Advanced → Dual-run**.
2. Select month/year; leave **Mismatches only** on.
3. Click **Run month dual-run** — note Total / Matched / Mismatched / Failed badges.
4. Click **Download CSV** — attach artifact to the decision log / ticket.

Deep link: `/salary-management?tab=dual-run`

---

## 3. Run via API

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

CSV:

```http
POST /api/payroll/runs/dual-run/month?format=csv&mismatchesOnly=true
Content-Type: application/json

{ "month": 6, "year": 2026 }
```

CLI (from `backend/`):

```bash
node scripts/run-dual-run-month.js --base https://<staging-host> --token <JWT> --month 6 --year 2026
```

Single employee:

```http
POST /api/payroll/runs/dual-run
{ "employeeId": "<id>", "month": 6, "year": 2026 }
```

---

## 4. Triage mismatches

| Signal | Action |
|--------|--------|
| `error` | Fix data/structure/leave load; re-run employee |
| `|netDiff| > 1` | Diff V1 vs V2 lines via single dual-run; log intentional vs bug |
| Systematic skew (many rows, same pattern) | Engine/formula bug — fix before any flag flip |
| Zero mismatched + zero failed | Candidate for PH-11 Finance / CTO sign-off |

Document intentional differences in `DUAL_RUN_DECISION_LOG.md` — never treat documented as auto-approval to enable V2 persist.

---

## 5. PH-10 exit criteria

- [ ] Month / year reviewed: ________
- [ ] Environment: staging / clone (not prod cutover)
- [ ] Summary: total ___ matched ___ mismatched ___ failed ___
- [ ] CSV artifact retained (path / ticket): ________
- [ ] All mismatches explained or fixed (decision log entries)
- [ ] Engineering lead initials: ________  Date: ________

**Then:** PH-11 Finance (+ HR) written approval → PH-12 cutover prep (`ENGINE_CUTOVER_RUNBOOK.md`).

**Exit:** Written approval + empty or fully explained mismatch set. PH-10 does **not** flip the flag in code.