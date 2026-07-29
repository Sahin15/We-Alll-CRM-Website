---
Purpose: Independent production-readiness audit before any PAYROLL_V2_ENGINE=true decision.
Audience: CTO / Finance / Engineering
Date: 2026-07-27
Branch audited: develop @ cd02cc2
Mode: Read-only audit (no code changes)
Verdict: **NO GO**
---

# Payroll V2 — Production Readiness Report

## Executive summary

Payroll V2 on `develop` is a **strong enterprise foundation** (engine, dual-run, periods, approvals, exports, jobs, docs, unit tests). It is **not** safe to treat as a drop-in replacement for Payroll V1 pay persistence for real employees.

**Final recommendation: NO GO** for enabling `PAYROLL_V2_ENGINE=true` to pay employees.

**One-question answer:** If this ERP were used to pay **1,000 real employees tomorrow**, would you approve enabling `PAYROLL_V2_ENGINE=true`?

### **No.**

**Objective reasons:**

1. **Cutover wiring gap:** Live `generateSalarySlip` / bulk generate still persist V1 earnings/deductions. Dual-run is **log-only**. `selectPersistableTotals` is used on diagnostic `processEmployeePayroll` / dual-run APIs, **not** on the slip writer. Enabling the flag today is largely a **no-op for pay**, but the cutover runbook assumes generate already persists V2 — a dangerous ops misconception.
2. **Correctness gaps on the live V1 path (pre-existing, salary-impacting):** attendance docs with `status: "absent"` do not create LOP; generate ignores half-day/OT attendance rules used by the diagnostic engine; LOP uses full `gross/30` even when earnings are pro-rated; no negative-net guard.
3. **Ops safety defaults soft:** `PAYROLL_PERIOD_GATES` defaults **off**; bank export can use `status=generated` (UI encourages it); `PUT` slip update is not period-gated; job queue is in-process, non-reclaiming, non-deduped.
4. **Hard gates incomplete:** No staging dual-run CTO/Finance sign-off; integration/UAT checklists open.

Until persist is explicitly wired, dual-run signed, gates enforced for banking, and LOP/attendance defects fixed, **do not enable the engine flag for real pay**.

---

## Scope & method

| Item | Detail |
|------|--------|
| Codebase | `develop` tip including R0–R9 |
| Approach | Independent code review of engines, controllers, gates, jobs, exports, approvals, flags |
| Out of scope | Feature work, refactors, schema changes, migrations |
| Related docs | `RISK_REGISTER.md`, `KNOWN_LIMITATIONS.md`, `GO_LIVE_CHECKLIST.md` |

---

## Area scores (0–10)

| Area | Score | Notes |
|------|------:|-------|
| Architecture | 8 | Clear V1 + additive V2; modular `services/payroll/*` |
| Business Logic | 6 | R1 LOP policy sound; attendance/pro-rata inconsistencies remain |
| Correctness | 5 | Engine dual-run solid; live generate ≠ engine path; absent/LOP bug |
| Performance | 6 | OK ≤~300 sequential; weak at 1k–5k without durable queue |
| Scalability | 4 | In-process jobs; no multi-instance mutex; sync bulk still live |
| Security | 6 | Permissions present; bulkApprove bypass; export status override |
| Maintainability | 7 | Good docs/workspace; cutover docs slightly overclaim wiring |
| Testing | 7 | 90 payroll unit tests; thin integration/E2E |
| Documentation | 8 | Runbooks + checklists; decision log empty of staging results |
| Production Readiness | 3 | Flags off for good reason; hard gates unmet |

### Overall Enterprise Readiness Score: **58 / 100**

Interpretation: **Ready for continued development and staging dual-run.** **Not ready** for V2 persist cutover or “replace V1 tomorrow.”

---

## Audit findings by area

### 1. Payroll Engine correctness

- `buildV1Result` / `buildV2Result` / `dualRunPayroll` compare within ₹1 (`DUAL_RUN_TOLERANCE`).
- `selectPersistableTotals` switches to V2 when flag true — **only if callers use it**.
- **Live generate does not call it** (`salarySlipController` dual-run log-only comment).

**Impact:** Flag enable ≠ V2 pay. Wiring later without fixing LOP/attendance would suddenly change nets.

### 2. Formula calculations

- Safe AST (`formulaEngine`); no `eval`.
- `Math.round` on formula results; totals via `sumMoney` without banker's rounding policy.

### 3. Proration

- Flat→pro-rata adapter (`toProRataComponentMaps`) fixed in R1.
- Risk: `proRata || structure` treats legitimate `0` as missing.
- LOP not aligned to pro-rated gross.

### 4. Leave deduction

- R1: money only on `lossOfPay`; `unpaidLeaveDeduction` forced 0 — **correct** vs pre-save double-count.
- Unpaid leave impact codes shared — good.

### 5. Attendance integration

- **Critical:** presence = attendance document exists; `status: "absent"` still counts present → **no LOP**.
- Half-day / late / OT rules exist in `payrollAttendanceRules` but **generate does not apply them**.

### 6. Overtime

- Rules compute OT money in engine/diagnostic path; generate uses manual overtime fields — intentional for V1 but diverges dual-run confidence.

### 7–8. Statutory (employer / employee)

- Employer (`PAYROLL_EMPLOYER_STATUTORY`): CTC-only; **does not change employee net** — verified by design + unit tests.
- Employee PF/ESI/PT/TDS still largely structure-driven amounts (not a full statutory rules engine).

### 9. Payroll Period

- State machine sound (`open→frozen→locked→paid`).
- Gates **opt-in**; default off = lock is advisory only.
- Period `mark-paid` does not mark slips paid.

### 10. Approval workflow

