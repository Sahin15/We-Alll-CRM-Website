import { describe, it, expect } from "@jest/globals";
import { getLeaveRequestDays } from "../src/utils/leaveDays.js";

describe("getLeaveRequestDays", () => {
  it("returns 0.5 for half-day leave regardless of date range", () => {
    expect(
      getLeaveRequestDays("half_day", "2026-05-21", "2026-05-21")
    ).toBe(0.5);
    expect(
      getLeaveRequestDays("half_day", "2026-05-21", "2026-05-25")
    ).toBe(0.5);
  });

  it("returns inclusive day count for other leave types", () => {
    expect(
      getLeaveRequestDays("personal", "2026-05-21", "2026-05-21")
    ).toBe(1);
    expect(
      getLeaveRequestDays("personal", "2026-05-21", "2026-05-23")
    ).toBe(3);
  });
});
