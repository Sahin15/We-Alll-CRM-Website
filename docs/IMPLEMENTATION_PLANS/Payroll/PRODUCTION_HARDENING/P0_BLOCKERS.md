---
Purpose: P0 blockers converted from production readiness audit into work items.
Last Updated: 2026-07-27
---

# Production Hardening — P0 Blockers

**Blocking Release?** = blocks `PAYROLL_V2_ENGINE=true` for real employee pay.

Complexity: **S** (<1d) · **M** (2–4d) · **L** (5–8d) · **XL** (>8d)

---

## PH-01 — Wire PAYROLL_V2_ENGINE into persistence

| Field | Value |
|-------|--------|
| **ID** | PH-01 |
| **Title** | Wire `PAYROLL_V2_ENGINE` into the slip persistence layer correctly |
| **Severity** | Critical |
| **Business Impact** | Enabling the flag does not change pay today; later partial wiring could silently change nets without ops awareness |
| **Technical Impact** | Cutover runbook false; dual-run confidence ≠ persist path |
| **Root Cause** | `generateSalarySlip` / bulk dual-run log-only; `selectPersistableTotals` unused by slip writer |
| **Affected Modules** | `salarySlipController.js`, `payrollEngine.js`, `payrollEngineConfig.js`, slip model mapping, `ENGINE_CUTOVER_RUNBOOK.md` |
| **Recommended Fix** | Map V2 totals/lines into slip schema on generate/bulk/recalc when flag true; keep V1 when false; align docs |
| **Dependencies** | None (foundation). Prefer complete before relying on dual-run for cutover |
| **Estimated Complexity** | L |
| **Verification Method** | Unit: flag off → V1 nets; flag on → slip net matches `selectPersistableTotals` V2 within ₹1. Pilot slip on staging |
| **Blocking Release?** | **Yes** |

---

## PH-02 — Fix absent → LOP

| Field | Value |
|-------|--------|
| **ID** | PH-02 |
| **Title** | Fix attendance `absent` → LOP calculation |
| **Severity** | Critical |
| **Business Impact** | Overpay when employees marked absent still receive full day |
| **Technical Impact** | LeaveImpact under-counts unpaid days |
| **Root Cause** | Presence keyed by attendance document existence; `status: "absent"` ignored |
| **Affected Modules** | `leaveImpactCalculator.js`, attendance status enums, generate path |
| **Recommended Fix** | Treat agreed absent-like statuses as unpaid absence; add regression fixtures |
| **Dependencies** | None (can parallel PH-01) |
| **Estimated Complexity** | M |
| **Verification Method** | Unit + manual: day with `absent` record → LOP day counted; present statuses unchanged |
| **Blocking Release?** | **Yes** |

---

## PH-03 — Align half-day / OT generator vs engine

| Field | Value |
|-------|--------|
| **ID** | PH-03 |
| **Title** | Align half-day / overtime behaviour between generator and engine |
| **Severity** | High |
| **Business Impact** | Dual-run false confidence; employees paid differently than diagnostic engine |
| **Technical Impact** | `payrollAttendanceRules` only on `processEmployeePayroll` |
| **Root Cause** | Split code paths for generate vs diagnostic |
| **Affected Modules** | `payrollAttendanceRules.js`, `salarySlipController.js`, `payrollEngine.js` |
| **Recommended Fix** | Single shared attendance money policy invoked by generate and dual-run |
| **Dependencies** | PH-02 (shared leave/attendance correctness) |
| **Estimated Complexity** | L |
| **Verification Method** | Same employee fixture: generate LOP/OT/half-day equals `processEmployeePayroll` overrides |
| **Blocking Release?** | **Yes** |

---

## PH-04 — Standardize salary proration

