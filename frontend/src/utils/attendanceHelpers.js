/**
 * Convert decimal hours to hours:minutes format
 * @param {number} decimalHours - Hours in decimal format (e.g., 7.86)
 * @returns {string} - Hours in HH:MM format (e.g., "7:52")
 */
export const formatHoursToHHMM = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return "0:00";
  
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Convert decimal hours to readable format with "hrs" suffix
 * @param {number} decimalHours - Hours in decimal format (e.g., 7.86)
 * @returns {string} - Formatted string (e.g., "7:52 hrs")
 */
export const formatWorkHours = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return "0:00 hrs";
  
  return `${formatHoursToHHMM(decimalHours)} hrs`;
};

/**
 * Convert minutes to hours:minutes format
 * @param {number} minutes - Minutes (e.g., 90)
 * @returns {string} - Hours in HH:MM format (e.g., "1:30")
 */
export const formatMinutesToHHMM = (minutes) => {
  if (!minutes || minutes === 0) return "0:00";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};
