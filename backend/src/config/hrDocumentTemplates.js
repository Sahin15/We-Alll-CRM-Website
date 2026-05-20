/**
 * Post-join HR document templates (employee profile must exist).
 * offer_letter is handled by the Offers module.
 */

export const HR_DOCUMENT_TEMPLATES = {
  joining_letter: {
    slug: "joining_letter",
    name: "Joining Letter",
    category: "joining_letter",
    title: "LETTER OF JOINING",
    onePerEmployee: true,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "designation", label: "Designation", source: "user.designation", required: true },
      { key: "departmentName", label: "Department", source: "user.department.name" },
      { key: "employeeId", label: "Employee ID", source: "user.employeeId" },
      { key: "joiningDate", label: "Joining date", source: "user.joiningDate", type: "date", required: true },
      { key: "reportingManagerName", label: "Reporting manager", source: "user.reportingManager.name" },
      { key: "workLocation", label: "Work location", default: "Kolkata Office" },
      { key: "officeTimings", label: "Office timings", default: "10:00 AM – 7:00 PM, Monday to Saturday" },
      { key: "documentsToBring", label: "Documents to bring", default: "Aadhaar, PAN, educational certificates, previous employment documents, passport-size photographs, and bank details." },
      { key: "customClause", label: "Additional instructions", type: "textarea" },
    ],
  },
  employment_contract: {
    slug: "employment_contract",
    name: "Employment Contract",
    category: "employment_contract",
    title: "EMPLOYMENT AGREEMENT",
    onePerEmployee: true,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "designation", label: "Designation", source: "user.designation", required: true },
      { key: "departmentName", label: "Department", source: "user.department.name" },
      { key: "joiningDate", label: "Start date", source: "user.joiningDate", type: "date", required: true },
      { key: "employmentType", label: "Employment type", source: "user.employmentType" },
      { key: "ctcDisplay", label: "Compensation (text)", default: "" },
      { key: "probationPeriod", label: "Probation period", default: "6 months" },
      { key: "noticePeriod", label: "Notice period", default: "30 days" },
      { key: "workLocation", label: "Work location", default: "Kolkata Office" },
      { key: "customClause", label: "Additional terms", type: "textarea" },
    ],
  },
  nda: {
    slug: "nda",
    name: "Non-Disclosure Agreement",
    category: "nda",
    title: "NON-DISCLOSURE AGREEMENT",
    onePerEmployee: true,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "designation", label: "Designation", source: "user.designation" },
      { key: "joiningDate", label: "Effective date", source: "user.joiningDate", type: "date" },
      { key: "confidentialityTerm", label: "Confidentiality term", default: "during employment and for 2 years thereafter" },
      { key: "customClause", label: "Additional clauses", type: "textarea" },
    ],
  },
  policy_acknowledgment: {
    slug: "policy_acknowledgment",
    name: "Policy Acknowledgment",
    category: "policy_acknowledgment",
    title: "POLICY ACKNOWLEDGMENT",
    onePerEmployee: true,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "designation", label: "Designation", source: "user.designation" },
      { key: "policyList", label: "Policies acknowledged", default: "Code of Conduct, IT & Data Security Policy, Leave Policy, and Anti-Harassment Policy.", type: "textarea" },
      { key: "acknowledgmentDate", label: "Acknowledgment date", type: "date", default: "today" },
    ],
  },
  increment_letter: {
    slug: "increment_letter",
    name: "Increment Letter",
    category: "increment_letter",
    title: "SALARY INCREMENT LETTER",
    onePerEmployee: false,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "designation", label: "Designation", source: "user.designation" },
      { key: "previousCtcDisplay", label: "Previous CTC", required: true },
      { key: "newCtcDisplay", label: "Revised CTC", required: true },
      { key: "effectiveDate", label: "Effective date", type: "date", required: true },
      { key: "incrementReason", label: "Reason", default: "annual performance review" },
    ],
  },
  bonus_letter: {
    slug: "bonus_letter",
    name: "Bonus Letter",
    category: "bonus_letter",
    title: "BONUS LETTER",
    onePerEmployee: false,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "bonusAmountDisplay", label: "Bonus amount", required: true },
      { key: "bonusPeriod", label: "Bonus period", default: "financial year 2025–26" },
      { key: "payoutDate", label: "Payout date", type: "date" },
    ],
  },
  promotion_letter: {
    slug: "promotion_letter",
    name: "Promotion Letter",
    category: "promotion_letter",
    title: "PROMOTION LETTER",
    onePerEmployee: false,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "previousDesignation", label: "Previous designation", required: true },
      { key: "newDesignation", label: "New designation", source: "user.designation", required: true },
      { key: "effectiveDate", label: "Effective date", type: "date", required: true },
      { key: "newCtcDisplay", label: "Revised CTC (optional)" },
    ],
  },
  experience_certificate: {
    slug: "experience_certificate",
    name: "Experience Certificate",
    category: "experience_certificate",
    title: "EXPERIENCE CERTIFICATE",
    onePerEmployee: false,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "designation", label: "Designation", source: "user.designation" },
      { key: "joiningDate", label: "Date of joining", source: "user.joiningDate", type: "date" },
      { key: "relievingDate", label: "Last working day", type: "date", required: true },
      { key: "conductRemark", label: "Conduct", default: "satisfactory" },
    ],
  },
  experience_letter: {
    slug: "experience_letter",
    name: "Experience Letter",
    category: "experience_letter",
    title: "EXPERIENCE CERTIFICATE",
    onePerEmployee: false,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "designation", label: "Designation", source: "user.designation" },
      { key: "joiningDate", label: "Date of joining", source: "user.joiningDate", type: "date" },
      { key: "relievingDate", label: "Last working day", type: "date", required: true },
      { key: "conductRemark", label: "Conduct", default: "satisfactory" },
    ],
  },
  relieving_letter: {
    slug: "relieving_letter",
    name: "Relieving Letter",
    category: "relieving_letter",
    title: "RELIEVING LETTER",
    onePerEmployee: false,
    fields: [
      { key: "employeeName", label: "Employee name", source: "user.name", required: true },
      { key: "employeeId", label: "Employee ID", source: "user.employeeId" },
      { key: "designation", label: "Designation", source: "user.designation" },
      { key: "joiningDate", label: "Date of joining", source: "user.joiningDate", type: "date" },
      { key: "relievingDate", label: "Relieving date", type: "date", required: true },
      { key: "resignationDate", label: "Resignation date", type: "date" },
    ],
  },
};

export const getTemplateBySlug = (slug) => HR_DOCUMENT_TEMPLATES[slug] || null;

export const listPostJoinTemplates = () =>
  Object.values(HR_DOCUMENT_TEMPLATES).map((t) => ({
    slug: t.slug,
    name: t.name,
    category: t.category,
    onePerEmployee: t.onePerEmployee,
    fields: t.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type || "text",
      required: !!f.required,
    })),
  }));

export default HR_DOCUMENT_TEMPLATES;
