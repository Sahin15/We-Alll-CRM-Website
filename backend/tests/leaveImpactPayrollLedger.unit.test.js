import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const findMock = jest.fn();

jest.unstable_mockModule("../src/models/leaveRequestModel.js", () => ({
  default: {
    find: findMock,
  },
}));

jest.unstable_mockModule("../src/services/workingDaysCalculator.js", () => ({
  default: class WorkingDaysCalculator {
    async getWorkingDays() {
      return { workingDays: 22 };
    }
  },
}));

jest.unstable_mockModule("../src/models/attendanceModel.js", () => ({
  default: {
    find: jest.fn().mockResolvedValue([
      {
        date: new Date("2026-10-01T18:30:00.000Z"),
        status: "absent",
      },
    ]),
  },
}));

const LeaveImpactCalculator = (
  await import("../src/services/leaveImpactCalculator.js")
).default;

describe("LeaveImpactCalculator payroll ledger exclusion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findMock.mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });
  });

  it("excludes payroll source leaves from month leave records query", async () => {
    const calc = new LeaveImpactCalculator();
    await calc.getLeaveRecordsForMonth("emp1", 10, 2026);

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        employee: "emp1",
        status: "approved",
        leaveType: { $ne: "payroll_earned_deduction" },
        source: { $ne: "payroll" },
      })
    );
  });
});
