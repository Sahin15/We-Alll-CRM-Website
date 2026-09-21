# Creative Workflow Permission Matrix

**Product:** We Alll Office ERP  
**Module:** Creative Workflow System  
**Status:** Design specification only — not implemented  
**Companion:** [CREATIVE_WORKFLOW_SPECIFICATION.md](./CREATIVE_WORKFLOW_SPECIFICATION.md) · [CREATIVE_STATE_MACHINE.md](./CREATIVE_STATE_MACHINE.md)

---

## 1. Purpose

Define **who can do what** in the Graphic Design and Video creative workflow.

Goals:

1. Keep designers productive without letting them bypass review.  
2. Keep reviewers decisive without letting them alter historical files.  
3. Give managers oversight and cancellation rights.  
4. Align with We Alll ERP role ladder without inventing parallel auth systems.  
5. Remain understandable to non-technical staff.

---

## 2. Role Mapping

### 2.1 ERP platform roles (existing)

`superadmin` > `admin` > `hr` > `accounts` > `manager` > `hod` > `employee` > `client`

### 2.2 Logical creative roles

| Logical role | Typical ERP roles | Scope |
| --- | --- | --- |
| **System Admin** | `superadmin`, `admin` | All departments; recovery; reopen; config |
| **Creative Manager** | `manager`, plus `admin` | Create/assign/monitor tasks in managed scope |
| **Department HoD** | `hod` | Same as manager within own department |
| **Designer / Editor** | `employee` in Design or Video | Produce revisions on assigned tasks |
| **Creative Reviewer** | `manager`, `hod`, or designated `employee` | Review decisions on assigned review queue |
| **QA Reviewer** | designated `employee` / `manager` | QA gate after creative approve |
| **Client Approver** | `client` or internal proxy | Client sign-off when required |
| **Posting Specialist** | `employee` in **Posting** department | Publish assets and submit post URL(s) |
| **Posting HoD / Manager** | `hod` / `manager` for Posting | Oversee posting queue; override assignee |
| **Requester** | any authenticated creator | View own requested tasks; limited actions |
| **Read-only Observer** | `hr`, `accounts` (as needed) | Metrics/reporting only unless granted more |

A single user may hold multiple logical roles (e.g., HoD who also reviews).

**Prerequisite:** department named **`Posting`** must exist and have employees before posting handoff can be used.

---

## 3. Permission Keys (Logical)

Suggested future module permission keys (names only — not implemented here):

| Key | Meaning |
| --- | --- |
| `creative.task.create` | Create Main Tasks |
| `creative.task.assign` | Assign / reassign designers |
| `creative.task.cancel` | Cancel tasks |
| `creative.task.close` | Close delivered tasks |
| `creative.task.reopen` | Reopen closed tasks |
| `creative.revision.create` | Create revisions on assigned work |
| `creative.revision.upload` | Upload files to draft revisions |
| `creative.revision.submit` | Submit for review |
| `creative.review.decide` | Approve / reject / request changes |
| `creative.qa.decide` | Pass / fail QA |
| `creative.client.decide` | Client approve / request changes |
| `creative.deliver.mark` | Mark delivered |
| `creative.posting.toggle` | Set requiresPosting + choose Posting member on Graphic/Video assign |
| `creative.posting.submit` | Submit post URL(s) and mark posting done |
| `creative.dashboard.view` | Manager dashboards |
| `creative.reports.view` | Reporting exports |
| `creative.audit.view` | Full timeline / admin audit |

Until a permission-key migration exists, enforce via role + assignment + department checks (same pattern as other ERP modules).

---

## 4. Matrix Conventions

| Symbol | Meaning |
| --- | --- |
| **Y** | Allowed |
| **N** | Not allowed |
| **O** | Allowed only for **own** assigned tasks / revisions |
| **D** | Allowed within **department** scope |
| **A** | Allowed when designated as that task’s actor (reviewer/QA/client) |
| **S** | Soft / policy-dependent (config flag) |

---

