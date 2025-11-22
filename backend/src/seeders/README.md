# Policy Seeder

This seeder adds dummy company policies to your database for testing and demonstration purposes.

## What it includes

The seeder creates **10 comprehensive company policies**:

1. **Work From Home Policy** (HR - High Priority)
   - Remote work guidelines and requirements

2. **Information Security Policy** (Security - Critical)
   - Password requirements, data protection, device security

3. **Leave and Time Off Policy** (Leave - High Priority)
   - All leave types, application process, entitlements

4. **Code of Conduct** (Code of Conduct - Critical)
   - Professional behavior, ethics, workplace conduct

5. **Attendance and Punctuality Policy** (Attendance - High Priority)
   - Work hours, clock in/out, overtime rules

6. **Health and Safety Policy** (Health & Safety - Critical)
   - Workplace safety, emergency procedures, wellness programs

7. **IT Usage and Acceptable Use Policy** (IT - High Priority)
   - Email, internet, software usage guidelines

8. **Expense Reimbursement Policy** (Finance - Medium Priority)
   - Travel expenses, meal allowances, reimbursement process

9. **Performance Review and Appraisal Policy** (HR - Medium Priority)
   - Review cycle, rating scale, promotion guidelines

10. **Data Privacy and GDPR Compliance Policy** (Security - Critical)
    - Data protection, individual rights, compliance requirements

## How to run

### Prerequisites
- MongoDB must be running
- `.env` file must be configured with `MONGO_URI`
- At least one admin/HR user must exist in the database

### Run the seeder

From the backend directory:

```bash
npm run seed:policies
```

Or directly:

```bash
node src/seeders/policySeed.js
```

## What happens

1. Connects to MongoDB
2. Finds an admin/HR user to assign as policy creator
3. Clears existing policies (⚠️ Warning: This deletes all current policies!)
4. Inserts 10 new policies
5. Displays summary by category
6. Exits

## Output

You'll see:
```
✅ MongoDB connected
📝 Using John Doe (admin) as policy creator
🗑️  Cleared existing policies
✅ Successfully seeded 10 policies

📊 Policy Summary:
   hr: 2 policies
   security: 3 policies
   leave: 1 policies
   code-of-conduct: 1 policies
   attendance: 1 policies
   health-safety: 1 policies
   it: 1 policies
   finance: 1 policies

🎉 Policy seeding completed successfully!
```

## Viewing the policies

After seeding:
1. Login to the application
2. Navigate to `/employee/policies`
3. Browse all policies
4. Click "View Policy" to see full details

Or check the dashboard at `/employee/dashboard` to see the 3 most recent policies.

## Customization

To modify policies:
1. Edit `backend/src/seeders/policySeed.js`
2. Update the `policies` array
3. Run the seeder again

## Notes

- Policies are marked as "active" status
- All policies have realistic content and formatting
- Priority levels vary (Critical, High, Medium)
- Categories include: HR, IT, Finance, Security, Health & Safety, etc.
- Each policy includes version numbers and tags
