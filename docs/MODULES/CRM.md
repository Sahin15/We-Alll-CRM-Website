---
Purpose: Document customer relationships, onboarding, service assignments, and multi-company segregation.
Scope: Clients, projects, and sales interfaces.
Owner: Lead CRM Architect
Update Trigger: Addition of new client features or company divisions.
Dependencies: docs/MODULES/HRMS.md
Related Documents: docs/MODULES/SALES.md, docs/CORE/PROJECT_OVERVIEW.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: CRM

The CRM (Customer Relationship Management) module manages digital agency clients, segregating We Alll and Kolkata Digital contract records.

---

## 1. Business Rules
* **Multi-Company Separation:** Every client account is aligned with either We Alll or Kolkata Digital. Cross-company visibility is restricted to Admins/SuperAdmins.
* **Auto-Project Generation:** Onboarding a new client and associating an active service automatically generates a matching Project file, ready for team assignment.

---

## 2. Core Workflows
1. **Onboarding:** Sales representatives record client information, company type, and services details.
2. **Project Initiation:** The system triggers project creation, sending notifications to HODs to allocate personnel.

---

## 3. Database & APIs

* **Database Collections:** `clients`, `services`, `projects`
* **Primary Endpoints:**
  * `POST /api/clients` - Onboard a new client record.
  * `GET /api/clients/:id` - Retrieve client profile and active projects.
  * `PUT /api/clients/:id` - Edit client configuration details.
* **Associated Permissions:** `crm.client.view`, `crm.client.manage`, `crm.client.view_assigned`
