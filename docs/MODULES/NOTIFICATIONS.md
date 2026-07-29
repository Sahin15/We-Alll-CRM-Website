---
Purpose: Document real-time alerts, in-app badges, announcement targets, and auto-purge scripts.
Scope: Messaging and notifications layers.
Owner: Core Communications Architect
Update Trigger: Addition of new notification types or external email setups.
Dependencies: None
Related Documents: docs/CORE/DATABASE_SCHEMA.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Notifications & Announcements

This module handles real-time user notification badges, targeting announcements by division, and FCM push alerts.

---

## 1. Business Rules
* **Segmentation:** Announcements can target roles, departments, or individual user lists.
* **Orphaned cleanups:** Deleting an announcement automatically runs a cascade trigger, purging associated push notifications.
* **Automated Database Housekeeping:** Read notifications older than 30 days are automatically purged. An expiration TTL index handles automatic notification deletions.

---

## 2. Core Workflows
1. **Creation:** Admin publishes a targeted announcement.
2. **Alert Dispatch:** The backend writes the announcement, identifies targets, generates notification records, and triggers FCM alerts.

---

## 3. Database & APIs

* **Database Collections:** `notifications`, `announcements`, `fcmtokens`
* **Primary Endpoints:**
  * `POST /api/announcements` - Create a targeted announcement.
  * `GET /api/notifications` - Retrieve alerts for the active employee.
  * `POST /api/notifications/:id/read` - Mark an alert as read.
* **Associated Permissions:** `company.announcement.view`, `company.announcement.manage`
