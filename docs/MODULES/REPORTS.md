---
Purpose: Document system analytics reports, finance charts data sources, and Excel sheet export processes.
Scope: Reporting and charts modules.
Owner: Lead Analyst
Update Trigger: Addition of new export options or tracking parameters.
Dependencies: None
Related Documents: docs/CORE/API_STANDARDS.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Reports & Analytics

This module compiles system-wide analytics on attendance, leaves, projects, billing, and workloads.

---

## 1. Business Rules
* **Scoped Visibility:** Employees only see their personal analytics. HODs query department charts. Admins, HR, and SuperAdmins access global company reports.
* **Format Exports:** Support exporting tables to XLSX (using xlsx) and PDF downloads.

---

## 2. Core Workflows
1. **Querying:** User selects dates. The API aggregates logs.
2. **Exporting:** Client compiles table and parses it into downloadable sheets.

---

## 3. Database & APIs

* **Database Collections:** `attendances`, `leaverequests`, `invoices`, `workitems`
* **Primary Endpoints:**
  * `GET /api/reports/attendance` - Fetch attendance stats.
  * `GET /api/reports/finance` - Fetch financial summaries.
  * `GET /api/reports/workload` - Fetch workload charts.
* **Associated Permissions:** `reports.analytics.view`
