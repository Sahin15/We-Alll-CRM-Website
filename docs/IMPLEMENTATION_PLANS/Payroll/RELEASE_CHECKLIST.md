---
Purpose: Release / cutover checklist for Payroll V2 (engine enable and production).
Last Updated: 2026-07-27
---

# Payroll V2 — Release Checklist

Use this checklist before enabling `PAYROLL_V2_ENGINE` or promoting Payroll V2 behavior to production (`main`). Code may live on `develop` while items remain unchecked.

**Hard rule:** Do not set `PAYROLL_V2_ENGINE=true` in staging/prod until every **Hard gate** row is complete.

---

## Development Complete

| # | Item | Status |
|---|------|--------|
| 1 | M1–M8 platform on `develop` | [x] |
| 2 | R0–R9 enterprise hardening on `develop` | [x] |
| 3 | V1 salary APIs still registered | [x] |
| 4 | Additive `/api/payroll/*` mounts only (no duplicate paths) | [x] |
| 5 | Docs: STATUS / TASKS / runbooks present | [x] |
| 6 | `DEVELOP_BRANCH_STATUS.md` published | [x] |

---

## Unit Tests

| # | Item | Status |
|---|------|--------|
| 1 | Payroll-scoped Jest suite green (R1–R9 + engine/formula/catalog) | [x] 2026-07-27 — 17 suites / 90 tests |
| 2 | Authz / finance pilot overlap if touched | [ ] as needed per change |
| 3 | Full backend suite green | [ ] known non-payroll timeouts (slots) |

---

## Integration Tests

| # | Item | Status |
|---|------|--------|
| 1 | Staging: generate slip (single) V1 path | [ ] |
| 2 | Staging: bulk generate sync | [ ] |
| 3 | Staging: async job bulk generate + status poll | [ ] |
| 4 | Staging: approvals act / bulk-approve | [ ] |
| 5 | Staging: bank NEFT + compliance exports | [ ] |
| 6 | Staging: period gates with flag on (non-prod first) | [ ] |

---

## Dual Run

| # | Item | Status | Hard gate |
|---|------|--------|-----------|
| 1 | Month dual-run CSV/JSON tooling available | [x] | |
| 2 | Ops runbook followed on staging | [ ] | **Yes** |
| 3 | Mismatches triaged in `DUAL_RUN_DECISION_LOG.md` | [ ] | **Yes** |
| 4 | CTO / Finance sign-off recorded | [ ] | **Yes** |

---

## HR Approval

| # | Item | Status |
|---|------|--------|
| 1 | HR UAT: Salary Management tabs (Periods / Approvals / Exports) | [ ] |
| 2 | HR UAT: structure create/update + slip generate | [ ] |
| 3 | HR UAT: email / PDF delivery | [ ] |

---

## Finance Approval

| # | Item | Status | Hard gate |
|---|------|--------|-----------|
| 1 | Finance review of bank export sample | [ ] | |
| 2 | Finance review of PF/ESI/PT/TDS registers | [ ] | |
| 3 | Finance accepts dual-run variance policy | [ ] | **Yes** (with CTO) |

---

## Regression Tests

| # | Item | Status |
|---|------|--------|
| 1 | No double LOP (R1) on sample cohort | [ ] |
| 2 | Flat structure pro-rata (R1) on joiners/leavers | [ ] |
| 3 | `DELETE /salary-structures/all` absent (R2) | [x] in code |
| 4 | Mark-paid / export with gates off (default) | [ ] |
| 5 | Employer statutory off → net unchanged | [x] unit |

---

## Security Review

| # | Item | Status |
|---|------|--------|
| 1 | Payroll permissions in catalog (`payroll.*`) | [x] |
| 2 | Sensitive salary fields not leaked on unrelated user APIs | [ ] spot-check |
| 3 | Export endpoints permission-gated | [x] |
| 4 | Job enqueue restricted to payroll roles | [ ] staging verify |

---

## Performance Review

| # | Item | Status |
|---|------|--------|
| 1 | Bulk sync acceptable for current headcount | [ ] measure |
| 2 | Async jobs used for large cohorts | [ ] policy |
| 3 | Multi-instance job runner risk documented | [x] (R9 in-process) |

---

## Rollback Plan

| # | Item | Status |
|---|------|--------|
| 1 | Kill switch: set `PAYROLL_V2_ENGINE=false` + restart | [x] documented in `ENGINE_KILL_SWITCH.md` |
| 2 | Confirm V1 persist path still default | [x] |
| 3 | No irreversible schema migration on cutover | [x] (additive models only) |

---

## Deployment Plan

| # | Item | Status |
|---|------|--------|
| 1 | Deploy `develop` → staging | [ ] |
| 2 | Env: all payroll flags **false** initially | [ ] |
| 3 | Smoke V1 payroll | [ ] |
| 4 | Dual-run month (staging) | [ ] |
| 5 | Optional: enable gates / employer statutory on staging only | [ ] |
| 6 | Engine enable only after hard gates | [ ] |
| 7 | Promote to `main` / prod via normal release | [ ] |

---

## Production Checklist

| # | Item | Status | Hard gate |
|---|------|--------|-----------|
| 1 | Staging dual-run signed | [ ] | **Yes** |
| 2 | Kill switch rehearsed | [ ] | **Yes** |
| 3 | `PAYROLL_V2_ENGINE=false` until go-live window | [x] default | |
| 4 | Monitoring / variance alert path defined | [ ] | |
| 5 | Communications to HR / Finance | [ ] | |
| 6 | Post-go-live first month dual-run retained | [ ] | |

---

## Sign-off log

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | |
| HR | | | |
| Finance | | | |
| CTO | | | |
