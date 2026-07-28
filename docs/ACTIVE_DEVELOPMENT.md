---
Purpose: Single source of truth for every AI development session on We Alll Office.
Scope: Platform-wide active work pointer. Update this file whenever feature, phase, milestone, or branch changes.
Owner: Lead Architect / Session Lead
Status: Active
Last Updated: 2026-07-28
---

# Active Development

**Every AI coding or documentation session must read this file first.**

---

| Field | Value |
|-------|--------|
| **Current Feature** | Payroll V2 — Simplified SMB model |
| **Current Phase** | Implementation (additive) |
| **Current Milestone** | **SP-01/SP-02 foundation** — calculator, adjustments API, simple structure fields |
| **Current Branch** | **`feature/payroll-simplified-model`** |
| **Implementation Workspace** | `docs/PAYROLL_SIMPLIFIED_MODEL.md` + `docs/IMPLEMENTATION_PLANS/Payroll/SIMPLIFIED_MODEL_IMPLEMENTATION_PLAN.md` |
| **Status** | Foundation in progress. Legacy structures unchanged by default (`payrollMode: legacy`). Keep `PAYROLL_V2_ENGINE=false`. Hardening gates still apply before engine enable. |
| **Last Updated** | 2026-07-28 |

---

## Session start checklist

1. Read this file.
2. Read `PAYROLL_SIMPLIFIED_MODEL.md` and the implementation plan.
3. Confirm branch `feature/payroll-simplified-model`.
4. Implement only the current SP task (do not rewrite generate path until SP-03/SP-04).

---

## Rules

* Additive only — do not remove HRA/allowance fields yet.
* Do **not** set `PAYROLL_V2_ENGINE=true`.
* New simple structures use `payrollMode: "simple"` + `monthlySalary`.
