---
Purpose: Explicit known limitations of Payroll V2 on develop (honest ops contract).
Last Updated: 2026-07-27
---

# Payroll V2 — Known Limitations

This is the honest contract for what the system **does and does not** do today.

---

## Engine & persist

1. **`PAYROLL_V2_ENGINE=true` does not change live slip nets today.**  
   Generate/bulk persist V1 field maps; dual-run logs variance only. Diagnostic dual-run APIs use `selectPersistableTotals`.

2. **V2 line items are not first-class on `SalarySlip` schema.**  
   Slips store nested V1 `earnings` / `deductions`. Full component-line persists need a deliberate mapping cutover.

3. **Dual-run on generate uses the full structure**, not necessarily the same pro-rated amounts written to the slip — mismatch signals can be false.

---

## Attendance & leave

4. **Attendance records with `status: "absent"` do not create LOP** (presence keyed by date existence).

5. **Half-day / late / OT automatic money rules are not applied on generate** (they exist on the diagnostic engine path).

6. **LOP divisor is fixed at gross ÷ 30**, not calendar or working days; not aligned to pro-rated earnings base.

7. **`paidLeaves` metrics can include unpaid leave types** (reporting noise; money path is separate).

---

## Periods & approvals

8. **Period gates are off unless `PAYROLL_PERIOD_GATES=true`.** Locked is not enforced by default.

9. **Period status `paid` is not the same as slips marked paid.**

10. **Slip `PUT` is not period-gated** even when gates are on.

11. **`bulkApprove` can skip the multi-stage chain** for privileged users.

12. **Employees may be notified when slips are still `generated`**, before approval.

---

## Exports & banking

13. **Bank NEFT default is `approved`, but callers/UI can request `generated`.** Approval is not a hard technical gate.

14. **When gates are on, export is allowed only for `open`/`frozen` periods** — export-after-lock requires unlock or SOP change.

15. **Bank format is generic NEFT CSV**, not bank-specific packs.

---

## Jobs & scale

16. **Job runner is in-process**, one-at-a-time per Node process — not multi-instance safe.

17. **Crashed jobs can remain `running` forever** (no reclaim).

18. **No automatic job retries or dedupe** by month/type.

19. **Sync bulk generate remains available** alongside async jobs (parallel work possible).

20. **Not sized for 1,000–5,000 employees** without chunking + durable queue.

---

## Statutory & CTC

21. **Employee statutory amounts are largely structure-driven**, not a full EPFO/ESIC/PT state engine.

22. **Employer PF/ESI (`PAYROLL_EMPLOYER_STATUTORY`) are CTC/reporting only** and do not change employee net when enabled.

23. **YTD fields on slips are not reliably populated.**

---

## Data & transactions

24. **No Mongo multi-document transactions** around bulk generate or approval completion vs slip status updates.

25. **Negative net salaries are not rejected** by schema or engine.

26. **Floating-point / mixed rounding** (paise vs rupee) can produce small drifts; dual-run tolerates ₹1.

---

## Product gaps (deferred)

27. F&F / settlement calculator — not built.  
28. Structure components catalog UI — foundation only.  
29. Month-end cron — not built.  
30. Cost centers / multi-company payroll dimensions — not built.

---

## What is solid

- Unique slip identity `(employee, month, year)`  
- R1 single LOP money path (`unpaidLeaveDeduction = 0`)  
- Flat structure pro-rata adapter  
- Safe formula AST (no `eval`)  
- Additive `/api/payroll/*` without removing V1 `/api/salary-*`  
- Kill-switch / cutover docs exist (wiring must catch up to docs)  
- Mass delete of all salary structures removed  
