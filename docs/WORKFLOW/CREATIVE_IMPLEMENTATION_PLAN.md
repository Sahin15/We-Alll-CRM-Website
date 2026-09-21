# Creative Workflow System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Git-style revision/review workflow for Graphic Design and Video, plus an optional **Posting department** handoff (create the department, checkbox on assign, auto-assign poster, URL proof of posting) — without changing how the Slot system assigns, completes, releases, or drives project progress.

**Architecture:** Extend the existing Work Item (Main Task) with creative statuses, append-only Revisions, Review records, timeline events, and optional posting fields (`requiresPosting`, `postingAssignedTo`, `postUrls`). Create the **Posting** department first, then wire Graphic/Video assignment UI to optionally auto-assign a Posting member. Keep `slotAssignment` / `Slot.assignedWorkItem` and `slotManagementService` as the single capacity path. Map **Delivered → slot complete** (today’s Done) and **Cancelled → slot release**. Revisions and posting never own slots.

**Tech Stack:** MERN — Express/Mongoose backend (`.js`), React frontend (`.jsx`), existing Bootstrap UI patterns, existing `slotManagementService` + department admin APIs, Jest/backend tests under `backend/tests/`.

**Specs:**
- `docs/WORKFLOW/CREATIVE_WORKFLOW_SPECIFICATION.md`
- `docs/WORKFLOW/CREATIVE_STATE_MACHINE.md`
- `docs/WORKFLOW/CREATIVE_REVISION_MODEL.md`
- `docs/WORKFLOW/CREATIVE_PERMISSION_MATRIX.md`
- `docs/WORKFLOW/CREATIVE_POSTING_HANDOFF.md`

## Global Constraints

- Pure JavaScript only (`.js` / `.jsx`); no TypeScript.
- Do not push to `main`; work on the feature branch for this task.
- **Slot system must work the same way as today** — no redesign of Slot model, monthly periods, availability, uniqueness, or progress math.
- Bidirectional link must stay consistent: `WorkItem.slotAssignment` ↔ `Slot.assignedWorkItem`.
- One work item per available slot; same-project only; completed slots remain immutable (no release/reassign).
- Mid-cycle creative statuses (In Progress, Submitted for Review, Changes Requested, Rework, QA, Approved) must **not** auto-change slot `assignmentStatus`.
- Slot complete runs **once** when Main Task reaches **Delivered** (equivalent to today’s `Done`), gated by `slotIntegration.autoCompleteSlotOnWorkItemCompletion`.
- Slot release on **Cancelled** / soft-delete remains gated by `slotIntegration.releaseSlotOnDeletion`, and must not release an already completed slot via the service path.
- Revisions must **never** create, assign, complete, or release slots.
- **Posting must never create a second slot** — posting is a handoff on the same Main Task.
- When `requiresPosting` is false, no Posting member is selected and **no posting date** is set (client posts externally).
- When `requiresPosting` is true, `postingAssignedTo` **and** `postingDate` are required; assignee must belong to the **Posting** department.
- **`postingDate` is independent of creative `dueDate`** — never overwrite one with the other.
- Create the **Posting** department before enabling the handoff UI in production.
- Non-creative Work Assignment (`To Do / In Progress / Review / Done`) slot behavior must keep passing existing slot tests unchanged.
- Never hardcode secrets; filter sensitive user fields from API responses.
- Prefer incremental changes; do not mass-refactor Work Assignment or Slot modules.

## File Structure (planned)

