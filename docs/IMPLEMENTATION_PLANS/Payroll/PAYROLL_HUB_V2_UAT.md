# Payroll Hub V2 — UAT checklist

Set `VITE_PAYROLL_HUB_V2=true` in frontend env (default on unless `false`).

## HR — Run payroll

- [ ] Open **Payroll hub** → **Run payroll**; period bar changes month/year for all workspaces.
- [ ] **Team previews** tab: Generate previews; row opens detail modal; Actions → Make corrections / Edit salary breakdown.
- [ ] **Salary breakdown** tab: select employee; leave balance / LOP / adjustments; **Save salary breakdown**.
- [ ] Step 2: set payment date on card.
- [ ] Step 3: credit selected employees; slips appear under **Payslips**.

## HR — Compensation

- [ ] **Compensation** roster opens detail page with timeline icons and breadcrumbs.
- [ ] Set / change salary creates new structure segment.

## Finance

- [ ] **Accounts** user lands on **Finance desk** (or navigate manually).
- [ ] Pre-flight checklist reflects payment date, missing slips, period lock.
- [ ] Export and mark paid work when period locked (gates on).

## Employee

- [ ] **My Salary Preview** shows draft stepper and draft disclaimer.
- [ ] **My Salary Slips** shows issued/paid stepper when slips exist.

## Legacy

- [ ] **Legacy tools** route opens structures, generate slips, periods.
- [ ] Set `VITE_PAYROLL_HUB_V2=false` restores previous Salary Management tabs.
