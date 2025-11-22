import mongoose from "mongoose";
import dotenv from "dotenv";
import Policy from "../models/policyModel.js";
import User from "../models/userModel.js";

dotenv.config();

const policies = [
  {
    title: "Work From Home Policy",
    description: "Guidelines for remote work arrangements, eligibility criteria, and expectations for employees working from home.",
    content: `# Work From Home Policy

## Purpose
This policy outlines the guidelines and expectations for employees who work from home on a regular or occasional basis.

## Eligibility
- Employees must have completed their probation period
- Role must be suitable for remote work
- Manager approval required

## Requirements
1. **Work Hours**: Maintain regular business hours (9 AM - 6 PM)
2. **Availability**: Be available on company communication channels
3. **Equipment**: Use company-provided equipment for work
4. **Internet**: Maintain stable internet connection (minimum 10 Mbps)
5. **Workspace**: Dedicated, quiet workspace free from distractions

## Communication
- Attend all scheduled meetings via video conference
- Respond to emails within 2 hours during business hours
- Update status on communication platforms

## Security
- Use VPN for accessing company resources
- Do not share work devices with family members
- Lock devices when not in use
- Report any security incidents immediately

## Performance
- Meet all deadlines and deliverables
- Maintain same productivity levels as office work
- Regular check-ins with manager

## Equipment
Company will provide:
- Laptop
- Headset
- VPN access
- Required software licenses

Employee responsible for:
- Internet connection
- Workspace setup
- Electricity costs

## Termination
This arrangement can be terminated by either party with 2 weeks notice.`,
    category: "hr",
    priority: "high",
    status: "active",
    version: "2.0",
    tags: ["remote", "wfh", "flexibility"]
  },
  {
    title: "Information Security Policy",
    description: "Critical security guidelines to protect company data, systems, and information assets from unauthorized access and breaches.",
    content: `# Information Security Policy

## Overview
This policy establishes the requirements for protecting company information and IT assets.

## Password Requirements
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and special characters
- Change every 90 days
- No password reuse for last 5 passwords
- Enable two-factor authentication (2FA) on all accounts

## Data Classification
**Confidential**: Customer data, financial records, trade secrets
**Internal**: Employee information, internal communications
**Public**: Marketing materials, public website content

## Access Control
- Access granted on need-to-know basis
- Review access rights quarterly
- Revoke access immediately upon termination
- No sharing of credentials

## Device Security
- Install company-approved antivirus software
- Enable full disk encryption
- Keep OS and software updated
- Lock screen after 5 minutes of inactivity
- Report lost/stolen devices within 1 hour

## Email Security
- Verify sender before opening attachments
- Do not click suspicious links
- Report phishing attempts to IT
- Use encryption for sensitive data

## Data Handling
- Do not store company data on personal devices
- Use approved cloud storage only
- Encrypt sensitive data in transit and at rest
- Shred physical documents containing sensitive information

## Incident Reporting
Report security incidents immediately to:
- IT Security Team: security@company.com
- Phone: ext. 5555
- Available 24/7

## Violations
Security policy violations may result in:
- Warning
- Suspension
- Termination
- Legal action

## Training
All employees must complete annual security awareness training.`,
    category: "security",
    priority: "critical",
    status: "active",
    version: "3.1",
    tags: ["security", "data protection", "compliance"]
  },
  {
    title: "Leave and Time Off Policy",
    description: "Comprehensive policy covering all types of leaves including casual, sick, vacation, and special leaves with application procedures.",
    content: `# Leave and Time Off Policy

## Leave Entitlements (Annual)

### Casual Leave
- 12 days per year
- Can be taken for personal reasons
- Minimum 1 day notice required
- Maximum 3 consecutive days

### Sick Leave
- 10 days per year
- Medical certificate required for 3+ consecutive days
- Can be taken without prior notice in emergencies
- Unused sick leave does not carry forward

### Vacation Leave
- 15 days per year
- Minimum 7 days notice required
- Maximum 10 consecutive days
- Must be approved by manager
- Can be carried forward (max 5 days)

### Special Leaves

**Maternity Leave**: 26 weeks (paid)
**Paternity Leave**: 2 weeks (paid)
**Bereavement Leave**: 5 days (paid)
**Marriage Leave**: 5 days (paid)
**Adoption Leave**: 12 weeks (paid)

## Application Process
1. Submit leave request through HRMS portal
2. Manager approval required
3. HR notification automatic
4. Minimum notice periods must be followed

## Leave Balance
- Check balance in HRMS portal
- Updated monthly
- Prorated for new joiners

## Holidays
- 10 public holidays per year
- List published at year start
- May vary by location

## Unpaid Leave
- Available after exhausting paid leave
- Requires special approval
- Affects salary and benefits

## Leave Encashment
- Unused vacation leave can be encashed
- Maximum 5 days per year
- Processed with December salary

## Cancellation
- Can cancel approved leave with 24 hours notice
- Emergency cancellations accepted

## Violations
- Unauthorized absence treated as leave without pay
- Repeated violations may lead to disciplinary action`,
    category: "leave",
    priority: "high",
    status: "active",
    version: "2.5",
    tags: ["leave", "time off", "vacation", "benefits"]
  },
  {
    title: "Code of Conduct",
    description: "Expected standards of behavior, ethics, and professional conduct for all employees in the workplace.",
    content: `# Code of Conduct

## Core Values
- Integrity
- Respect
- Excellence
- Collaboration
- Innovation

## Professional Behavior

### Respect and Dignity
- Treat everyone with respect
- No discrimination based on race, gender, religion, age, or disability
- No harassment or bullying
- Value diverse perspectives

### Honesty and Integrity
- Be truthful in all communications
- No conflicts of interest
- Report unethical behavior
- Protect company reputation

### Professionalism
- Dress appropriately for your role
- Maintain punctuality
- Meet commitments and deadlines
- Communicate professionally

## Workplace Conduct

### Prohibited Behaviors
- Violence or threats
- Substance abuse
- Theft or fraud
- Sexual harassment
- Discrimination
- Bullying or intimidation
- Misuse of company resources

### Confidentiality
- Protect confidential information
- No disclosure to unauthorized parties
- Respect privacy of colleagues
- Follow data protection policies

### Conflicts of Interest
- Disclose potential conflicts
- No personal gain from company business
- No competing business activities
- Transparent decision-making

## Social Media
- Do not speak on behalf of company without authorization
- Respect confidentiality online
- Be professional in online interactions
- Follow social media policy

## Gifts and Entertainment
- Modest gifts acceptable (under $50)
- Declare gifts over $50
- No gifts that create obligations
- No cash gifts

## Reporting Violations
- Report to manager or HR
- Anonymous hotline available: 1-800-ETHICS
- Email: ethics@company.com
- No retaliation for good faith reports

## Consequences
Violations may result in:
- Verbal warning
- Written warning
- Suspension
- Termination
- Legal action

## Acknowledgment
All employees must acknowledge understanding of this code annually.`,
    category: "code-of-conduct",
    priority: "critical",
    status: "active",
    version: "4.0",
    tags: ["ethics", "conduct", "behavior", "compliance"]
  },
  {
    title: "Attendance and Punctuality Policy",
    description: "Guidelines for work hours, attendance tracking, late arrivals, and procedures for reporting absences.",
    content: `# Attendance and Punctuality Policy

## Work Hours
**Standard Hours**: 9:00 AM - 6:00 PM (Monday to Friday)
**Lunch Break**: 1 hour (flexible timing)
**Total Hours**: 40 hours per week

## Flexible Hours
- Core hours: 10:00 AM - 4:00 PM (must be present)
- Flexible start: 8:00 AM - 10:00 AM
- Flexible end: 5:00 PM - 7:00 PM
- Manager approval required

## Clock In/Out
- Use HRMS system to clock in/out
- Clock in within 15 minutes of start time
- Clock out after completing work hours
- Biometric/mobile app available

## Late Arrival
- Grace period: 15 minutes
- 3 late arrivals = 1 day leave deduction
- Inform manager if running late
- Repeated lateness may lead to disciplinary action

## Early Departure
- Requires manager approval
- Must complete minimum 8 hours
- Deducted from leave balance if unapproved

## Breaks
- 1 hour lunch break
- Two 15-minute breaks
- Breaks not counted in work hours

## Absence Reporting
- Inform manager before start time
- Update in HRMS system
- Provide reason for absence
- Medical certificate if required

## Overtime
- Pre-approval required
- Compensatory off for 8+ hours overtime
- Overtime pay as per policy
- Maximum 10 hours per week

## Remote Work Attendance
- Same clock in/out requirements
- Be available during core hours
- Attend all scheduled meetings
- Maintain communication

## Tracking
- Attendance tracked daily
- Monthly reports generated
- Reviewed by HR and managers
- Discrepancies must be resolved within 7 days

## Perfect Attendance
Rewards for perfect attendance:
- Monthly: Certificate of appreciation
- Quarterly: Gift voucher ($50)
- Annual: Extra day off + bonus

## Violations
**Minor**: Verbal warning
**Moderate**: Written warning + leave deduction
**Severe**: Suspension or termination

## Exceptions
- Medical emergencies
- Family emergencies
- Natural disasters
- Company-approved events`,
    category: "attendance",
    priority: "high",
    status: "active",
    version: "1.8",
    tags: ["attendance", "punctuality", "work hours"]
  },
  {
    title: "Health and Safety Policy",
    description: "Workplace health and safety guidelines, emergency procedures, and employee wellness programs.",
    content: `# Health and Safety Policy

## Commitment
Company is committed to providing a safe and healthy work environment for all employees.

## Responsibilities

### Employer
- Provide safe workplace
- Conduct risk assessments
- Provide safety training
- Maintain safety equipment
- Investigate incidents

### Employee
- Follow safety procedures
- Use safety equipment
- Report hazards
- Attend safety training
- Take care of own health

## Workplace Safety

### General Rules
- Keep workspace clean and organized
- No blocking emergency exits
- Report spills immediately
- Use equipment properly
- Wear appropriate footwear

### Ergonomics
- Adjust chair and desk height
- Position monitor at eye level
- Take regular breaks
- Use ergonomic accessories
- Report discomfort early

### Fire Safety
- Know evacuation routes
- Attend fire drills
- Do not use elevators during fire
- Assembly point: Main parking lot
- Fire extinguishers on each floor

## Emergency Procedures

### Medical Emergency
1. Call emergency services (911)
2. Notify first aid officer
3. Do not move injured person
4. Provide first aid if trained
5. Report to HR

### Evacuation
1. Remain calm
2. Use nearest exit
3. Help others if safe
4. Go to assembly point
5. Wait for all-clear

### First Aid
- First aid kits on each floor
- Trained first aiders available
- Emergency numbers posted
- AED available in reception

## Health Programs

### Wellness Initiatives
- Annual health checkup (free)
- Gym membership subsidy
- Mental health support
- Nutrition counseling
- Yoga classes

### Mental Health
- Employee Assistance Program (EAP)
- Confidential counseling
- Stress management workshops
- Work-life balance support
- Contact: wellness@company.com

## COVID-19 Protocols
- Vaccination encouraged
- Masks optional
- Hand sanitizers available
- Enhanced cleaning
- Work from home if unwell

## Incident Reporting
Report all incidents within 24 hours:
- Injuries
- Near misses
- Property damage
- Safety hazards

**Report to**: safety@company.com or ext. 5566

## Training
- Safety orientation for new employees
- Annual refresher training
- Specialized training for high-risk roles
- Emergency response drills

## Inspections
- Monthly safety inspections
- Annual external audit
- Immediate action on findings

## Violations
Failure to follow safety procedures may result in disciplinary action.`,
    category: "health-safety",
    priority: "critical",
    status: "active",
    version: "2.2",
    tags: ["health", "safety", "wellness", "emergency"]
  },
  {
    title: "IT Usage and Acceptable Use Policy",
    description: "Guidelines for appropriate use of company IT resources, internet, email, and software.",
    content: `# IT Usage and Acceptable Use Policy

## Scope
This policy applies to all company IT resources including computers, networks, email, internet, and software.

## Acceptable Use

### General Principles
- Use IT resources for business purposes
- Limited personal use acceptable
- Respect others' privacy
- Comply with all laws and regulations
- Protect company assets

### Email Usage
- Professional communication only
- No spam or chain letters
- Appropriate subject lines
- Limit attachment sizes (max 10MB)
- Use BCC for mass emails

### Internet Usage
- Primarily for work-related activities
- Brief personal use acceptable during breaks
- No excessive bandwidth consumption
- No illegal downloads

### Software
- Use only licensed software
- No unauthorized installations
- Request software through IT
- No pirated software
- Keep software updated

## Prohibited Activities

### Strictly Forbidden
- Accessing illegal content
- Downloading pirated software
- Hacking or unauthorized access
- Creating/spreading malware
- Cryptocurrency mining
- Gambling websites
- Adult content
- Harassment or bullying online

### Data Protection
- No sharing of credentials
- No unauthorized data copying
- No personal use of company data
- Encrypt sensitive information
- Use secure file transfer methods

## Social Media
- Do not represent company without authorization
- Respect confidentiality
- Be professional
- Follow social media policy
- Disclose affiliation when discussing company

## Mobile Devices
- Secure with password/biometric
- Install company security apps
- No jailbreaking/rooting
- Report if lost/stolen
- Separate work and personal data

## Monitoring
Company reserves the right to:
- Monitor internet usage
- Review email communications
- Track system access
- Audit software installations
- Investigate policy violations

**No expectation of privacy on company systems**

## BYOD (Bring Your Own Device)
If using personal devices for work:
- Install security software
- Enable remote wipe
- Keep OS updated
- Separate work and personal data
- Follow all security policies

## Cloud Services
- Use only approved cloud services
- No storing company data on personal cloud
- Approved services: Google Drive, Dropbox Business
- Enable 2FA on all cloud accounts

## Printing
- Print only when necessary
- Use duplex printing
- Collect prints immediately
- Shred confidential documents
- No personal printing of large documents

## Support
IT Support available:
- Email: itsupport@company.com
- Phone: ext. 5500
- Hours: 9 AM - 6 PM (Mon-Fri)
- Emergency: 24/7 hotline

## Violations
Violations may result in:
- Warning
- Suspension of IT privileges
- Termination
- Legal action

## Acknowledgment
All users must acknowledge this policy before accessing IT resources.`,
    category: "it",
    priority: "high",
    status: "active",
    version: "3.0",
    tags: ["IT", "technology", "internet", "email", "security"]
  },
  {
    title: "Expense Reimbursement Policy",
    description: "Guidelines for business expense claims, reimbursement procedures, and approved expense categories.",
    content: `# Expense Reimbursement Policy

## Purpose
This policy outlines the process for reimbursing employees for business-related expenses.

## Eligible Expenses

### Travel
- Airfare (economy class)
- Train/bus tickets
- Taxi/ride-sharing (when necessary)
- Rental cars (with approval)
- Parking fees
- Tolls

### Accommodation
- Hotel stays (up to $150/night)
- Must be for business travel
- Reasonable location
- Standard room only

### Meals
- Business meals with clients
- Meals during business travel
- Limits:
  - Breakfast: $15
  - Lunch: $25
  - Dinner: $40
- Alcohol: Up to $20 with meal

### Communication
- Business phone calls
- Internet charges during travel
- Courier services

### Office Supplies
- Stationery (with approval)
- Books related to work
- Professional subscriptions

### Professional Development
- Conference fees
- Training courses (approved)
- Professional memberships
- Certification exams

## Non-Reimbursable Expenses
- Personal entertainment
- Minibar charges
- Personal shopping
- Traffic violations
- Excessive meal costs
- First-class travel (without approval)
- Spouse/family travel expenses

## Submission Process

### Requirements
1. Submit within 30 days of expense
2. Original receipts required
3. Use expense management system
4. Provide business justification
5. Manager approval needed

### Documentation
- Itemized receipts
- Date and location
- Business purpose
- Names of attendees (for meals)
- Project/client code

### Approval Workflow
1. Employee submits claim
2. Manager reviews and approves
3. Finance verifies
4. Payment processed
5. Reimbursement in next payroll

## Payment Timeline
- Approved claims: 7-10 business days
- Payment via direct deposit
- Check status in expense portal

## Corporate Credit Card
For frequent travelers:
- Apply through Finance
- Use only for business expenses
- Submit receipts within 7 days
- Reconcile monthly
- Personal use prohibited

## Per Diem
For extended travel (5+ days):
- Daily allowance instead of receipts
- Rates vary by location
- Covers meals and incidentals
- Accommodation separate

### Per Diem Rates
- Domestic: $75/day
- International: $100/day
- Major cities: $125/day

## Mileage Reimbursement
Personal vehicle for business:
- $0.58 per mile
- Submit mileage log
- Include start/end locations
- Business purpose required
- Not for commuting

## Advances
For large expenses:
- Request 2 weeks in advance
- Maximum $2,000
- Reconcile within 7 days of return
- Return unused amount

## Currency Conversion
- Use company exchange rate
- Attach conversion receipt
- Credit card rate acceptable

## Violations
Fraudulent claims will result in:
- Immediate termination
- Repayment of all fraudulent amounts
- Possible legal action

## Questions
Contact Finance:
- Email: finance@company.com
- Phone: ext. 5400
- Hours: 9 AM - 5 PM`,
    category: "finance",
    priority: "medium",
    status: "active",
    version: "2.3",
    tags: ["finance", "expenses", "reimbursement", "travel"]
  },
  {
    title: "Performance Review and Appraisal Policy",
    description: "Annual performance evaluation process, rating criteria, feedback mechanisms, and promotion guidelines.",
    content: `# Performance Review and Appraisal Policy

## Overview
Regular performance reviews ensure employees receive feedback and recognition for their contributions.

## Review Cycle

### Annual Review
- Conducted every December
- Comprehensive evaluation
- Salary review included
- Promotion consideration

### Mid-Year Review
- Conducted in June
- Progress check
- Goal adjustment
- Development planning

### Probation Review
- 3-month review for new hires
- Confirmation decision
- Extension if needed

## Review Process

### Self-Assessment
- Employee completes self-review
- Highlight achievements
- Identify challenges
- Set goals
- Due 1 week before review meeting

### Manager Assessment
- Evaluate performance
- Provide specific examples
- Rate against objectives
- Identify development needs

### Review Meeting
- One-on-one discussion
- Review achievements
- Discuss challenges
- Set new goals
- Development plan
- Duration: 60-90 minutes

## Rating Scale
**5 - Outstanding**: Consistently exceeds expectations
**4 - Exceeds Expectations**: Regularly surpasses goals
**3 - Meets Expectations**: Achieves all objectives
**2 - Needs Improvement**: Some objectives not met
**1 - Unsatisfactory**: Significant improvement needed

## Evaluation Criteria

### Performance (60%)
- Goal achievement
- Quality of work
- Productivity
- Initiative
- Problem-solving

### Competencies (30%)
- Technical skills
- Communication
- Teamwork
- Leadership
- Adaptability

### Values (10%)
- Integrity
- Respect
- Innovation
- Customer focus

## Goal Setting
- SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
- 3-5 major goals per year
- Aligned with company objectives
- Quarterly progress reviews

## Feedback

### Continuous Feedback
- Regular check-ins (monthly)
- Real-time feedback encouraged
- Both positive and constructive
- Documented in system

### 360-Degree Feedback
- For senior roles
- Input from peers, subordinates, managers
- Anonymous feedback
- Used for development

## Development Plans

### Individual Development Plan (IDP)
- Identify skill gaps
- Training needs
- Career aspirations
- Timeline and milestones
- Manager support

### Training Opportunities
- Internal workshops
- External courses
- Conferences
- Certifications
- Mentoring programs

## Salary Review
- Based on performance rating
- Market benchmarking
- Budget constraints
- Effective from January

### Increment Guidelines
- Outstanding: 12-15%
- Exceeds: 8-12%
- Meets: 5-8%
- Needs Improvement: 0-3%
- Unsatisfactory: No increment

## Promotion
### Criteria
- Consistent high performance (2+ years)
- Demonstrated leadership
- Skill development
- Business need
- Manager recommendation

### Process
- Nomination by manager
- Panel review
- Interview (for senior roles)
- Approval by leadership
- Announcement

## Performance Improvement Plan (PIP)
For underperformance:
- 90-day improvement plan
- Clear objectives
- Regular monitoring
- Support provided
- Outcome: Improvement or termination

## Documentation
- All reviews documented in HRMS
- Accessible to employee
- Confidential
- Retained for 7 years

## Appeals
If disagreeing with review:
- Discuss with manager first
- Escalate to HR if unresolved
- Review by senior management
- Decision final

## Timeline
- November: Self-assessment
- December: Review meetings
- January: Salary adjustments
- February: Promotions effective`,
    category: "hr",
    priority: "medium",
    status: "active",
    version: "3.5",
    tags: ["performance", "appraisal", "review", "promotion", "development"]
  },
  {
    title: "Data Privacy and GDPR Compliance Policy",
    description: "Guidelines for handling personal data, privacy rights, and compliance with data protection regulations.",
    content: `# Data Privacy and GDPR Compliance Policy

## Purpose
Ensure compliance with data protection laws and protect personal information.

## Scope
Applies to all personal data processed by the company, including:
- Employee data
- Customer data
- Vendor data
- Website visitors

## Principles

### Lawfulness and Transparency
- Process data lawfully
- Inform individuals about data use
- Obtain consent when required
- Clear privacy notices

### Purpose Limitation
- Collect data for specific purposes
- Do not use for incompatible purposes
- Document processing purposes

### Data Minimization
- Collect only necessary data
- Do not collect excessive information
- Regular data audits

### Accuracy
- Keep data accurate and up-to-date
- Allow corrections
- Verify data quality

### Storage Limitation
- Retain data only as long as necessary
- Define retention periods
- Secure deletion procedures

### Security
- Implement appropriate security measures
- Protect against unauthorized access
- Encryption for sensitive data
- Regular security assessments

## Individual Rights

### Right to Access
- Individuals can request their data
- Provide copy within 30 days
- Free of charge (first request)

### Right to Rectification
- Correct inaccurate data
- Complete incomplete data
- Respond within 30 days

### Right to Erasure
- "Right to be forgotten"
- Delete data when no longer needed
- Exceptions apply (legal obligations)

### Right to Restrict Processing
- Limit how data is used
- While verifying accuracy
- During legal proceedings

### Right to Data Portability
- Provide data in machine-readable format
- Transfer to another controller
- When technically feasible

### Right to Object
- Object to processing
- Particularly for marketing
- Must stop unless compelling reason

## Data Processing

### Consent
- Clear and specific
- Freely given
- Easy to withdraw
- Documented

### Legitimate Interests
- Balance with individual rights
- Document assessment
- Provide opt-out

### Legal Obligations
- Employment law requirements
- Tax and accounting
- Health and safety

## Data Categories

### Personal Data
- Name, email, phone
- Address, date of birth
- Employee ID, job title

### Sensitive Data (Special Category)
- Health information
- Biometric data
- Background checks
- Extra protection required

### Children's Data
- Under 16 requires parental consent
- Extra safeguards
- Limited processing

## Security Measures

### Technical
- Encryption (at rest and in transit)
- Access controls
- Firewalls and antivirus
- Regular backups
- Secure disposal

### Organizational
- Staff training
- Data protection policies
- Incident response plan
- Vendor agreements
- Privacy by design

## Data Breach

### Response Plan
1. Contain the breach
2. Assess the risk
3. Notify authorities (within 72 hours if high risk)
4. Inform affected individuals
5. Document the incident
6. Review and improve

### Reporting
- Report to Data Protection Officer
- Email: dpo@company.com
- Phone: ext. 5577
- Available 24/7

## Third-Party Processing

### Data Processors
- Written agreements required
- Security requirements
- Audit rights
- Liability clauses

### International Transfers
- Adequate protection required
- Standard contractual clauses
- Privacy Shield (US)
- Document transfers

## Employee Responsibilities

### All Employees
- Protect personal data
- Follow security procedures
- Report breaches immediately
- Complete privacy training

### Managers
- Ensure team compliance
- Approve data processing
- Monitor practices
- Support investigations

### Data Protection Officer
- Oversee compliance
- Advise on obligations
- Handle requests
- Liaise with authorities

## Training
- Annual privacy training mandatory
- Role-specific training
- New employee orientation
- Regular updates

## Monitoring
- Regular audits
- Compliance checks
- Risk assessments
- Continuous improvement

## Violations
Breaches may result in:
- Disciplinary action
- Termination
- Regulatory fines
- Legal liability

## Contact
Data Protection Officer:
- Email: dpo@company.com
- Phone: ext. 5577
- Office: Building A, 3rd Floor`,
    category: "security",
    priority: "critical",
    status: "active",
    version: "2.0",
    tags: ["privacy", "GDPR", "data protection", "compliance", "security"]
  }
];

const seedPolicies = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");

    // Find an admin user to assign as creator
    const adminUser = await User.findOne({ role: { $in: ["admin", "superadmin", "hr"] } });
    
    if (!adminUser) {
      console.log("❌ No admin user found. Please create an admin user first.");
      process.exit(1);
    }

    console.log(`📝 Using ${adminUser.name} (${adminUser.role}) as policy creator`);

    // Clear existing policies
    await Policy.deleteMany({});
    console.log("🗑️  Cleared existing policies");

    // Add creator to each policy
    const policiesWithCreator = policies.map(policy => ({
      ...policy,
      createdBy: adminUser._id
    }));

    // Insert policies
    const insertedPolicies = await Policy.insertMany(policiesWithCreator);
    console.log(`✅ Successfully seeded ${insertedPolicies.length} policies`);

    // Display summary
    console.log("\n📊 Policy Summary:");
    const categoryCounts = {};
    insertedPolicies.forEach(policy => {
      categoryCounts[policy.category] = (categoryCounts[policy.category] || 0) + 1;
    });
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} policies`);
    });

    console.log("\n🎉 Policy seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding policies:", error);
    process.exit(1);
  }
};

// Run the seeder
seedPolicies();