| Field | Value |
|-------|--------|
| **ID** | PH-04 |
| **Title** | Standardize salary proration (earnings + LOP base) |
| **Severity** | High |
| **Business Impact** | Wrong net for mid-month joiners/leavers with absences |
| **Technical Impact** | Earnings may be pro-rated; LOP uses full gross/30; `\|\|` zero fallback |
| **Root Cause** | Separate calculators; nullish vs OR bug |
| **Affected Modules** | `proRataSalaryCalculator.js`, `payrollCorrectnessHelpers.js`, LeaveImpact, generate |
| **Recommended Fix** | Document one policy; compute LOP on same base as persisted earnings; use `??` not `\|\|` |
| **Dependencies** | PH-02, PH-03 |
| **Estimated Complexity** | L |
| **Verification Method** | Golden cases: mid-month structure change + absences; zero component stays zero |
| **Blocking Release?** | **Yes** |

---

## PH-05 — Prevent negative net salary

| Field | Value |
|-------|--------|
| **ID** | PH-05 |
| **Title** | Prevent negative net salary |
| **Severity** | High |
| **Business Impact** | Invalid payslips / banking errors |
| **Technical Impact** | Engine + pre-save allow `net < 0` |
| **Root Cause** | No guard/policy |
| **Affected Modules** | `payrollEngine.js`, `salarySlipModel.js` pre-save, generate error handling |
| **Recommended Fix** | Fail closed (reject generate) or clamp-to-zero with audit flag — **document chosen policy**; prefer fail closed for V2 |
| **Dependencies** | PH-01 (apply on both V1/V2 persist paths) |
| **Estimated Complexity** | S–M |
| **Verification Method** | Fixture with deductions > gross → generate fails or clamped per policy; unit test |
| **Blocking Release?** | **Yes** |

---

## PH-06 — Mandatory period gates

| Field | Value |
|-------|--------|
| **ID** | PH-06 |
| **Title** | Mandatory period gates for go-live environments |
| **Severity** | Critical |
| **Business Impact** | “Locked” payroll still mutable when flag off |
| **Technical Impact** | `assertPeriodAllows` skipped when unset |
| **Root Cause** | `PAYROLL_PERIOD_GATES` defaults false |
| **Affected Modules** | `payrollPeriodGates.js`, `.env.example`, staging/prod secrets, ops docs |
| **Recommended Fix** | Require gates on for staging/prod go-live; document; optionally fail boot if prod and gates off |
| **Dependencies** | None |
| **Estimated Complexity** | S–M |
| **Verification Method** | Gates on: locked period rejects generate; open allows |
| **Blocking Release?** | **Yes** |

---

## PH-07 — Prevent bank export before approval

| Field | Value |
|-------|--------|
| **ID** | PH-07 |
| **Title** | Prevent bank export before approval |
| **Severity** | Critical |
| **Business Impact** | NEFT file for unapproved slips → wrong payments |
| **Technical Impact** | `?status=generated` allowed; UI encourages it |
| **Root Cause** | Soft default, not hard gate |
| **Affected Modules** | `payrollReportController.js`, `payrollReportService.js`, `PayrollExports.jsx` |
| **Recommended Fix** | Bank NEFT hard-requires `approved` (ignore override or 400); remove generated option from bank UI |
| **Dependencies** | Approval workflow must be usable (existing) |
| **Estimated Complexity** | M |
| **Verification Method** | Export with generated slips → 400/empty policy; approved only succeeds |
| **Blocking Release?** | **Yes** |

---

## PH-08 — Protect slip updates after lock

| Field | Value |
|-------|--------|
| **ID** | PH-08 |
| **Title** | Protect slip updates after period lock |
| **Severity** | High |
| **Business Impact** | Amounts change after freeze/lock |
| **Technical Impact** | `PUT` / recalc not fully gated |
| **Root Cause** | Gates wired to generate/mark-paid/export, not update |
| **Affected Modules** | `salarySlipController.js` update + recalculate |
| **Recommended Fix** | `assertPeriodAllows` for mutate ops when gates on |
| **Dependencies** | PH-06 |
| **Estimated Complexity** | S–M |
| **Verification Method** | Locked period: PUT returns 403/400; open allows draft/generated edits |
| **Blocking Release?** | **Yes** |

---

## PH-09 — Crash recovery for payroll jobs

