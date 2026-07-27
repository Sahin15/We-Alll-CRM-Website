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
| **Current Milestone** | **R7 — Structure components foundation** (**complete — awaiting review**) |
| **Current Branch** | `feature/payroll-structure-components` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | Optional `SalaryStructure.components[]` + flat shadow sync; V2 prefers structure components when present. Keep `PAYROLL_V2_ENGINE=false`. Do **not** start R8 until R7 approved. |
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
* Do **not** set `PAYROLL_V2_ENGINE=true` without dual-run sign-off (R3) and cutover runbook gates.

---

## R7 scope (this milestone)

* Optional `components[]` on SalaryStructure; flat fields remain V1 shadow
* `structureComponentSync` + create/update API sync
* V2 engine uses structure components when non-empty
* Unit tests (round-trip + dual-run)

**Next (not started):** R8 — Statutory & F&F (or R7b catalog UI)

**Out of scope for R7 foundation:** Catalog CRUD UI, bulk DB migrate, rewrite structure forms.
