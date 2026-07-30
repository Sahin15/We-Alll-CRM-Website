import { describe, it, expect } from "@jest/globals";
import {
  groupConsecutiveDates,
  resolveDatesForLeaveDeduction,
} from "../src/services/payroll/payrollLeaveBalanceService.js";

describe("groupConsecutiveDates", () => {
  it("groups consecutive dates into ranges", () => {
    const groups = groupConsecutiveDates([
      new Date(2026, 4, 5),
      new Date(2026, 4, 6),
      new Date(2026, 4, 7),
      new Date(2026, 4, 10),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].start.getDate()).toBe(5);
    expect(groups[0].end.getDate()).toBe(7);
    expect(groups[1].start.getDate()).toBe(10);
    expect(groups[1].end.getDate()).toBe(10);
  });

  it("returns empty array for no dates", () => {
    expect(groupConsecutiveDates([])).toEqual([]);
  });

  it("resolves payroll leave dates from month when no absent dates", () => {
    const dates = resolveDatesForLeaveDeduction(5, 2026, 2, []);
    expect(dates).toHaveLength(2);
  });
});
