import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import mongoose from 'mongoose';
import LeaveImpactCalculator from '../src/services/leaveImpactCalculator.js';
import LeaveRequest from '../src/models/leaveRequestModel.js';
import User from '../src/models/userModel.js';
import WorkingDaysCalendar from '../src/models/workingDaysCalendarModel.js';

describe('Leave Impact Calculator - Property Tests', () => {
  let calculator;
  let testEmployeeId;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-payroll');
    }
    
    calculator = new LeaveImpactCalculator();
    
    // Create a test employee
    const testEmployee = new User({
      name: 'Test Employee',
      email: 'test@example.com',
      employeeId: 'TEST001',
      role: 'employee',
      status: 'active'
    });
    await testEmployee.save();
    testEmployeeId = testEmployee._id;
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await LeaveRequest.deleteMany({});
    await WorkingDaysCalendar.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await LeaveRequest.deleteMany({});
    await WorkingDaysCalendar.deleteMany({});
    await User.findByIdAndDelete(testEmployeeId);
    await mongoose.connection.close();
  });

  /**
   * Property 3: Leave Deduction Proportionality
   * Feature: enhanced-payroll-system
   * Validates: Requirements 3.1, 3.2, 3.3
   * 
   * For any employee with unpaid leaves in a month, the salary deduction should equal
   * the per-day salary (calculated as monthly gross salary divided by working days)
   * multiplied by the number of unpaid leave days, with half-day leaves counting as 0.5 days.
   */
  describe('Property 3: Leave Deduction Proportionality', () => {
    it('should calculate deductions proportionally to unpaid leave days', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2025 }), // year
          fc.integer({ min: 10000, max: 100000 }), // gross salary
          fc.integer({ min: 1, max: 10 }), // unpaid leave days
          fc.integer({ min: 20, max: 30 }), // working days
          async (month, year, grossSalary, unpaidLeaveDays, workingDays) => {
            // Create working days record
            await WorkingDaysCalendar.create({
              month,
              year,
              department: null,
              totalDays: 30,
              weekends: 4,
              holidays: 2,
              workingDays,
              holidayDates: [],
              breakdown: { sundays: [], publicHolidays: [], companyHolidays: [] }
            });

            // Create salary structure
            const salaryStructure = { grossSalary };

            // Create unpaid leave record
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month - 1, unpaidLeaveDays);
            
            await LeaveRequest.create({
              employee: testEmployeeId,
              leaveType: 'unpaid',
              startDate,
              endDate,
              numberOfDays: unpaidLeaveDays,
              status: 'approved',
              reason: 'Test unpaid leave'
            });

            // Calculate leave impact
            const result = await calculator.calculateLeaveDeduction(
              testEmployeeId,
              month,
              year,
              salaryStructure
            );

            // Verify proportional calculation
            const expectedPerDaySalary = grossSalary / workingDays;
            const expectedDeduction = expectedPerDaySalary * unpaidLeaveDays;

            expect(result.perDaySalary).toBeCloseTo(expectedPerDaySalary, 0);
            expect(result.deductionAmount).toBeCloseTo(expectedDeduction, 0);
            expect(result.unpaidLeaves).toBe(unpaidLeaveDays);

            // Validate calculation
            expect(calculator.validateCalculation(result)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle half-day leaves correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2025 }), // year
          fc.integer({ min: 10000, max: 100000 }), // gross salary
          fc.integer({ min: 20, max: 30 }), // working days
          async (month, year, grossSalary, workingDays) => {
            // Create working days record
            await WorkingDaysCalendar.create({
              month,
              year,
              department: null,
              totalDays: 30,
              weekends: 4,
              holidays: 2,
              workingDays,
              holidayDates: [],
              breakdown: { sundays: [], publicHolidays: [], companyHolidays: [] }
            });

            const salaryStructure = { grossSalary };

            // Create half-day unpaid leave
            const leaveDate = new Date(year, month - 1, 15);
            
            await LeaveRequest.create({
              employee: testEmployeeId,
              leaveType: 'unpaid',
              startDate: leaveDate,
              endDate: leaveDate,
              numberOfDays: 1,
              isHalfDay: true,
              status: 'approved',
              reason: 'Test half-day leave'
            });

            const result = await calculator.calculateLeaveDeduction(
              testEmployeeId,
              month,
              year,
              salaryStructure
            );

            // Half-day should count as 0.5 days
            const expectedPerDaySalary = grossSalary / workingDays;
            const expectedDeduction = expectedPerDaySalary * 0.5;

            expect(result.unpaidLeaves).toBe(0.5);
            expect(result.deductionAmount).toBeCloseTo(expectedDeduction, 0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain consistency across different salary ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2025 }), // year
          fc.integer({ min: 5000, max: 200000 }), // gross salary
          fc.integer({ min: 1, max: 5 }), // leave days
          async (month, year, grossSalary, leaveDays) => {
            const workingDays = 26; // Fixed for consistency

            // Create working days record
            await WorkingDaysCalendar.create({
              month,
              year,
              department: null,
              totalDays: 30,
              weekends: 4,
              holidays: 0,
              workingDays,
              holidayDates: [],
              breakdown: { sundays: [], publicHolidays: [], companyHolidays: [] }
            });

            const salaryStructure = { grossSalary };

            // Create leave record
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month - 1, leaveDays);
            
            await LeaveRequest.create({
              employee: testEmployeeId,
              leaveType: 'unpaid',
              startDate,
              endDate,
              numberOfDays: leaveDays,
              status: 'approved',
              reason: 'Test leave'
            });

            const result = await calculator.calculateLeaveDeduction(
              testEmployeeId,
              month,
              year,
              salaryStructure
            );

            // Deduction percentage should be consistent
            const deductionPercentage = (result.deductionAmount / grossSalary) * 100;
            const expectedPercentage = (leaveDays / workingDays) * 100;

            expect(deductionPercentage).toBeCloseTo(expectedPercentage, 1);
            expect(result.unpaidLeaves).toBe(leaveDays);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Paid vs Unpaid Leave Impact
   * Feature: enhanced-payroll-system
   * Validates: Requirements 3.4
   * 
   * For any employee with both paid and unpaid leaves in a month, only unpaid leaves
   * should result in salary deductions, while paid leaves should have no impact on
   * the final salary calculation.
   */
  describe('Property 4: Paid vs Unpaid Leave Impact', () => {
    it('should only deduct for unpaid leaves, not paid leaves', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2025 }), // year
          fc.integer({ min: 20000, max: 80000 }), // gross salary
          fc.integer({ min: 1, max: 5 }), // paid leave days
          fc.integer({ min: 1, max: 5 }), // unpaid leave days
          async (month, year, grossSalary, paidLeaveDays, unpaidLeaveDays) => {
            const workingDays = 26;

            // Create working days record
            await WorkingDaysCalendar.create({
              month,
              year,
              department: null,
              totalDays: 30,
              weekends: 4,
              holidays: 0,
              workingDays,
              holidayDates: [],
              breakdown: { sundays: [], publicHolidays: [], companyHolidays: [] }
            });

            const salaryStructure = { grossSalary };

            // Create paid leave record
            await LeaveRequest.create({
              employee: testEmployeeId,
              leaveType: 'annual',
              startDate: new Date(year, month - 1, 1),
              endDate: new Date(year, month - 1, paidLeaveDays),
              numberOfDays: paidLeaveDays,
              status: 'approved',
              reason: 'Paid leave'
            });

            // Create unpaid leave record
            await LeaveRequest.create({
              employee: testEmployeeId,
              leaveType: 'unpaid',
              startDate: new Date(year, month - 1, 10),
              endDate: new Date(year, month - 1, 10 + unpaidLeaveDays - 1),
              numberOfDays: unpaidLeaveDays,
              status: 'approved',
              reason: 'Unpaid leave'
            });

            const result = await calculator.calculateLeaveDeduction(
              testEmployeeId,
              month,
              year,
              salaryStructure
            );

            // Only unpaid leaves should contribute to deduction
            expect(result.paidLeaves).toBe(paidLeaveDays);
            expect(result.unpaidLeaves).toBe(unpaidLeaveDays);

            const expectedDeduction = (grossSalary / workingDays) * unpaidLeaveDays;
            expect(result.deductionAmount).toBeCloseTo(expectedDeduction, 0);

            // Paid leaves should not affect deduction
            const paidLeaveDeduction = result.leaveBreakdown
              .filter(leave => leave.isPaid)
              .reduce((sum, leave) => sum + leave.deductionAmount, 0);
            
            expect(paidLeaveDeduction).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify paid and unpaid leave types', async () => {
      const paidLeaveTypes = ['annual', 'sick', 'casual', 'earned'];
      const unpaidLeaveTypes = ['unpaid', 'loss_of_pay', 'lop'];

      for (const leaveType of paidLeaveTypes) {
        expect(calculator.isLeaveTypePaid(leaveType)).toBe(true);
      }

      for (const leaveType of unpaidLeaveTypes) {
        expect(calculator.isLeaveTypePaid(leaveType)).toBe(false);
      }
    });

    it('should handle mixed leave types in the same month', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 2020, max: 2025 }), // year
          fc.integer({ min: 30000, max: 60000 }), // gross salary
          async (month, year, grossSalary) => {
            const workingDays = 24;

            // Create working days record
            await WorkingDaysCalendar.create({
              month,
              year,
              department: null,
              totalDays: 28,
              weekends: 4,
              holidays: 0,
              workingDays,
              holidayDates: [],
              breakdown: { sundays: [], publicHolidays: [], companyHolidays: [] }
            });

            const salaryStructure = { grossSalary };

            // Create multiple leave records of different types
            const leaves = [
              { type: 'annual', days: 2, isPaid: true },
              { type: 'sick', days: 1, isPaid: true },
              { type: 'unpaid', days: 3, isPaid: false },
              { type: 'casual', days: 1, isPaid: true }
            ];

            let dayOffset = 1;
            for (const leave of leaves) {
              await LeaveRequest.create({
                employee: testEmployeeId,
                leaveType: leave.type,
                startDate: new Date(year, month - 1, dayOffset),
                endDate: new Date(year, month - 1, dayOffset + leave.days - 1),
                numberOfDays: leave.days,
                status: 'approved',
                reason: `${leave.type} leave`
              });
              dayOffset += leave.days + 1;
            }

            const result = await calculator.calculateLeaveDeduction(
              testEmployeeId,
              month,
              year,
              salaryStructure
            );

            // Verify breakdown
            const totalPaidLeaves = leaves.filter(l => l.isPaid).reduce((sum, l) => sum + l.days, 0);
            const totalUnpaidLeaves = leaves.filter(l => !l.isPaid).reduce((sum, l) => sum + l.days, 0);

            expect(result.paidLeaves).toBe(totalPaidLeaves);
            expect(result.unpaidLeaves).toBe(totalUnpaidLeaves);

            // Only unpaid leaves should contribute to deduction
            const expectedDeduction = (grossSalary / workingDays) * totalUnpaidLeaves;
            expect(result.deductionAmount).toBeCloseTo(expectedDeduction, 0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property Test for Leave Days Calculation
   * Validates that leave days are calculated correctly across month boundaries
   */
  describe('Leave Days Calculation Properties', () => {
    it('should calculate leave days correctly for leaves spanning multiple months', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 11 }), // month (not December to avoid year boundary)
          fc.integer({ min: 2020, max: 2025 }), // year
          fc.integer({ min: 1, max: 10 }), // days before month end
          fc.integer({ min: 1, max: 10 }), // days after month start
          async (month, year, daysBefore, daysAfter) => {
            // Create leave that spans across months
            const monthEnd = new Date(year, month, 0).getDate();
            const startDate = new Date(year, month - 1, monthEnd - daysBefore + 1);
            const endDate = new Date(year, month, daysAfter);

            const leave = {
              startDate,
              endDate,
              isHalfDay: false
            };

            // Calculate days in the current month
            const daysInMonth = calculator.calculateLeaveDaysInMonth(leave, month, year);

            // Should only count days that fall within the month
            expect(daysInMonth).toBe(daysBefore);
            expect(daysInMonth).toBeGreaterThan(0);
            expect(daysInMonth).toBeLessThanOrEqual(daysBefore);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero for leaves that do not overlap with the month', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 11 }), // month (not January or December)
          fc.integer({ min: 2020, max: 2025 }), // year
          async (month, year) => {
            // Create leave in previous month
            const prevMonthLeave = {
              startDate: new Date(year, month - 2, 1),
              endDate: new Date(year, month - 2, 5),
              isHalfDay: false
            };

            // Create leave in next month
            const nextMonthLeave = {
              startDate: new Date(year, month, 1),
              endDate: new Date(year, month, 5),
              isHalfDay: false
            };

            const prevDays = calculator.calculateLeaveDaysInMonth(prevMonthLeave, month, year);
            const nextDays = calculator.calculateLeaveDaysInMonth(nextMonthLeave, month, year);

            expect(prevDays).toBe(0);
            expect(nextDays).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property Test for Proportional Salary Calculation
   * Validates the proportional salary calculation logic
   */
  describe('Proportional Salary Calculation Properties', () => {
    it('should calculate proportional salary correctly', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // base salary
          fc.integer({ min: 20, max: 30 }), // working days
          fc.integer({ min: 1, max: 30 }), // days worked
          (baseSalary, workingDays, daysWorked) => {
            const clampedDaysWorked = Math.min(daysWorked, workingDays);
            const proportionalSalary = calculator.calculateProportionalSalary(
              baseSalary,
              workingDays,
              clampedDaysWorked
            );

            // Proportional salary should not exceed base salary
            expect(proportionalSalary).toBeLessThanOrEqual(baseSalary);

            // Should be proportional to days worked
            const expectedSalary = (baseSalary / workingDays) * clampedDaysWorked;
            expect(proportionalSalary).toBeCloseTo(expectedSalary, 0);

            // Should be non-negative
            expect(proportionalSalary).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in proportional calculation', async () => {
      // Zero working days
      expect(calculator.calculateProportionalSalary(50000, 0, 5)).toBe(0);

      // Zero days worked
      expect(calculator.calculateProportionalSalary(50000, 26, 0)).toBe(0);

      // Full month worked
      expect(calculator.calculateProportionalSalary(50000, 26, 26)).toBe(50000);
    });
  });

  /**
   * Property Test for Validation
   * Validates that the calculation validation works correctly
   */
  describe('Calculation Validation Properties', () => {
    it('should validate correct calculations', async () => {
      await fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }), // paid leaves
          fc.integer({ min: 0, max: 10 }), // unpaid leaves
          fc.integer({ min: 100, max: 5000 }), // per day salary
          (paidLeaves, unpaidLeaves, perDaySalary) => {
            const deductionAmount = unpaidLeaves * perDaySalary;
            
            const result = {
              paidLeaves,
              unpaidLeaves,
              perDaySalary,
              deductionAmount
            };

            expect(calculator.validateCalculation(result)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid calculations', async () => {
      // Missing fields
      expect(calculator.validateCalculation({})).toBe(false);
      expect(calculator.validateCalculation(null)).toBe(false);

      // Negative values
      expect(calculator.validateCalculation({
        paidLeaves: -1,
        unpaidLeaves: 2,
        perDaySalary: 1000,
        deductionAmount: 2000
      })).toBe(false);

      // Inconsistent deduction
      expect(calculator.validateCalculation({
        paidLeaves: 1,
        unpaidLeaves: 2,
        perDaySalary: 1000,
        deductionAmount: 5000 // Should be 2000
      })).toBe(false);
    });
  });
});