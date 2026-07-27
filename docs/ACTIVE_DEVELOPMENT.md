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
| **Current Milestone** | **R0 — Integration baseline** (**complete — awaiting review**) |
| **Current Branch** | `integrate/payroll-v2-stack` |
| **Implementation Workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` + `docs/PAYROLL_V2_PRODUCT_SPECIFICATION.md` |
| **Status** | V2 tip merged with `develop` on integration branch. **`PAYROLL_V2_ENGINE` must stay false.** Do **not** start R1 until R0 reviewed. |
| **Last Updated** | 2026-07-27 |

---

## Session start checklist

1. Read this file (`docs/ACTIVE_DEVELOPMENT.md`).
2. Read the **Implementation Workspace** / product spec listed above.
3. Confirm the **Current Branch** matches `git branch --show-current`.
4. Implement **only** the Current Milestone (if coding is approved).
5. Never open or follow plans under **Superseded Documents** for coding decisions.

---

## Superseded Documents (Archived — do not use for impl)

| Document | Location | Reason |
|----------|----------|--------|
| Obsolete monolithic / agent plans | `docs/ARCHIVE/*payroll*` | Superseded by product spec + Payroll workspace |

---

## Rules

* Never guess which implementation plan is newer.
* Do not start the next R-milestone until this file is updated **and** a human approves.
* Do **not** set `PAYROLL_V2_ENGINE=true` without dual-run sign-off (R3).

---

## R0 scope (this milestone)

* Branch `integrate/payroll-v2-stack` from `feature/payroll-v2-reporting`
* Merge `origin/develop` (reconcile authz test fixtures)
* Keep `PAYROLL_V2_ENGINE` default **false** (opt-in only via `=true`)
* Verify `/api/payroll/{periods,components,runs,approvals,reports}` mounts
* Smoke unit tests for payroll + finance authz

**Next (not started):** R1 — Fix double LOP + pro-rata (`fix/payroll-double-lop-prorata`)

**Out of scope for R0:** Money-calc fixes, period gates, ops UI, engine-on.