| Path | Responsibility |
| --- | --- |
| `backend/scripts/createPostingDepartment.js` (or admin create) | Idempotent create of department named `Posting` |
| `backend/src/utils/departmentWorkflows.js` | Map `"Posting"` → `posting` workflow |
| `backend/src/utils/departmentWorkflowConfig.js` | Optional advanced posting workflow config |
| `backend/src/models/creativeRevisionModel.js` | Revision documents (or embedded schema module) |
| `backend/src/models/workItemModel.js` | Creative status + posting fields; **preserve** `slotAssignment` / `slotIntegration` |
| `backend/src/services/creativeWorkflowService.js` | Status transitions, revision create/submit/review |
| `backend/src/services/creativePostingService.js` | requiresPosting assign + submit URLs / posting done |
| `backend/src/services/slotManagementService.js` | **Reuse only** — do not change contracts unless fixing a proven bug |
| `backend/src/controllers/creativeWorkflowController.js` | Creative + posting endpoints |
| `backend/src/routes/creativeWorkflowRoutes.js` | Routes + permissions |
| `backend/tests/creativeWorkflow*.test.js` | Workflow tests |
| `backend/tests/creativeWorkflowSlotIntegration.test.js` | Slot parity tests for creative tasks |
| `backend/tests/creativePostingHandoff.test.js` | Posting checkbox / auto-assign / URL submit tests |
| `frontend/src/components/creative/*` | Revision timeline / review actions |
| `frontend` work-create modals | Checkbox + Posting member picker on Graphic/Video assign |
| Existing slot UI (`AssignWorkModal`, `SlotSelectionDropdown`, etc.) | **Reuse as-is** for Main Task slot pickers |
| `frontend/src/pages/departments/DepartmentList.jsx` | Admin can also create Posting manually |

---

### Task 0A: Create the Posting Department (Prerequisite)

**Files:**
- Create: `backend/scripts/createPostingDepartment.js`
- Modify: `backend/src/utils/departmentWorkflows.js` (and optionally `departmentWorkflowConfig.js`)
- Modify: `frontend/src/components/projects/CreateProjectModal.jsx` (`getRolesByDepartments` posting branch if needed)
- Test: `backend/tests/createPostingDepartment.test.js` (or script dry-run assertions)

**Interfaces:**
- Consumes: `Department` model / `POST /departments` pattern
- Produces: active department `{ name: "Posting", type: "operational" }`; workflow map entry

- [ ] **Step 1: Write failing test / assertion** that `getWorkflowByDepartment("Posting")` returns a posting workflow (not standard fallback only by accident).

- [ ] **Step 2: Implement idempotent script**

```js
// createPostingDepartment.js — pseudocode
const existing = await Department.findOne({ name: "Posting" });
if (!existing) {
  await Department.create({
    name: "Posting",
    description: "Publishes approved graphic and video content; submits live post URLs",
    type: "operational",
    status: "active",
  });
}
```

- [ ] **Step 3: Add department map entries**

```js
// departmentWorkflows.js departmentMap additions
"Posting": "posting",
"Posting Department": "posting",
"Content Posting": "posting",
```

Add a minimal `POSTING_WORKFLOW` (statuses can stay standard for the Posting dept’s own tasks; creative handoff uses Main Task posting fields).

- [ ] **Step 4: Run script against local/dev DB** (with approval) and verify department appears in Department List UI.

- [ ] **Step 5: Document** that HR/Admin must move/create Posting employees and attach Posting to relevant projects’ `departments`.

- [ ] **Step 6: Commit** `feat: add Posting department seed and workflow mapping`.

---

### Task 0B: Posting Fields + Auto-Assign Rules on Main Task

**Files:**
- Modify: `backend/src/models/workItemModel.js`
- Create: `backend/src/services/creativePostingService.js`
- Test: `backend/tests/creativePostingHandoff.test.js`

**Interfaces:**
- Consumes: WorkItem, User (department = Posting)
- Produces: `setPostingHandoff({ requiresPosting, postingAssignedTo, postingDate })`, `submitPostingDone({ postUrls, postingNotes })`

- [ ] **Step 1: Write failing tests**

