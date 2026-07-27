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
| **Current Milestone** | **R5 — Period gates** (**complete — awaiting review**) |
| **Current Branch** | `feature/payroll-period-gates` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | `PAYROLL_PERIOD_GATES` (default false) gates generate/export/mark-paid. Keep `PAYROLL_V2_ENGINE=false`. Do **not** start R6 until R5 approved. |
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

## R5 scope (this milestone)

* Flag `PAYROLL_PERIOD_GATES` (default false)
* Generate / export: `open` \| `frozen`; mark-paid: `locked`; missing period = block
* UI disables + messages on Generate, Exports, Mark as paid
* `GET /api/payroll/periods/gates-status`

**Next (not started):** R6 — Engine cutover (optional; needs R3 sign-off)

**Out of scope for R5:** Enabling V2 engine, changing period state machine edges.
