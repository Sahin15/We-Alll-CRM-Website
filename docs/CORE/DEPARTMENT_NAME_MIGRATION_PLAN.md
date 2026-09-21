# Department Name Migration & Alignment Plan

## Context

Canonical department names are defined in:

- `backend/src/constants/departmentNames.js`
- `frontend/src/constants/departmentNames.js`

**13 canonical names:** Content Writing, Graphics, Development, Digital Marketing, Finance, General, HR, IT, Posting, Sales, Social Media, Telecaller, Video Production.

Legacy aliases (Design, Video, Engineering, Marketing, etc.) map to these via `DEPARTMENT_NAME_ALIASES`.

Most of the codebase still compares **raw DB strings** or uses **`.includes()` substring checks**. After standardizing on canonical names, those checks must use shared helpers or alias resolution.

---

## Impact map (where department names drive behavior)

### 1. Creative workflow (HIGH impact)

| File | Current behavior | Risk after rename |
|------|------------------|-------------------|
| `backend/src/utils/departmentWorkflows.js` | `getWorkflowByDepartment()` — exact map with legacy keys | **Low** — map already includes Graphics + Video Production aliases |
| `backend/src/utils/departmentWorkflowConfig.js` | Advanced workflow map — missing Video Production, Posting | **Medium** — wrong advanced workflow for video/posting depts |
| `backend/src/controllers/workItemController.js` | Creative mode when `workflowType` is design / video-production | **Low** if workflowType set correctly at create time |
| `backend/src/services/creativePostingService.js` | `POSTING_DEPT_NAMES` set — posting aliases | **Low** for canonical "Posting" |
| `backend/src/utils/creativeStatusMap.js` | Uses `workflowType`, not dept name | **Low** |
| `frontend/src/utils/creativeWorkflowAccess.js` | Uses `workflowType` enum | **Low** |
| `frontend/src/components/work/AssignWorkModal.jsx` | `isCreativeDepartmentName()` — `.includes('graphic')`, `.includes('video')` | **Medium** — works for Graphics/Video Production; misses legacy "Design" |
| `frontend/src/components/work/ProfessionalWorkCreationModal.jsx` | Same substring logic | **Medium** |
| `frontend/src/components/creative/CreativeWorkflowPanel.jsx` | Posting users filtered via `.includes("posting")` | **Low** |
| `frontend/src/components/projects/CreateWorkAssignmentForm.jsx` | Maps `"design"→"Design"`, checks `=== 'design'` | **HIGH** — Graphics dept gets General work types, no design fields |
| `frontend/src/components/projects/SlotList.jsx` | Substring checks for design/video/marketing | **Medium** — "design" won't match "Graphics" |

**Creative rule:** Main Tasks use creative workflow when project/assignee department is **Graphics** or **Video Production** (workflowType `design` / `video-production`, workflowMode `creative`).

---

### 2. RBAC & menu access (MEDIUM impact)

| File | Names checked | Risk |
|------|---------------|------|
| `backend/src/routes/leadRoutes.js` | Sales | Low if DB = Sales |
| `backend/src/routes/rawDataRoutes.js` | Sales, Telecaller | Low |
| `backend/src/controllers/rawDataController.js` | Sales, Telecaller (exact Set) | Low |
| `frontend/src/components/layout/Sidebar.jsx` | Sales, Telecaller, HR (exclude) | Low |
| `backend/src/controllers/leaveController.js` | `=== 'HR'` | **Medium** — fails for "Human Resources" |
| `backend/src/controllers/wfhController.js` | `=== 'HR'` | **Medium** |
| `frontend/src/pages/employee/MyLeaves.jsx` | `=== 'HR'` | **Medium** |
| `backend/src/authz/attachDepartmentContext.js` | Stores raw lowercased name | Legacy names fail allowlists |

---

### 3. Work assignment & projects (MEDIUM impact)

