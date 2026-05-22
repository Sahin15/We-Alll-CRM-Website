/**
 * Company letterhead defaults for HR document generation.
 * Override via environment variables in production.
 */
export const getCompanySettings = () => ({
  legalName: process.env.COMPANY_LEGAL_NAME || "We Alll",
  tagline: process.env.COMPANY_TAGLINE || "Digital Solutions",
  address:
    process.env.COMPANY_ADDRESS ||
    "Kolkata, West Bengal, India",
  email: process.env.COMPANY_HR_EMAIL || "hr@wealll.com",
  phone: process.env.COMPANY_PHONE || "",
  signatoryName: process.env.COMPANY_SIGNATORY_NAME || "HR Manager",
  signatoryTitle: process.env.COMPANY_SIGNATORY_TITLE || "Human Resources",
  website: process.env.COMPANY_WEBSITE || "https://wealll.cloud",
});

export default getCompanySettings;
