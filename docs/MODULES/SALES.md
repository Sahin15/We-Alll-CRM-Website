---
Purpose: Document lead management, call lists tracking, raw sheets upload, and caller metrics.
Scope: Sales pipelines and raw data sheet uploads.
Owner: Lead Sales Architect
Update Trigger: Policy revisions on caller routing or lead assignments.
Dependencies: docs/MODULES/HRMS.md
Related Documents: docs/MODULES/CRM.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Sales & Leads

The Sales module tracks sales prospects, caller queues, and raw data sheet uploads.

---

## 1. Business Rules
* **Lead Allocations:** Incoming leads are assigned to sales representatives based on active departments and caller logs.
* **Segregated sheet queues:** Raw data sheets uploaded by Admins must be filtered by department, separating callers' visibility to avoid data overlap.

---

## 2. Core Workflows
1. **Sheet Upload:** Admins upload caller sheets. Rows are parsed into the raw data collections.
2. **Calling Queue:** Callers query active lists, logging notes and status updates directly in the app.

---

## 3. Database & APIs

* **Database Collections:** `leads`, `rawdatas`, `importantpersons`
* **Primary Endpoints:**
  * `POST /api/raw-data/upload` - Admin upload of caller sheets.
  * `GET /api/raw-data/queue` - Retrieve active queue for callers.
  * `POST /api/leads` - Transition a caller queue item into an active sales Lead.
* **Associated Permissions:** `crm.lead.view`, `crm.lead.manage`, `crm.rawdata.manage`, `crm.rawdata.analytics.view`
