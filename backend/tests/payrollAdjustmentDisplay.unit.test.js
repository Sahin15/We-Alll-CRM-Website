import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors frontend resolveLeaveDays for API line shaping.
 */
function resolveLeaveDaysFromAdj(a) {
  let leaveDays = a.leaveDays != null ? Number(a.leaveDays) : null;
  if (
    a.type === "leave_balance_deduction" &&
    !(leaveDays > 0) &&
    a.payrollMeta?.daysDeducted != null
  ) {
    leaveDays = Number(a.payrollMeta.daysDeducted);
  }
  return leaveDays > 0 ? leaveDays : null;
}

describe("leave_balance_deduction line days", () => {
  it("uses leaveDays when set", () => {
    assert.equal(
      resolveLeaveDaysFromAdj({
        type: "leave_balance_deduction",
        leaveDays: 5,
        amount: 0,
      }),
      5
    );
  });

  it("falls back to payrollMeta.daysDeducted", () => {
    assert.equal(
      resolveLeaveDaysFromAdj({
        type: "leave_balance_deduction",
        leaveDays: null,
        amount: 0,
        payrollMeta: { daysDeducted: 5 },
      }),
      5
    );
  });
});
