---
Purpose: Document dashboard widget configurations, stats calculations, and role-based panels.
Scope: Frontend application homepages.
Owner: Lead Frontend Engineer
Update Trigger: Dashboard visual modifications or adding new widgets.
Dependencies: docs/MODULES/HRMS.md
Related Documents: docs/CORE/UI_DESIGN_SYSTEM.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Dashboards

The Dashboards module renders custom widgets, statistics, and shortcuts based on user role.

---

## 1. Business Rules
* **Role Layouts:** Renders specialized panels (SuperAdmin, Admin, HR, HOD, Employee, Client).
* **Parallel API Fetching:** Dashboards fetch data (e.g. attendance, tasks, notices, projects) in parallel using `Promise.allSettled` to optimize load times.

---

## 2. Core Workflows
1. **Mounting:** Dashboard checks user role.
2. **Retrieval:** Parallel API queries fetch relevant data. If any query fails, the panel displays a fallback state.

---

## 3. Database & APIs

* **Database Collections:** Serves as a unified interface querying `attendances`, `workitems`, `leaverequests`, `announcements`, and `growthtracks`.
* **Primary Endpoints:**
  * `GET /api/admin-dashboard` - Aggregates admin metrics.
  * `GET /api/client-dashboard` - Aggregates client statistics.
  * `GET /api/attendance/today` - Checks employee clock-in status.
* **Associated Permissions:** `dashboard.view`
