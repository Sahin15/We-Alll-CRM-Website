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
| **Current Milestone** | **R2 — Hygiene** (**complete — awaiting review**) |
| **Current Branch** | `fix/payroll-hygiene` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | DELETE `/salary-structures/all` removed; salary-slip static routes ordered before `/:id`; slip notifications verified for deploy. Keep `PAYROLL_V2_ENGINE=false`. Do **not** start R3 until R2 approved. |
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

## R2 scope (this milestone)

* Remove `DELETE /api/salary-structures/all` (route + controller + frontend `deleteAll` client)
* Register salary-slip static GET paths before `GET /:id` (employee, reports, stats)
* Confirm `sendSalarySlipNotification` + `salary_slip_generated` remain on generate/bulk for deploy

**Next (not started):** R3 — Dual-run validation program

**Out of scope for R2:** Period gates, approvals UI, engine cutover.