| File | Issue |
|------|-------|
| `CreateWorkAssignmentForm.jsx` | Legacy Design/Video keys |
| `CreateProjectModal.jsx` | Substring role buckets — mostly OK for Graphics/Video Production |
| `AssignWorkModal.jsx` | Creative + posting handoff detection |

---

### 4. Admin / department CRUD (DONE)

| File | Status |
|------|--------|
| `DepartmentList.jsx` | Dropdown + alias resolution on edit |
| `departmentController.js` | Validates canonical names on create/update |

---

## Fix plan (phased)

### Phase 0 — Seed canonical departments (DONE)

Run on every environment:

```bash
cd backend
npm run seed:departments
```

Creates all 13 canonical departments idempotently. Safe to re-run.

Optional legacy rename (production only, after backup):

```bash
node scripts/migrate-department-names.js --dry-run
node scripts/migrate-department-names.js
```

Renames alias DB records (Design→Graphics, Video→Video Production, etc.) and updates user.department references.

---

### Phase 1 — Shared helpers (DONE)

Use these instead of raw string checks:

**Backend** (`departmentNames.js`):

- `resolveCanonicalDepartmentName(name)`
- `isCreativeDepartmentName(name)` — Graphics, Video Production
- `isPostingDepartmentName(name)` — Posting
- `isHrDepartmentName(name)` — HR
- `isSalesDepartmentName(name)` — Sales
- `isTelecallerDepartmentName(name)` — Telecaller

**Frontend** — mirror the same helpers in `frontend/src/constants/departmentNames.js`.

---

### Phase 2 — Creative workflow paths (DONE)

1. **`AssignWorkModal.jsx`** — shared helpers + canonical workflowType
2. **`ProfessionalWorkCreationModal.jsx`** — same
3. **`CreateWorkAssignmentForm.jsx`** — Graphics / Video Production canonical keys
4. **`SlotList.jsx`** — canonical department checks
5. **`departmentWorkflowConfig.js`** + **`departmentWorkflows.js`** — canonical resolution
6. **`CreativeWorkflowPanel.jsx`**, **`creativePostingService.js`** — `isPostingDepartmentName()`

---

### Phase 3 — RBAC / HR gates (DONE)

1. **`leaveController.js`**, **`wfhController.js`**, **`MyLeaves.jsx`** — `isHrDepartmentName()`
2. **`userController.js`** — canonical department filter lookup
3. **`legacyAdapter.js`** — optional: resolve both sides through canonical names (deferred)

---

### Phase 4 — Tests & docs

1. Update unit tests for creative assignment with **Graphics** (not Design)
2. Update `EnhancedAdminWorkOverview.jsx` mock data to canonical names
3. Update `docs/WORKFLOW/CREATIVE_*.md` to reference Graphics + Video Production

---

### Phase 5 — UAT demo alignment (optional)

`seed-uat.js` uses `UAT Engineering` / `UAT Human Resources` for demo users. Either:

- Map demo users to canonical **Development** / **HR**, or
- Keep UAT-prefixed depts for demo isolation (current behavior)

Recommendation: assign demo HoD/employees to canonical **Development** and **HR** in a future seed-uat revision.

---

## Verification checklist

After each phase:

- [ ] Create project with **Graphics** dept → work assignment shows design fields + creative workflow
- [ ] Create project with **Video Production** → video fields + creative workflow
- [ ] Posting handoff: assign user in **Posting** dept
- [ ] Sales user sees Leads menu; Telecaller sees Raw Data assign
- [ ] HR user sees HR leave controls
- [ ] Superadmin department dropdown shows 13 names only
- [ ] `npm run seed:departments` is idempotent (no duplicates)

---

## Database seed status

| Environment | Database | Seed command |
|-------------|----------|--------------|
| Local dev | `crm-uat` (via `.env`) | `npm run seed:departments` |
| UAT server | `crm-uat` | SSH + same command with UAT `.env` |
| Production | `crm-database` | Run only after backup; use migrate script for renames |
