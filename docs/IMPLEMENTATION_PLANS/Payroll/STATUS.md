---
Purpose: Live status of Payroll V2 work.
Last Updated: 2026-07-17
---

# Payroll V2 — Status

| Field | Value |
|-------|--------|
| **Feature** | Payroll & Salary Management System V2 |
| **Phase** | Implementation |
| **Milestone** | Milestone 8 — Reporting / Bank Export |
| **Branch** | `feature/payroll-v2-reporting` |
| **Implementation workspace** | `docs/IMPLEMENTATION_PLANS/Payroll/` |
| **Code implementation** | Milestone 8 complete — **awaiting review** |
| **Next coding milestone** | None in current plan (V2 milestone set complete pending review) |

---

## Progress

| Area | Status |
|------|--------|
| Milestone 1–7 | Done |
| Milestone 8 — Bank NEFT CSV | Done |
| Milestone 8 — Compliance registers | Done |
| Milestone 8 — Export history foundation | Done |
| Milestone 8 — tests | Done |

---

## Milestone 8 deliverables

| Artifact | Path |
|----------|------|
| Reporting package | `backend/src/services/payroll/reporting/` |
| History model | `backend/src/models/payrollExportHistoryModel.js` |
| API | `/api/payroll/reports` |
| Permission | `payroll.bank.export` |
| Tests | `backend/tests/payrollReporting.unit.test.js` |

### API surface

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/payroll/reports/capabilities` | Formats + lifecycle status list |
| GET | `/api/payroll/reports/bank-neft.csv` | Default `status=approved` |
| GET | `/api/payroll/reports/registers/:id.csv` | `pf` \| `esi` \| `pt` \| `tds` |
| GET | `/api/payroll/reports/exports` | Export history audit |

---

## Blockers

1. Human review / merge approval.
