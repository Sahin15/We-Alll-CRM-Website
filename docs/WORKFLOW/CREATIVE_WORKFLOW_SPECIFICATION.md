# Creative Workflow Specification

**Product:** We Alll Office ERP  
**Module:** Creative Workflow System (Graphic Design & Video Department)  
**Status:** Design specification only — not implemented  
**Audience:** Product owners, department heads, managers, designers, reviewers, QA, and future implementers  
**Related docs:**
- [CREATIVE_STATE_MACHINE.md](./CREATIVE_STATE_MACHINE.md)
- [CREATIVE_REVISION_MODEL.md](./CREATIVE_REVISION_MODEL.md)
- [CREATIVE_PERMISSION_MATRIX.md](./CREATIVE_PERMISSION_MATRIX.md)
- [CREATIVE_POSTING_HANDOFF.md](./CREATIVE_POSTING_HANDOFF.md)
- [CREATIVE_IMPLEMENTATION_PLAN.md](./CREATIVE_IMPLEMENTATION_PLAN.md)

---

## 1. Purpose

The current Work Assignment module is effective for software development and simple operational tasks. It uses a linear four-stage path (`To Do → In Progress → Review → Done`) and treats files as replaceable attachments on a single work item.

That model fails for Graphic Design and Video Production because creative work is **iterative**:

1. A designer produces work.
2. A reviewer evaluates it.
3. Changes may be requested, or the work may be rejected.
4. The designer recreates or revises.
5. Review repeats until approval.
6. QA and/or client approval may follow.
7. Only then is the work delivered and closed.

**This specification defines a Git-inspired creative workflow** that preserves every revision, review decision, file, and timeline event — while remaining simple for non-technical users.

---

## 2. Problem Statement

| Current limitation | Creative impact |
| --- | --- |
| Single status ladder (`To Do / In Progress / Review / Done`) | Cannot express rework, QA, client approval, or delivery distinctly |
| Flat `revisionCount` number | Counts revisions but does not store revision history |
| Shared attachments on the work item | New uploads overwrite context; old files are hard to recover |
| Status history only | No first-class review decisions or revision lineage |
| Same UX for all departments | Designers and video editors need iteration language, not “ticket done” language |

---

## 3. Design Philosophy (Git Metaphor for Non-Technical Users)

Treat every creative assignment like a **repository**, explained in plain language:

| Git concept | Creative system concept | Plain-language meaning |
| --- | --- | --- |
| Repository | **Main Task** | The original assignment (e.g., “Marketing Banner”) |
| Commit | **Revision** | One complete attempt / version of the work |
| Parent commit | **Parent Revision** | Which previous version this was based on |
| Branch history | **Revision tree / timeline** | Full chain of attempts — never deleted |
| Pull request review | **Review action** | Approve, reject, request changes, send back |
| Immutable history | **Append-only records** | Never overwrite or erase past work |
| Working tree files | **Revision-owned files** | Each revision has its own downloads |

**Hard rules:**

1. Never overwrite revision history.
2. Never delete previous work (soft-archive only for admin recovery cases).
3. Every review creates a history event.
4. Every upload remains downloadable forever under its revision.
5. The Main Task is the durable container; revisions are the durable attempts.

---

## 4. Scope

### In scope

- Graphic Design department creative assignments
- Video Production department creative assignments
- Main Task + Revision lifecycle
- Review, QA, client approval, delivery, and close
- Timeline / audit history
- Manager dashboards and reporting metrics (definitions)
- Permission model for creative roles
- File ownership per revision

### Out of scope (this design exercise)

- Implementation code
- UI redesign
- API contract changes
- Migration scripts
- Changing the existing software-development Work Assignment flow
- Real-time collaborative editing tools (Figma/After Effects plugins)

### Coexistence with existing Work Assignment

Creative Workflow is a **department-specific workflow mode**, not a replacement for all Work Items.

| Department / work type | Workflow mode |
| --- | --- |
| Software Development / standard ops | Existing linear Work Assignment |
| Graphic Design creative jobs | Creative Workflow (this spec) |
| Video Production creative jobs | Creative Workflow (this spec) |
| Other departments | Unchanged unless later opted in |

