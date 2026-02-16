import Holiday from "../models/holidayModel.js";
import WorkingDaysCalendar from "../models/workingDaysCalendarModel.js";

class WorkingDaysCalculator {
  constructor() {
    this.defaultWorkPattern = "6-day"; // Monday to Saturday
  }

  /**
   * Calculate working days for a given month and year
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {string} departmentId - Department ID (optional)
   * @param {string} workPattern - Work pattern: "5-day" or "6-day"
   * @returns {Object} Working days calculation result
   */
  async calculateWorkingDays(month, year, departmentId = null, workPattern = null) {
    try {
      // Validate inputs
      if (month < 1 || month > 12) {
        throw new Error("Invalid month. Must be between 1 and 12.");
      }

      if (year < 2020 || year > 2050) {
        throw new Error("Invalid year. Must be between 2020 and 2050.");
      }

      const pattern = workPattern || this.defaultWorkPattern;

      // Get total days in the month
      const totalDays = new Date(year, month, 0).getDate();

      // Calculate weekends based on work pattern
      const weekendInfo = this.calculateWeekends(month, year, pattern);

      // Get holidays for the month
      const holidayInfo = await this.getHolidaysInMonth(month, year, departmentId);

      // Calculate working days
      const workingDays = totalDays - weekendInfo.count - holidayInfo.count;

      // Prepare breakdown
      const breakdown = {
        sundays: weekendInfo.sundays,
        saturdays: pattern === "5-day" ? weekendInfo.saturdays : [],
        publicHolidays: holidayInfo.publicHolidays,
        companyHolidays: holidayInfo.companyHolidays
      };

      const result = {
        totalDays,
        weekends: weekendInfo.count,
        holidays: holidayInfo.count,
        workingDays: Math.max(0, workingDays), // Ensure non-negative
        holidayDates: holidayInfo.dates,
        breakdown,
        workPattern: pattern
      };

      // Cache the result for future use
      await this.cacheResult(month, year, departmentId, result);

      return result;
    } catch (error) {
      console.error("Error calculating working days:", error);
      throw error;
    }
  }

  /**
   * Calculate weekends in a month based on work pattern
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {string} workPattern - "5-day" or "6-day"
   * @returns {Object} Weekend calculation result
   */
  calculateWeekends(month, year, workPattern) {
    const sundays = [];
    const saturdays = [];
    const totalDays = new Date(year, month, 0).getDate();

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0) { // Sunday
        sundays.push(new Date(date));
      } else if (dayOfWeek === 6 && workPattern === "5-day") { // Saturday for 5-day work week
        saturdays.push(new Date(date));
      }
    }

    const count = sundays.length + (workPattern === "5-day" ? saturdays.length : 0);

    return {
      count,
      sundays,
      saturdays
    };
  }

  /**
   * Get holidays in a specific month
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {string} departmentId - Department ID (optional)
   * @returns {Object} Holiday information
   */
  async getHolidaysInMonth(month, year, departmentId = null) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Build query for holidays
      const query = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };

      // If department specified, include department-specific holidays
      if (departmentId) {
        query.$or = [
          { department: null }, // Company-wide holidays
          { department: departmentId } // Department-specific holidays
        ];
      } else {
        query.department = null; // Only company-wide holidays
      }

      const holidays = await Holiday.find(query).sort({ date: 1 });

      const publicHolidays = [];
      const companyHolidays = [];
      const dates = [];

      holidays.forEach(holiday => {
        const holidayDate = new Date(holiday.date);
        dates.push(holidayDate);

        if (holiday.type === "public") {
          publicHolidays.push(holidayDate);
        } else {
          companyHolidays.push(holidayDate);
        }
      });

      return {
        count: holidays.length,
        dates,
        publicHolidays,
        companyHolidays
      };
    } catch (error) {
      console.error("Error getting holidays:", error);
      // Return empty result on error to prevent calculation failure
      return {
        count: 0,
        dates: [],
        publicHolidays: [],
        companyHolidays: []
      };
    }
  }

  /**
   * Cache working days calculation result
   * @param {number} month - Month
   * @param {number} year - Year
   * @param {string} departmentId - Department ID
   * @param {Object} result - Calculation result
   */
  async cacheResult(month, year, departmentId, result) {
    try {
      // Check if already cached
      const existing = await WorkingDaysCalendar.findOne({
        month,
        year,
        department: departmentId
      });

      if (existing) {
        // Update existing cache
        Object.assign(existing, result);
        await existing.save();
      } else {
        // Create new cache entry
        await WorkingDaysCalendar.create({
          month,
          year,
          department: departmentId,
          ...result
        });
      }
    } catch (error) {
      // Don't throw error for caching failures
      console.warn("Failed to cache working days result:", error.message);
    }
  }

  /**
   * Get cached working days or calculate if not cached
   * @param {number} month - Month
   * @param {number} year - Year
   * @param {string} departmentId - Department ID
   * @returns {Object} Working days result
   */
  async getWorkingDays(month, year, departmentId = null) {
    try {
      // Try to get from cache first
      const cached = await WorkingDaysCalendar.findOne({
        month,
        year,
        department: departmentId
      });

      if (cached) {
        return {
          totalDays: cached.totalDays,
          weekends: cached.weekends,
          holidays: cached.holidays,
          workingDays: cached.workingDays,
          holidayDates: cached.holidayDates,
          breakdown: cached.breakdown,
          workPattern: cached.workPattern
        };
      }

      // Calculate if not cached
      return await this.calculateWorkingDays(month, year, departmentId);
    } catch (error) {
      console.error("Error getting working days:", error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific month/year/department
   * @param {number} month - Month
   * @param {number} year - Year
   * @param {string} departmentId - Department ID
   */
  async invalidateCache(month, year, departmentId = null) {
    try {
      await WorkingDaysCalendar.invalidateCache(month, year, departmentId);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      throw error;
    }
  }

  /**
   * Bulk calculate working days for multiple months
   * @param {Array} periods - Array of {month, year, departmentId} objects
   * @returns {Array} Array of calculation results
   */
  async bulkCalculateWorkingDays(periods) {
    try {
      const results = [];

      for (const period of periods) {
        try {
          const result = await this.calculateWorkingDays(
            period.month,
            period.year,
            period.departmentId
          );
          results.push({
            ...period,
            ...result,
            success: true
          });
        } catch (error) {
          results.push({
            ...period,
            error: error.message,
            success: false
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error in bulk calculation:", error);
      throw error;
    }
  }

  /**
   * Get working days for current month
   * @param {string} departmentId - Department ID
   * @returns {Object} Working days result
   */
  async getCurrentMonthWorkingDays(departmentId = null) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    return await this.getWorkingDays(month, year, departmentId);
  }

  /**
   * Validate working days calculation
   * @param {Object} result - Calculation result
   * @returns {boolean} True if valid
   */
  validateCalculation(result) {
    if (!result || typeof result !== 'object') {
      return false;
    }

    const required = ['totalDays', 'weekends', 'holidays', 'workingDays'];
    for (const field of required) {
      if (typeof result[field] !== 'number' || result[field] < 0) {
        return false;
      }
    }

    // Working days should not exceed total days
    if (result.workingDays > result.totalDays) {
      return false;
    }

    // Sum should be consistent
    const sum = result.weekends + result.holidays + result.workingDays;
    if (sum !== result.totalDays) {
      return false;
    }

    return true;
  }
}

export default WorkingDaysCalculator;