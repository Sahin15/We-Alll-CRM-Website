import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  payrollPeriodAnchorDate,
  applyLeaveBalanceDeduction,
} from "../src/services/payroll/payrollLeaveBalanceService.js";
import LeaveRequest from "../src/models/leaveRequestModel.js";

const createMock = jest.spyOn(LeaveRequest, "create");
const getBalanceMock = jest.spyOn(LeaveRequest, "getLeaveBalance");

describe("payroll earned leave ledger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBalanceMock.mockResolvedValue({
      eligibleForPaidLeave: true,
      earned: { remaining: 5 },
    });
    createMock.mockImplementation(async (payload) => ({
      _id: "ledger-leave-1",
      ...payload,
    }));
  });

  it("uses last day of month as IST anchor", () => {
    const anchor = payrollPeriodAnchorDate(10, 2026);
    expect(anchor.toISOString()).toBe("2026-10-30T18:30:00.000Z");
  });

  it("creates payroll_earned_deduction without attendance side effects", async () => {
    const result = await applyLeaveBalanceDeduction({
      employeeId: "emp1",
      month: 10,
      year: 2026,
      days: 2,
      approvedBy: "hr1",
      reason: "Earned leave balance deducted for 2 day(s) (10/2026)",
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const payload = createMock.mock.calls[0][0];
    expect(payload.leaveType).toBe("payroll_earned_deduction");
    expect(payload.numberOfDays).toBe(2);
    expect(payload.source).toBe("payroll");
    expect(payload.payrollPeriodMonth).toBe(10);
    expect(payload.payrollPeriodYear).toBe(2026);
    expect(result.attendanceSnapshots).toEqual([]);
    expect(result.daysDeducted).toBe(2);
    expect(result.createdLeaveIds).toHaveLength(1);
  });
});
