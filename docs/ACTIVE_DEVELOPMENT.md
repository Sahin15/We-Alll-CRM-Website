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
| **Current Milestone** | **R6 — Engine cutover prep** (**complete — awaiting review**; flag still false) |
| **Current Branch** | `chore/enable-payroll-v2-engine` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | Cutover + kill-switch runbooks ready. Keep `PAYROLL_V2_ENGINE=false` until R3 CTO sign-off + ops enable. Do **not** start R7 until R6 prep approved (or explicit skip to R7). |
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
* Do **not** set `PAYROLL_V2_ENGINE=true` without dual-run sign-off (R3) and the cutover runbook hard gates.

---

## R6 scope (this milestone)

* Docs only: `ENGINE_CUTOVER_RUNBOOK.md`, `ENGINE_KILL_SWITCH.md`
* No env flip in git; no persist-math changes

**Next (not started):** R7 — Component wiring (or ops-only staging enable outside git)

**Out of scope for R6 prep:** Committing `PAYROLL_V2_ENGINE=true`, historical slip migration.
