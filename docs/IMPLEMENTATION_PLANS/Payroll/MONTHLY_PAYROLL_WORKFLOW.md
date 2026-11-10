# Monthly payroll workflow (final — SMB simple + Hub V2)

## Why two tabs under Run payroll?

| Tab | Purpose | Creates preview via |
|-----|---------|---------------------|
| **1 — Build salary breakdown** | Per employee: structure check, attendance, leave balance, LOP, adjustments, **Save salary breakdown** | Simple payroll API (`salaryPreviewApi.generate` from breakdown UI) |
| **2 — Preview queue & credit** | Team list: queries, quick corrections, payment date (steps 2–3), **credit salary** | Does not rebuild breakdown; optional **Bulk generate (working days)** |

The **Confirm working days** popup appears only for **Bulk generate** — it confirms month calendar (total days, Sundays, holidays, working days) before the bulk preview API runs. It does **not** replace **Save salary breakdown** and does not apply leave or adjustments.

## Canonical month (HR)

1. **Compensation** — only long-term salary/internship changes (not monthly LOP).
2. **Run payroll → Build salary breakdown** — each employee: save breakdown.
3. **Run payroll → Preview queue** — resolve employee queries; optional bulk generate only if needed.
4. **Step 2 Confirm** — set **payment date** on the period.
5. **Step 3 Issue** — **Credit salary** → official payslips.
6. **Payslips** — PDF/email; **Finance desk** — export, mark paid when period locked.

## Employee

- **My Salary Preview** — after HR saved breakdown (draft).
- **My Salary Slips** — after HR credited salary.

## Legacy (out of main path)

- **Generate Slips** (allowance engine) under `/salary-management/legacy`.
- Bulk working-days generate without breakdown — legacy-friendly; de-emphasized in Hub V2.