---

## 5. Core Entities

### 5.1 Main Task

The original creative assignment. Analogous to a Git repository root.

**Identity fields (logical):**

| Field | Description |
| --- | --- |
| Task ID | Unique identifier |
| Title | Human-readable name (e.g., “Marketing Banner – Diwali Campaign”) |
| Description / brief | Creative brief, goals, constraints |
| Department | Graphic Design or Video Production |
| Work type | Design type or video type (banner, logo, promo, tutorial, etc.) |
| Project | Linked ERP project (when applicable) |
| Created by | Requester / assigner |
| Primary assignee | Designer or video editor responsible |
| Reviewer(s) | Person(s) who approve creative quality |
| QA reviewer (optional) | Internal quality gate |
| Client approver (optional) | External or account-side approver |
| Priority | low / medium / high / urgent |
| Due date | Target delivery date |
| Current status | See status list in §7 |
| Current revision | Pointer to the active tip revision |
| Revision count | Derived count of revisions (never the only source of truth) |
| Estimated time (task) | Overall estimate |
| Actual time (task) | Sum of revision actual times (derived) |
| Closed at | Timestamp when Closed |
| Cancelled at / reason | If Cancelled |

### 5.2 Revision

One immutable attempt at the deliverable. Analogous to a Git commit.

Full field model: see [CREATIVE_REVISION_MODEL.md](./CREATIVE_REVISION_MODEL.md).

Every revision includes at minimum:

- Revision Number  
- Parent Revision  
- Created By  
- Assigned To  
- Created Date  
- Reason  
- Feedback  
- Attachments  
- Estimated Time  
- Actual Time  
- Status  
- Review Notes  
- Approval Notes  

### 5.3 Review Record

An append-only decision attached to a revision (and mirrored on the task timeline).

| Field | Description |
| --- | --- |
| Review ID | Unique identifier |
| Task ID | Parent Main Task |
| Revision ID | Revision under review |
| Reviewer | Who performed the review |
| Decision | Approve / Reject / Request Minor Changes / Request Major Rework / Send Back with Comments |
| Notes | Required for non-approve decisions; optional for approve |
| Severity | minor / major / reject (derived from decision) |
| Created at | When the review was recorded |

### 5.4 Timeline Event

Append-only audit stream for the Main Task.

Examples:

- Task created / assigned  
- Revision created / uploaded  
- Submitted for review  
- Review completed with decision  
- Changes requested / rework started  
- Approved  
- Sent to QA  
- Client approval recorded  
- Delivered  
- Closed / Cancelled  

### 5.5 File Asset

A file belonging to exactly one revision.

| Field | Description |
| --- | --- |
| File ID | Unique identifier |
| Revision ID | Owning revision |
| Uploaded by | User |
| Uploaded at | Timestamp |
| File name | Original name |
| MIME / type | For preview rules |
| Size | Bytes |
| Storage key | Immutable storage reference |
| Downloadable | Always true for authorized roles |

---

## 6. End-to-End Workflow (Canonical Example)

```
Marketing Banner (Main Task)
        ↓
    Assigned
        ↓
Designer creates Revision 1
        ↓
Submitted for Review
        ↓
Reviewer requests changes
        ↓
Revision 2 created (parent = Revision 1)
        ↓
Submitted again
        ↓
Rejected
        ↓
Revision 3 created
        ↓
Approved
        ↓
QA Review
        ↓
Client Approval (if required)
        ↓
Delivered
        ↓
Closed
```

**Plain-language story for staff training:**

1. Manager creates the Main Task and assigns a designer.  
2. Designer starts work and uploads Revision 1 (first attempt).  
3. Designer submits for review.  
4. Reviewer either approves or asks for another attempt.  
5. Each new attempt is a new Revision — old ones stay visible.  
6. After creative approval, QA checks production readiness.  
7. If the job needs client sign-off, that happens next.  
8. Delivery marks the final files as handed over.  
9. Close locks the task for reporting.

---

## 7. Work Statuses

Supported Main Task statuses:

| Status | Meaning |
| --- | --- |
| **Backlog** | Captured but not yet assigned / activated |
| **Assigned** | Assignee set; work not started |
| **In Progress** | Active production on the current revision |
| **Submitted for Review** | Current revision awaiting reviewer decision |
| **Changes Requested** | Reviewer asked for corrections; next revision expected |
| **Rework In Progress** | Designer actively working on a new revision after feedback |
| **QA Review** | Creatively approved; awaiting QA gate |
| **Approved** | Passed required creative (and QA/client if configured) gates, ready to deliver |
| **Delivered** | Final assets handed over (slot completes here when enabled) |
| **Awaiting Posting** | Optional — Posting department must publish and submit URL(s) |
| **Posted** | Optional — Posting done with URL proof |
| **Closed** | Complete and locked for operational change |
| **Cancelled** | Stopped; history retained |

`Awaiting Posting` and `Posted` apply only when `requiresPosting === true`. Otherwise skip them: `Delivered → Closed`.

Detailed transitions: [CREATIVE_STATE_MACHINE.md](./CREATIVE_STATE_MACHINE.md).  
Posting handoff: [CREATIVE_POSTING_HANDOFF.md](./CREATIVE_POSTING_HANDOFF.md).

---

## 8. Review Workflow

Reviewers may take exactly one of these decisions per review action:

| Decision | Typical next status | Creates new revision? |
| --- | --- | --- |
| **Approve** | QA Review (if QA required) or Approved | No |
| **Reject** | Changes Requested (or Cancelled if terminal reject policy) | Yes (new revision expected, unless cancelled) |
| **Request Minor Changes** | Changes Requested | Yes |
| **Request Major Rework** | Changes Requested | Yes |
| **Send Back with Comments** | Changes Requested | Yes |

**Rules:**

1. Every review decision creates a Review Record and a Timeline Event.  
2. Non-approve decisions should include notes (mandatory for Reject / Major Rework).  
3. “Minor” vs “Major” does not change the status name; it informs reporting and designer guidance.  
4. Approval of a revision does not delete prior revisions.  
5. Only one active “tip” revision is editable for production at a time.

---

## 9. Files Policy

1. Files are owned by a **Revision**, not loosely by the Main Task.  
2. Uploading new files never replaces older revision files.  
3. Every historical file remains downloadable for authorized users.  
4. Delivery packaging references the **approved revision’s files** (plus any delivery-package revision if needed).  
5. Soft-delete of a file (if ever allowed) must leave an audit event and must not erase storage for compliance windows.

---

## 10. History & Traceability

The system must maintain a complete chronological timeline.

Example:

| Time | Event |
| --- | --- |
| 09:10 | Task Assigned |
| 09:45 | Revision 1 Uploaded |
| 10:15 | Review Completed |
| 10:16 | Changes Requested |
| 11:40 | Revision 2 Uploaded |
| 12:10 | Approved |
| 12:15 | Sent to QA |
| 12:40 | Delivered |

Timeline events are append-only and include actor, timestamp, related revision/review IDs, and a human-readable summary.

---

## 11. Dashboard (Managers)

Managers should see at least:

| Metric | Definition |
| --- | --- |
| Total Assigned | Tasks currently Assigned / In Progress / Rework / In Review family |
| In Review | Submitted for Review + QA Review (configurable split) |
| Rework | Changes Requested + Rework In Progress |
| Rejected | Count of reject decisions in period (and/or tasks with ≥1 reject) |
| Approved | Tasks in Approved (and optionally Delivered/Closed) |
| Delivered | Tasks in Delivered / Closed after delivery |
| Average Revisions | Mean revisions per closed/delivered task |
| Average Approval Time | Mean time from first submit to creative approval |
| Designer Productivity | Approved/delivered revisions or tasks per designer in period |
| Reviewer Workload | Open review queue size and average review turnaround per reviewer |

Dashboard filters: department, project, date range, designer, reviewer, priority.

---

## 12. Reporting

Track and export (CSV/report module later) at least:

