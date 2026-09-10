# Creative Time Tracking

Server-backed timers for creative assignees (Graphic Design / Video Production).

## Behavior

| Action | Timer | Status |
|--------|-------|--------|
| Start / Revision 1 | Start | `In Progress` |
| Submit for Review | Stop, record duration | `Submitted for Review` |
| Start Rework | Start new revision timer | `Rework In Progress` |
| Hold | Pause, accumulate seconds | `On Hold` |
| Resume | Continue from accumulated time | prior active status |

## Single active task

- At most one item in `In Progress` or `Rework In Progress` per creative assignee.
- To start another task, **Hold** the current one first (priority work scenario).
- After **Submit**, the assignee may start or resume any other task.
- **Resume** is blocked while another task is actively running.

API returns **409** with message: *Hold [Task Title] first to start this task.*

## Data model

**CreativeRevision.timeTracking**

- `workStartedAt`, `activeTimerStartedAt`, `accumulatedActiveSeconds`
- `lastStoppedAt`, `stopReason` (`submit` | `hold`)
- `holdSegments[]` — per-revision hold history

**WorkItem**

- `holdPreviousStatus`, `heldAt`, `holdResumeLog[]`

## API

| Method | Path |
|--------|------|
| GET | `/api/creative-workflow/my-active` |
| POST | `/api/creative-workflow/:id/hold` |
| POST | `/api/creative-workflow/:id/resume` |

Start/submit/rework responses include `timeSummary` with per-revision durations and clock timestamps.

## Frontend

- `CreativeStepTimeline.jsx` — elapsed time + clock timestamps per step (no live ticking UI; server tracks in background)
- My Work banner when another task is actively running
