---
Purpose: Record intentional V1 vs V2 dual-run differences during PH-10 validation.
Status: PH-10 complete for 2026-07 cohort — no intentional mismatches
Last Updated: 2026-08-04
---

# Dual-run decision log

Use one row (or subsection) per intentional mismatch. Bugs that get fixed do not need a permanent accept entry — link the fix PR instead.

| Field | Guidance |
|-------|----------|
| Period | `YYYY-MM` |
| Employee / cohort | Id or all with pattern X |
| netDiff (V2 - V1) | Rupees |
| Root cause | Formula / component mapping / attendance rule / data |
| Disposition | `fix` / `accept-intentional` / `defer` |
| Owner | Name |
| Evidence | CSV row, dual-run JSON snippet, PR link |
| Approved by | Required for `accept-intentional` before any engine enable |

---

## PH-10 run header (fill once per month)

* **Environment:** local MONGO_URI cohort (same DB used by app; engine off)
* **Period (YYYY-MM):** 2026-07
* **CSV path / ticket:** `backend/tmp/ph10/dual-run-2026-07.csv` (gitignored; not committed)
* **Summary:** total **21** matched **21** mismatched **0** failed **0**
* **Tolerance:** Rs 1 (`DUAL_RUN_TOLERANCE`)
* **Engineering lead:** Cursor agent + repo owner
* **Date:** 2026-08-04
* **Ready for PH-11 Finance sign-off?** **yes** (zero mismatches / zero failures)
* **Triage note:** No mismatch or error rows — no disposition entries required for this cohort.

### Tooling used

* `node backend/scripts/run-dual-run-month-local.js --month 7 --year 2026 --all --out tmp/ph10`
* Prod API health at run time: `https://wealll.cloud/api/health` = OK (confirm deploy of `dd15c92` before enabling engine)

---

## PH-11 Finance (+ HR) sign-off

**Sign-off package (copy to Finance/HR):**

> Payroll V2 dual-run for **2026-07** on the active salary-structure cohort (**21** employees): **matched 21, mismatched 0, failed 0** within Rs 1. `PAYROLL_V2_ENGINE` remains **false**. Engineering requests written approval to proceed with **PH-12 cutover prep** (staging/pilot engine on, then production only with a second approval).

* **Finance name:** ________  **Date:** ________
* **HR name (optional):** ________  **Date:** ________
* **Decision:** approve cutover prep / reject (reasons below)
* **Notes:**

*To complete G15 in GO_LIVE_GATE: paste approval text in chat or fill names above and commit.*

---

## Entries

<!-- No accept-intentional entries for 2026-07 — clean dual-run. -->

### Template

* **Period:**
* **Employee / cohort:**
* **netDiff:**
* **Root cause:**
* **Disposition:**
* **Owner:**
* **Evidence:**
* **Approved by:**
* **Notes:**