| Field | Value |
|-------|--------|
| **ID** | PH-09 |
| **Title** | Crash recovery / reclaim for payroll jobs |
| **Severity** | High |
| **Business Impact** | Stuck payroll runs; ops confusion; duplicate work under multi-instance |
| **Technical Impact** | Orphaned `running`; process-local mutex |
| **Root Cause** | R9 in-process foundation |
| **Affected Modules** | `payrollJobService.js`, `payrollJobModel.js` |
| **Recommended Fix** | Reclaim stale `running` (heartbeat/TTL); optional dedupe by type+month+year; document multi-instance limits |
| **Dependencies** | None (scale gate more than small pilot) |
| **Estimated Complexity** | M |
| **Verification Method** | Simulate crash mid-job → reclaim → completes; no duplicate slips (unique index) |
| **Blocking Release?** | **Yes for ≥300 employees / multi-instance**; **Conditional** for ≤50 single-node staging pilot |

---

## PH-10 — Full staging dual-run validation

| Field | Value |
|-------|--------|
| **ID** | PH-10 |
| **Title** | Full staging dual-run validation |
| **Severity** | High |
| **Business Impact** | Unknown V1 vs V2 variance at cohort scale |
| **Technical Impact** | Cutover without evidence |
| **Root Cause** | Ops hard gate incomplete |
| **Affected Modules** | Dual-run APIs, `DUAL_RUN_OPS_RUNBOOK.md`, `DUAL_RUN_DECISION_LOG.md` |
| **Recommended Fix** | Run full month on staging; triage every mismatch |
| **Dependencies** | PH-01–PH-05 (meaningful after wiring + correctness) |
| **Estimated Complexity** | M (ops calendar time) |
| **Verification Method** | CSV attached; mismatches=0 or all dispositioned |
| **Blocking Release?** | **Yes** |

---

## PH-11 — Finance sign-off

| Field | Value |
|-------|--------|
| **ID** | PH-11 |
| **Title** | Finance (+ HR) sign-off |
| **Severity** | High |
| **Business Impact** | Legal/ops accountability for pay |
| **Technical Impact** | None (process) |
| **Root Cause** | Pending human approval |
| **Affected Modules** | Decision log, go-live gate |
| **Recommended Fix** | Written approval after PH-10 |
| **Dependencies** | PH-10 |
| **Estimated Complexity** | S (process) |
| **Verification Method** | Named sign-off in decision log / GO_LIVE_GATE |
| **Blocking Release?** | **Yes** |

---

## PH-12 — Production cutover

| Field | Value |
|-------|--------|
| **ID** | PH-12 |
| **Title** | Production cutover (`PAYROLL_V2_ENGINE=true`) |
| **Severity** | Critical (ops) |
| **Business Impact** | Live pay switches to V2 persist |
| **Technical Impact** | Env flag + restart |
| **Root Cause** | N/A — terminal gate |
| **Affected Modules** | Secrets, deploy, kill switch |
| **Recommended Fix** | Follow `ENGINE_CUTOVER_RUNBOOK.md` + `GO_LIVE_GATE.md` |
| **Dependencies** | PH-01–PH-11 + CTO approval |
| **Estimated Complexity** | M (ops) |
| **Verification Method** | Pilot slip then cohort; kill-switch drill |
| **Blocking Release?** | This **is** the release |

---

## Additional tracked items (from audit — include in hardening)

| ID | Maps to | Title | Blocking? | Complexity |
|----|---------|-------|-----------|------------|
| PH-13 | R-10 | Restrict `bulkApprove` stage bypass | Yes | M |
| PH-14 | R-12/R-13 | Notifications / `approvedBy` hygiene | No (strong recommend) | S–M |
| PH-15 | R-14 | Map duplicate-key create to 409/skip | No | S |

Schedule PH-13 before PH-12. PH-14/PH-15 before or with pilot.

---

## Summary counts

| Metric | Count |
|--------|------:|
| Primary sequence (PH-01–PH-12) | 12 |
| Additional hardening (PH-13–PH-15) | 3 |
| **Total tracked blockers** | **15** |
| Critical severity | 5 (PH-01,02,06,07,12) |
| High severity | 8 (PH-03–05,08–11,13) |
| Blocking release (hard Yes) | 13 (+ PH-09 conditional) |
