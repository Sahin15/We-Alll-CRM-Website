---
Purpose: Phased milestones after M1–M8 — enterprise R-track.
Last Updated: 2026-07-27
---

# Payroll V2 — Milestones (R-track)

## Prior platform (complete on tip)

| Milestone | Branch | Status |
|-----------|--------|--------|
| M1–M8 | `feature/payroll-v2-reporting` | Complete |

## Integration / hardening

| Milestone | Branch | Status |
|-----------|--------|--------|
| **R0** | `integrate/payroll-v2-stack` | Complete |
| **R1** | `fix/payroll-double-lop-prorata` | Complete |
| **R2** | `fix/payroll-hygiene` | Complete |
| **R3** | `chore/payroll-dual-run-ops` | Complete tooling — awaiting staging sign-off |
| **R4** | `feature/payroll-ops-ui` | Complete |
| **R5** | `feature/payroll-period-gates` | Complete |
| **R6** | `chore/enable-payroll-v2-engine` | Prep complete — flag still false |
| **R7** | `feature/payroll-structure-components` | Complete |
| **R8** | `feature/payroll-statutory-fnf` | Employer statutory foundation complete |
| **R9** | `feature/payroll-jobs` | Complete — tip on **`develop`** |

## Develop baseline

| Item | Status |
|------|--------|
| Consolidate R0–R9 onto `develop` | Complete (FF, 2026-07-27) |
| Source of truth | **`develop`** |
| Next coding | Cut branches from `develop` per `NEXT_DEVELOPMENT_QUEUE.md` |
