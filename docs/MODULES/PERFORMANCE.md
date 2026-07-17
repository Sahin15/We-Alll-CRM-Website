---
Purpose: Document performance reviews, warning notices, target checklists, and PIP stage transitions.
Scope: Performance and Growth Track system.
Owner: Lead Talent Architect / HR Coordinator
Update Trigger: Policy updates on warning stages, review periods, or escalation chains.
Dependencies: docs/MODULES/HRMS.md
Related Documents: docs/CORE/UI_DESIGN_SYSTEM.md, docs/CORE/AUTHORIZATION_V2.md
Status: Active
Version: v2.0.0
Last Updated: 2026-07-17
---

# Business Module: Growth Track (PIP)

The Growth Track module (historically Performance Improvement Plan/PIP) manages structured support frameworks for employee performance improvement.

---

## 1. Business Rules
* **Module Stages:**
  * **Stage 1 - Concern Stage:** Initial informal warning issued by managers.
  * **Stage 2 - Improvement Stage:** Official performance review notice.
  * **Stage 3 - Critical Review Stage (PIP Active):** The employee is placed under a strict review cycle, transforming their dashboard branding to orange/red colors.
* **Review Cycle & Targets:** Focuses on weekly metrics.
* **Resolution Outcomes:**
  * *Improved:* Normal operations resume; dashboard layout returns to standard blue/purple theme.
  * *Partially Improved:* Extends review cycle.
  * *No Improvement:* Triggers `hr_action`, escalating the case to HR.

---

## 2. Core Workflows
1. **Initiation:** Manager creates a Growth Track entry. Employee is notified and must acknowledge the notice on their dashboard.
2. **Weekly Logs:** Manager records weekly metrics. At week-end, manager logs review meeting notes.
3. **Closure:** HR/Manager submits final outcome.

---

## 3. Database & APIs

* **Database Collections:** `growthtracks`
* **Primary Endpoints:**
  * `POST /api/growth-tracks/initiate` - Initiate a review stage.
  * `POST /api/growth-tracks/:trackId/targets` - Assign weekly target.
  * `POST /api/growth-tracks/:trackId/reviews` - Log weekly meeting notes.
  * `POST /api/growth-tracks/:trackId/finalize` - Terminate/resolve review cycle.
* **Associated Permissions:** `growth_track.view`, `growth_track.manage`
