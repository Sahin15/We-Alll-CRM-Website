---
Purpose: Locked decisions for Payroll V2. Do not reopen without a new DECISIONS entry.
Last Updated: 2026-07-17
---

# Payroll V2 — Decisions

## D-2026-07-17-01 — Documentation workspace is sole plan source

* **Decision:** `docs/IMPLEMENTATION_PLANS/Payroll/` is the only Payroll implementation documentation going forward.
* **Rationale:** Multiple overlapping plans caused AI/session conflicts.
* **Consequence:** All other Payroll implementation plans are Archived (not deleted).

## D-2026-07-17-02 — Active development pointer

* **Decision:** Every AI session must read `docs/ACTIVE_DEVELOPMENT.md` first.
* **Rationale:** Single source of truth for feature, phase, milestone, and branch.
* **Consequence:** Agents must not guess which plan is current.

## D-2026-07-17-03 — No Payroll code in documentation standardization session

* **Decision:** This session creates documentation only (no DB, API, UI, engines).
* **Rationale:** Stabilize source of truth before Milestone 1.
* **Consequence:** Coding waits for explicit approval.

## D-2026-07-17-04 — Dual-run migration (from plan v2.0.0)

* **Decision:** Implement V2 engine beside V1; log variance; keep persisted slips on V1 until variance is verified near zero.
* **Feature flag:** `PAYROLL_V2_ENGINE=false` by default; `true` enables V2 generation path; toggle back for rollback.

## D-2026-07-17-05 — Modular 14-engine architecture (from plan v2.0.0)

* **Decision:** Split payroll into isolated engines (Payroll, Component, Formula, Attendance, Leave, OT, Loan, Reimbursement, Statutory, Audit, Approval, Payslip, Reporting, Notification).
* **Rationale:** Reduce oversized controllers; enable independent milestone branches.

## D-2026-07-17-06 — Formula safety (from plan v2.0.0)

* **Decision:** Formula Engine uses a safe AST parser. JavaScript `eval` is forbidden.

## D-2026-07-17-07 — Milestone order (from plan v2.0.0)

* **Decision:** Coding order is Pay Period → Components → Formula → Engine → Attendance → Approval → Payslip → Reporting.
* **Rationale:** Period lock must exist before engine persistence and approvals.

## D-2026-07-17-08 — Obsolete plans are Archived, not deleted

* **Decision:** Move superseded Payroll plans to `docs/ARCHIVE/`.
* **Rationale:** Preserve history; prevent accidental use as active guidance.

## D-2026-07-17-09 — Period status machine (Milestone 1)

* **Decision:** Period statuses are `open` → `frozen` → `locked` → `paid`.
* **Actions:** freeze / unfreeze / lock / unlock / markPaid (named actions; unlock requires `unlockReason`).
* **Unlock:** `locked` → `frozen` only (not straight to `open`).
* **Paid:** terminal for Milestone 1 (no reopen).

## D-2026-07-17-10 — Component catalog (Milestone 2)

* **Decision:** Components are catalog entries with unique `code`, `type` (`earning|deduction|employer`), `taxable`, `statutory`, `calcMethod`.
* **Permission:** `payroll.component.manage`.
* **Deletes:** Soft-deactivate via DELETE (sets `isActive: false`); codes are immutable after create.
* **Seed:** `POST /seed-defaults` inserts V1-mapped defaults without overwriting existing codes.
* **Deferred:** Assigning components onto `SalaryStructure` and formula evaluation (Milestones 3–4).

## D-2026-07-17-11 — Formula engine safety (Milestone 3)

* **Decision:** Formulas are compiled to an AST and evaluated in a custom interpreter. JavaScript `eval` / `Function` are forbidden.
* **Allowlisted functions:** `min`, `max`, `round`, `if`, `percent`.
* **Variables:** Uppercase identifiers supplied at evaluation time (e.g. `BASIC`, `GROSS`, `LOP_DAYS`).
* **Limits:** Max length 500 chars; max AST depth 32; reserved names blocked (`eval`, `constructor`, …).

## D-2026-07-17-12 — Dual-run engine (Milestone 4)

* **Decision:** Always compute V1 (flat structure) and V2 (component-mapped) totals; log/report diffs.
* **Persist:** Use V1 unless `PAYROLL_V2_ENGINE=true`.
* **Tolerance:** Absolute diffs ≤ ₹1 count as match.
* **Permission:** `payroll.run.process` for dual-run APIs.
