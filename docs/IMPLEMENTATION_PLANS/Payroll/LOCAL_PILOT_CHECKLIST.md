---
Purpose: Local-first Payroll V2 pilot before production deploy / engine enable on VPS.
Status: Active
Last Updated: 2026-08-04
---

# Local Payroll V2 pilot checklist

**Order:** test on local → deploy code with engine **off** on server → enable flag on VPS only after local OK.

## 0. Local env (already for this machine)

In `backend/.env` (gitignored):

```
PAYROLL_V2_ENGINE=true
PAYROLL_PERIOD_GATES=false
```

Restart backend after changing env (`npm run dev` in `backend/`).

Production `wealll.cloud` must stay `PAYROLL_V2_ENGINE=false` until you finish this list.

## 1. Start apps

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Open the Vite URL; API via `VITE_API_URL=/api` proxy.

## 2. Dual-run (engine can be on; dual-run always compares)

1. Salary Management → Advanced → **Dual-run** (`?tab=dual-run`)
2. Month **7** / Year **2026** → Run month dual-run
3. Expect matched ≈ 21, mismatched 0 (same as PH-10)

Or:

```bash
cd backend
node scripts/run-dual-run-month-local.js --month 7 --year 2026 --all --out tmp/ph10-local-pilot
```

## 3. Pilot generate (V2 persist)

1. Open **Pay Periods** — open/freeze a safe test month if you turn gates on later.
2. **Generate Slips** — generate **one** employee for a non-paid test month (or draft-only).
3. Open the slip: net should match Dual-run **V2** within Rs 1.
4. Spot-check: basic, LOP, PF/ESI employee lines.

## 4. Controls smoke (engine on)

| Check | Where |
|-------|--------|
| Bank export blocks `generated` | Advanced → Exports — use approved/sent only |
| Bulk approve hidden unless flag | Advanced → Approvals (local `PAYROLL_ALLOW_BULK_APPROVE` unset = off) |
| Negative net rejected | Only if you force over-deduction on a draft |

## 5. Kill-switch rehearsal (local)

```bash
cd backend
# In .env set PAYROLL_V2_ENGINE=false, restart backend
# Generate another slip — amounts should follow V1 path
# Set true again when continuing V2 pilot
node scripts/rehearse-payroll-kill-switch.js
```

## 6. When local is good — deploy code, then enable on server

1. `git pull` / ensure `main` deployed: `bash deploy.sh`
2. Confirm server `.env` still has **`PAYROLL_V2_ENGINE=false`** (or unset) for first boot after deploy.
3. Smoke production UI with engine **off**.
4. Only then set on VPS:

```bash
PAYROLL_V2_ENGINE=true
pm2 restart all
```

5. One production pilot slip → monitor.

## Hard rules

- Never commit `PAYROLL_V2_ENGINE=true`.
- Local `.env` changes stay on your machine.
- If local pilot finds systematic dual-run diffs — **do not** enable on VPS; fix first.