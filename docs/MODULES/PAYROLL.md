---
Purpose: Document salary structures, earnings/deductions calculations, and monthly salary slip generations.
Scope: Financial and payroll backend systems.
Owner: Lead Finance Developer / HR Auditor
Update Trigger: Legal changes on tax deductions or payroll policy structures.
Dependencies: docs/MODULES/HRMS.md, docs/MODULES/ATTENDANCE.md, docs/MODULES/LEAVE.md
Related Documents: docs/CORE/DATABASE_SCHEMA.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Payroll

The Payroll module handles salary parameters config, drafts payroll previews, and issues monthly employee salary slips.

---

## 1. Business Rules
* **Calculation Bases:** Earnings are calculated based on the employee's base pay structure template. Deductions are automatically computed for LOP (Loss of Pay) days (determined by unpaid leaves and unapproved absences mapped in the Attendance logs).
* **Payment Schedule:** Draft runs occur during the final week of each month. Admin approval triggers final database commits and notifications.

---

## 2. Core Workflows
1. **Draft Generation:** HR runs the Payroll Preview for the active month, compiling work logs and deductions.
2. **Commit & Slip Issuance:** Admin signs off on the draft. Slips are created, and employees receive push notification alerts to view/download PDFs.

---

## 3. Database & APIs

* **Database Collections:** `salaries`, `salarystructures`, `salarystructuretemplates`, `salaryslips`, `salarypreviews`
* **Primary Endpoints:**
  * `POST /api/salary-structures` - Define salary structure for a user.
  * `POST /api/salary-slips/generate` - Run monthly payroll slip generation.
  * `GET /api/salary-slips/my-slips` - View personal salary logs.
* **Associated Permissions:** `payroll.structure.manage`, `payroll.slip.manage`, `payroll.slip.view_self`
