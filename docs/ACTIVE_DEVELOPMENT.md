---
Purpose: Single source of truth for every AI development session on We Alll Office.
Scope: Platform-wide active work pointer. Update this file whenever feature, phase, milestone, or branch changes.
Owner: Lead Architect / Session Lead
Status: Active
Last Updated: 2026-07-27
---

# Active Development

**Every AI coding or documentation session must read this file first.**

---

| Field | Value |
|-------|--------|
| **Current Feature** | Payroll & Salary Management System V2 |
| **Current Phase** | Integration / Hardening (Enterprise R-milestones) |
| **Current Milestone** | **R3 — Dual-run validation** (**complete — awaiting review / staging run**) |
| **Current Branch** | `chore/payroll-dual-run-ops` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | Month dual-run CSV + mismatchesOnly triage shipped; ops runbook + decision log ready. Keep `PAYROLL_V2_ENGINE=false` until CTO sign-off after a real staging month. Do **not** start R4 until R3 approved. |
| **Last Updated** | 2026-07-27 |

---

## Session start checklist

1. Read this file (`docs/ACTIVE_DEVELOPMENT.md`).
2. Read the Implementation Workspace / product spec.
3. Confirm **Current Branch** matches `git branch --show-current`.
4. Implement **only** the Current Milestone (if coding is approved).

---

## Rules

* Do not start the next R-milestone until this file is updated **and** a human approves.
* Do **not** set `PAYROLL_V2_ENGINE=true` without dual-run sign-off (R3).

---

## R3 scope (this milestone)

* `POST /api/payroll/runs/dual-run/month` — `format=json|csv`, `mismatchesOnly`, sort by `|netDiff|`
* Helpers: `dualRunMonthReport.js`
* Ops runbook + decision log template in Payroll workspace
* Unit tests for report shaping

**Next (not started):** R4 — Ops UI (approvals + exports)

**Out of scope for R3:** Enabling V2 engine, mismatch UI tab, rewriting V1/V2 math.
