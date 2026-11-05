import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const findOneMock = jest.fn();
const createMock = jest.fn();
const userFindByIdMock = jest.fn();
const getContextMock = jest.fn();
const applyLeaveMock = jest.fn();
const resolveDatesMock = jest.fn();

jest.unstable_mockModule("../src/models/payrollAdjustmentModel.js", () => ({
  default: {
    findOne: findOneMock,
    create: createMock,
  },
}));

jest.unstable_mockModule("../src/models/userModel.js", () => ({
  default: {
    findById: userFindByIdMock,
  },
}));

jest.unstable_mockModule(
  "../src/services/payroll/payrollLeaveBalanceService.js",
  () => ({
    getPayrollAbsentContext: getContextMock,
    resolveDatesForLeaveDeduction: resolveDatesMock,
    applyLeaveBalanceDeduction: applyLeaveMock,
    reverseLeaveBalanceDeduction: jest.fn(),
  })
);

const { createAdjustment, createLeaveBalanceDeduction } = await import(
  "../src/controllers/payrollAdjustmentController.js"
);

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("payroll adjustments — combined leave and salary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userFindByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "emp1",
        employmentType: "full-time",
      }),
    });
    createMock.mockResolvedValue({ _id: "adj-new", type: "absent_deduction" });
    getContextMock.mockResolvedValue({
      coverableDays: 2,
      maxLeaveDeductible: 5,
      balance: { eligibleForPaidLeave: true, earned: { remaining: 5 } },
      perDaySalary: 600,
      absentDates: [],
    });
    resolveDatesMock.mockReturnValue(["2026-10-01", "2026-10-02"]);
    applyLeaveMock.mockResolvedValue({
      daysDeducted: 2,
      createdLeaveIds: ["l1"],
      attendanceSnapshots: [],
    });
  });

  it("allows absent_deduction without querying for leave cover", async () => {
    const req = {
      body: {
        employee: "emp1",
        month: 10,
        year: 2026,
        type: "absent_deduction",
        amount: 1200,
        reason: "Salary deduction for 2 day(s)",
      },
      user: { id: "hr1" },
    };
    const res = mockRes();

    await createAdjustment(req, res);

    expect(findOneMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("blocks a second leave_balance_deduction in the same month", async () => {
    findOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "existing-leave" }),
    });

    const res = mockRes();
    await createLeaveBalanceDeduction(
      {
        body: { employee: "emp1", month: 10, year: 2026, days: 1 },
        user: { id: "hr1" },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/leave balance deduction already exists/i),
      })
    );
    expect(applyLeaveMock).not.toHaveBeenCalled();
  });

  it("allows leave deduction when no active leave row exists (salary may coexist)", async () => {
    findOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    createMock.mockResolvedValue({ _id: "leave-new" });

    const res = mockRes();
    await createLeaveBalanceDeduction(
      {
        body: { employee: "emp1", month: 10, year: 2026, days: 2 },
        user: { id: "hr1" },
      },
      res
    );

    expect(findOneMock).toHaveBeenCalledTimes(1);
    expect(applyLeaveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
