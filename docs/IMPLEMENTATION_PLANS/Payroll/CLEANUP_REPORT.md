---
Purpose: Cleanup / hygiene audit after consolidating Payroll V2 onto develop.
Date: 2026-07-27
Policy: Document only — do NOT delete unless unquestionably safe (none deleted in this pass).
---

# Payroll V2 — Cleanup Report (develop baseline)

## Scope

Audit of payroll/salary-related code and docs after FF merge of R-stack tip `66c9c42` onto `develop`.

## Duplicates (mounts / models / services)

| Check | Result |
|-------|--------|
| API registrations in `server.js` | Unique: `/api/salary-*` (V1) + `/api/payroll/*` (V2 additive) — **no duplicate mounts** |
| Mongoose models | One each: `PayrollPeriod`, `PayrollJob`, `PayrollExportHistory`, `SalaryComponent`, plus V1 `Salary*` — **no duplicate model names** |
| Route files | One router file per domain; no twin routers |
| Services under `services/payroll/` | Single module per concern; reporting helpers nested under `reporting/` |

## Unused / dead code (candidates — keep)

| Item | Notes | Action |
|------|-------|--------|
| `salaryModel.js` (`Salary`) | Legacy collection; may still be referenced elsewhere | **Keep** — verify consumers before any remove |
| Historical remote branches (`feature/payroll-v2-*`, R*) | Content already on develop | **Keep remotes** until human archive approval |
| `docs/ARCHIVE/*` payroll plans | Intentional archive | **Keep** |

## Debug / console

| Location | Notes | Action |
|----------|-------|--------|
| `salarySlipPdfGenerator.js` | Logo path `console.log` / warn | Cleanup candidate (non-blocking) |
| `documentStorageService.js` | warn/error on S3 fallback | **Keep** — operational |
| `salarySlipController.js` | `console.warn` on notify failures | **Keep** |

## TODOs / FIXMEs (payroll path)

No critical `FIXME` blocking develop baseline. Remaining product TODOs tracked in `TASKS.md` / `NEXT_DEVELOPMENT_QUEUE.md` (YTD, F&F, cron).

## Commented-out code

No large commented payroll blocks identified that are safe to strip in this pass. Prefer follow-up PR with file-level review.

## Lint debt (frontend salary UI)

`eslint` on `src/components/salary/**` reports ~95 issues (mostly `react/prop-types`, unused imports, unescaped entities). **Vite production build succeeds.** Treat as hygiene sprint (queue S5), not merge blocker.

## Architectural recommendations (no refactor now)

1. Keep V1 controllers; gradually move generate/recalc orchestration behind `services/payroll/*`.
2. Prefer cutting feature branches from `develop` named `feature/payroll-<topic>`.
3. When multi-instance deploy arrives, replace R9 in-process queue (do not bolt Redis onto develop without a milestone).
4. Consider a thin `payrollApi` FE facade mirroring backend `/api/payroll` (today split across `payroll*Api.js` + `salaryApi.js`).

## Deletions performed

**None.**
