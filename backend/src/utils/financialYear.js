/**
 * Get the current financial year (April to March)
 * This function automatically determines the current financial year based on today's date.
 * Examples:
 * - January 15, 2024 → "2023-2024" (still in previous FY)
 * - April 15, 2024 → "2024-2025" (new FY started)
 * - March 31, 2025 → "2024-2025" (last day of FY)
 * - April 1, 2025 → "2025-2026" (new FY starts)
 * 
 * The system will automatically include new financial years as time progresses.
 * When 2026-2027 starts (April 1, 2026), it will automatically be available.
 * 
 * @returns {string} Financial year in format "2024-2025"
 */
export const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11, where 0 is January

  // Financial year starts in April (month 3, 0-indexed)
  if (currentMonth >= 3) {
    // April to December - current year to next year
    return `${currentYear}-${currentYear + 1}`;
  } else {
    // January to March - previous year to current year
    return `${currentYear - 1}-${currentYear}`;
  }
};

/**
 * Get the financial year for a specific date
 * @param {Date} date - The date to get financial year for
 * @returns {string} Financial year in format "2024-2025"
 */
export const getFinancialYearForDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  if (month >= 3) {
    // April to December
    return `${year}-${year + 1}`;
  } else {
    // January to March
    return `${year - 1}-${year}`;
  }
};

/**
 * Get the date range for a financial year
 * @param {string} financialYear - Financial year in format "2024-2025"
 * @returns {object} Object with startDate and endDate
 */
export const getFinancialYearDateRange = (financialYear) => {
  const [startYear, endYear] = financialYear.split("-").map(Number);
  
  return {
    startDate: new Date(startYear, 3, 1), // April 1st
    endDate: new Date(endYear, 2, 31), // March 31st
  };
};

/**
 * Get all financial years from a start year to current year
 * @param {number} startYear - Starting year (e.g., 2024)
 * @returns {array} Array of financial years
 */
export const getFinancialYears = (startYear = 2024) => {
  const currentFY = getCurrentFinancialYear();
  const [currentStartYear] = currentFY.split("-").map(Number);
  
  const years = [];
  for (let year = startYear; year <= currentStartYear; year++) {
    years.push(`${year}-${year + 1}`);
  }
  
  return years.reverse(); // Most recent first
};