## 5. Main Task Actions

| Action | Designer | Creative Reviewer | QA | Client | Manager / HoD | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Create Main Task | N | S | N | N | Y | Y |
| Edit brief (before first submit) | O (limited) | N | N | N | Y | Y |
| Edit brief (after reviews exist) | N | N | N | N | Y (audited) | Y |
| Assign / reassign designer | N | N | N | N | Y | Y |
| Set reviewers / QA / client flags | N | N | N | N | Y | Y |
| Start work (Assigned → In Progress) | O | N | N | N | Y | Y |
| Cancel task | N | N | N | N | Y | Y |
| Mark delivered | O (S) | N | N | N | Y | Y |
| Close task | N | N | N | N | Y | Y |
| Reopen closed task | N | N | N | N | N | Y |
| View task | O/D | A/D | A | A | D | Y |
| View full timeline | O | A | A | A (limited) | D | Y |

**Notes:**

- Designers may edit limited operational fields (actual time, personal notes) on own active tasks.  
- Clients see timeline summaries relevant to approvals, not internal HR/productivity notes.  
- Managers operate within department/project scope; admins are global.

---

## 6. Revision Actions

| Action | Designer | Reviewer | QA | Client | Manager / HoD | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Create Revision 1 | O | N | N | N | Y | Y |
| Create next revision (start rework) | O | N | N | N | Y | Y |
| Upload files to **draft** tip | O | N | N | N | Y (support) | Y |
| Upload files to **submitted/approved** revision | N | N | N | N | N | N* |
| Download any revision files | O/D | A/D | A | A (approved/delivered only S) | D | Y |
| Edit revision reason/estimate (draft) | O | N | N | N | Y | Y |
| Log actual time | O | N | N | N | Y | Y |
| Submit for review | O | N | N | N | Y | Y |
| Soft-archive revision | N | N | N | N | N | Y |
| Hard-delete revision / files | N | N | N | N | N | N |

\* Admins also must not mutate historical revision files; recovery is restore-from-backup / compensating upload on a **new** revision.

---

## 7. Review Decision Actions

| Decision | Designer | Creative Reviewer | QA | Client | Manager / HoD | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Approve (creative) | N | A | N | N | A/Y | Y |
| Request Minor Changes | N | A | N | N | A/Y | Y |
| Request Major Rework | N | A | N | N | A/Y | Y |
| Reject | N | A | N | N | A/Y | Y |
| Send Back with Comments | N | A | N | N | A/Y | Y |
| Self-review own submission | N | N** | N | N | S | S |
| Override review (force approve) | N | N | N | N | S | Y |

\*\* Separation of duties: the submitting designer cannot approve their own revision unless an explicit emergency policy is enabled for tiny teams.

### Review note requirements

| Decision | Notes required? |
| --- | --- |
| Approve | Optional |
| Request Minor Changes | Recommended |
| Request Major Rework | **Required** |
| Reject | **Required** |
| Send Back with Comments | **Required** |

---

## 8. QA, Client & Posting Gates

| Action | Designer | Creative Reviewer | QA | Client | Posting Specialist | Manager / HoD | Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA Pass | N | N | A | N | N | S | Y |
| QA Fail → Changes Requested | N | N | A | N | N | S | Y |
| Client Approve | N | N | N | A | N | S (proxy) | Y |
| Client Request Changes | N | N | N | A | N | S (proxy) | Y |
| Tick requires Posting + pick member + **posting date** (on create/assign) | N | N | N | N | N | Y | Y |
| Change posting assignee or **posting date** before Posted | N | N | N | N | N | Y | Y |
| Submit post URL(s) + posting done | N | N | N | N | O (assigned) | S | Y |
| Close when posting required | N | N | N | N | N | Y (from Posted) | Y |
| Close when posting not required | N | N | N | N | N | Y (from Delivered) | Y |

If client approval is not required on a task, client columns are inactive for that task.  
If `requiresPosting` is false, posting columns are inactive (client posts externally).

---

