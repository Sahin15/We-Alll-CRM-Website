---
Purpose: Business model for a simplified Payroll V2 aimed at Indian SMBs (We Alll Office).
Audience: Product, HR ops, Engineering (design only — no implementation in this document)
Status: Design proposal — not implemented
Last Updated: 2026-07-27
---

# Payroll V2 — Simplified Model for We Alll Office

## One-line goal

Build the **easiest payroll system an Indian SMB HR person can learn in under one hour** — while keeping the product **enterprise-grade inside** (audit, permissions, month control, approvals).

**We are not SAP.**  
**We are not a component-catalog payroll engine for this phase.**

---

# 1. Payroll philosophy

Everything revolves around this equation:

```text
Monthly Salary
  − Automatic Payroll Deductions
  + Manual Adjustments (can be + or −)
  − TDS
  ─────────────
  = Net Salary
```

### Meaning in plain English

| Piece | Meaning |
|-------|---------|
| **Monthly Salary** | One agreed amount for the employee for a full month |
| **Automatic deductions** | System-calculated (mainly attendance / LWP / policy recommendations applied) |
| **Manual adjustments** | HR-approved money changes for that month (bonus, penalty, advance recovery, etc.) |
| **TDS** | Tax deducted at source when enabled |
| **Net Salary** | What should hit the employee’s bank |

HR should **never** manually calculate salary on paper. The system calculates; HR reviews and adjusts with reasons.

---

# 2. What we deliberately remove (for now)

Do **not** require these as first-class salary fields:

- HRA  
- DA  
- Medical allowance  
- Travel allowance  
- Food allowance  
- Special allowance  
- City allowance  
- Complex earning/deduction component catalogs  

These may return later as **optional expansion** (see §10). For SMB launch, **Monthly Salary is enough**.

---

# 3. Salary structure (simplified)

An employee’s salary structure contains **only**:

| Field | Purpose |
|-------|---------|
| **Monthly Salary** | Agreed full-month CTC/salary amount for payroll (company-defined meaning: typically gross monthly pay for this model) |
| **Effective Date** | From when this amount applies |
| **Status** | Draft / Active / Superseded (or equivalent) |
| **TDS Enabled** | Yes / No — whether TDS is applied in payroll |
| **Remarks** | Free text (offer note, increment note, etc.) |

### Business rules

1. Only **one Active** structure per employee at a time (new active supersedes previous).  
2. Mid-month effective date → system may **pro-rate** Monthly Salary for that month (see §5).  
3. No HRA/% formulas required to create a structure.  
4. Changing Monthly Salary after slips are locked for a month does **not** silently rewrite paid history.

---

# 4. Automatic calculations (system does; HR does not)

For each employee + payroll month, the system automatically derives:

| Output | Meaning |
|--------|---------|
| Working Days | Payable working days in the month (company calendar / policy) |
| Present Days | Days present (from attendance) |
| Approved Leave Without Pay | Unpaid / LWP / LOP leave days approved |
| Approved Overtime | OT recognized by policy (hours or days equivalent — product detail later) |
| Monthly Salary | From active structure (or pro-rated base) |
| Per Day Salary | See §5 |
| Gross Salary | Pay before TDS, after automatic attendance effects and before/with adjustments per §6 formula order |
| TDS | If TDS Enabled |
| Net Salary | Final payable |

### Principles

- HR **reviews** numbers; HR does **not** type “per day × days” by hand.  
- All automatic lines must be **explainable** (“why was ₹X deducted?”).  
- If attendance data is incomplete, system should **warn**, not silently invent presence.

---

# 5. Per day salary

### Default formula

```text
Per Day Salary = Monthly Salary ÷ 30
```

### Rules

1. Default divisor is **30** (common Indian SMB simplification).  
2. Must be **configurable later** (e.g. calendar days, working days) without changing the philosophy.  
3. Late-day deductions and “deduct 1 day / 2 days” use this same Per Day Salary unless HR is permitted to enter a **custom amount**.

### Pro-rata (join / exit / structure change)

Recommended simple rule for SMB:

```text
Payable Monthly Base = Per Day Salary × Payable Days in Month
```

Exact “payable days” definition (calendar vs working) is a company setting — default can stay **30-day month model** for v1 simplicity.

---

# 6. Salary formula (canonical order)

For one employee in one month:

### Step A — Start from Monthly Salary (or pro-rated monthly base)

```text
Base Pay = Monthly Salary   (or pro-rated base if applicable)
```

### Step B — Automatic payroll deductions

Examples (system-generated):

- Leave without pay / LOP days × Per Day Salary  
- Applied late policy deduction (if HR accepted recommendation — see §8)  
- Other automatic policy deductions enabled by company  

```text
Subtotal after auto = Base Pay − Automatic Deductions
```

### Step C — Manual adjustments

Sum of approved adjustments for that employee + month:

- Positive types add  
- Negative types subtract  

```text
Subtotal after adjustments = Subtotal after auto + Σ(Manual Adjustments)
```

### Step D — TDS

If **TDS Enabled**:

