import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockAttendanceFind = jest.fn();
const mockLeaveFind = jest.fn();
const mockGetWorkingDays = jest.fn();

jest.unstable_mockModule("../src/models/attendanceModel.js", () => ({
  default: { find: mockAttendanceFind },
}));

jest.unstable_mockModule("../src/models/leaveRequestModel.js", () => ({
  default: { find: mockLeaveFind },
}));

jest.unstable_mockModule("../src/services/workingDaysCalculator.js", () => ({
  default: class WorkingDaysCalculator {
    getWorkingDays() {
      return mockGetWorkingDays();
    }
  },
}));

const { default: LeaveImpactCalculator } = await import(
  "../src/services/leaveImpactCalculator.js"
);

describe("PH-02 absent attendance counts as LOP", () => {
  beforeEach(() => {
    mockAttendanceFind.mockReset();
    mockLeaveFind.mockReset();
    mockGetWorkingDays.mockReset();
  });

  it("counts a working day with status absent as unpaid leave", async () => {
    // Fixed Wednesday in mid-month so weekends/holidays are easy to avoid
    const absentDate = new Date(2025, 0, 15); // Wed Jan 15 2025
    mockGetWorkingDays.mockResolvedValue({
      totalDays: 31,
      weekends: 8,
      holidays: 0,
      workingDays: 23,
      holidayDates: [],
      breakdown: { saturdays: [] },
    });
    mockLeaveFind.mockResolvedValue([]);
    mockAttendanceFind.mockResolvedValue([
      { date: absentDate, status: "absent" },
      { date: new Date(2025, 0, 14), status: "present" },
    ]);

    const calc = new LeaveImpactCalculator();
    const structure = {
      basicSalary: 30000,
      hra: 0,
      specialAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
    };

    const result = await calc.calculateLeaveDeduction(
      "507f1f77bcf86cd799439011",
      1,
      2025,
      structure
    );

    expect(result.absentDays).toBeGreaterThanOrEqual(1);
    expect(
      result.leaveBreakdown.some(
        (b) => b.leaveType === "absent" && b.days >= 1
      )
    ).toBe(true);
  });
});
