---
Purpose: Live status of Payroll V2 work (post M1–M8 → R-milestones).
Last Updated: 2026-07-27
---

# Payroll V2 — Status

| Field | Value |
|-------|--------|
| **Feature** | Payroll & Salary Management System V2 |
| **Phase** | Integration / Hardening |
| **Milestone** | R4 — Ops UI |
| **Branch** | `feature/payroll-ops-ui` |
| **Base** | `chore/payroll-dual-run-ops` (R3 tip) |
| **Code implementation** | R4 complete — **awaiting review** |
| **Engine flag** | Keep `PAYROLL_V2_ENGINE` **false** |
| **Next** | R5 — Period gates — **not started** |

---

## Progress

| Area | Status |
|------|--------|
| R0–R3 | Done (R3 staging sign-off still manual) |
| R4 — Approvals tab | Done |
| R4 — Exports tab | Done |
| R4 — API clients | Done |
| R5+ | Not started |

---

## R4 deliverables

| Artifact | Path |
|----------|------|
| Approvals UI | `frontend/src/components/salary/PayrollApprovals.jsx` |
| Exports UI | `frontend/src/components/salary/PayrollExports.jsx` |
| Clients | `payrollApprovalApi.js`, `payrollReportApi.js` |
| Hub | `SalaryManagement.jsx` tabs `approvals` / `exports` |

### Manual check

HR/Accounts: open Salary Management → Approvals / Exports; confirm permission errors are clear for roles without `payroll.approval.manage` / `payroll.bank.export`.

---

## Blockers

1. Human review before R5.
2. R3 staging dual-run CTO sign-off (process; independent of R4 UI).
