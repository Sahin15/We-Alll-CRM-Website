/** Public logo paths (served from frontend/public). */
export const BRAND_LOGO_FULL = "/We Alll Office Logo.png";
export const BRAND_LOGO_MINI = "/Wealll_mini.png";
export const BRAND_NAME = "We Alll Office";

/** First year We Alll operated — salary/year pickers must not go earlier. */
export const COMPANY_START_YEAR = 2024;

/** App release version — keep in sync with frontend/backend package.json */
export const APP_VERSION = "5.2.3";
export const APP_VERSION_LABEL = `V ${APP_VERSION}`;

/**
 * Year options from current year down to company start (inclusive).
 * @param {number} [fromYear=COMPANY_START_YEAR]
 * @returns {number[]}
 */
export function getCompanyYearOptions(fromYear = COMPANY_START_YEAR) {
  const currentYear = new Date().getFullYear();
  const start = Math.min(fromYear, currentYear);
  const years = [];
  for (let year = currentYear; year >= start; year -= 1) {
    years.push(year);
  }
  return years;
}
