---
Purpose: Live status of Payroll V2 work (post M1–M8 → R-milestones).
Last Updated: 2026-07-27
---

# Payroll V2 — Status

| Field | Value |
|-------|--------|
| **Feature** | Payroll & Salary Management System V2 |
| **Phase** | Integration / Hardening |
| **Milestone** | R9 — Payroll jobs foundation |
| **Branch** | `feature/payroll-jobs` |
| **Base** | `feature/payroll-statutory-fnf` (R8 tip) |
| **Code implementation** | R9 foundation complete — **awaiting review** |
| **Engine flag** | Keep `PAYROLL_V2_ENGINE` **false** |
| **Next** | Ops merge / staging; optional cron or F&F |

---

## Progress

| Area | Status |
|------|--------|
| R0–R8 | Done |
| R9 — PayrollJob + queue | Done |
| R9 — Async bulk generate/email | Done |
| R9 — Job status API | Done |
| R9 — Cron | Not started |
| R-track tip | `feature/payroll-jobs` |

---

## R9 deliverables

| Artifact | Path |
|----------|------|
| Model | `backend/src/models/payrollJobModel.js` |
| Service | `backend/src/services/payroll/payrollJobService.js` |
| Routes | `/api/payroll/jobs/*` |
| Tests | `payrollJobs.r9.unit.test.js` |

### Usage

```http
POST /api/payroll/jobs/bulk-generate
{ "month": 6, "year": 2026 }

GET /api/payroll/jobs/:jobId
```

Sync `POST /salary-slips/generate-bulk` remains for small cohorts.

---

## Blockers

1. Human review / merge of R-stack branches into develop.
2. R3 CTO dual-run sign-off before engine enable.
