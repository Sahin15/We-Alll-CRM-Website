---
Purpose: Define a prioritized development schedule and migration roadmap based on dependencies, business impact, and risk.
Scope: Platform roadmap and release planning.
Owner: Product Owner / Chief Architect
Update Trigger: Milestone completions or major shifts in platform capabilities.
Dependencies: docs/HEALTH/PROJECT_HEALTH_REPORT.md
Related Documents: docs/CORE/PROJECT_OVERVIEW.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Master Development Roadmap: We Alll Office

This document specifies the engineering roadmap for We Alll Office, scheduling upgrades across three sequential release milestones based on technical dependencies, business value, and risk mitigation.

---

## 1. Release Schedule

```
               [Release v2.1: Hardening & Security]
                                │
                                ▼
            [Release v2.2: Test Coverage & Clean Logs]
                                │
                                ▼
            [Release v2.3: Scale & Performance Safety]
```

---

## 2. Release Milestones Details

### 2.1 Release v2.1: Hardening & Security (Immediate / High Priority)
* **Goal:** Complete V2 Authorization security rollout and secure database transaction consistency.
* **Target Backlog Items:**
  1. **Complete RBAC V2 Migration:** Refactor all backend routes (like leave and attendance routes) to gate strictly on the V2 permission catalog, deleting legacy `authorizeRoles()` arrays.
  2. **Introduce Mongoose Transactions:** Wrap multi-update processes—specifically monthly payroll slip generations (`salarySlipController.js`) and procurement approvals (`purchaseRequestController.js`)─in database transaction sessions (`session.startTransaction()`) to prevent partial commit corruption.
  3. **Controller Refactoring:** Extract helper logic from oversized files (e.g. date math in `workCalendarController.js` and shifts logic in `attendanceController.js`) into reusable utilities.

### 2.2 Release v2.2: Testing & Logs (Medium Term / Medium Priority)
* **Goal:** Implement the testing baseline and standardize debugging tools.
* **Target Backlog Items:**
  1. **Backend Jest Setup:** Configure Jest and supertest in the backend folder. Write unit tests for Auth routes, Clocking endpoints, and Leave balance queries.
  2. **Frontend Cypress Integration:** Integrate Cypress test files. Validate core React user dashboard interactions (clocking buttons, leave modals).
  3. **Standardize Logging:** Refactor all controllers to use Winston log levels instead of raw `console.log` statements.

### 2.3 Release v2.3: Scale & Performance (Long Term / High Value)
* **Goal:** Optimizing file upload limits and performance.
* **Target Backlog Items:**
  1. **Stream-based CSV/XLSX Uploads:** Update bulk caller records uploads (`rawDataController.js`) to stream records directly to MongoDB using csv-parser rather than reading the entire file in-memory.
  2. **TTL Indexing Optimization:** Adjust MongoDB notifications index to enforce automatic archiving of historical announcements.
  3. **Client Subscriptions Rollbacks:** Add transactional rollback handlers for client subscription creation and payment verification flows.
