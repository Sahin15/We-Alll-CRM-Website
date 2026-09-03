import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getISTDateKey,
  getISTMidnightForYmd,
  getMonthBoundsIST,
} from "../src/utils/timezone.js";

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

describe("Leave impact IST calendar (UTC server safe)", () => {
  beforeEach(() => {
    mockAttendanceFind.mockReset();
    mockLeaveFind.mockReset();
    mockGetWorkingDays.mockReset();
  });

  it("maps IST-midnight attendance to the India calendar day, not UTC day", () => {
    // 15 Jul 2026 00:00 IST == 14 Jul 2026 18:30 UTC
    const istMidnight = getISTMidnightForYmd(2026, 7, 15);
    expect(istMidnight.toISOString()).toBe("2026-07-14T18:30:00.000Z");
    expect(getISTDateKey(istMidnight)).toBe("2026-07-15");
  });

  it("does not count present IST days as unpaid when stored as previous UTC evening", async () => {
    const july2026 = getMonthBoundsIST(2026, 7);
    // Wed 15 Jul 2026 is a working day (not Sunday)
    const presentIst = getISTMidnightForYmd(2026, 7, 15);

    mockGetWorkingDays.mockResolvedValue({
      totalDays: july2026.lastDay,
      weekends: 8,
      holidays: 0,
      workingDays: 23,
      holidayDates: [],
      breakdown: { saturdays: [] },
    });
    mockLeaveFind.mockResolvedValue([]);

    // Only one present day in the query window; other working days still absent.
    // Assert that THIS day is NOT in absentDates (regression for UTC toDateString bug).
    mockAttendanceFind.mockResolvedValue([
      { date: presentIst, status: "present" },
    ]);

    const calc = new LeaveImpactCalculator();
    const result = await calc.calculateLeaveDeduction(
      "507f1f77bcf86cd799439011",
      7,
      2026,
      { grossSalary: 30000, basicSalary: 30000 }
    );

    const absentKeys = (result.leaveBreakdown.find((b) => b.leaveType === "absent")
      ?.absentDates || []).map((d) => getISTDateKey(d));

    expect(absentKeys).not.toContain("2026-07-15");
    expect(getISTDateKey(presentIst)).toBe("2026-07-15");
  });
});