```js
describe("Posting handoff", () => {
  it("leaves postingAssignedTo and postingDate null when requiresPosting is false (client posts)", async () => {
    // create graphic/video creative task with requiresPosting: false
    // expect postingAssignedTo == null
    // expect postingDate == null
    // expect postingStatus == "not_required"
  });

  it("requires postingAssignedTo and postingDate when requiresPosting is true", async () => {
    // expect validation error without assignee
    // expect validation error without postingDate
  });

  it("stores postingDate separately from creative dueDate", async () => {
    // dueDate = Day A, postingDate = Day B (later)
    // expect both preserved; postingDate !== dueDate unless intentionally same
  });

  it("auto-assigns postingAssignedTo when member selected", async () => {
    // expect postingAssignedTo set
    // expect postingDate set
    // expect postingStatus == "pending"
    // expect assignee.department.name === "Posting"
  });

  it("rejects postingAssignedTo who is not in Posting department", async () => {
    // designer id should fail
  });

  it("submitPostingDone requires at least one URL and moves to Posted", async () => {
    // task in Awaiting Posting
    // submit { postUrls: ["https://example.com/p/1"] }
    // expect status Posted, postingStatus done
  });

  it("does not create or mutate slots on posting submit", async () => {
    // slot remains completed after Delivered; unchanged by Posted
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Add schema fields** on WorkItem: `requiresPosting`, `postingAssignedTo`, `postingDate`, `postingStatus`, `postUrls`, `postingNotes`, `postingSubmittedAt`, `postingSubmittedBy` (see `CREATIVE_POSTING_HANDOFF.md`).

- [ ] **Step 4: Implement service validation + submit**; timeline events `posting_assigned`, `awaiting_posting`, `posted`.

- [ ] **Step 5: Re-run tests — expect PASS**

- [ ] **Step 6: Commit** `feat: add posting handoff fields and submit-done flow`.

---

### Task 1: Lock Slot Parity Tests Before Creative Changes

**Files:**
- Create: `backend/tests/creativeWorkflowSlotIntegration.test.js` (skeleton + baseline expectations)
- Verify existing: `backend/tests/slotAssignmentUniqueness.test.js`, `backend/tests/slotCompletionImmutability.test.js`, `backend/tests/slotAvailabilityAccuracy.test.js` (paths may vary — locate with glob)
- Modify: none of slot production code in this task

**Interfaces:**
- Consumes: existing Slot / WorkItem models and `slotManagementService`
- Produces: failing-or-pending creative slot mapping tests that define Delivered→complete and Cancelled→release

- [ ] **Step 1: Locate existing slot tests and run them**

```bash
cd backend
npx jest --testPathPattern=slot --passWithNoTests
```

Expected: existing slot tests PASS (baseline green). If any fail on `develop`, stop and report — do not layer creative work on a broken baseline.

- [ ] **Step 2: Write failing tests for creative→slot mapping**

In `backend/tests/creativeWorkflowSlotIntegration.test.js`, encode these behaviors (adapt to project test helpers):

```js
describe("Creative workflow ↔ Slot parity", () => {
  it("assigns Main Task to slot the same way as a normal work item", async () => {
    // create project with enableSlotSystem, available slot, creative work item
    // assign via slotManagementService.assignWorkItemToSlot
    // expect slot.assignmentStatus === "assigned"
    // expect workItem.slotAssignment.assignedSlot equals slot._id
  });

  it("does not complete or release slot on Submitted for Review / Changes Requested / Approved", async () => {
    // move creative statuses through review loop
    // expect slot.assignmentStatus remains "assigned"
    // expect completionStatus.isCompleted === false
  });

  it("completes slot once on Delivered when autoCompleteSlotOnWorkItemCompletion is true", async () => {
    // transition Main Task to Delivered
    // expect slot.assignmentStatus === "completed"
    // expect project slot progress recalculated when slot-based
  });

  it("does not complete slot again on Closed after Delivered", async () => {
    // Delivered then Closed
    // expect still one completion; no throw; assignedWorkItem retained
  });

  it("releases slot on Cancelled when not completed and releaseSlotOnDeletion is true", async () => {
    // Cancel before Delivered
    // expect slot.assignmentStatus === "available"
    // expect workItem.slotAssignment cleared
  });

  it("never assigns a slot to a Revision document", async () => {
    // create Revision 1 and Revision 2
    // expect no Slot.assignedWorkItem pointing at revision ids
    // expect only Main Task remains slot-linked
  });
});
```

- [ ] **Step 3: Run the new file — expect FAIL until later tasks implement mapping**

```bash
npx jest backend/tests/creativeWorkflowSlotIntegration.test.js -v
```

Expected: FAIL (creative statuses / Delivered mapping not implemented yet) **or** SKIP markers only if helpers missing — prefer real FAIL.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/creativeWorkflowSlotIntegration.test.js
git commit -m "$(cat <<'EOF'
test: add creative workflow slot parity expectations

EOF
)"
```

