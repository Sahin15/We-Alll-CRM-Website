import { describe, it, expect } from "@jest/globals";
import {
  assertNonNegativeNetFromMaps,
  sumEarningsMap,
  sumDeductionsMap,
  NegativeNetError,
} from "../src/services/payroll/negativeNetGuard.js";

describe("PH-05 negativeNetGuard", () => {
  it("sums earnings and deductions like slip pre-save", () => {
    expect(
      sumEarningsMap({
        basicSalary: 10000,
        hra: 0,
        bonus: 500,
        otherAllowances: [{ amount: 100 }],
      })
    ).toBe(10600);
    expect(
      sumDeductionsMap({
        providentFund: 1000,
        lossOfPay: 2000,
        advances: 500,
        unpaidLeaveDeduction: 0,
      })
    ).toBe(3500);
  });

  it("allows non-negative net", () => {
    const net = assertNonNegativeNetFromMaps(
      { basicSalary: 10000 },
      { providentFund: 1000, lossOfPay: 0 }
    );
    expect(net).toBe(9000);
  });

  it("fail-closes when deductions exceed earnings", () => {
    expect(() =>
      assertNonNegativeNetFromMaps(
        { basicSalary: 5000 },
        { lossOfPay: 6000, advances: 500 }
      )
    ).toThrow(NegativeNetError);

    try {
      assertNonNegativeNetFromMaps(
        { basicSalary: 5000 },
        { lossOfPay: 6000 }
      );
    } catch (e) {
      expect(e.code).toBe("NEGATIVE_NET_SALARY");
      expect(e.details.netSalary).toBe(-1000);
    }
  });
});