| Report | Definition |
| --- | --- |
| Number of revisions | Per task, per designer, per period |
| Average approval time | First submit → creative approve |
| Rework percentage | Tasks with ≥2 revisions / total completed tasks |
| Rejected work | Reject decisions and reject rate |
| Most active reviewers | Reviews completed, average decision time |
| Designer turnaround time | Revision create → submit; and changes-requested → next submit |
| Revision trends | Revisions over time (weekly/monthly) |

---

## 13. Roles (Logical)

Mapped to We Alll ERP role ladder where possible (`superadmin > admin > hr > accounts > manager > hod > employee > client`).

| Logical creative role | Typical ERP mapping | Primary job |
| --- | --- | --- |
| Creative Manager / HoD | `manager`, `hod`, `admin` | Create tasks, assign, monitor, escalate |
| Designer / Video Editor | `employee` (design/video dept) | Produce revisions, submit for review |
| Creative Reviewer | `manager`, `hod`, or designated `employee` | Approve / reject / request changes |
| QA Reviewer | designated reviewer | Production/quality gate after creative approve |
| Client Approver | `client` or account proxy | Final external sign-off when required |
| System Admin | `admin`, `superadmin` | Configuration, recovery, audit access |

Exact action rights: [CREATIVE_PERMISSION_MATRIX.md](./CREATIVE_PERMISSION_MATRIX.md).

---

## 14. Configuration Flags (Per Task or Department Default)

| Flag | Default suggestion | Effect |
| --- | --- | --- |
| QA required | On for Video; optional for Design | After creative approve → QA Review |
| Client approval required | Off unless marked | After QA/approve → wait for client |
| Max recommended revisions | Soft warning at N (e.g., 5) | Does not hard-block unless policy says so |
| Allow terminal reject → Cancelled | Off by default | Manager may cancel after reject |
| Multi-reviewer consensus | Off | Single reviewer sufficient unless enabled |

---

## 15. Slot System Integration (Hard Constraint)

**The existing project Slot system must continue to work exactly as it does today.**

Creative Workflow adds revisions, reviews, and richer statuses on top of the Main Task (Work Item). It does **not** redesign slots, capacity, monthly periods, or progress math.

### 15.1 What stays unchanged

| Behavior | Rule |
| --- | --- |
| Enablement | Still gated by `project.slotConfiguration.enableSlotSystem` |
| Bidirectional link | `WorkItem.slotAssignment` ↔ `Slot.assignedWorkItem` must stay consistent |
| Assign on create | Creating/assigning a creative Main Task to a slot uses the same assign flow (`slotManagementService` / existing UI) |
| One work item per available slot | Unchanged uniqueness / availability rules |
| Same-project only | Work item and slot must share the same project |
| Mid-lifecycle | Status moves such as In Progress, Submitted for Review, Changes Requested, Rework, QA **do not** auto-change slot `assignmentStatus` (same as today’s In Progress / Review) |
| Completed slots immutable | Completed slots are not released or reassigned |
| Monthly period model | `periodIdentifier`, current-month availability, unique `(project, year, month, slotNumber)` unchanged |
| Progress | Slot-based progress still = completed slots / total slots via `recalculateSlotProgress()` |
| Soft delete / cancel release | Still controlled by `slotIntegration.releaseSlotOnDeletion` (default true), unless the slot is already completed |

### 15.2 What maps to today’s “Done” / “Cancelled”

Creative statuses are richer than `To Do / In Progress / Review / Done`. Slot side effects must map as follows:

| Creative Main Task event | Slot effect (same spirit as today) |
| --- | --- |
| Task created/assigned **with** a selected slot | Slot → `assigned`; both sides linked |
| In Progress / Rework / Submitted for Review / Changes Requested / QA Review / Approved | **No** automatic slot complete or release |
| Task → **Delivered** | Equivalent to today’s **Done**: if `autoCompleteSlotOnWorkItemCompletion`, call `completeSlot`, then recalculate project slot progress when enabled |
| Task → **Closed** (after Delivered) | No second slot completion; slot already completed on Delivered |
| Task → **Cancelled** (and slot not completed) | Equivalent to today’s **Cancelled**: release slot + clear `slotAssignment` when `releaseSlotOnDeletion` |
| Soft-delete Main Task | Same release/clear behavior as today’s work item delete path |