---

### Task 2: Extend Main Task Status Model Without Breaking Legacy Done

**Files:**
- Modify: `backend/src/models/workItemModel.js`
- Create: `backend/src/utils/creativeStatusMap.js`
- Test: `backend/tests/creativeStatusMap.test.js`

**Interfaces:**
- Consumes: existing work item `status` enum (`To Do`, `In Progress`, `Review`, `Done`, `Cancelled`)
- Produces: `isCreativeWorkflow(workItem)`, `CREATIVE_STATUSES`, `mapsToSlotComplete(status)`, `mapsToSlotRelease(status)`

- [ ] **Step 1: Write failing unit tests for status→slot mapping helpers**

```js
import {
  mapsToSlotComplete,
  mapsToSlotRelease,
  CREATIVE_STATUSES,
} from "../src/utils/creativeStatusMap.js";

describe("creativeStatusMap", () => {
  it("maps Delivered to slot complete (legacy Done equivalent)", () => {
    expect(mapsToSlotComplete("Delivered")).toBe(true);
    expect(mapsToSlotComplete("Done")).toBe(true);
    expect(mapsToSlotComplete("Approved")).toBe(false);
    expect(mapsToSlotComplete("Closed")).toBe(false);
  });

  it("maps Cancelled to slot release", () => {
    expect(mapsToSlotRelease("Cancelled")).toBe(true);
    expect(mapsToSlotRelease("Delivered")).toBe(false);
  });

  it("includes all creative statuses from the spec", () => {
    expect(CREATIVE_STATUSES).toEqual(
      expect.arrayContaining([
        "Backlog",
        "Assigned",
        "In Progress",
        "Submitted for Review",
        "Changes Requested",
        "Rework In Progress",
        "QA Review",
        "Approved",
        "Delivered",
        "Awaiting Posting",
        "Posted",
        "Closed",
        "Cancelled",
      ])
    );
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest backend/tests/creativeStatusMap.test.js -v
```

- [ ] **Step 3: Implement `creativeStatusMap.js`**

```js
export const CREATIVE_STATUSES = [
  "Backlog",
  "Assigned",
  "In Progress",
  "Submitted for Review",
  "Changes Requested",
  "Rework In Progress",
  "QA Review",
  "Approved",
  "Delivered",
  "Awaiting Posting",
  "Posted",
  "Closed",
  "Cancelled",
];

export const LEGACY_STATUSES = [
  "To Do",
  "In Progress",
  "Review",
  "Done",
  "Cancelled",
];

/** Slot complete: legacy Done OR creative Delivered */
export function mapsToSlotComplete(status) {
  return status === "Done" || status === "Delivered";
}

/** Slot release candidate: Cancelled only */
export function mapsToSlotRelease(status) {
  return status === "Cancelled";
}

export function isCreativeWorkflow(workItem) {
  return (
    workItem?.workflowMode === "creative" ||
    workItem?.departmentWorkflowType === "design" ||
    workItem?.departmentWorkflowType === "video-production"
  );
}
```

- [ ] **Step 4: Extend work item schema carefully**

Add fields such as `workflowMode: { enum: ["standard", "creative"], default: "standard" }`, creative-only status support **without removing** legacy enum values used by non-creative items. Prefer one of:

1. Keep legacy `status` for standard items; store creative status in `creativeStatus` **or**
2. Widen `status` enum to include both sets and validate transitions by `workflowMode`.

Choose (2) only if existing queries can tolerate the wider enum; otherwise use (1) and map list filters in the service layer. **Do not remove** `slotAssignment` or `slotIntegration`.

- [ ] **Step 5: Wire pre-save slot hooks to use helpers**

In `workItemModel.js` pre-save (today triggers on `Done` / `Cancelled`), call:

```js
if (mapsToSlotComplete(this.status) && this.hasAssignedSlot && this.slotIntegration?.autoCompleteSlotOnWorkItemCompletion) {
  // existing completeSlot + recalculateSlotProgress path
}
if (mapsToSlotRelease(this.status) && this.hasAssignedSlot && this.slotIntegration?.releaseSlotOnDeletion) {
  // existing release path
}
```

