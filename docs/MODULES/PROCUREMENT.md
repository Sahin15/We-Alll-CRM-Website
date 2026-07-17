---
Purpose: Document the purchasing process including purchase requests, approvals, purchase orders, and goods receipts.
Scope: Procurement module.
Owner: Lead Procurement Architect
Update Trigger: Threshold revisions or workflow changes.
Dependencies: docs/MODULES/HRMS.md
Related Documents: docs/CORE/DATABASE_SCHEMA.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Procurement

The Procurement module manages purchase requests (PR), purchase orders (PO), goods receipts (GR), and vendor records.

---

## 1. Business Rules
* **Sequential Numbering:** All documents (PRs, POs, GRs, Procurement Invoices, and Payments) use auto-incremented counters managed by `procurementCounterModel.js` in separate namespaces (e.g. `WA-PR-2026-0001` vs `KD-PR-2026-0001`).
* **Approval Tiers:** Purchase Requests require initial review by the Department Head (HOD), followed by final Admin validation.
* **Budget Gating:** Purchase Requests check department budgets before allowing submission.

---

## 2. Core Workflows
1. **Requisition (PR):** Employee submits PR. HOD reviews and signs off.
2. **Order (PO):** Finance/Admin generates a Purchase Order to the Vendor.
3. **Receipt (GR) & Billing:** Delivery is verified via Goods Receipt, triggering Invoice validation.

---

## 3. Database & APIs

* **Database Collections:** `purchaserequests`, `purchaseorders`, `goodsreceipts`, `vendors`, `procurementcounters`, `budgets`
* **Primary Endpoints:**
  * `POST /api/procurement/purchase-requests` - Submit a new request.
  * `PUT /api/procurement/purchase-requests/:id/approve` - Approve requisition.
  * `POST /api/procurement/purchase-orders` - Generate order sheet.
* **Associated Permissions:** `procurement.pr.create`, `procurement.pr.view`, `procurement.pr.approve_hod`, `procurement.pr.approve_admin`, `procurement.po.manage`
