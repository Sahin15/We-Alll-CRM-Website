---
Purpose: Prioritized queue for Payroll V2 work after develop consolidation.
Last Updated: 2026-07-27
Branch base: always cut from `develop`
---

# Payroll V2 — Next Development Queue

**Rule:** All new Payroll V2 branches fork from `develop`. Do not reopen historical M*/R* tip branches for new commits.

Complexity: **S** (<1 day) · **M** (2–5 days) · **L** (1–2 weeks) · **XL** (>2 weeks)

---

## Immediate

| ID | Work | Why | Complexity |
|----|------|-----|------------|
| I1 | Deploy `develop` to staging; smoke V1 salary generate/email | Prove consolidate tip is operable | M |
| I2 | Full-month dual-run CSV + triage (`DUAL_RUN_*`) | Hard gate for engine | M |
| I3 | Record CTO/Finance sign-off in decision log | Unlocks R6 env enable | S |
| I4 | Archive/delete obsolete remote payroll feature branches (human-approved) | Reduce branch noise | S |

---

## Next Sprint

| ID | Work | Why | Complexity |
|----|------|-----|------------|
| S1 | YTD fields populated on slip generate | Tracked V1 debt | M |
| S2 | FE job status poller for `/api/payroll/jobs` | Ops UX for R9 | M |
| S3 | Structure components catalog / editor UI (R7b) | Make components usable by HR | L |
| S4 | Staging-only `PAYROLL_PERIOD_GATES=true` trial | Validate fail-closed gates | M |
| S5 | Lint cleanup for V1 salary components (prop-types / unused) | Hygiene; non-blocking for build | M |

---

## Medium Term

| ID | Work | Why | Complexity |
|----|------|-----|------------|
| M1 | F&F calculator + settlement slip (R8b) | Exit workflows | L |
| M2 | Month-end cron enqueue (R9b) — still in-process or simple scheduler | Automation without Redis | M |
| M3 | Bank-specific NEFT format packs | Finance ops | M |
| M4 | Integration test suite for `/api/payroll/*` (supertest) | CI confidence | L |
| M5 | Employer statutory staging trial (`PAYROLL_EMPLOYER_STATUTORY`) | CTC reporting | M |

---

## Long Term

| ID | Work | Why | Complexity |
|----|------|-----|------------|
| L1 | Redis/Bull (or equivalent) job queue + multi-instance safety | Scale | L |
| L2 | Engine cutover on staging → prod per `ENGINE_CUTOVER_RUNBOOK.md` | V2 persist | L |
| L3 | Cost centers / multi-company payroll dimensions | Enterprise ERP | XL |
| L4 | Full statutory engine (EPFO/ESIC/PT state rules) | Compliance depth | XL |

---

## Future

| ID | Work | Why | Complexity |
|----|------|-----|------------|
| F1 | Employee self-serve tax regime / declarations | Product | XL |
| F2 | Payroll analytics / variance dashboards | Ops | L |
| F3 | Mobile payslip experience parity | UX | L |
| F4 | Remove or fully shadow V1 calculation path (post multi-month stability) | Simplify | XL |

---

## Explicitly out of queue until hard gates

- Setting `PAYROLL_V2_ENGINE=true` in production
- Breaking changes to `/api/salary-*` contracts
- Schema migrations that rewrite existing slips
- Deleting Payroll V1 controllers/routes
