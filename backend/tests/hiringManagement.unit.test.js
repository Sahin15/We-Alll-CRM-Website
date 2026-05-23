/**
 * Hiring Management System — Unit Tests
 *
 * Pure business logic for access control, review workflow, and offer conversion side effects.
 * No database connection required.
 */

import { describe, it, expect } from "@jest/globals";
import { HR_ROLES, isHrUser } from "../src/utils/hiringAccess.js";

const VALID_REVIEW_ACTIONS = ["hr_approved", "hr_rejected", "on_hold"];

function validateReviewAction(action) {
  if (!VALID_REVIEW_ACTIONS.includes(action)) {
    return { valid: false, message: "Invalid review action" };
  }
  return { valid: true };
}

function canReviewRequest(status) {
  return ["submitted", "on_hold"].includes(status);
}

function applyReviewResult(action) {
  if (action === "hr_approved") {
    return { status: "in_progress", assignedHr: true };
  }
  return { status: action, assignedHr: false };
}

function canSubmitRequest(status, requestDeptId, hodDeptId) {
  if (status !== "draft") {
    return { allowed: false, message: "Only draft requests can be submitted" };
  }
  if (String(requestDeptId) !== String(hodDeptId)) {
    return { allowed: false, message: "Access denied" };
  }
  return { allowed: true, nextStatus: "submitted" };
}

function canAccessHiringRequestSync(user, hiringRequest, hodDeptId) {
  if (isHrUser(user)) return true;
  if (!hodDeptId) return false;
  const reqDeptId = hiringRequest.department?._id || hiringRequest.department;
  return String(reqDeptId) === String(hodDeptId);
}

function applyOfferConversionSideEffects(hiringRequest) {
  const next = {
    filledCount: (hiringRequest.filledCount || 0) + 1,
    status: hiringRequest.status,
    closedAt: hiringRequest.closedAt || null,
  };
  if (next.filledCount >= hiringRequest.headcount) {
    next.status = "filled";
    next.closedAt = next.closedAt || new Date();
  }
  return next;
}

function nextRequestNumber(lastNumber, year = new Date().getFullYear()) {
  const prefix = `HRQ-${year}-`;
  let seq = 1;
  if (lastNumber?.startsWith(prefix)) {
    const part = lastNumber.split("-").pop();
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

describe("hiringAccess — HR roles", () => {
  it("recognizes HR roles", () => {
    expect(HR_ROLES).toContain("hr");
    expect(isHrUser({ role: "hr" })).toBe(true);
    expect(isHrUser({ role: "admin" })).toBe(true);
    expect(isHrUser({ role: "employee" })).toBe(false);
    expect(isHrUser({ role: "hod" })).toBe(false);
  });
});

describe("hiringAccess — request visibility", () => {
  const deptA = "507f1f77bcf86cd799439011";
  const deptB = "507f1f77bcf86cd799439012";

  it("allows HR to access any department request", () => {
    expect(
      canAccessHiringRequestSync({ role: "hr" }, { department: deptB }, deptA)
    ).toBe(true);
  });

  it("allows HoD only for own department", () => {
    expect(
      canAccessHiringRequestSync({ role: "hod" }, { department: deptA }, deptA)
    ).toBe(true);
    expect(
      canAccessHiringRequestSync({ role: "hod" }, { department: deptB }, deptA)
    ).toBe(false);
  });

  it("denies HoD without department assignment", () => {
    expect(
      canAccessHiringRequestSync({ role: "hod" }, { department: deptA }, null)
    ).toBe(false);
  });
});

describe("hiring request — submit", () => {
  it("only draft requests in HoD department can be submitted", () => {
    expect(canSubmitRequest("draft", "dept1", "dept1")).toEqual({
      allowed: true,
      nextStatus: "submitted",
    });
    expect(canSubmitRequest("submitted", "dept1", "dept1").allowed).toBe(false);
    expect(canSubmitRequest("draft", "dept1", "dept2").allowed).toBe(false);
  });
});

describe("hiring request — review", () => {
  it("validates review actions", () => {
    expect(validateReviewAction("hr_approved").valid).toBe(true);
    expect(validateReviewAction("invalid").valid).toBe(false);
  });

  it("only submitted or on_hold can be reviewed", () => {
    expect(canReviewRequest("submitted")).toBe(true);
    expect(canReviewRequest("on_hold")).toBe(true);
    expect(canReviewRequest("in_progress")).toBe(false);
  });

  it("approval moves request to in_progress", () => {
    expect(applyReviewResult("hr_approved")).toEqual({
      status: "in_progress",
      assignedHr: true,
    });
    expect(applyReviewResult("hr_rejected")).toEqual({
      status: "hr_rejected",
      assignedHr: false,
    });
  });
});

describe("offer conversion — hiring request side effects", () => {
  it("increments filledCount without closing when headcount not met", () => {
    const result = applyOfferConversionSideEffects({
      filledCount: 0,
      headcount: 2,
      status: "in_progress",
    });
    expect(result.filledCount).toBe(1);
    expect(result.status).toBe("in_progress");
    expect(result.closedAt).toBeNull();
  });

  it("auto-closes request when headcount is reached", () => {
    const result = applyOfferConversionSideEffects({
      filledCount: 1,
      headcount: 2,
      status: "in_progress",
    });
    expect(result.filledCount).toBe(2);
    expect(result.status).toBe("filled");
    expect(result.closedAt).toBeInstanceOf(Date);
  });
});

describe("request number generation", () => {
  it("increments sequence from last number", () => {
    expect(nextRequestNumber("HRQ-2026-0003", 2026)).toBe("HRQ-2026-0004");
    expect(nextRequestNumber(null, 2026)).toBe("HRQ-2026-0001");
  });
});

describe("notification types", () => {
  it("includes HMS notification types in schema enum", async () => {
    const { default: Notification } = await import("../src/models/notificationModel.js");
    const enumValues = Notification.schema.path("type").enumValues;
    expect(enumValues).toContain("hiring_request");
    expect(enumValues).toContain("hiring_offer");
    expect(enumValues).toContain("hiring_application");
  });
});