- Stage act restricted to current approver.
- **`bulkApprove` skips stages** for anyone with `payroll.approval.manage`.
- Generate may set `approvedBy` while status remains `generated` (audit confusion).

### 11. Notifications

- Fire on generate (before approval); non-blocking — employees may see unapproved slips.

### 12–13. Export / reports

- Default bank status `approved` — good.
- Query/UI can export `generated` — **approval bypass for banking**.
- With gates on, export allowed only `open|frozen` (lock-before-bank ordering risk).

### 14. Job queue

- In-process sequential runner; no Redis.
- No job dedupe; orphaned `running` after crash; sync bulk parallel path remains.
- Unique slip index prevents duplicate **documents**, not duplicate **work**.

### 15. Feature flags

| Flag | Default | Production meaning |
|------|---------|-------------------|
| `PAYROLL_V2_ENGINE` | false | Intended persist switch; **not wired to generate** |
| `PAYROLL_PERIOD_GATES` | false | Period lock enforcement |
| `PAYROLL_EMPLOYER_STATUTORY` | false | ER CTC lines |

Partial enable risk: gates off + export `generated` + V2 flag misunderstanding.

### 16. Rollback safety

- Kill switch (`ENGINE_KILL_SWITCH.md`) works **if** persist actually uses the flag.
- Today kill switch is mostly theoretical for pay (persist already V1).
- After true wiring: flag false + restart is correct rollback (no migration).

### 17–19. Error recovery / concurrency / integrity

- No Mongo multi-doc transactions for approval↔slip or bulk generate.
- Unique `{employee, month, year}` protects slip identity.
- Race on create → possible raw `E11000` / 500.
- No optimistic locking on period transitions.

### 20. Security

- Module permissions on payroll routes — good baseline.
- Broad legacy role sets; bulkApprove privilege; export override — elevate carefully.

---

## Production safety Q&A (evidence-based)

| Question | Answer |
|----------|--------|
| Can payroll accidentally run twice? | **Yes** (jobs/sync). Slip rows: skipped / unique index. |
| Can two admins process the same period? | **Yes** — no lease; last write wins on period doc. |
| Can two queues generate duplicate slips? | **Duplicate docs: no.** Parallel work: yes. |
| Can a locked payroll be modified? | **Gates off: yes.** Gates on: generate blocked; **PUT update still ungated.** |
| Can bank export happen before approval? | **Yes** via `status=generated`. |
| Can payslips regenerate after payment? | **No** (exists + status guards + unique index). |
| Can deleted structures corrupt history? | Mass `DELETE /all` **removed**. Single delete of active structure still operational risk if slips already exist (history on slips). |
| Can feature flags partially enable functionality? | **Yes** — independent flags; V2 flag currently misleading for generate. |

---

## Performance readiness (estimate)

| Headcount | Sync bulk | Async jobs (R9) | Recommendation |
|----------:|-----------|-----------------|----------------|
| 50 | Fine | Fine | Either path |
| 100 | Fine | Fine | Prefer jobs for email+PDF |
| 300 | Marginal (timeouts) | OK single node | Jobs + raise timeouts |
| 1000 | Poor | Risky (one process, no reclaim) | Durable queue + chunking required |
| 5000 | Not viable | Not viable as designed | Redis/Bull + workers + idempotent chunks |

**Bottlenecks:** sequential per-employee create; attendance/leave queries; PDF/email; single-process job runner; no backpressure.

---

## Failure simulation (expected behaviour today)

| Failure | Expected behaviour | Gap |
|---------|-------------------|-----|
| Server restart mid-generate | Partial slip set; unique skips rest on retry | Job stuck `running` forever |
| Mongo timeout | Request/job fails; partial creates possible | No transaction rollback |
| Email failure | Slip still created; warn logged | Manual resend |
| Storage/PDF failure | Depends on call site; notify may skip | Ops re-run |
| Job retry | None automatic | Manual re-enqueue (may duplicate work, not slips) |
| Approval rejection | Workflow rejects; slips may stay `generated` | Export still possible if status overridden |
| Bank export failure | HTTP error; no slip mutation | Safe |
| Partial calculation | Dual-run catch logs; slip may still persist V1 | Silent dual-run fail |
| Network outage | Client retry → skip existing | Generally OK for identity |

---

## GO / NO GO

### **NO GO**

**Conditions that would move to “GO WITH CONDITIONS” (still not tomorrow):**

1. Wire generate/bulk/recalc to `selectPersistableTotals` (or equivalent) with V1/V2 line mapping into slip schema.
2. Fix absent-status LOP; align generate with attendance rules policy; align LOP with pro-rata base.
3. Negative net reject or policy clamp.
4. Staging full-month dual-run + CTO/Finance sign-off.
5. `PAYROLL_PERIOD_GATES=true` in target env; gate slip `PUT`; forbid bank export unless `approved` (or completed workflow).
6. Job reclaim + dedupe or disable sync bulk in multi-instance deploys.
7. Pilot ≤50 employees one full cycle on staging with V2 persist.

**Not approved:** enabling `PAYROLL_V2_ENGINE=true` for 1,000 employees tomorrow.

---

## Scorecard summary

| Dimension | /10 |
|-----------|----:|
| Architecture | 8 |
| Business Logic | 6 |
| Correctness | 5 |
| Performance | 6 |
| Scalability | 4 |
| Security | 6 |
| Maintainability | 7 |
| Testing | 7 |
| Documentation | 8 |
| Production Readiness | 3 |
| **Overall** | **58/100** |

---

## Sign-off

| Role | Recommendation | Date |
|------|----------------|------|
| Principal Architect (this audit) | **NO GO** — engine flag | 2026-07-27 |
| CTO | _pending human_ | |
| Finance | _pending human_ | |
