---
Purpose: Document the clocking system, geolocation tracking, status checks, and attendance audits.
Scope: Time tracking module.
Owner: Lead Systems Engineer
Update Trigger: Policy modifications on shift times, lunch hours, or late flags.
Dependencies: docs/MODULES/HRMS.md
Related Documents: docs/MODULES/LEAVE.md, docs/CORE/DATABASE_SCHEMA.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Business Module: Attendance

The Attendance module tracks employee clock-in and clock-out timestamps, active geolocations, and automatically computes daily work shift metrics.

---

## 1. Business Rules
* **Daily Shift Schedule:**
  * Monday-Friday: 10:00 AM - 7:00 PM (8h work, Lunch break: 1:30 PM - 2:30 PM).
  * Saturday (WFH): 10:00 AM - 5:00 PM (6h work, Lunch break: 1:30 PM - 2:30 PM).
* **Late Arrival Warning:** Clock-ins after 10:15 AM trigger an automatic `Late` flag.
* **Auto-Clockout:** If an employee remains logged in past 11:59 PM without clocking out, a background cron job automatically runs a clock-out set to the standard 7:00 PM shift end, logging an `attendance_auto_clockout` notification alert.

---

## 2. Core Workflows
1. **Clock-in Verification:** Employee hits "Clock In" on the dashboard widgets. Geolocation is checked. If verified, status is set to "Present" or "Late".
2. **Shift Completion:** Employee hits "Clock Out". Work hours are computed, subtracting lunch hours.

---

## 3. Database & APIs

* **Database Collections:** `attendances`
* **Primary Endpoints:**
  * `POST /api/attendance/clock-in` - Log clock-in event with GPS location.
  * `POST /api/attendance/clock-out` - Log clock-out event and calculate hours.
  * `GET /api/attendance/my-attendance` - Retrieve current month records for the active employee.
* **Associated Permissions:** `attendance.clock`, `attendance.record.view`, `attendance.record.manage`
