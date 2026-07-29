---
Purpose: Living risk register for Payroll V2 prior to engine cutover.
Last Updated: 2026-07-27
Source audit: PRODUCTION_READINESS_REPORT.md
---

# Payroll V2 — Risk Register

**Severity:** Critical · High · Medium · Low  
**Blocking:** Blocks `PAYROLL_V2_ENGINE=true` for real pay (Yes/No)

---

## Open risks

| ID | Severity | Blocking | Title | Impact | Root cause | Recommended fix |
|----|----------|----------|-------|--------|------------|-----------------|
| R-01 | Critical | Yes | V2 flag not wired to slip generate | Ops may enable flag believing nets switch; or later wiring flips nets without readiness | `generateSalarySlip` dual-runs for logs only; never calls `selectPersistableTotals` | Wire persist path; update cutover runbook to match; keep flag false until done |
| R-02 | Critical | Yes* | Attendance `absent` does not create LOP | Under-deduction / overpay | Presence = any attendance doc exists | Treat `status: absent` (and similar) as unpaid absence |
| R-03 | Critical | Yes | Bank export before approval | Wrong/early NEFT file | `status` query + UI allow `generated` | Hard-require `approved` (or completed workflow) for bank export |
| R-04 | Critical | Yes | Period gates default off | Locked periods still generate/export/mark-paid | `PAYROLL_PERIOD_GATES` unset → false | Enable in staging/prod; make non-optional for go-live envs |
| R-05 | High | Yes | Slip `PUT` ignores period gates | Locked month amounts editable | No `assertPeriodAllows` on update | Gate update/recalc consistently |
| R-06 | High | Yes | Generate ≠ engine attendance policy | Dual-run false confidence; half-day/OT diverge | `payrollAttendanceRules` only in `processEmployeePayroll` | Single shared policy for generate + dual-run |
| R-07 | High | Yes | LOP vs pro-rata base mismatch | Wrong net for joiners/leavers with absences | LeaveImpact uses full gross/30; earnings may be pro-rated | Compute LOP on same base as persisted earnings |
| R-08 | High | Yes | No negative net guard | Negative salary slips possible | Engine + pre-save allow `net < 0` | Fail closed or clamp with explicit policy + audit |
| R-09 | High | No† | In-process job queue | Stuck jobs; multi-instance duplicates work | R9 foundation; process-local mutex | Reclaim `running`; dedupe; or Redis before 1k employees |
| R-10 | High | Yes | `bulkApprove` skips stages | Control bypass | Service allows any approval.manage user | Restrict or require dual control |
| R-11 | High | Yes | Staging dual-run unsigned | Unknown V1/V2 variance at scale | Ops hard gate incomplete | Complete R3 runbook + decision log + CTO sign-off |
| R-12 | Medium | No | Notifications before approval | Employee confusion | Notify on generate | Notify on approve or gate by status |
| R-13 | Medium | No | `approvedBy` on generate | Misleading audit trail | Fields set while status=`generated` | Rename or set only on approval |
| R-14 | Medium | No | Create race → E11000 as 500 | Ops noise | Check-then-create without duplicate handling | Map duplicate key to 409 / skip |
| R-15 | Medium | No | No Mongo transactions | Partial approval/slip linkage | Multi-doc updates without session | Transactions or compensating checks |
| R-16 | Medium | No | Pro-rata `\|\|` zero fallback | Rare underpay/overpay | `0 \|\| fullAmount` | Use nullish coalescing |
| R-17 | Medium | No | Export blocked when period locked (gates on) | Ops order mistakes | Gate allows export only open/frozen | Document SOP or allow export when locked |
| R-18 | Low | No | Float/rounding inconsistency | Paise drift | Mixed round policies | Standardize to paise integer or bank round |
| R-19 | Low | No | Cutover runbook overclaims generate wiring | False readiness | Docs say generate persists V2 | Align docs with code (see R-01) |
| R-20 | Low | No | Historical payroll remote branches | Confusion | Many tip branches still on remote | Archive after human approval |

\*R-02 blocks **correct** go-live of any pay path (V1 or V2), not only the flag.  
†R-09 blocks scale go-live more than small-cohort staging.

---

## Accepted / mitigated

| ID | Item | Status |
|----|------|--------|
| M-01 | Double LOP (`lossOfPay` + `unpaidLeaveDeduction`) | Mitigated R1 — unpaid forced 0 |
| M-02 | Flat structure pro-rata adapter | Mitigated R1 |
| M-03 | `DELETE /salary-structures/all` | Removed R2 |
| M-04 | Employer statutory changes employee net | Mitigated by design — CTC only |
| M-05 | Duplicate slip documents same emp/month/year | Mitigated — unique index |
| M-06 | Regenerate after paid | Mitigated — status + exists checks |
| M-07 | Formula `eval` RCE | Mitigated — AST allowlist |

---

## Risk heat (blocking Critical/High count)

- **Critical open:** 4 (R-01–R-04)  
- **High open blocking:** 6 (R-05–R-08, R-10–R-11)  

**Cutover barred** until Critical + blocking High for pay correctness and banking controls are closed or formally accepted by CTO/Finance in writing.