```text
TDS Amount = f(company TDS rule, taxable base)  
```

For SMB v1, TDS may be:

- **Fixed monthly amount** on structure, or  
- **Simple % of Subtotal after adjustments**, or  
- **Manual TDS adjustment** only  

(Exact TDS method is a company setting; must stay simple.)

If TDS not enabled → TDS Amount = 0.

### Step E — Net

```text
Net Salary = Subtotal after adjustments − TDS Amount
```

### Guardrails

1. **Net Salary cannot be negative** without a hard stop or explicit override permission + reason.  
2. Every automatic and manual line appears on Preview with expand/collapse sections.  
3. Rounding: prefer **nearest rupee** for SMB clarity (document paise policy later if needed).

---

# 7. Manual payroll adjustments

### Why this exists

SMB reality: bonus, penalties, advance recovery, one-off corrections.  
These must **not** be buried inside fake “allowance fields.” They are first-class **month-scoped adjustments**.

### Identity

Every adjustment belongs to:

- **One employee**  
- **One payroll month** (month + year)  
- Optionally linked to a preview/slip once generated  

### Adjustment types

| Type | Typical sign | Example |
|------|--------------|---------|
| Bonus | + | Festival bonus |
| Incentive | + | Target incentive |
| Advance Recovery | − | Recover salary advance |
| Penalty | − | Policy penalty |
| Late Deduction | − | Accepted late policy (or manual) |
| Absent Deduction | − | Extra absent recovery |
| Manual Salary Deduction | − | Catch-all deduction |
| Manual Salary Addition | + | Catch-all addition |
| Other | +/− | Must have clear reason |

### Required fields

| Field | Required |
|-------|----------|
| Type | Yes |
| Amount | Yes (always store signed or store amount + direction — product choice; prefer **amount + direction** for clarity) |
| Reason | Yes (short mandatory text) |
| Remarks | Optional |
| Approved By | Yes before it affects Net (or auto-approved if creator has privilege — see permissions) |
| Created By | Yes |
| Created Date | Yes |
| Audit Log | Yes (append-only) |

### Adjustment rules

1. **Draft → Approved → Applied** (or Rejected). Only **Approved** adjustments affect Net Salary.  
2. After payroll period is **Locked/Paid**, new adjustments require unlock permission + reason.  
3. Editing amount after approval creates audit: previous value → new value.  
4. Deleting is discouraged; prefer **void** with reason (enterprise audit).  
5. Same employee/month may have many adjustments.  
6. Late policy acceptance **creates** a Late Deduction adjustment (see §8) — not a silent hidden calc.

---

# 8. Special feature — Late attendance policy

### Idea

Attendance policy may **recommend** a deduction. HR decides. System calculates when HR picks day-based options.

### Example recommendation

```text
3 Late Marks  →  Recommend: Deduct 1 Day Salary
```

### HR choices

| Choice | System behaviour |
|--------|------------------|
| **No Deduction** | No late adjustment created |
| **Deduct 1 Day** | Create Late Deduction amount = `Monthly Salary ÷ 30` |
| **Deduct 2 Days** | Create Late Deduction amount = `(Monthly Salary ÷ 30) × 2` |
| **Custom Amount** | HR enters rupees (only if permitted) |

### Rules

1. Recommendation is **advisory**, not auto-applied without HR action (SMB trust + fairness).  
2. When HR selects 1 Day / 2 Days, amount is **system-calculated** from Per Day Salary.  
3. **Custom Amount** requires permission (`payroll.adjustment.override` or similar).  
4. Creating the adjustment writes full audit (who, when, recommendation shown, choice, amount).  
5. Changing choice later = void previous late adjustment + create new (audited), if period still open.  
6. Multiple late policies in one month should produce **clear separate lines** or one consolidated late line with breakdown in remarks — prefer **one clear Late Deduction line** with reason text listing marks.

---

# 9. Payroll screen (Preview experience)

During **Preview**, HR must clearly see expandable sections:

1. **Monthly Salary** (and pro-rata note if any)  
2. **Automatic Deductions** (each line: type, days/hours, amount, source)  
3. **Manual Adjustments** (each approved/pending line)  
4. **TDS**  
5. **Final Net Salary** (always visible, highlighted)

### UX principles (business, not visual design)

- Net is never buried.  
- Every deduction answers “why?” in one click/expand.  
- Pending (unapproved) adjustments shown but **not** included in Net until approved.  
- Warnings: missing attendance, no active structure, negative net risk, TDS enabled but rule missing.

---

# 10. Audit requirements

Every manual adjustment (and late-policy decision) must record:

| Audit field | Required |
|-------------|----------|
| Who created | Yes |
| Who approved | Yes (when approval applies) |
| When created / approved | Yes |
| Reason | Yes |
| Previous value | Yes on change |
| New value | Yes on change |
| Employee + month | Yes |
| Recommendation context (for late policy) | Yes when applicable |

Audit is **append-only**. No silent edits.

Automatic calculations should also be reproducible: store inputs snapshot (monthly salary, per day, LOP days, etc.) on preview/slip so disputes can be explained later.

---

