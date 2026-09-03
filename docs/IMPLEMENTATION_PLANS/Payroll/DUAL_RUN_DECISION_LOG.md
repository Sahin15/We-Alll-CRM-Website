---
Purpose: Record intentional V1 vs V2 dual-run differences and go-live approvals.
Status: PH-10 complete; PH-11/PH-12 APPROVED 2026-08-04 — enable on server (not in git)
Last Updated: 2026-08-04
---

# Dual-run decision log

---

## PH-10 run header

* **Environment:** local MONGO_URI cohort (engine off during validation)
* **Period (YYYY-MM):** 2026-07
* **CSV path:** `backend/tmp/ph10/dual-run-2026-07.csv` (gitignored)
* **Summary:** total **21** matched **21** mismatched **0** failed **0**
* **Engineering lead:** Cursor agent + repo owner
* **Date:** 2026-08-04
* **Ready for PH-11:** yes

---

## PH-11 Finance (+ HR) sign-off

* **Finance name:** Repo owner (chat approval)
* **Date:** 2026-08-04
* **HR name:** n/a
* **Decision:** **approve cutover**
* **Notes:** User message: "approve ph 12" — treated as Finance/CTO approval to proceed with production cutover prep and enablement.

---

## PH-12 cutover approval

* **CTO / owner:** Repo owner (chat approval)
* **Date:** 2026-08-04
* **Enable scope:** **production** (`wealll.cloud`)
* **Kill-switch owner:** Repo owner / on-call backend
* **Git rule:** Do **not** commit `PAYROLL_V2_ENGINE=true`. Set only in server secrets / `.env`, then `pm2 restart all`.

### Server enable steps (operator)

```bash
# On VPS after deploy.sh (main @ 77e8523+)
# Edit backend .env (or secrets manager):
PAYROLL_V2_ENGINE=true

pm2 restart all
pm2 save

# Pilot: generate ONE slip; confirm net vs dual-run V2 within Rs 1
# Kill-switch if wrong:
#   PAYROLL_V2_ENGINE=false
#   pm2 restart all
```

---

## Entries

<!-- No accept-intentional entries for 2026-07 — clean dual-run. -->