import { describe, it, expect } from "@jest/globals";
import {
  pickAmount,
  computeFlatGross,
  computePerDaySalary,
} from "../src/services/payroll/payrollCorrectnessHelpers.js";
import { buildStandardGenerateSlipMoney } from "../src/services/payroll/generatePayrollMoneyPolicy.js";

describe("PH-04 pickAmount / gross / per-day", () => {
  it("keeps zero preferred amounts (does not fall back)", () => {
    expect(pickAmount(0, 5000)).toBe(0);
    expect(pickAmount(null, 5000)).toBe(5000);
    expect(pickAmount(undefined, 5000)).toBe(5000);
  });

  it("computes flat gross including other allowances", () => {
    expect(
      computeFlatGross({
        basicSalary: 10000,
        hra: 4000,
        specialAllowance: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        otherAllowances: [{ amount: 500 }],
      })
    ).toBe(14500);
  });

  it("computes per-day from persisted gross / 30", () => {
    expect(computePerDaySalary(30000, 30)).toBe(1000);
  });
});

describe("PH-03/PH-04 buildStandardGenerateSlipMoney", () => {
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
    otherAllowances: [],
    otherDeductions: [],
  };

  it("applies half-day LOP and OT like processEmployeePayroll", async () => {
    const money = await buildStandardGenerateSlipMoney({
      employeeId: "emp1",
      month: 7,
      year: 2026,
      structure,
      proRataData: { earnings: {}, deductions: {}, isProRata: false },
      attendance: {
        unpaidLeaves: 1,
        lossOfPayAmount: 800,
      },
      extras: {},
      deps: {
        loadAttendanceRecords: async () => [
          { status: "present", overtime: 2, totalManualOvertime: 0 },
          { status: "half-day", overtime: 0, totalManualOvertime: 0 },
        ],
      },
    });

    // per-day = 24000/30 = 800; base LOP 800 + half-day 400 = 1200; OT 300
    expect(money.perDaySalary).toBe(800);
    expect(money.earnings.overtime).toBe(300);
    expect(money.deductions.lossOfPay).toBe(1200);
    expect(money.lopDays).toBe(1.5);
    expect(money.engineOverrides.overtime).toBe(300);
    expect(money.engineOverrides.lossOfPay).toBe(1200);
  });

  it("uses pro-rata zero amounts and LOP on pro-rated gross", async () => {
    const money = await buildStandardGenerateSlipMoney({
      employeeId: "emp1",
      month: 7,
      year: 2026,
      structure,
      proRataData: {
        isProRata: true,
        earnings: {
          basicSalary: 12000,
          hra: 0,
          specialAllowance: 0,
          transportAllowance: 0,
          medicalAllowance: 0,
        },
        deductions: {},
      },
      attendance: { unpaidLeaves: 2 },
      extras: { overtime: 0 },
      deps: {
        loadAttendanceRecords: async () => [],
      },
    });

    expect(money.earnings.basicSalary).toBe(12000);
    expect(money.perDaySalary).toBe(400); // 12000/30
    expect(money.deductions.lossOfPay).toBe(800); // 2 * 400
    expect(money.earnings.overtime).toBe(0); // explicit request overtime
  });
});