Ensure `Delivered` sets `completedAt` once (like Done). Ensure `Closed` does not re-enter completeSlot.

- [ ] **Step 6: Re-run unit + existing slot tests**

```bash
npx jest backend/tests/creativeStatusMap.test.js --testPathPattern=slot -v
```

Expected: mapping tests PASS; existing slot tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/utils/creativeStatusMap.js backend/src/models/workItemModel.js backend/tests/creativeStatusMap.test.js
git commit -m "$(cat <<'EOF'
feat: map creative Delivered/Cancelled to existing slot complete/release

EOF
)"
```

---

### Task 3: Revision Model (No Slot Fields)

**Files:**
- Create: `backend/src/models/creativeRevisionModel.js`
- Test: `backend/tests/creativeRevisionModel.test.js`

**Interfaces:**
- Consumes: Main Task `WorkItem` `_id`, User refs
- Produces: Revision with parent, files, times, review/approval notes — **no `slotAssignment`**

- [ ] **Step 1: Write failing model tests** for required fields from `CREATIVE_REVISION_MODEL.md` (number, parent, createdBy, assignedTo, reason, attachments, estimated/actual time, status, reviewNotes, approvalNotes).

- [ ] **Step 2: Implement schema** matching the revision model doc. Explicitly omit any Slot references.

- [ ] **Step 3: Assert in test** that schema paths do not include `slotAssignment` / `assignedSlot`.

- [ ] **Step 4: Commit** with message `feat: add creative revision model without slot coupling`.

---

### Task 4: Creative Workflow Service (Transitions + Reviews)

**Files:**
- Create: `backend/src/services/creativeWorkflowService.js`
- Test: `backend/tests/creativeWorkflowService.test.js`
- Reference: `docs/WORKFLOW/CREATIVE_STATE_MACHINE.md`

**Interfaces:**
- Consumes: WorkItem, CreativeRevision, Review records, `creativeStatusMap`
- Produces: `startWork`, `submitForReview`, `recordReviewDecision`, `startRework`, `markDelivered`, `cancelTask`
- Slot I/O: **none directly** — rely on WorkItem save hooks / existing status update paths so slot behavior stays centralized

- [ ] **Step 1: Write transition tests** for legal/illegal moves from the state machine.

- [ ] **Step 2: Implement service methods** that update Main Task status + revision tip; append timeline events.

- [ ] **Step 3: Ensure `markDelivered`** sets `Delivered`, triggers slot complete via hook, and if `requiresPosting` transitions to `Awaiting Posting` + notifies poster.

- [ ] **Step 4: Ensure `startRework` creates Revision N+1 with parent link and **does not** touch slots or posting assignment.

- [ ] **Step 5: Run** `creativeWorkflowService` + `creativeWorkflowSlotIntegration` + `creativePostingHandoff` tests.

- [ ] **Step 6: Commit** `feat: add creative workflow transition service`.

---

### Task 5: API Routes & Permissions

**Files:**
- Create: `backend/src/controllers/creativeWorkflowController.js`
- Create: `backend/src/routes/creativeWorkflowRoutes.js`
- Modify: app route registration file (locate existing `app.use` for work items)
- Align with: `docs/WORKFLOW/CREATIVE_PERMISSION_MATRIX.md` and `.cursor/rules/project.mdc` permission patterns

- [ ] **Step 1: Add endpoints** for create revision, submit, review decide, start rework, deliver, timeline read, **and** `POST .../posting/submit` (URLs + done).

- [ ] **Step 2: Reuse existing work-item slot assign/remove routes** — do not add `/revisions/:id/assign-slot` or posting-specific slots.

- [ ] **Step 3: try/catch all handlers; return `{ success: false, error: "..." }` (or existing `{ message }` style in that controller family).

- [ ] **Step 4: Integration test: assign slot via existing endpoint on creative Main Task still works; posting submit does not change slot.

- [ ] **Step 5: Commit** `feat: expose creative workflow API without new slot endpoints`.

---

### Task 6: Frontend — Creative Surfaces + Posting Checkbox (Reuse Slot UI)

**Files:**
- Create: `frontend/src/components/creative/` (revision list, review actions, timeline, posting submit form)
- Modify: `ProfessionalWorkCreationModal.jsx` and/or `CreateWorkAssignmentForm.jsx` for Graphic/Video only
- Reuse: `AssignWorkModal.jsx`, `SlotSelectionDropdown.jsx`, `SlotProgressDisplay.jsx` unchanged for capacity

- [ ] **Step 1: On Graphic/Video work create**, add checkbox **“Assign to Posting department”**.

- [ ] **Step 2: If checked**, show required:
  - Posting-department member dropdown (filter `employees` where `department.name === "Posting"`, preferably project members)
  - **Posting date** date picker (label clearly distinct from creative Due Date)
  - On save, send `requiresPosting: true` + `postingAssignedTo` + `postingDate`

- [ ] **Step 3: If unchecked**, hide member picker **and** posting date; send `requiresPosting: false`, no posting assignee, no posting date (client posts).

- [ ] **Step 4: Add Posting queue UI** for assignee: show planned `postingDate`, enter URL(s), optional notes, submit “Posting done”.

- [ ] **Step 5: Do not build a separate slot picker for revisions or posting.**

- [ ] **Step 6: Manual check:**  
  - Creative + slot + no posting → Delivered → Close; slot completed.  
  - Creative + slot + posting member + **posting date** → Delivered → Awaiting Posting → submit URLs → Posted → Close; slot still completed once; `postingDate` ≠ necessarily `dueDate`.  
  - Uncheck posting → no member and no posting date required.

- [ ] **Step 7: Commit** `feat: add creative UI with optional posting handoff and posting date`.

---

### Task 7: Regression Gate — Slots + Creative + Posting

**Files:**
- Modify: `backend/tests/creativeWorkflowSlotIntegration.test.js`, `backend/tests/creativePostingHandoff.test.js`
- Run full slot + creative + posting suites

- [ ] **Step 1: Run full verification**

```bash
cd backend
npx jest --testPathPattern="slot|creative|posting" -v
```

Expected: ALL PASS.

- [ ] **Step 2: Manual checklist**

1. Non-creative work item Done still completes slot.  
2. Creative task mid-review does not complete slot.  
3. Creative Delivered completes slot once.  
4. Creative Closed / Posted does not reopen/recomplete slot.  
5. Creative Cancelled releases incomplete slot.  
6. Completed slot remains non-assignable.  
7. Revision uploads never appear as slot assignees.  
8. Posting department exists and appears in assign picker only when checkbox ticked.  
9. Unticked posting = no posting assignee and no posting date (client posts).  
10. Ticked posting requires member **and** posting date; auto-assigns selected Posting member.  
11. `postingDate` is stored separately from creative `dueDate`.  
12. Posting submit requires ≥1 URL and does not touch slots.

- [ ] **Step 3: Commit** `test: verify creative+posting preserves slot system behavior`.

---

## Out of Scope (this plan)

- Redesigning Slot model or monthly capacity UI  
- Per-revision slots or per-posting slots  
- Changing `calculationMethod: 'slot-based'` formula  
- Auto-publishing to Instagram/Facebook/YouTube APIs (URLs are manual proof only)  
- Mass UI redesign of Work Board for all departments  
- Merging to `main` without explicit approval  

## Spec Coverage Check

| Spec requirement | Task |
| --- | --- |
| Create Posting department | Task 0A |
| Optional posting checkbox + auto-assign + **posting date** | Tasks 0B, 6 |
| Post URL(s) + posting done | Tasks 0B, 5, 6 |
| Client posts when unchecked | Tasks 0B, 6 |
| Distinct posting date vs due date | Tasks 0B, 6 |
| Revision model fields | Task 3 |
| Status machine (incl. Awaiting Posting / Posted) | Task 4 |
| Permissions | Task 5 |
| Dashboard/reporting | Deferred (follow-up plan) unless pulled forward |
| Slot parity / Delivered→complete | Tasks 1, 2, 7 |
| Files per revision | Task 3–4 |
| Non-technical Git metaphor | Tasks 4–6 (copy/UI labels) |
