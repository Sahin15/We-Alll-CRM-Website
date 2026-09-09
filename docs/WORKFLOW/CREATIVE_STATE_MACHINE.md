# Creative Workflow — State Machine

Authoritative workflow for Graphic Design, Video Production, and related creative tasks (`workflowMode: creative`).

## States

| Status | Description |
|--------|-------------|
| To Do / Assigned / Backlog | Task assigned, not started |
| In Progress | Assignee working on current revision |
| Submitted for Review | Awaiting reviewer decision |
| Changes Requested | Reviewer or QA requested rework |
| Rework In Progress | Assignee applying feedback |
| QA Review | Mandatory QA after reviewer approve |
| Approved | QA passed; ready for delivery |
| Delivered | Asset delivered to client (slot completes here) |
| Awaiting Posting | Optional — posting handoff active |
| Posted | Post URLs submitted |
| Closed | Task complete |
| Cancelled | Cancelled with reason (generic PATCH allowed) |

## Transitions

```
To Do → In Progress          (assignee: startWork)
In Progress → Submitted      (assignee: submitForReview)
Submitted → Changes Requested (reviewer: minor/major/reject)
Submitted → QA Review        (reviewer: approve — always routes to QA)
QA Review → Approved         (reviewer: qa pass)
QA Review → Changes Requested (reviewer: qa fail)
Changes Requested → Rework   (assignee: startRework)
Rework → Submitted           (assignee: submitForReview)
Approved → Delivered         (reviewer: markDelivered)
Delivered → Awaiting Posting (auto when requiresPosting)
Awaiting Posting → Posted    (posting assignee: submitPostingDone)
Delivered → Closed           (reviewer: close when no posting)
Posted → Closed              (reviewer: close)
```

## Role Matrix

| Action | Assignee | Assigner | Project Head | Dept HOD | Posting Assignee |
|--------|----------|----------|--------------|----------|------------------|
| Start / Submit / Rework | Yes | No | No | No | No |
| Request changes / Approve | No | Yes | Yes | Yes* | No |
| QA Pass / Fail | No | Yes | Yes | Yes* | No |
| Mark Delivered / Close | No | Yes | Yes | Yes* | No |
| Submit posting URLs | No | No | No | No | Yes |

\*Dept HOD = head of the project's department(s).

Assignees cannot review their own work unless they are also project head or dept HOD.

## API Endpoints

| Method | Path | Action |
|--------|------|--------|
| POST | `/api/creative-workflow/:id/start` | Start work / Revision 1 |
| POST | `/api/creative-workflow/:id/submit-review` | Submit for review |
| POST | `/api/creative-workflow/:id/review` | Review decision (minor/major/reject/approve) |
| POST | `/api/creative-workflow/:id/rework` | Start rework |
| POST | `/api/creative-workflow/:id/qa` | QA pass/fail |
| POST | `/api/creative-workflow/:id/deliver` | Mark delivered |
| POST | `/api/creative-workflow/:id/close` | Close task |
| PUT | `/api/creative-workflow/:id/posting` | Set posting handoff |
| POST | `/api/creative-workflow/:id/posting/submit` | Submit post URLs |
| GET | `/api/creative-workflow/:id/revisions` | List revisions |

## Enforcement

- Generic `PATCH /api/work-items/:id/status` is **blocked** for creative items except `Cancelled`.
- Transition guards live in `backend/src/utils/creativeWorkflowRules.js`.
- Reviewer auth lives in `backend/src/utils/creativeWorkflowAuth.js`.
- Slot assignment completes on **Delivered** only.

## Frontend

- All status changes use `CreativeWorkflowPanel` — no legacy status pickers.
- Access checks mirror backend via `frontend/src/utils/creativeWorkflowAccess.js`.
