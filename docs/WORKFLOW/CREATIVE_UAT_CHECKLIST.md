# Creative Workflow — UAT Checklist

Run on **staging** with a Graphic or Video project that uses slots.

## Setup

- [ ] Branch `feature/creative-workflow` deployed to staging
- [ ] Posting department exists with at least one active user
- [ ] Test users: assignee, assigner (createdBy), project head, dept HOD, posting assignee

## Happy Path (no posting)

1. [ ] Assign creative work from project team / slot header
2. [ ] Assignee: Start / Revision 1 → In Progress
3. [ ] Assignee: add attachment URL, Submit for Review
4. [ ] Reviewer: Approve → QA Review (not Approved directly)
5. [ ] Reviewer: QA Pass → Approved
6. [ ] Reviewer: Mark Delivered → slot marked complete
7. [ ] Reviewer: Close → Closed
8. [ ] Activity timeline shows all transitions

## Rework Loop

1. [ ] Submit for review
2. [ ] Reviewer: Request Major Changes with notes
3. [ ] Assignee: Start Rework → new revision
4. [ ] Resubmit → approve → QA fail → rework again
5. [ ] Change request counts visible in panel and employee view

## Posting Path

1. [ ] Enable posting handoff (assignee + date) before deliver
2. [ ] Mark Delivered → Awaiting Posting
3. [ ] Posting assignee submits URLs → Posted
4. [ ] Reviewer closes from Posted

## Enforcement

- [ ] PATCH status to In Progress/Done on creative item → 400 error
- [ ] PATCH Cancelled with valid reason → allowed
- [ ] Random employee cannot review/QA/deliver
- [ ] Assignee cannot self-approve (unless project head/HOD role)

## UI

- [ ] No legacy status dropdown on creative items (My Work, Details, Kanban)
- [ ] Kanban drag disabled for creative cards; creative status badge shown
- [ ] Work item modal opens on Activity tab for creative items
- [ ] Close hidden until Delivered/Posted; Deliver hidden until Approved

## Data Cleanup

```bash
cd backend
node scripts/cleanup-stuck-creative-work.js --dry-run
node scripts/cleanup-stuck-creative-work.js
```

- [ ] Stuck items (In Progress, no revision) reported and reset to To Do

## Merge

- [ ] UAT sign-off recorded
- [ ] Merge to `develop` → `staging` → `main` per git workflow