# 11. Workflow (monthly, SMB-simple)

Aligned with payday style cycle (example: work in January, pay on 10 February):

```text
1. Keep Salary Structures updated (Monthly Salary + TDS flag)
2. Open Pay Period for the month
3. Attendance & leave settle
4. System builds Preview (auto calcs + recommendations)
5. HR reviews late recommendations → creates/accepts adjustments
6. HR adds other manual adjustments → get approval if required
7. HR confirms Preview Net
8. Generate official slips from Preview
9. Approvals (HR → Finance as needed)
10. Export bank file
11. Mark paid / close period
```

### Role feel

- **HR:** review + adjustments + generate  
- **Finance:** approve money out + export comfort  
- **Employee:** see payslip / raise query  
- **Admin:** permissions + rare unlock  

---

# 12. Permission matrix

| Capability | HR Executive | HR Manager | Finance | Accounts | Employee | Super Admin |
|------------|:------------:|:----------:|:-------:|:--------:|:--------:|:-----------:|
| View own payslip | | | | | ✓ | ✓ |
| Manage salary structures (Monthly Salary) | ✓ | ✓ | view | | | ✓ |
| Open/freeze pay period | ✓ | ✓ | | | | ✓ |
| Lock / unlock period | | ✓ | ✓ | | | ✓ |
| Run preview / generate slips | ✓ | ✓ | | | | ✓ |
| Create manual adjustments | ✓ | ✓ | | | | ✓ |
| Approve manual adjustments | | ✓ | ✓ | | | ✓ |
| Accept late recommendation (1/2 day) | ✓ | ✓ | | | | ✓ |
| Custom late amount / override calc | | ✓ | ✓ | | | ✓ |
| Approve payroll for bank | | ✓ | ✓ | | | ✓ |
| Export bank / registers | | view | ✓ | ✓ | | ✓ |
| Mark paid | | ✓ | ✓ | ✓ | | ✓ |
| View full audit log | ✓ | ✓ | ✓ | ✓ | | ✓ |

Exact role names can map to We Alll permissions later; this matrix is the **business intent**.

---

# 13. Business rules (summary checklist)

1. Monthly Salary is the only required pay input on structure.  
2. Net = Monthly path − automatic −/+ manual − TDS.  
3. Per Day = Monthly ÷ 30 by default.  
4. HR never hand-calculates net.  
5. Adjustments are month + employee scoped and audited.  
6. Late policy recommends; HR decides; day options auto-amount.  
7. Custom amounts need elevated permission.  
8. Locked/paid periods block casual changes.  
9. Negative net blocked or specially authorized.  
10. Preview must show five clear money sections.  
11. No mandatory HRA/DA/allowance fields in this phase.  
12. One active structure per employee.

---

# 14. Future expansion strategy

Stay simple now; grow without rewriting philosophy.

| Phase | Add | Without breaking SMB model |
|-------|-----|----------------------------|
| **Now** | Monthly Salary + auto attendance effects + adjustments + TDS flag + audit + periods | Core |
| **Next** | Configurable day divisor; simple TDS %; OT as auto earning adjustment | Settings |
| **Later** | Optional component packs (HRA etc.) as **add-ons**, default off | Advanced mode |
| **Later** | Statutory employer PF/ESI as reporting lines (CTC view) | Parallel to Net |
| **Later** | Multi-state PT rules | Compliance pack |
| **Never required for SMB** | Full SAP-style wage types on day one | — |

### Expansion rule

New complexity must be **optional**, behind “Advanced compensation”, defaulting to the simple Monthly Salary model for new companies.

---

# 15. Relationship to current Salary Management tabs

This model **simplifies meaning**, not necessarily deleting screens overnight:

| Today’s tab | Role under simplified model |
|-------------|-----------------------------|
| Templates | Optional starter for Monthly Salary only |
| Salary Structures | Monthly Salary + TDS + dates |
| Pay Periods | Keep (month lock) |
| Salary Previews | Main HR review screen (expandable sections) |
| Generate / Slips | Keep, driven by preview |
| Approvals | Keep for money control |
| Exports | Keep for bank |
| Reports | Keep, simpler KPIs |
| **New** | Payroll Adjustments (could be panel inside Preview) |

Implementation is **out of scope** for this document.

---

# 16. Success criteria

This design succeeds if:

1. A new HR Executive can explain Net Salary using the philosophy equation in **under 5 minutes**.  
2. Creating a structure takes **under 2 minutes** (no allowance maze).  
3. Late deduction is a **clear choice**, not a mystery number.  
4. Every rupee on the payslip is **traceable**.  
5. Finance trusts audit + period lock.  
6. We Alll remains differentiated as **SMB-simple**, not SAP-heavy.

---

# 17. Explicit non-goals (this phase)

- Full Indian statutory engine (EPFO/ESIC state machine) as mandatory  
- Dozens of wage components  
- Formula language for HR users  
- Replacing attendance/leave systems (integrate, don’t rebuild)  

---

*End of simplified payroll business model.*  
*Status: Design only — do not treat as shipped behaviour until implemented and signed off.*
