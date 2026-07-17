---
Purpose: Maintain a historical audit log of critical technology selection and software architectural design decisions.
Scope: Platform-wide architectural choices.
Owner: Chief Software Architect
Update Trigger: Implementation of major refactorings, system migrations, or new framework libraries.
Dependencies: None
Related Documents: docs/CORE/PROJECT_ARCHITECTURE.md, docs/CORE/AUTHORIZATION_V2.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Architecture Decision Log (ADL): We Alll Office

This document serves as the historical record of We Alll Office structural engineering design choices, detailing the context, decisions, trade-offs, and downstream impacts.

---

## 1. ADR 01: Authorization V2 RBAC Migration

* **Date:** 2026-05-10
* **Status:** Approved / In Migration Phase
* **Decision:** Replace the legacy hardcoded role arrays (`authorizeRoles('admin', 'hr', ...)`) with a modular permission catalog gating system (`requireModulePermission`).
* **Reason:** Legacy hardcoded checks made it impossible to assign granular permissions (e.g. allowing specific managers to view other departments' projects without granting them full HR/Admin clearance). 
* **Alternatives Considered:** 
  * *Maintaining Legacy Role Checks:* Simple but lacks flexibility and causes code duplication.
  * *Database-stored Permission Map:* Fully dynamic but introduces database queries overhead on every HTTP request.
* **Trade-offs & Impact:** 
  * **Pro:** Allows granular user permission overrides, supports scopes (`SELF`, `OWN_DEPARTMENT`, `COMPANY`), and simplifies route gates.
  * **Con:** Increases complexity during authorization payload checks. Requires fallback legacy arrays during migration.

---

## 2. ADR 02: Legacy Slot Consolidations into Work Items

* **Date:** 2026-05-20
* **Status:** Approved / Completed
* **Decision:** Deprecate the old `slotModel.js` and `taskModel.js` task allocations and unify task management under a single schema: `workItemModel.js`.
* **Reason:** The legacy slots model was overly complex, distributing task parameters across separate slot structures, leading to database fragmentation and sync lag.
* **Alternatives Considered:** Refactoring slot collections to add relationship fields. Rejected because it maintained legacy overhead.
* **Trade-offs & Impact:**
  * **Pro:** Unifies task tracking, speeds up workload aggregation queries, and clarifies assignee roles.
  * **Con:** Legacy data must be kept in read-only tables (`slotModel.js`) to avoid losing historical metrics.

---

## 3. ADR 03: Geolocation Gated Clock-ins

* **Date:** 2026-06-01
* **Status:** Approved / Completed
* **Decision:** Enforce GPS coordinates validations on the backend during clock-in events to confirm proximity to We Alll office coordinates.
* **Reason:** To prevent remote clock-in abuse and maintain attendance data integrity.
* **Alternatives Considered:** IP address tracking. Rejected because mobile proxies and DHCP resets render IPs unreliable.
* **Trade-offs & Impact:**
  * **Pro:** Enforces location compliance, prevents spoofing, and secures attendance reports.
  * **Con:** Requires active browser geolocation consent and fails gracefully if browser location services are blocked.

---

## 4. ADR 04: Body-Class CSS Variable Theme Overrides for PIP

* **Date:** 2026-07-15
* **Status:** Approved / Completed
* **Decision:** Dynamically append a `.pip-active` class to the HTML `<body>` tag when an employee is in the PIP/Critical Review stage, overriding CSS color variables in `pip-theme.css`.
* **Reason:** To implement a prominent warning theme across the entire dashboard interface without creating duplicate layouts or complex react rendering logic.
* **Alternatives Considered:** Conditional component style attributes throughout the React codebase. Rejected due to code clutter.
* **Trade-offs & Impact:**
  * **Pro:** Simple, maintainable, and completely isolates PIP styling parameters.
  * **Con:** Requires developers to use CSS variables for primary dashboard assets rather than typing static hex colors.
