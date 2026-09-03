---
Purpose: Document the HRMS (Human Resources Management System) module including users, departments, roles, and profiles.
Scope: Backend users/departments models and frontend profiles page.
Owner: Lead HR Systems Architect
Update Trigger: Addition of new employee roles or department logic.
Dependencies: None
Related Documents: docs/CORE/AUTHORIZATION_V2.md, docs/CORE/DATABASE_SCHEMA.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: HRMS

The HRMS (Human Resources Management System) module is the foundational directory service for We Alll Office. It handles user registration, active roles mapping, department organizational mapping, and employee profiles.

---

## 1. Business Rules
* **Multi-Company Separation:** Every employee profile must specify their alignment company (`We Alll` or `Kolkata Digital`).
* **Active Status Gating:** Only employees with `status: "active"` can authenticate. Deactivated employee accounts block JWT validation instantly.
* **AWS S3 Profile Images:** User profile images are uploaded directly to the agency's AWS S3 bucket.

---

## 2. Core Workflows
1. **Onboarding:** Admin creates a new user, maps their department, role, and company alignment, which automatically sets up corresponding default grants.
2. **Profile Editing:** Employees can update their contact details and profile pictures. HR can modify employment settings (roles, departments, permissions, salary structure).

---

## 3. Database & APIs

* **Database Collections:** `users`, `departments`, `activities`
* **Primary Endpoints:**
  * `POST /api/users` - Create employee account.
  * `GET /api/users/profile` - Retrieve current active user profile.
  * `PUT /api/users/profile` - Update profile settings.
  * `GET /api/departments` - List department divisions.
* **Associated Permissions:** `team.user.create`, `team.user.update`, `team.user.view`, `team.department.view`, `team.department.manage`
