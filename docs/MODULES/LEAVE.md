---
Purpose: Document leave balance models, policies, request workflows, and multi-tier approval sequences.
Scope: Leave management backend logic and frontend templates.
Owner: HR Systems Architect
Update Trigger: Modifications on leave types, allowances, or approval tiers.
Dependencies: docs/MODULES/HRMS.md
Related Documents: docs/MODULES/ATTENDANCE.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Leave Management

The Leave Management module tracks employee leave entitlements (Personal, Sick, Unpaid, Holiday leaves) and coordinates multi-tiered approvals.

---

## 1. Business Rules
* **Entitlement Balance:** Standard full-time employees receive 18 leaves annually (12 Personal, 6 Sick). Part-time employees default to Unpaid leave requests only.
* **Advance Notice Policy:** Planned leaves require a minimum of 3 days advance notice. System validations block submissions that bypass this notice unless flagged as an emergency.
* **Approval Chain:** Leave requests require HOD approval, followed by final HR review and Admin validation.

---

## 2. Core Workflows
1. **Submission:** Employee inputs start/end dates and leave type. Eligible balance is checked.
2. **Review Tiers:** HOD reviews request. If approved, HR is notified to perform the final balance check and issue the release.

---

## 3. Database & APIs

* **Database Collections:** `leaverequests`, `holidays`, `wfhrequests`
* **Primary Endpoints:**
  * `POST /api/leaves/request` - Submit a new leave request.
  * `PUT /api/leaves/request/:id/approve` - Approve/escalate a request.
  * `GET /api/leaves/balance` - Retrieve active employee leave balances.
* **Associated Permissions:** `leave.request.create`, `leave.request.approve`, `leave.request.view`, `leave.request.view_self`
