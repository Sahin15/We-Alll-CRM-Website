import { describe, it, expect } from "@jest/globals";
import {
  UNPAID_LEAVE_IMPACT_CODES,
  getLeavePayImpact,
  isLeaveTypePaid,
} from "../src/services/payroll/leaveImpactCodes.js";
import {
  DEFAULT_ATTENDANCE_PAY_RULES,
  getHourlyRate,
  calculateOvertimePay,
  summarizeAttendanceForPayroll,
  buildAttendancePayrollAdjustments,
} from "../src/services/payroll/payrollAttendanceRules.js";

describe("leaveImpactCodes", () => {
  it("lists unpaid impact codes", () => {
    expect(UNPAID_LEAVE_IMPACT_CODES).toEqual(
      expect.arrayContaining(["unpaid", "lop", "loss_of_pay", "lwp"])
    );
  });

  it("classifies leave types", () => {
    expect(getLeavePayImpact("casual")).toBe("paid");
    expect(getLeavePayImpact("medical")).toBe("paid");
    expect(getLeavePayImpact("LOP")).toBe("unpaid");
    expect(getLeavePayImpact("personal")).toBe("paid");
    expect(isLeaveTypePaid("sick")).toBe(true);
    expect(isLeaveTypePaid("leave_without_pay")).toBe(false);
  });
});

describe("payrollAttendanceRules", () => {
  it("computes hourly rate and overtime pay", () => {
    // gross 24000 / (30*8) = 100/hour; 2h * 1.5 = 300
    expect(getHourlyRate(24000)).toBe(100);
    expect(
      calculateOvertimePay({ grossSalary: 24000, overtimeHours: 2 })
    ).toBe(300);
  });

  it("summarizes late, half-day, and OT hours from records", () => {
    const summary = summarizeAttendanceForPayroll([
      { status: "present", overtime: 0, totalManualOvertime: 0 },
      { status: "late", overtime: 1, totalManualOvertime: 0 },
      { status: "half-day", overtime: 0, totalManualOvertime: 0.5 },
      { status: "present", overtime: 2, totalManualOvertime: 1 },
    ]);
    expect(summary.lateDays).toBe(1);
    expect(summary.halfDayDays).toBe(1);
    expect(summary.overtimeHours).toBe(4.5);
    // default: late not deducted; half-day is
    expect(summary.extraLopDays).toBe(0.5);
  });

  it("can enable late deduction via rules", () => {
    const summary = summarizeAttendanceForPayroll(
      [{ status: "late" }, { status: "late" }],
      { ...DEFAULT_ATTENDANCE_PAY_RULES, applyLateDeduction: true, lateDeductionFraction: 0.25 }
    );
    expect(summary.extraLopDays).toBe(0.5);
  });

  it("builds attendance payroll adjustments", () => {
    const summary = summarizeAttendanceForPayroll([
      { status: "present", overtime: 2, totalManualOvertime: 0 },
    ]);
    const adj = buildAttendancePayrollAdjustments({
      grossSalary: 24000,
      summary,
    });
    expect(adj.overtimePay).toBe(300);
    expect(adj.overtimePayFormulaCheck).toBe(300);
    expect(adj.overtimeHours).toBe(2);
  });
});

describe("processEmployeePayroll attendance wiring", () => {
  it("merges attendance OT and half-day LOP into dual-run overrides", async () => {
    const { processEmployeePayroll } = await import(
      "../src/services/payroll/payrollEngine.js"
    );

    const structure = {
      basicSalary: 24000,
      hra: 0,
      specialAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      providentFund: 0,
      professionalTax: 0,
      tds: 0,
      esi: 0,
      grossSalary: 24000,
      otherAllowances: [],
      otherDeductions: [],
    };

    class FakeLeaveImpact {
      async calculateLeaveDeduction() {
        return {
          unpaidLeaves: 1,
          paidLeaves: 0,
          deductionAmount: 800,
          perDaySalary: 800,
        };
      }
    }

    const result = await processEmployeePayroll({
      employeeId: "emp1",
      month: 7,
      year: 2026,
      deps: {
        SalaryStructure: {
          getActiveStructure: async () => structure,
        },
        LeaveImpactCalculator: FakeLeaveImpact,
        loadAttendanceRecords: async () => [
          { status: "present", overtime: 2, totalManualOvertime: 0 },
          { status: "half-day", overtime: 0, totalManualOvertime: 0 },
        ],
      },
    });

    expect(result.attendanceAdjustment.overtimePay).toBe(300);
    expect(result.attendanceAdjustment.extraLopDays).toBe(0.5);
    // base LOP 800 + half-day 0.5*800 = 1200; OT 300 on earnings
    expect(result.dual.v1.earnings.overtime).toBe(300);
    expect(result.dual.v1.deductions.lossOfPay).toBe(1200);
    expect(result.dual.diff.withinTolerance).toBe(true);
  });
});
