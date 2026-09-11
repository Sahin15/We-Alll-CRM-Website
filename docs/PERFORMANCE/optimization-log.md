# Optimization Log

Each change requires a completed OPT packet (baseline → hypothesis → implementation → after measurement → regression → rollback).

| OPT ID | Title | Status | Branch commit |
|--------|-------|--------|---------------|
| — | Phase 0 baseline capture | In progress (UAT login measured; auth pages pending) | — |
| OPT-A1 | In-flight dedupe on `getAllUsers` | Implemented — pending re-measure | — |

---

### OPT-A1: In-flight dedupe on `getAllUsers`

**Baseline measurement**
- Date: 2026-09-11
- Environment: UAT + code review
- Page: HR/Admin dashboards (multiple parallel `getAllUsers` on mount)
- Metrics: Duplicate `/api/users` count pending authenticated DevTools capture

**Hypothesis**
Centralizing in-flight dedupe at `userApi.getAllUsers` collapses concurrent identical requests from dashboard widgets/modals into one HTTP call without changing freshness (no TTL).

**Implementation**
- [`frontend/src/api/userApi.js`](../../frontend/src/api/userApi.js) — wrap `baseCrudApi.getAll` with `apiOptimizer.deduplicate` keyed by sorted params.

**After measurement**
- Pending: DevTools network count on HR dashboard before/after deploy.

**Regression verification**
- Pending: smoke login + dashboard load + user list modals.

**Rollback consideration**
Revert `getAllUsers` export to `baseCrudApi.getAll` direct assignment.

---

<!-- Template for new entries:

### OPT-001: [Title]

**Baseline measurement**
- Date:
- Environment:
- Page:
- Metrics:

**Hypothesis**

**Implementation**

**After measurement**

**Regression verification**

**Rollback consideration**

-->
