/**
 * Timezone Utility - SIMPLIFIED IST Handling
 * 
 * CRITICAL: This system assumes ALL servers (local, production) should operate in IST.
 * We store dates in MongoDB as UTC but always interpret them as IST.
 * 
 * The key is: We don't care about the server's actual timezone.
 * We ALWAYS work with IST dates.
 */

/**
 * Get current time in IST
 * @returns {Date} Current date/time in IST (as Date object)
 */
export function getCurrentISTTime() {
  // Simply return current time
  // The server timezone doesn't matter - we'll interpret everything as IST
  return new Date();
}

/**
 * Get today's date at midnight in IST
 * @param {Date} [date] - Optional date to get midnight for (defaults to today)
 * @returns {Date} Midnight IST for the given date
 */
export function getTodayMidnightIST(date) {
  const targetDate = date || new Date();
  
  // Get the date in IST timezone as YYYY-MM-DD
  const istDateString = targetDate.toLocaleDateString('en-CA', { 
    timeZone: 'Asia/Kolkata' 
  }); // Returns YYYY-MM-DD format
  
  // Create midnight IST by parsing the date string
  const year = parseInt(istDateString.substring(0, 4));
  const month = parseInt(istDateString.substring(5, 7)) - 1; // Month is 0-indexed
  const day = parseInt(istDateString.substring(8, 10));
  
  // Create date in UTC that represents IST midnight
  // IST is UTC+5:30, so we subtract 5:30 hours
  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in milliseconds
  const istMidnight = new Date(utcDate.getTime() - istOffset);
  
  return istMidnight;
}

/**
 * Get IST time components from a Date object
 * @param {Date} date - Date object to convert
 * @returns {Object} { hour, minute, second, totalMinutes }
 */
export function getISTTimeComponents(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  const istTimeString = date.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const [hour, minute, second] = istTimeString.split(':').map(Number);
  const totalMinutes = hour * 60 + minute;
  
  return {
    hour,
    minute,
    second,
    totalMinutes
  };
}

/**
 * Format date to IST string
 * @param {Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted IST date string
 */
export function formatISTDate(date, options = {}) {
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  return date.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Calculate attendance status based on IST clock-in time
 * @param {Date} clockInTime - Clock-in time
 * @returns {string} Status: 'present', 'late', or 'half-day'
 */
export function calculateAttendanceStatus(clockInTime) {
  const { totalMinutes } = getISTTimeComponents(clockInTime);
  
  // Business Rules:
  // - 00:00 to 10:30 IST (0-630 minutes) = Present
  // - 10:31 to 11:59 IST (631-719 minutes) = Late
  // - 12:00 onwards IST (720+ minutes) = Half-day
  
  if (totalMinutes >= 720) {
    return 'half-day';
  } else if (totalMinutes > 630) {
    return 'late';
  } else {
    return 'present';
  }
}

/**
 * Check if a date is today in IST
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today in IST
 */
export function isTodayIST(date) {
  const todayMidnight = getTodayMidnightIST();
  const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);
  
  return date >= todayMidnight && date < tomorrowMidnight;
}

/**
 * Get date range for today in IST
 * CRITICAL: This works regardless of server timezone
 * @returns {Object} { start, end } - Start and end of today in IST
 */
export function getTodayRangeIST() {
  const now = new Date();
  
  // Get today's date in IST as YYYY-MM-DD string
  const istDateString = now.toLocaleDateString('en-CA', { 
    timeZone: 'Asia/Kolkata' 
  }); // Returns YYYY-MM-DD
  
  // Parse the date components
  const year = parseInt(istDateString.substring(0, 4));
  const month = parseInt(istDateString.substring(5, 7)) - 1; // Month is 0-indexed
  const day = parseInt(istDateString.substring(8, 10));
  
  // Create start of day (00:00:00 IST) in UTC
  // IST is UTC+5:30, so IST midnight is 18:30 UTC of previous day
  const startUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in milliseconds
  const start = new Date(startUTC.getTime() - istOffset);
  
  // End is start of next day
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  
  return { start, end };
}

/**
 * Log timezone info for debugging
 */
export function logTimezoneInfo() {
  const now = new Date();
  const istTime = getCurrentISTTime();
  
  console.log('[TIMEZONE] Server Time:', now.toISOString());
  console.log('[TIMEZONE] IST Time:', formatISTDate(istTime));
  console.log('[TIMEZONE] Server Timezone Offset:', -now.getTimezoneOffset() / 60, 'hours');
  console.log('[TIMEZONE] IST Offset: +5:30 hours');
}

export default {
  getCurrentISTTime,
  getTodayMidnightIST,
  getISTTimeComponents,
  formatISTDate,
  calculateAttendanceStatus,
  isTodayIST,
  getTodayRangeIST,
  logTimezoneInfo
};
