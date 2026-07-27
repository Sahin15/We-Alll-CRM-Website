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
| **Current Milestone** | **R4 — Ops UI** (**complete — awaiting review**) |
| **Current Branch** | `feature/payroll-ops-ui` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | Approvals + Exports tabs on Salary Management. Keep `PAYROLL_V2_ENGINE=false`. Do **not** start R5 until R4 approved. |
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

## R4 scope (this milestone)

* Salary Management tabs: **Approvals** (pending inbox, act/reject, bulk-approve, start from slips/IDs)
* Salary Management tabs: **Exports** (bank NEFT, PF/ESI/PT/TDS, export history)
* API clients: `payrollApprovalApi.js`, `payrollReportApi.js`

**Next (not started):** R5 — Period enforcement

**Out of scope for R4:** Period gates, auto-approval on generate, engine flip.