**Why Delivered (not Approved)?**  
Approval means creative/QA sign-off; capacity is consumed when work is handed over (**Delivered**), matching “work item Done completes the slot.”

### 15.3 What must never happen

1. Do **not** create a slot per Revision.  
2. Do **not** complete a slot on every revision approve.  
3. Do **not** invent a parallel “creative slot” model.  
4. Do **not** change `assignToWorkItem` / `releaseSlot` / `completeSlot` contracts unless a bugfix is separately approved.  
5. Do **not** break existing non-creative Work Assignment slot behavior.

Revisions attach only to the Main Task. The slot remains bound to the **Main Task (Work Item)** for the whole revision history.

### 15.4 Tests that must keep passing

Existing slot tests remain the regression gate, including:

- Assignment uniqueness  
- Completion immutability  
- Availability accuracy  

Any creative workflow change that breaks these tests is out of scope / must be fixed before merge.

---

## 16. Posting Department Handoff

**Prerequisite:** the **Posting** department does not exist yet and must be created first.

Full detail: [CREATIVE_POSTING_HANDOFF.md](./CREATIVE_POSTING_HANDOFF.md).

### 16.1 Intent

When assigning Graphic Design or Video work:

1. Always assign the creative owner (designer / editor).  
2. Optionally **tick “Assign to Posting department”**.  
3. If ticked → select a **Posting** team member **and a Posting date** → that person is **auto-assigned** as posting owner.  
4. If not ticked → **no posting assignee and no posting date**; the **client posts** the content themselves.  
5. When We Alll posts, the Posting member submits **URL / URLs** and marks **posting done**.

**Posting date** (`postingDate`) is a separate field from the creative **due date**. It is the planned day the content should go live.

### 16.2 Extra statuses (only when posting required)

| Status | Meaning |
| --- | --- |
| **Awaiting Posting** | Delivered; waiting for Posting member to publish + submit URLs |
| **Posted** | Posting done with URL proof |

When posting is not required: `Delivered → Closed` (no Awaiting Posting / Posted).

### 16.3 Slot interaction

Unchanged: **Delivered** still completes the slot once. Posting / Posted / Closed do not create, reassign, or re-complete slots.

---

## 17. Non-Goals & Explicit Constraints

- Do not force Git UI jargon on designers (“commit”, “merge”, “rebase”). Use **Task**, **Revision**, **Review**, **Timeline**.  
- Do not mutate historical revisions.  
- Do not share mutable attachment slots across revisions.  
- Do not collapse Creative statuses into the old 4-stage board without a mapping layer.  
- Do not change Slot assign / complete / release / progress behavior beyond the mapping in §15.  
- Do not require Posting on every Graphic/Video job — only when explicitly selected.  
- Do not implement in this document set.

---

## 18. Success Criteria

The Creative Workflow is successful when:

1. Any stakeholder can answer: “What was attempted, when, by whom, and why did it change?”  
2. Average revision and approval-time metrics are trustworthy because history is complete.  
3. Designers never fear losing a previous file version.  
4. Managers can distinguish in-review vs rework vs delivered without opening every task.  
5. The experience feels as rigorous as Git and as simple as a status board.  
6. Slot assignment, completion, release, and slot-based project progress behave the same as today for creative and non-creative work.  
7. Graphic/Video assignment can optionally hand off to Posting; client-post jobs skip Posting; Posting members can prove completion with URLs.

---

## 19. Document Control

| Version | Date | Notes |
| --- | --- | --- |
| 0.1 | 2026-07-28 | Initial design specification from Creative Workflow System brief |
| 0.2 | 2026-07-28 | Added Slot System Integration hard constraint (§15) |
| 0.3 | 2026-07-28 | Added Posting department handoff (§16) |
| 0.4 | 2026-07-28 | Posting date required when posting is selected (§16) |

**Implementation plan:** [CREATIVE_IMPLEMENTATION_PLAN.md](./CREATIVE_IMPLEMENTATION_PLAN.md) (also mirrored under `docs/superpowers/plans/`).
