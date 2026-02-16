import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';
import mongoose from 'mongoose';
import WorkingDaysCalculator from '../src/services/workingDaysCalculator.js';
import WorkingDaysCalendar from '../src/models/workingDaysCalendarModel.js';
import Holiday from '../src/models/holidayModel.js';

describe('Working Days Calculator - Property Tests', () => {
  let calculator;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-payroll');
    }
    calculator = new WorkingDaysCalculator();
  });

  afterAll(async () => {
    // Clean up test data
    await WorkingDaysCalendar.deleteMany({});
    await Holiday.deleteMany({});
    await mongoose.connection.close();
  });

  /**
   * Property 1: Working Days Calculation Consistency
   * Feature: enhanced-payroll-system
   * Validates: Requirements 2.1, 2.3, 2.4
   * 
   * For any valid month, year, and work pattern combination, the working days calculation
   * should always exclude Sundays and holidays, and the result should be consistent
   * across multiple calculations for the same parameters.
   */
  describe('Property 1: Working Days Calculation Consistency', () => {
    it('should produce consistent results for the same input parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2030 }), // year
          fc.constantFrom('5-day', '6-day'), // work pattern
          async (month, year, workPattern) => {
            // Calculate working days twice
            const result1 = await calculator.calculateWorkingDays(month, year, null, workPattern);
            const result2 = await calculator.calculateWorkingDays(month, year, null, workPattern);

            // Results should be identical
            expect(result1.totalDays).toBe(result2.totalDays);
            expect(result1.weekends).toBe(result2.weekends);
            expect(result1.holidays).toBe(result2.holidays);
            expect(result1.workingDays).toBe(result2.workingDays);
            expect(result1.workPattern).toBe(result2.workPattern);

            // Validate calculation consistency
            expect(calculator.validateCalculation(result1)).toBe(true);
            expect(calculator.validateCalculation(result2)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always exclude Sundays from working days', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2030 }), // year
          fc.constantFrom('5-day', '6-day'), // work pattern
          async (month, year, workPattern) => {
            const result = await calculator.calculateWorkingDays(month, year, null, workPattern);
            
            // Count actual Sundays in the month
            const totalDays = new Date(year, month, 0).getDate();
            let sundayCount = 0;
            
            for (let day = 1; day <= totalDays; day++) {
              const date = new Date(year, month - 1, day);
              if (date.getDay() === 0) { // Sunday
                sundayCount++;
              }
            }

            // For 6-day work pattern, weekends should equal Sunday count
            if (workPattern === '6-day') {
              expect(result.weekends).toBe(sundayCount);
            }
            
            // For 5-day work pattern, weekends should include Saturdays too
            if (workPattern === '5-day') {
              expect(result.weekends).toBeGreaterThanOrEqual(sundayCount);
            }

            // Working days should never include Sundays
            expect(result.workingDays).toBeLessThanOrEqual(totalDays - sundayCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain mathematical consistency in day calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2030 }), // year
          async (month, year) => {
            const result = await calculator.calculateWorkingDays(month, year);
            
            // Total days should equal sum of working days, weekends, and holidays
            const sum = result.workingDays + result.weekends + result.holidays;
            expect(sum).toBe(result.totalDays);

            // Working days should never be negative
            expect(result.workingDays).toBeGreaterThanOrEqual(0);

            // Working days should never exceed total days
            expect(result.workingDays).toBeLessThanOrEqual(result.totalDays);

            // Total days should match actual calendar days
            const actualDays = new Date(year, month, 0).getDate();
            expect(result.totalDays).toBe(actualDays);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(2), // February
          fc.integer({ min: 2020, max: 2030 }), // year
          async (month, year) => {
            const result = await calculator.calculateWorkingDays(month, year);
            
            // February should have 28 or 29 days
            const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            const expectedDays = isLeapYear ? 29 : 28;
            
            expect(result.totalDays).toBe(expectedDays);
            
            // Validate the result
            expect(calculator.validateCalculation(result)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property Test for Weekend Calculation
   * Validates that weekend calculation is accurate for different work patterns
   */
  describe('Weekend Calculation Properties', () => {
    it('should calculate weekends correctly for different work patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2030 }), // year
          async (month, year) => {
            const result5Day = await calculator.calculateWorkingDays(month, year, null, '5-day');
            const result6Day = await calculator.calculateWorkingDays(month, year, null, '6-day');
            
            // 5-day work week should have more or equal weekends than 6-day
            expect(result5Day.weekends).toBeGreaterThanOrEqual(result6Day.weekends);
            
            // Both should have the same total days
            expect(result5Day.totalDays).toBe(result6Day.totalDays);
            
            // 6-day pattern should have more working days (unless all Saturdays are holidays)
            expect(result6Day.workingDays).toBeGreaterThanOrEqual(result5Day.workingDays);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property Test for Caching Behavior
   * Validates that caching works correctly and doesn't affect calculation accuracy
   */
  describe('Caching Properties', () => {
    it('should maintain consistency between cached and calculated results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2025 }), // year (smaller range for caching test)
          async (month, year) => {
            // Clear any existing cache
            await WorkingDaysCalendar.deleteMany({ month, year, department: null });
            
            // First calculation (should create cache)
            const result1 = await calculator.getWorkingDays(month, year);
            
            // Second calculation (should use cache)
            const result2 = await calculator.getWorkingDays(month, year);
            
            // Results should be identical
            expect(result1).toEqual(result2);
            
            // Verify cache was created
            const cached = await WorkingDaysCalendar.findOne({ month, year, department: null });
            expect(cached).toBeTruthy();
            expect(cached.workingDays).toBe(result1.workingDays);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property Test for Input Validation
   * Validates that invalid inputs are handled correctly
   */
  describe('Input Validation Properties', () => {
    it('should reject invalid month values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 13 })
          ), // invalid months
          fc.integer({ min: 2020, max: 2030 }), // valid year
          async (invalidMonth, year) => {
            await expect(
              calculator.calculateWorkingDays(invalidMonth, year)
            ).rejects.toThrow('Invalid month');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject invalid year values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // valid month
          fc.oneof(
            fc.integer({ max: 2019 }),
            fc.integer({ min: 2051 })
          ), // invalid years
          async (month, invalidYear) => {
            await expect(
              calculator.calculateWorkingDays(month, invalidYear)
            ).rejects.toThrow('Invalid year');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property Test for Bulk Operations
   * Validates that bulk calculations maintain consistency
   */
  describe('Bulk Operation Properties', () => {
    it('should produce consistent results in bulk vs individual calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              month: fc.integer({ min: 1, max: 12 }),
              year: fc.integer({ min: 2020, max: 2025 }),
              departmentId: fc.constant(null)
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (periods) => {
            // Bulk calculation
            const bulkResults = await calculator.bulkCalculateWorkingDays(periods);
            
            // Individual calculations
            const individualResults = [];
            for (const period of periods) {
              try {
                const result = await calculator.calculateWorkingDays(
                  period.month,
                  period.year,
                  period.departmentId
                );
                individualResults.push({
                  ...period,
                  ...result,
                  success: true
                });
              } catch (error) {
                individualResults.push({
                  ...period,
                  error: error.message,
                  success: false
                });
              }
            }
            
            // Compare results
            expect(bulkResults.length).toBe(individualResults.length);
            
            for (let i = 0; i < bulkResults.length; i++) {
              const bulk = bulkResults[i];
              const individual = individualResults[i];
              
              expect(bulk.success).toBe(individual.success);
              
              if (bulk.success && individual.success) {
                expect(bulk.workingDays).toBe(individual.workingDays);
                expect(bulk.totalDays).toBe(individual.totalDays);
                expect(bulk.weekends).toBe(individual.weekends);
                expect(bulk.holidays).toBe(individual.holidays);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});