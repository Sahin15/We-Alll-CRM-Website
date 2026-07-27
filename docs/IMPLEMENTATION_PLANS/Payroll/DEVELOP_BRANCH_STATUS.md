---
Purpose: Official develop-branch baseline for Payroll V2 (source of truth).
Last Updated: 2026-07-27
Owner: Lead Architect / Session Lead
---

# Payroll V2 — Develop Branch Status

## Current Branch

| Field | Value |
|-------|--------|
| **Source of truth** | `develop` |
| **Production branch** | `main` (unchanged; do not land Payroll V2 here without release process) |
| **Latest commit** | `66c9c42` — `feat(payroll): add async bulk generate/email job queue (R9)` |
| **Consolidation date** | 2026-07-27 |
| **Engine flag** | `PAYROLL_V2_ENGINE` **false** (must stay false until R3 CTO dual-run sign-off) |

From this point onward, **all new Payroll V2 work starts from `develop`**. Historical feature/fix/chore branches remain as ancestry only; do not continue coding on them.

---

## Merged Features

All of the following branch tips are **ancestors of `develop`** (verified 2026-07-27). Fast-forward merge of `feature/payroll-jobs` → `develop` landed the full stack; **no merge conflicts**.

### Platform milestones (M1–M8)

| Milestone | Branch | Status on develop |
|-----------|--------|-------------------|
| M1 Pay Period | `feature/payroll-v2-pay-period` | Merged |
| M2 Components | `feature/payroll-v2-components` | Merged |
| M3 Formula | `feature/payroll-v2-formula` | Merged |
| M4 Engine | `feature/payroll-v2-engine` | Merged (flag off) |
| M5 Attendance | `feature/payroll-v2-attendance` | Merged |
| M6 Approval | `feature/payroll-v2-approval` | Merged |
| M7 Payslip | `feature/payroll-v2-payslip` | Merged |
| M8 Reporting | `feature/payroll-v2-reporting` | Merged |
| Analysis / docs | `feature/payroll-v2-analysis` | Merged |

### Enterprise R-track (R0–R9)

| Milestone | Branch | Status on develop |
|-----------|--------|-------------------|
| R0 Integration | `integrate/payroll-v2-stack` | Merged |
| R1 LOP / pro-rata | `fix/payroll-double-lop-prorata` | Merged |
| R2 Hygiene | `fix/payroll-hygiene` | Merged |
| R3 Dual-run ops | `chore/payroll-dual-run-ops` | Tooling merged; **staging sign-off pending** |
| R4 Ops UI | `feature/payroll-ops-ui` | Merged |
| R5 Period gates | `feature/payroll-period-gates` | Merged (flag off by default) |
| R6 Cutover prep | `chore/enable-payroll-v2-engine` | Runbooks merged; **flag still false** |
| R7 Structure components | `feature/payroll-structure-components` | Merged |
| R8 Employer statutory | `feature/payroll-statutory-fnf` | Foundation merged (flag off) |
| R9 Jobs | `feature/payroll-jobs` | Merged |

### Conflicts resolved

**None.** `origin/develop` was a strict ancestor of `feature/payroll-jobs`; merge was a fast-forward (`2b11ef5` → `66c9c42`).

---

## Pending Features

| Item | Notes |
|------|--------|
| R3 staging dual-run + CTO sign-off | Hard gate before engine enable |
| YTD population on slips | Tracked defect |
| F&F calculator / settlement | R8b — later |
| Month-end cron / Redis queue | R9b — later |
| Structure components catalog UI | R7b — later |
| Job status poller UI | Optional FE |
| Bank-specific NEFT formats | Registry ready; formats TBD |

---

## Feature Flags

| Flag | Default | develop status | Notes |
|------|---------|----------------|-------|
| `PAYROLL_V2_ENGINE` | unset → **false** | **OFF** | Persist still V1 until cutover |
| `PAYROLL_EMPLOYER_STATUTORY` | unset → **false** | **OFF** | ER PF/ESI CTC lines only when true |
| `PAYROLL_PERIOD_GATES` | unset → **false** | **OFF** | Opt-in period status enforcement |

Confirmed via `payrollEngineConfig.isPayrollV2EngineEnabled()` and `isEmployerStatutoryEnabled()` defaults on 2026-07-27.

---

## Known Risks

1. **Engine still dual-run only** — enabling `PAYROLL_V2_ENGINE` without R3 sign-off risks net pay diffs in production.
2. **In-process job runner (R9)** — not multi-instance safe; no Redis/Bull yet.
3. **Legacy salary UI lint debt** — prop-types / unused imports in V1 components (does not block Vite build).
4. **Full backend Jest suite** — unrelated slot/Mongo timeout failures exist outside payroll scope.
5. **Historical branch clutter** — many remote payroll branches still exist; tip content is on develop (safe to archive/delete later with human approval).

---

## Production Readiness

| Criterion | Status |
|-----------|--------|
| Code on `develop` | Yes |
| V1 APIs preserved | Yes (`/api/salary-*`) |
| V2 additive APIs | Yes (`/api/payroll/*`) |
| Engine persist V2 | **No** — flag off |
| Migrations required | **None** |
| Staging dual-run signed | **No** |
| Ready for `main` / prod deploy of V2 engine | **No** |

**Verdict:** Ready for **continued enterprise development on `develop`**. Not ready for production V2 engine cutover.

---

## Current Architecture (summary)

```
V1 (live persist)
  /api/salary-structures | salary-slips | salary-preview | salary-templates

V2 (additive, flag-gated where noted)
  /api/payroll/periods
  /api/payroll/components
  /api/payroll/runs          (dual-run; PAYROLL_V2_ENGINE for totals selection)
  /api/payroll/approvals
  /api/payroll/reports
  /api/payroll/jobs          (async bulk; sync bulk still on salary-slips)

Services: backend/src/services/payroll/*
Models: PayrollPeriod, SalaryComponent, PayrollJob, PayrollExportHistory (+ V1 salary*)
UI: Salary Management tabs — Periods, Approvals, Exports (+ existing V1 tabs)
```

---

## Next Milestone

See [NEXT_DEVELOPMENT_QUEUE.md](./NEXT_DEVELOPMENT_QUEUE.md).

**Recommended immediate:** staging dual-run (R3) on `develop` deploy → CTO sign-off → only then follow [ENGINE_CUTOVER_RUNBOOK.md](./ENGINE_CUTOVER_RUNBOOK.md).

Until then, keep coding follow-ons (R7b / R8b / R9b / YTD) on branches cut from `develop`.
