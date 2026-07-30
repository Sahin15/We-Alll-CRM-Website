import { describe, it, expect } from "@jest/globals";
import {
  getLeaveBalanceCategory,
  isPaidLeaveType,
  normalizeLeaveTypeForCreate,
} from "../src/constants/leaveTypes.js";
import { ANNUAL_EARNED_LEAVE_LIMIT, MONTHLY_EARNED_LEAVE_RATE } from "../src/constants/leaveCategoryLimits.js";

describe("leaveTypes", () => {
  it("uses a single 24-day earned pool (2 per month)", () => {
    expect(ANNUAL_EARNED_LEAVE_LIMIT).toBe(24);
    expect(MONTHLY_EARNED_LEAVE_RATE).toBe(2);
  });

  it("maps legacy leave types to casual for new requests", () => {
    expect(normalizeLeaveTypeForCreate("personal")).toBe("casual");
    expect(normalizeLeaveTypeForCreate("vacation")).toBe("casual");
    expect(normalizeLeaveTypeForCreate("half_day")).toBe("casual");
    expect(normalizeLeaveTypeForCreate("medical")).toBe("medical");
  });

  it("classifies balance usage for legacy records", () => {
    expect(getLeaveBalanceCategory("personal")).toBe("casual");
    expect(getLeaveBalanceCategory("half_day")).toBe("casual");
    expect(getLeaveBalanceCategory("medical")).toBe("medical");
    expect(isPaidLeaveType("casual")).toBe(true);
    expect(isPaidLeaveType("unpaid")).toBe(false);
  });
});
