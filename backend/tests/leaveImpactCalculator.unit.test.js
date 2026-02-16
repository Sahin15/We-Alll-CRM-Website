import { describe, it, expect } from '@jest/globals';
import LeaveImpactCalculator from '../src/services/leaveImpactCalculator.js';

describe('Leave Impact Calculator - Unit Tests', () => {
  let calculator;

  beforeEach(() => {
    calculator = new LeaveImpactCalculator();
  });

  describe('Leave Type Classification', () => {
    it('should correctly identify paid leave types', () => {
      const paidTypes = ['annual', 'sick', 'casual', 'earned', 'compensatory', 'festival', 'bereavement'];
      
      for (const type of paidTypes) {
        expect(calculator.isLeaveTypePaid(type)).toBe(true);
      }
    });

    it('should correctly identify unpaid leave types', () => {
      const unpaidTypes = ['unpaid', 'loss_of_pay', 'lop', 'extended_sick', 'personal'];
      
      for (const type of unpaidTypes) {
        expect(calculator.isLeaveTypePaid(type)).toBe(false);
      }
    });

    it('should default to paid for unknown leave types', () => {
      const unknownTypes = ['unknown', 'custom', 'special'];
      
      for (const type of unknownTypes) {
        expect(calculator.isLeaveTypePaid(type)).toBe(true);
      }
    });

    it('should handle case insensitive leave types', () => {
      expect(calculator.isLeaveTypePaid('ANNUAL')).toBe(true);
      expect(calculator.isLeaveTypePaid('Unpaid')).toBe(false);
      expect(calculator.isLeaveTypePaid('SICK')).toBe(true);
    });
  });

  describe('Leave Days Calculation', () => {
    it('should calculate leave days within a month correctly', () => {
      const leave = {
        startDate: new Date(2025, 0, 10), // January 10, 2025
        endDate: new Date(2025, 0, 15),   // January 15, 2025
        isHalfDay: false
      };

      const days = calculator.calculateLeaveDaysInMonth(leave, 1, 2025);
      expect(days).toBe(6); // 10, 11, 12, 13, 14, 15
    });

    it('should handle half-day leaves correctly', () => {
      const leave = {
        startDate: new Date(2025, 0, 10),
        endDate: new Date(2025, 0, 10),
        isHalfDay: true
      };

      const days = calculator.calculateLeaveDaysInMonth(leave, 1, 2025);
      expect(days).toBe(0.5);
    });

    it('should handle leaves spanning multiple months', () => {
      const leave = {
        startDate: new Date(2025, 0, 25), // January 25, 2025
        endDate: new Date(2025, 1, 5),    // February 5, 2025
        isHalfDay: false
      };

      // Days in January: 25, 26, 27, 28, 29, 30, 31 = 7 days
      const daysInJanuary = calculator.calculateLeaveDaysInMonth(leave, 1, 2025);
      expect(daysInJanuary).toBe(7);

      // Days in February: 1, 2, 3, 4, 5 = 5 days
      const daysInFebruary = calculator.calculateLeaveDaysInMonth(leave, 2, 2025);
      expect(daysInFebruary).toBe(5);
    });

    it('should return zero for leaves outside the month', () => {
      const leave = {
        startDate: new Date(2025, 1, 1), // February 1, 2025
        endDate: new Date(2025, 1, 5),   // February 5, 2025
        isHalfDay: false
      };

      const days = calculator.calculateLeaveDaysInMonth(leave, 1, 2025); // January
      expect(days).toBe(0);
    });

    it('should handle single day leaves correctly', () => {
      const leave = {
        startDate: new Date(2025, 0, 15),
        endDate: new Date(2025, 0, 15),
        isHalfDay: false
      };

      const days = calculator.calculateLeaveDaysInMonth(leave, 1, 2025);
      expect(days).toBe(1);
    });
  });

  describe('Proportional Salary Calculation', () => {
    it('should calculate proportional salary correctly', () => {
      const baseSalary = 60000;
      const workingDays = 24;
      const daysWorked = 20;

      const result = calculator.calculateProportionalSalary(baseSalary, workingDays, daysWorked);
      const expected = Math.round((baseSalary / workingDays) * daysWorked);

      expect(result).toBe(expected);
    });

    it('should handle zero working days gracefully', () => {
      const result = calculator.calculateProportionalSalary(50000, 0, 10);
      expect(result).toBe(0);
    });

    it('should handle zero days worked', () => {
      const result = calculator.calculateProportionalSalary(50000, 26, 0);
      expect(result).toBe(0);
    });

    it('should return full salary when all days worked', () => {
      const baseSalary = 45000;
      const workingDays = 22;

      const result = calculator.calculateProportionalSalary(baseSalary, workingDays, workingDays);
      expect(result).toBe(baseSalary);
    });

    it('should handle fractional calculations correctly', () => {
      const baseSalary = 30000;
      const workingDays = 20;
      const daysWorked = 15;

      const result = calculator.calculateProportionalSalary(baseSalary, workingDays, daysWorked);
      const expected = Math.round((30000 / 20) * 15); // 22500

      expect(result).toBe(expected);
    });
  });

  describe('Calculation Validation', () => {
    it('should validate correct leave impact calculations', () => {
      const validCalculation = {
        paidLeaves: 2,
        unpaidLeaves: 3,
        perDaySalary: 2000,
        deductionAmount: 6000 // 3 * 2000
      };

      expect(calculator.validateCalculation(validCalculation)).toBe(true);
    });

    it('should reject calculations with missing fields', () => {
      const incompleteCalculation = {
        paidLeaves: 2,
        unpaidLeaves: 3
        // Missing perDaySalary and deductionAmount
      };

      expect(calculator.validateCalculation(incompleteCalculation)).toBe(false);
    });

    it('should reject calculations with negative values', () => {
      const invalidCalculation = {
        paidLeaves: -1, // Invalid
        unpaidLeaves: 3,
        perDaySalary: 2000,
        deductionAmount: 6000
      };

      expect(calculator.validateCalculation(invalidCalculation)).toBe(false);
    });

    it('should reject calculations with inconsistent deduction amounts', () => {
      const inconsistentCalculation = {
        paidLeaves: 2,
        unpaidLeaves: 3,
        perDaySalary: 2000,
        deductionAmount: 10000 // Should be 6000 (3 * 2000)
      };

      expect(calculator.validateCalculation(inconsistentCalculation)).toBe(false);
    });

    it('should allow small rounding differences in deduction amounts', () => {
      const calculationWithRounding = {
        paidLeaves: 2,
        unpaidLeaves: 3,
        perDaySalary: 2000,
        deductionAmount: 6001 // 1 rupee difference (within tolerance)
      };

      expect(calculator.validateCalculation(calculationWithRounding)).toBe(true);
    });

    it('should reject null or undefined calculations', () => {
      expect(calculator.validateCalculation(null)).toBe(false);
      expect(calculator.validateCalculation(undefined)).toBe(false);
      expect(calculator.validateCalculation({})).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero leave days', () => {
      const calculation = {
        paidLeaves: 0,
        unpaidLeaves: 0,
        perDaySalary: 2000,
        deductionAmount: 0
      };

      expect(calculator.validateCalculation(calculation)).toBe(true);
    });

    it('should handle high salary values', () => {
      const baseSalary = 500000;
      const workingDays = 26;
      const daysWorked = 20;

      const result = calculator.calculateProportionalSalary(baseSalary, workingDays, daysWorked);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(baseSalary);
    });

    it('should handle fractional leave days', () => {
      const calculation = {
        paidLeaves: 1.5,
        unpaidLeaves: 2.5,
        perDaySalary: 1000,
        deductionAmount: 2500 // 2.5 * 1000
      };

      expect(calculator.validateCalculation(calculation)).toBe(true);
    });
  });
});