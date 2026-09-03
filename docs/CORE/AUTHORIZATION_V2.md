---
Purpose: Define the role-based access control (RBAC) permission structure, scopes, and middleware gating rules.
Scope: Backend and frontend route authorization layers.
Owner: Lead Security Architect / Team Lead
Update Trigger: Addition of new modules, role groups, or V2 permission keys.
Dependencies: docs/CORE/PROJECT_ARCHITECTURE.md
Related Documents: docs/CORE/API_STANDARDS.md, docs/CORE/CODING_STANDARDS.md
Status: Active
Version: v2.0.0
Last Updated: 2026-07-17
---

# Authorization System V2 (RBAC)

This document specifies the We Alll Office **Authorization System V2**, detailing the granular Role-Based Access Control (RBAC) permissions, security scopes, legacy role mappings, and routing gate middleware.

---

## 1. Architectural Upgrade: Legacy vs. V2

Historically, We Alll CRM controlled access via hardcoded role string arrays. The system has migrated to a granular permission model:

* **Legacy Mode:** `authorizeRoles("admin", "superadmin", "hr")` blocked access based on structural titles. This created code duplication and made it impossible to assign custom sub-permissions.
* **V2 RBAC Mode:** `requireModulePermission(module, permission, options)` queries individual permissions mapped to roles and scoped boundaries, allowing for runtime overrides.

---

## 2. Security Scopes Model

Permissions are not simple binary flags; they enforce three access **Scopes** to handle multi-tiered departments:

1. **`SELF`:** User can only query or update their own data (e.g. standard employees viewing their attendance logs or submitting their own leave requests).
2. **`OWN_DEPARTMENT`:** User can access records belonging to any member in their department (e.g. Department Heads (HODs) reviewing team members' tasks and approving leaves).
3. **`COMPANY`:** User has full access to all company records across We Alll or Kolkata Digital (e.g. HR or Admins viewing global attendance logs).

---

## 3. Permissions Catalog Reference (`permissionCatalog.js`)

All valid platform permission keys must be declared inside the core catalog. The following shows the primary keys:

```javascript
export const PERMISSION_CATALOG = [
  // Attendance & Time logs
  { key: 'attendance.record.view', module: 'attendance', description: 'View attendance records' },
  { key: 'attendance.record.manage', module: 'attendance', description: 'Manage/modify attendance entries' },
  { key: 'attendance.clock', module: 'attendance', description: 'Clock in and out actions' },

  // Leaves
  { key: 'leave.request.create', module: 'leave', description: 'Submit leave request' },
  { key: 'leave.request.approve', module: 'leave', description: 'Approve department leave requests' },

  // Projects & Tasks
  { key: 'projects.project.view', module: 'projects', description: 'View project configurations' },
  { key: 'projects.project.manage', module: 'projects', description: 'Manage project pipelines and teams' },

  // Growth Track (PIP)
  { key: 'growth_track.view', module: 'growth_track', description: 'View performance improvement tracks' },
  { key: 'growth_track.manage', module: 'growth_track', description: 'Manage performance improvement tracks' }
];
```

---

## 4. Legacy Role Parity mapping (`legacyRoleMapping.js`)

To prevent breaking existing roles during rollout, the V2 engine parses role mappings to construct a runtime grants list for active user accounts:

* **`employee`:** Automatically mapped to standard grants, securing access to `SELF` scopes.
* **`manager` / `hod`:** Automatically mapped to department scopes for core work items, tasks, and reviews.
* **`admin` / `superadmin` / `hr`:** Granted `COMPANY` scope permissions across all operational modules.

```javascript
// Example grant mapping configuration:
export const LEGACY_ROLE_TO_ACCESS_ROLES = {
  employee: [
    {
      accessRole: 'employee_standard',
      grants: [
        { permission: 'attendance.clock', scope: SCOPES.SELF },
        { permission: 'growth_track.view', scope: SCOPES.SELF }
      ]
    }
  ]
};
```

---

## 5. Route Gating Middleware Integration

Backend endpoints are secured using `requireModulePermission` middleware. If a module lacks V2 active settings or is in transition phase, the middleware falls back to the legacy roles array:

```javascript
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

// Securing the route:
router.get(
  "/my-active",
  protect,
  requireModulePermission("growth_track", "growth_track.view", { 
    legacyRoles: ["admin", "superadmin", "hr", "manager", "hod", "employee"] 
  }),
  getMyActiveTrack
);
```
