import { describe, it, expect } from "@jest/globals";
import {
  calculateEarnedLeaves,
  resolveAccrualDate,
} from "../src/utils/leaveAccrual.js";

const july2026 = new Date("2026-07-30T12:00:00");

describe("leaveAccrual", () => {
  describe("resolveAccrualDate", () => {
    it("prefers joiningDate over a later fullTimeStartDate for regular full-time staff", () => {
      const anchor = resolveAccrualDate({
        joiningDate: new Date("2022-01-15"),
        fullTimeStartDate: new Date("2026-05-01"),
        employmentType: "full-time",
      });

      expect(anchor.toISOString().slice(0, 10)).toBe("2022-01-15");
    });

    it("uses fullTimeStartDate after intern conversion", () => {
      const anchor = resolveAccrualDate({
        joiningDate: new Date("2025-01-15"),
        fullTimeStartDate: new Date("2026-05-01"),
        employmentType: "full-time",
        internshipDetails: { startDate: new Date("2025-01-15"), duration: "6-months" },
      });

      expect(anchor.toISOString().slice(0, 10)).toBe("2026-05-01");
    });
  });

  describe("calculateEarnedLeaves", () => {
    it("accrues from January for long-tenured employees in July", () => {
      expect(
        calculateEarnedLeaves(
          2026,
          new Date("2022-01-15"),
          july2026
        )
      ).toBe(14);
    });

    it("accrues from conversion month for interns turned full-time mid-year", () => {
      expect(
        calculateEarnedLeaves(
          2026,
          new Date("2026-05-01"),
          july2026
        )
      ).toBe(6);
    });

    it("does not under-accrue when fullTimeStartDate was wrongly set recently", () => {
      const wrongRecentStart = new Date("2026-05-01");
      const trueJoining = new Date("2022-01-15");

      const accrualDate = resolveAccrualDate({
        joiningDate: trueJoining,
        fullTimeStartDate: wrongRecentStart,
        employmentType: "full-time",
      });

      expect(
        calculateEarnedLeaves(2026, accrualDate, july2026)
      ).toBe(14);
    });
  });
});
