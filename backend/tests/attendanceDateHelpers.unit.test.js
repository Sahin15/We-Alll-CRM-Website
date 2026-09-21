/**
 * IST attendance date helpers — used by frontend attendance details/calendar.
 * Validates Sunday/weekend and leave-day matching against stored IST midnight UTC.
 */
import { describe, test, expect } from "@jest/globals";
import { expandLeaveDatesWithinFilter } from "../src/controllers/attendanceController.js";

// Mirror frontend attendanceHelpers logic for regression checks.
const toISTDateString = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0];
};

const getISTDayOfWeek = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

describe("attendance IST date helpers", () => {
  test("IST midnight stored as UTC maps to correct calendar day", () => {
    const stored = new Date("2026-08-09T18:30:00.000Z");
    expect(toISTDateString(stored)).toBe("2026-08-10");
  });

  test("Sunday calendar string is detected as Sunday", () => {
    expect(getISTDayOfWeek("2026-08-09")).toBe(0);
  });

  test("leave synthetic date matches loop date string", () => {
    const leaveDay = new Date("2026-08-09T18:30:00.000Z");
    const loopDateStr = "2026-08-10";
    expect(toISTDateString(leaveDay)).toBe(loopDateStr);
  });

  test("leave expansion is clipped to the requested day", () => {
    const dateFilter = {
      $gte: new Date("2026-08-11T18:30:00.000Z"),
      $lte: new Date("2026-08-12T18:29:59.999Z"),
    };

    expect(
      expandLeaveDatesWithinFilter(
        new Date("2026-08-12T00:00:00.000Z"),
        new Date("2026-08-13T23:59:59.999Z"),
        dateFilter
      )
    ).toEqual(["2026-08-12"]);
  });
});
