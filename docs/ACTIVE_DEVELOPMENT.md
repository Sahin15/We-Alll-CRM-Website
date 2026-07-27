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
| **Current Milestone** | **R9 — Payroll jobs foundation** (**complete — awaiting review**) |
| **Current Branch** | `feature/payroll-jobs` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | Async bulk generate/email via `/api/payroll/jobs` (in-process queue). Sync bulk endpoints unchanged. Keep `PAYROLL_V2_ENGINE=false`. R-track coding tip for this stack. |
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

## R9 scope (this milestone)

* `PayrollJob` model + in-process runner
* `POST /api/payroll/jobs/bulk-generate` / `bulk-email` → 202
* `GET /api/payroll/jobs` / `:id`

**Next:** Human review; optional R9b cron / FE poller / F&F follow-ons

**Out of scope:** Month-end cron, Redis/Bull, load harness, job poller UI.
