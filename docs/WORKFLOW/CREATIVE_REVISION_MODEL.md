# Creative Revision Model

Each creative work item maintains a **revision chain** tracked in `CreativeRevision` documents.

## Schema Highlights

| Field | Description |
|-------|-------------|
| `workItem` | Parent work item reference |
| `revisionNumber` | 1-based sequence (R1, R2, …) |
| `isCurrentTip` | Exactly one tip revision per work item |
| `status` | `draft`, `submitted`, `changes_requested`, etc. |
| `parentRevision` | Previous revision when branched from rework |
| `attachments` | File metadata (name, url, type) |
| `lastDecision` | Review outcome on this revision |
| `decisionSeverity` | `minor`, `major`, `reject`, or `none` |
| `reviewedBy` / `reviewedAt` / `reviewNotes` | Review audit trail |

## Lifecycle

1. **startWork** — creates Revision 1 as draft tip (`isCurrentTip: true`).
2. **submitForReview** — tip moves to `submitted`; work item → Submitted for Review.
3. **recordReview (approve)** — routes to QA Review (does not skip QA).
4. **recordReview (changes)** — tip marked changes_requested; new draft created on rework.
5. **startRework** — new revision branched from prior tip.
6. **recordQa** — pass/fail on submitted tip at QA Review stage.

## Index

Partial unique index ensures one tip per work item:

```javascript
{ workItem: 1, isCurrentTip: 1 }  // unique where isCurrentTip: true
```

## Attachments

- Optional at submit-for-review time — assignees may submit with zero file links.
- Added via `POST /api/creative-workflow/:id/revisions/attachments`.
- Soft-deprecated attachments excluded from UI counts (`softDeprecated: true`).
- UI shows clickable links per revision in `CreativeWorkflowPanel`.

## Legacy Data

Items stuck in **In Progress** without any revision (manual status bypass) should be cleaned with:

```bash
node backend/scripts/cleanup-stuck-creative-work.js --dry-run
```

Assignees must click **Start / Revision 1** before submitting for review.
