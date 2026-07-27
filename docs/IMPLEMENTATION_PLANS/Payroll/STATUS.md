---
Purpose: Live status of Payroll V2 work (post M1–M8 → R-milestones).
Last Updated: 2026-07-27
---

# Payroll V2 — Status

| Field | Value |
|-------|--------|
| **Feature** | Payroll & Salary Management System V2 |
| **Phase** | Integration / Hardening |
| **Milestone** | R7 — Structure components foundation |
| **Branch** | `feature/payroll-structure-components` |
| **Base** | `chore/enable-payroll-v2-engine` (R6 tip) |
| **Code implementation** | R7 foundation complete — **awaiting review** |
| **Engine flag** | Keep `PAYROLL_V2_ENGINE` **false** |
| **Next** | R8 — Statutory & F&F — **not started** (or R7 catalog UI) |

---

## Progress

| Area | Status |
|------|--------|
| R0–R6 | Done (R3/R6 ops sign-off still manual) |
| R7 — Schema `components[]` | Done |
| R7 — Sync helpers + API | Done |
| R7 — Engine prefer components | Done |
| R7 — Tests | Done |
| R8+ | Not started |

---

## R7 deliverables

| Artifact | Path |
|----------|------|
| Sync | `backend/src/services/payroll/structureComponentSync.js` |
| Model | `salaryStructureModel.js` → `components[]` |
| API | create/update via `prepareStructureComponentFields` |
| Engine | `buildV2Result` uses structure components when present |
| Tests | `structureComponentSync.r7.unit.test.js` |

### Rollback

Flat fields remain authoritative for V1; clear `components` or omit on update to re-hydrate from flat.

---

## Blockers

1. Human review before R8 / catalog UI follow-on.