## 9. Dashboard & Reporting

| Action | Designer | Reviewer | QA | Client | Manager / HoD | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Personal queue (my tasks / my reviews) | Y | Y | Y | Y | Y | Y |
| Team dashboard (assigned / in review / rework / etc.) | N | S | N | N | Y | Y |
| Designer productivity metrics | N | N | N | N | D | Y |
| Reviewer workload metrics | N | O (self) | N | N | D | Y |
| Department reports (revision trends, reject %) | N | N | N | N | D | Y |
| Cross-department reports | N | N | N | N | N | Y |
| Export report data | N | N | N | N | D | Y |

---

## 10. Notification Recipients (Logical)

| Event | Notify |
| --- | --- |
| Task assigned | Designer |
| Submitted for review | Creative reviewer(s) |
| Changes requested / rejected / send back | Designer + Manager (optional) |
| Creative approved | QA (if required) else Manager |
| QA fail | Designer + Creative reviewer |
| QA pass | Client (if required) else Manager |
| Client decision | Designer + Manager |
| Delivered | Requester + Manager |
| Cancelled / Closed | Designer + Manager |

---

## 11. Data Visibility Rules

| Data | Designer | Reviewer | Client | Manager | Admin |
| --- | --- | --- | --- | --- | --- |
| Task brief | Own/dept | Assigned | Assigned tasks | Dept | All |
| All revisions metadata | Own tasks | Assigned tasks | Approved+ summary | Dept | All |
| Internal review debate notes | Own | Yes | No | Yes | Yes |
| Salary / HR fields | Never via this module | Never | Never | Never | Separate modules only |
| File downloads (historical) | Own tasks | Assigned | Final/approved only (S) | Dept | All |

Sensitive ERP fields (salaries, passwords, government IDs, bank details) must never appear in creative task payloads.

---

## 12. Separation of Duties (Recommended Policies)

1. **Creator ≠ sole approver** for client-billable deliverables when team size ≥ 2.  
2. **QA ≠ same person as creative reviewer** when QA is required (preferred).  
3. **Client approval cannot be forged** by designers; managers may proxy only with audit note.  
4. **Cancel** requires manager/admin; designers may only request cancel via comment.  
5. **Reopen** is admin-only and always audited.

Small-team escape hatch: department config may allow manager dual-role (reviewer + QA) with warning banner.

---

## 13. Status Transition Authority (Quick Reference)

| Transition | Primary actor |
| --- | --- |
| → Assigned | Manager / HoD / Admin |
| → In Progress | Designer (own) |
| → Submitted for Review | Designer (own) |
| → Changes Requested | Reviewer / QA fail / Client changes |
| → Rework In Progress | Designer (own) |
| → QA Review | Creative reviewer (approve + QA required) |
| → Approved | Creative reviewer and/or QA (+ client if required) |
| → Delivered | Manager (or designer if policy allows) |
| → Awaiting Posting | System/Manager when `requiresPosting` |
| → Posted | Posting assignee (URL submit) |
| → Closed | Manager / Admin (from Delivered if no posting; from Posted if posting required) |
| → Cancelled | Manager / Admin |

Full transition rules: [CREATIVE_STATE_MACHINE.md](./CREATIVE_STATE_MACHINE.md).

---

## 14. Abuse & Edge Cases

| Scenario | Rule |
| --- | --- |
| Designer tries to approve own work | Deny (unless small-team policy) |
| Reviewer edits designer files | Deny — request changes instead |
| Manager force-moves to Approved | Allowed only as audited override |
| Client downloads Revision 1 after Revision 3 approved | Default deny; optional allow with watermark/policy |
| Employee from another department opens task | Deny unless project membership grants view |
| Deleted user on historical revision | Keep name snapshot / inactive user reference |

---

## 15. Document Control

| Version | Date | Notes |
| --- | --- | --- |
| 0.1 | 2026-07-28 | Initial permission matrix |
| 0.2 | 2026-07-28 | Posting Specialist role and posting submit rights |
