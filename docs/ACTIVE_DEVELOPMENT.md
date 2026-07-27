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
| **Current Milestone** | **R8 — Employer statutory foundation** (**complete — awaiting review**) |
| **Current Branch** | `feature/payroll-statutory-fnf` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | `PAYROLL_EMPLOYER_STATUTORY` (default false) adds PF_ER/ESI_ER + CTC; employee net unchanged. Keep `PAYROLL_V2_ENGINE=false`. Do **not** start R9 / F&F UI until R8 approved. |
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

## R8 scope (this milestone)

* Catalog defaults `PF_ER` / `ESI_ER`
* `employerStatutory.js` rates + CTC helpers
* V2 employer lines when `PAYROLL_EMPLOYER_STATUTORY=true` (net unchanged)

**Next (not started):** R9 — Jobs / scale, or R8b F&F calculator

**Out of scope:** F&F settlement UI/slip type, full EPFO/ESIC rule engine, PT slabs rewrite.
