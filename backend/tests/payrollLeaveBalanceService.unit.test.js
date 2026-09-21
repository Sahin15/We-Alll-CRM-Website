import { describe, it, expect } from "@jest/globals";
import {
  groupConsecutiveDates,
  resolveDatesForLeaveDeduction,
} from "../src/services/payroll/payrollLeaveBalanceService.js";

describe("groupConsecutiveDates", () => {
  it("groups consecutive dates into ranges", () => {
    const groups = groupConsecutiveDates([
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-10",
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].start.toISOString()).toBe("2026-05-04T18:30:00.000Z");
    expect(groups[0].end.toISOString()).toBe("2026-05-06T18:30:00.000Z");
    expect(groups[1].start.toISOString()).toBe("2026-05-09T18:30:00.000Z");
    expect(groups[1].end.toISOString()).toBe("2026-05-09T18:30:00.000Z");
  });

  it("returns empty array for no dates", () => {
    expect(groupConsecutiveDates([])).toEqual([]);
  });

  it("resolves payroll leave dates from month when no absent dates", () => {
    const dates = resolveDatesForLeaveDeduction(5, 2026, 2, []);
    expect(dates).toHaveLength(2);
  });

  it("keeps ISO absent dates on the same IST calendar day", () => {
    const dates = resolveDatesForLeaveDeduction(7, 2026, 2, [
      "2026-07-13",
      "2026-07-14",
    ]);
    expect(dates).toHaveLength(2);
    expect(dates[0].toISOString()).toBe("2026-07-12T18:30:00.000Z");
    expect(dates[1].toISOString()).toBe("2026-07-13T18:30:00.000Z");
  });
});
