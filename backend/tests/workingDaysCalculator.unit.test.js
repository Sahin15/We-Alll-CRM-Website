import { describe, it, expect } from '@jest/globals';
import WorkingDaysCalculator from '../src/services/workingDaysCalculator.js';

describe('Working Days Calculator - Unit Tests', () => {
  let calculator;

  beforeEach(() => {
    calculator = new WorkingDaysCalculator();
  });

  describe('Weekend Calculation', () => {
    it('should calculate weekends correctly for 6-day work pattern', () => {
      // January 2025: 31 days, Sundays are 5, 12, 19, 26
      const result = calculator.calculateWeekends(1, 2025, '6-day');
      
      expect(result.count).toBe(4); // Only Sundays
      expect(result.sundays).toHaveLength(4);
      expect(result.saturdays).toHaveLength(0);
    });

    it('should calculate weekends correctly for 5-day work pattern', () => {
      // January 2025: 31 days, Sundays: 4, Saturdays: 4 (not 5)
      const result = calculator.calculateWeekends(1, 2025, '5-day');
      
      expect(result.count).toBe(8); // Sundays + Saturdays
      expect(result.sundays).toHaveLength(4);
      expect(result.saturdays).toHaveLength(4);
    });

    it('should handle February leap year correctly', () => {
      // February 2024 (leap year): 29 days
      const result = calculator.calculateWeekends(2, 2024, '6-day');
      
      expect(result.sundays.length).toBeGreaterThan(0);
      expect(result.count).toBe(result.sundays.length);
    });

    it('should handle February non-leap year correctly', () => {
      // February 2023 (non-leap year): 28 days
      const result = calculator.calculateWeekends(2, 2023, '6-day');
      
      expect(result.sundays.length).toBeGreaterThan(0);
      expect(result.count).toBe(result.sundays.length);
    });
  });

  describe('Validation', () => {
    it('should validate correct calculation results', () => {
      const validResult = {
        totalDays: 31,
        weekends: 4,
        holidays: 2,
        workingDays: 25,
        holidayDates: [],
        breakdown: {}
      };

      expect(calculator.validateCalculation(validResult)).toBe(true);
    });

    it('should reject invalid calculation results', () => {
      const invalidResult = {
        totalDays: 31,
        weekends: 4,
        holidays: 2,
        workingDays: 30, // Invalid: exceeds total days
        holidayDates: [],
        breakdown: {}
      };

      expect(calculator.validateCalculation(invalidResult)).toBe(false);
    });

    it('should reject results with negative values', () => {
      const invalidResult = {
        totalDays: 31,
        weekends: -1, // Invalid: negative
        holidays: 2,
        workingDays: 25,
        holidayDates: [],
        breakdown: {}
      };

      expect(calculator.validateCalculation(invalidResult)).toBe(false);
    });

    it('should reject incomplete results', () => {
      const incompleteResult = {
        totalDays: 31,
        weekends: 4
        // Missing required fields
      };

      expect(calculator.validateCalculation(incompleteResult)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all months correctly', () => {
      for (let month = 1; month <= 12; month++) {
        const result = calculator.calculateWeekends(month, 2025, '6-day');
        
        expect(result.count).toBeGreaterThanOrEqual(0);
        expect(result.sundays).toBeInstanceOf(Array);
        expect(result.saturdays).toBeInstanceOf(Array);
      }
    });

    it('should handle different years correctly', () => {
      const years = [2020, 2021, 2022, 2023, 2024, 2025];
      
      for (const year of years) {
        const result = calculator.calculateWeekends(1, year, '6-day');
        
        expect(result.count).toBeGreaterThanOrEqual(0);
        expect(result.sundays.length).toBeGreaterThan(0);
      }
    });
  });
});