---
Purpose: Record intentional V1 vs V2 dual-run differences during PH-10 validation.
Status: Active template (fill during staging runs)
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

* **Environment:** staging / clone
* **Period (YYYY-MM):**
* **CSV path / ticket:**
* **Summary:** total ___ matched ___ mismatched ___ failed ___
* **Engineering lead:** ________  **Date:** ________
* **Ready for PH-11 Finance sign-off?** yes / no

---

## PH-11 Finance (+ HR) sign-off

* **Finance name:** ________  **Date:** ________
* **HR name (optional):** ________  **Date:** ________
* **Decision:** approve staging cutover prep / reject (reasons below)
* **Notes:**

---

## Entries

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

<!-- Add dated entries below. Do not delete historical accepts. -->