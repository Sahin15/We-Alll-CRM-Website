import { describe, it, expect } from "@jest/globals";
import LeaveRequest from "../src/models/leaveRequestModel.js";

const convertedIntern = {
  employmentType: "full-time",
  joiningDate: new Date("2026-03-12T00:00:00.000Z"),
  fullTimeStartDate: new Date("2026-07-16T06:29:10.684Z"),
  internshipDetails: {
    startDate: new Date("2026-03-12T00:00:00.000Z"),
    duration: "6-months",
  },
};

describe("buildLeaveBalance payroll deduction", () => {
  it("counts payroll earned-leave deduction dated before full-time conversion", () => {
    const balance = LeaveRequest.buildLeaveBalance(
      convertedIntern,
      [
        {
          leaveType: "casual",
          startDate: new Date("2026-07-01T00:00:00.000Z"),
          endDate: new Date("2026-07-01T00:00:00.000Z"),
          reason: "Earned leave deducted for 1 day(s) instead of salary",
          source: "payroll",
        },
      ],
      2026
    );

    expect(balance.earned.used).toBe(1);
  });

  it("counts legacy payroll deduction reasons without source field", () => {
    const balance = LeaveRequest.buildLeaveBalance(
      convertedIntern,
      [
        {
          leaveType: "casual",
          startDate: new Date("2026-07-01T00:00:00.000Z"),
          endDate: new Date("2026-07-01T00:00:00.000Z"),
          reason: "[Payroll 7/2026] Earned leave balance deducted instead of salary for absent day(s)",
        },
      ],
      2026
    );

    expect(balance.earned.used).toBe(1);
  });

  it("does not count intern-period medical leave against earned balance", () => {
    const balance = LeaveRequest.buildLeaveBalance(
      convertedIntern,
      [
        {
          leaveType: "medical",
          startDate: new Date("2026-03-18T00:00:00.000Z"),
          endDate: new Date("2026-03-18T00:00:00.000Z"),
          reason: "hospital",
        },
      ],
      2026
    );

    expect(balance.earned.used).toBe(0);
  });
});
