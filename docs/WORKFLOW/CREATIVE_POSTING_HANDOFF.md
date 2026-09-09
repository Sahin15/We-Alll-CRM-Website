# Creative Posting Handoff

Optional handoff from creative delivery to the Posting department for live URL submission.

## When It Applies

- Graphic Design and Video Production assignments may set `requiresPosting: true`.
- If enabled, a posting assignee and posting date must be configured before **Mark Delivered**.
- If disabled, the client posts directly and reviewers **Close** from **Delivered**.

## Fields on Work Item

| Field | Purpose |
|-------|---------|
| `requiresPosting` | Whether posting department is involved |
| `postingAssignedTo` | User in Posting department |
| `postingDate` | Scheduled posting date |
| `postingStatus` | `not_required`, `pending`, or `done` |
| `postUrls` | Live post links after submit — `{ platform, url }[]` (e.g. Instagram, Facebook) |
| `postingNotes` | Optional notes from posting assignee |

## Flow

1. **Assign work** — optional posting handoff at creation (`AssignWorkModal`).
2. **Before delivery** — reviewer edits handoff via Creative Workflow panel (`PUT /posting`).
3. **Mark Delivered** — if posting required, status becomes **Awaiting Posting**.
4. **Submit URLs** — posting assignee calls `POST /posting/submit` → **Posted**.
5. **Close** — reviewer closes from **Posted**.

## Validation

- Posting assignee must belong to a department whose name includes "Posting".
- `markDelivered` rejects if `requiresPosting` is true but assignee/date missing.
- Posting submit does **not** mutate slot completion (slot already completed on Delivered).

## API

```http
PUT /api/creative-workflow/:workItemId/posting
{
  "requiresPosting": true,
  "postingAssignedTo": "<userId>",
  "postingDate": "2026-09-15"
}

POST /api/creative-workflow/:workItemId/posting/submit
{
  "postUrls": [
    { "platform": "Instagram", "url": "https://instagram.com/p/..." },
    { "platform": "Facebook", "url": "https://facebook.com/..." }
  ],
  "postingNotes": "optional"
}
```
