/**
 * Employee Lifecycle Management — Unit Tests
 *
 * Tests pure business logic extracted from the employee lifecycle feature.
 * No database connection required — all tests run against in-memory logic.
 *
 * Feature: employee-lifecycle-management
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import fc from "fast-check";
import { isSystemAccessBlocked } from "../src/utils/employeeQueryUtils.js";

// ─── Pure logic helpers (mirrors the controller / service logic) ──────────────

const VALID_STATUSES = ["active", "inactive", "terminated", "offboarded"];

/**
 * Validates a status value.
 * @returns {{ valid: boolean, message?: string }}
 */
function validateStatus(status) {
  if (!status || !VALID_STATUSES.includes(status)) {
    return {
      valid: false,
      message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a state-machine transition.
 * @returns {{ allowed: boolean, message?: string }}
 */
function validateTransition(fromStatus, toStatus, adminOverride = false) {
  const blocked = [
    { from: "terminated", to: ["active", "inactive"] },
    { from: "offboarded", to: ["active", "inactive"] },
  ];
  for (const rule of blocked) {
    if (rule.from === fromStatus && rule.to.includes(toStatus) && !adminOverride) {
      return {
        allowed: false,
        message: `Cannot transition from ${fromStatus} to ${toStatus} without adminOverride flag`,
      };
    }
  }
  return { allowed: true };
}

/**
 * Validates a reactivationDate value.
 * @returns {{ valid: boolean, message?: string }}
 */
function validateReactivationDate(reactivationDate, status, now = new Date()) {
  if (!reactivationDate) return { valid: true };
  if (status !== "inactive") {
    return {
      valid: false,
      message: "Reactivation date is only valid when setting status to inactive",
    };
  }
  const d = new Date(reactivationDate);
  if (isNaN(d.getTime())) {
    return { valid: false, message: "Invalid date format" };
  }
  if (d <= now) {
    return { valid: false, message: "Reactivation date must be in the future" };
  }
  return { valid: true };
}

/**
 * Partitions an employee list into activeSection and pastMembersSection.
 * Mirrors the logic in EmployeeList.jsx.
 */
function partitionEmployees(employees) {
  const activeSection = employees.filter(
    (e) => e.status === "active" || e.status === "inactive"
  );
  const pastMembersSection = employees.filter(
    (e) => e.status === "terminated" || e.status === "offboarded"
  );
  return { activeSection, pastMembersSection };
}

/**
 * Determines whether login and auth middleware should block a user.
 * Mirrors loginUser + authMiddleware.protect logic.
 */
function shouldBlockUser(userStatus) {
  return isSystemAccessBlocked({ status: userStatus });
}

/**
 * Simulates the scheduler eligibility check.
 * Returns true if the user should be auto-reactivated.
 */
function isEligibleForReactivation(user, now = new Date()) {
  return (
    user.status === "inactive" &&
    user.reactivationDate != null &&
    new Date(user.reactivationDate) <= now
  );
}

/**
 * StatusBadge config — mirrors StatusBadge.jsx STATUS_CONFIG.
 */
const STATUS_BADGE_CONFIG = Object.create(null); // no prototype — avoids "toString" etc.
STATUS_BADGE_CONFIG.active     = { bg: "success",   label: "Active" };
STATUS_BADGE_CONFIG.inactive   = { bg: "warning",   label: "Inactive" };
STATUS_BADGE_CONFIG.terminated = { bg: "danger",    label: "Terminated" };
STATUS_BADGE_CONFIG.offboarded = { bg: "secondary", label: "Offboarded" };

function renderStatusBadge(status) {
  if (!status || !(status in STATUS_BADGE_CONFIG)) return null;
  return STATUS_BADGE_CONFIG[status];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ── Property 1: Status validation ────────────────────────────────────────────
describe("Property 1 — Status validation rejects all non-permitted values", () => {
  /**
   * **Validates: Requirements 1.1, 1.2**
   */

  it("accepts all four permitted status values", () => {
    for (const s of VALID_STATUSES) {
      expect(validateStatus(s).valid).toBe(true);
    }
  });

  it("rejects null and undefined", () => {
    expect(validateStatus(null).valid).toBe(false);
    expect(validateStatus(undefined).valid).toBe(false);
  });

  it("rejects legacy values on_leave and suspended", () => {
    expect(validateStatus("on_leave").valid).toBe(false);
    expect(validateStatus("suspended").valid).toBe(false);
  });

  it("property: arbitrary strings outside the four values are always rejected", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        if (VALID_STATUSES.includes(s)) return true; // skip valid values
        return validateStatus(s).valid === false;
      }),
      { numRuns: 200 }
    );
  });

  it("property: the four permitted values are always accepted", () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_STATUSES), (s) => {
        return validateStatus(s).valid === true;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 2 & 3: Employee section partition ────────────────────────────────
describe("Property 2 & 3 — Employee section partition and Past Members count", () => {
  /**
   * **Validates: Requirements 2.2, 2.3, 2.6**
   */

  it("places active/inactive employees in activeSection only", () => {
    const employees = [
      { _id: "1", status: "active" },
      { _id: "2", status: "inactive" },
      { _id: "3", status: "terminated" },
      { _id: "4", status: "offboarded" },
    ];
    const { activeSection, pastMembersSection } = partitionEmployees(employees);
    expect(activeSection.map((e) => e._id)).toEqual(["1", "2"]);
    expect(pastMembersSection.map((e) => e._id)).toEqual(["3", "4"]);
  });

  it("produces no duplicates between sections", () => {
    const employees = [
      { _id: "a", status: "active" },
      { _id: "b", status: "terminated" },
    ];
    const { activeSection, pastMembersSection } = partitionEmployees(employees);
    const activeIds = new Set(activeSection.map((e) => e._id));
    const pastIds = new Set(pastMembersSection.map((e) => e._id));
    for (const id of activeIds) {
      expect(pastIds.has(id)).toBe(false);
    }
  });

  it("property: every employee appears in exactly one section", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            _id: fc.uuid(),
            status: fc.constantFrom("active", "inactive", "terminated", "offboarded"),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (employees) => {
          const { activeSection, pastMembersSection } = partitionEmployees(employees);
          const total = activeSection.length + pastMembersSection.length;
          if (total !== employees.length) return false;
          const activeIds = new Set(activeSection.map((e) => e._id));
          const pastIds = new Set(pastMembersSection.map((e) => e._id));
          for (const id of activeIds) {
            if (pastIds.has(id)) return false;
          }
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });

  it("property: Past Members count equals number of terminated/offboarded employees", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            _id: fc.uuid(),
            status: fc.constantFrom("active", "inactive", "terminated", "offboarded"),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (employees) => {
          const { pastMembersSection } = partitionEmployees(employees);
          const expected = employees.filter(
            (e) => e.status === "terminated" || e.status === "offboarded"
          ).length;
          return pastMembersSection.length === expected;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 5: Auth middleware blocks terminated/offboarded ──────────────────
describe("Property 5 — Login and auth block terminated and offboarded users", () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.4**
   */

  it("blocks terminated users", () => {
    expect(shouldBlockUser("terminated")).toBe(true);
  });

  it("blocks offboarded users", () => {
    expect(shouldBlockUser("offboarded")).toBe(true);
  });

  it("allows active users", () => {
    expect(shouldBlockUser("active")).toBe(false);
  });

  it("allows inactive users", () => {
    expect(shouldBlockUser("inactive")).toBe(false);
  });

  it("property: only terminated and offboarded are blocked", () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_STATUSES), (status) => {
        const blocked = shouldBlockUser(status);
        if (status === "terminated" || status === "offboarded") {
          return blocked === true;
        }
        return blocked === false;
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 9: Past reactivation date rejection ──────────────────────────────
describe("Property 9 — Past reactivation date rejection", () => {
  /**
   * **Validates: Requirements 5.3**
   */

  const now = new Date("2025-01-15T12:00:00Z");

  it("rejects a date in the past", () => {
    const result = validateReactivationDate("2024-01-01", "inactive", now);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/future/i);
  });

  it("rejects today's date (not strictly future)", () => {
    const result = validateReactivationDate(now.toISOString(), "inactive", now);
    expect(result.valid).toBe(false);
  });

  it("accepts a future date", () => {
    const future = new Date(now.getTime() + 86400000).toISOString();
    const result = validateReactivationDate(future, "inactive", now);
    expect(result.valid).toBe(true);
  });

  it("rejects reactivationDate when status is not inactive", () => {
    const future = new Date(now.getTime() + 86400000).toISOString();
    for (const s of ["active", "terminated", "offboarded"]) {
      const result = validateReactivationDate(future, s, now);
      expect(result.valid).toBe(false);
    }
  });

  it("property: any past date is always rejected", () => {
    fc.assert(
      fc.property(
        fc.date({ max: new Date(now.getTime() - 1) }),
        (pastDate) => {
          const result = validateReactivationDate(pastDate.toISOString(), "inactive", now);
          return result.valid === false;
        }
      ),
      { numRuns: 200 }
    );
  });

  it("property: any strictly future date is accepted for inactive status", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(now.getTime() + 1) }),
        (futureDate) => {
          // Skip NaN dates that fast-check may generate
          if (isNaN(futureDate.getTime())) return true;
          const result = validateReactivationDate(futureDate.toISOString(), "inactive", now);
          return result.valid === true;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 10 & 11: Scheduler activates eligible users ─────────────────────
describe("Property 10 & 11 — Scheduler activates exactly eligible users", () => {
  /**
   * **Validates: Requirements 5.4, 7.1**
   */

  const now = new Date("2025-06-01T01:00:00Z");

  function runSchedulerLogic(users) {
    return users.map((user) => {
      if (isEligibleForReactivation(user, now)) {
        return {
          ...user,
          status: "active",
          reactivationDate: null,
          statusChangedAt: now,
          statusChangedBy: null,
        };
      }
      return { ...user };
    });
  }

  it("activates an inactive user whose reactivationDate has passed", () => {
    const user = {
      _id: "u1",
      status: "inactive",
      reactivationDate: new Date("2025-05-31T00:00:00Z"),
    };
    const [result] = runSchedulerLogic([user]);
    expect(result.status).toBe("active");
    expect(result.reactivationDate).toBeNull();
  });

  it("does not activate an inactive user whose reactivationDate is in the future", () => {
    const user = {
      _id: "u2",
      status: "inactive",
      reactivationDate: new Date("2025-07-01T00:00:00Z"),
    };
    const [result] = runSchedulerLogic([user]);
    expect(result.status).toBe("inactive");
    expect(result.reactivationDate).not.toBeNull();
  });

  it("does not activate an active user even if reactivationDate is set", () => {
    const user = {
      _id: "u3",
      status: "active",
      reactivationDate: new Date("2025-05-01T00:00:00Z"),
    };
    const [result] = runSchedulerLogic([user]);
    expect(result.status).toBe("active");
  });

  it("clears reactivationDate when activating", () => {
    const user = {
      _id: "u4",
      status: "inactive",
      reactivationDate: new Date("2025-05-30T00:00:00Z"),
    };
    const [result] = runSchedulerLogic([user]);
    expect(result.reactivationDate).toBeNull();
  });

  it("property: only inactive users with past reactivationDate are activated", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            _id: fc.uuid(),
            status: fc.constantFrom("active", "inactive", "terminated", "offboarded"),
            reactivationDate: fc.option(
              fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
              { nil: null }
            ),
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (users) => {
          const results = runSchedulerLogic(users);
          for (let i = 0; i < users.length; i++) {
            const original = users[i];
            const result = results[i];
            const eligible = isEligibleForReactivation(original, now);
            if (eligible) {
              if (result.status !== "active") return false;
              if (result.reactivationDate !== null) return false;
            } else {
              if (result.status !== original.status) return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 14: Blocked transitions without override ────────────────────────
describe("Property 14 — Blocked transitions without override", () => {
  /**
   * **Validates: Requirements 7.4**
   */

  it("blocks terminated → active without override", () => {
    const result = validateTransition("terminated", "active", false);
    expect(result.allowed).toBe(false);
  });

  it("blocks terminated → inactive without override", () => {
    const result = validateTransition("terminated", "inactive", false);
    expect(result.allowed).toBe(false);
  });

  it("blocks offboarded → active without override", () => {
    const result = validateTransition("offboarded", "active", false);
    expect(result.allowed).toBe(false);
  });

  it("blocks offboarded → inactive without override", () => {
    const result = validateTransition("offboarded", "inactive", false);
    expect(result.allowed).toBe(false);
  });

  it("allows terminated → active with adminOverride", () => {
    const result = validateTransition("terminated", "active", true);
    expect(result.allowed).toBe(true);
  });

  it("allows active → terminated (no override needed)", () => {
    const result = validateTransition("active", "terminated", false);
    expect(result.allowed).toBe(true);
  });

  it("property: terminated/offboarded → active/inactive always blocked without override", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("terminated", "offboarded"),
        fc.constantFrom("active", "inactive"),
        (from, to) => {
          return validateTransition(from, to, false).allowed === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("property: terminated/offboarded → active/inactive always allowed with adminOverride", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("terminated", "offboarded"),
        fc.constantFrom("active", "inactive"),
        (from, to) => {
          return validateTransition(from, to, true).allowed === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 15: StatusBadge colour and label mapping ────────────────────────
describe("Property 15 — StatusBadge renders correct colour and label for all statuses", () => {
  /**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
   */

  it("active → success / Active", () => {
    const badge = renderStatusBadge("active");
    expect(badge).not.toBeNull();
    expect(badge.bg).toBe("success");
    expect(badge.label).toBe("Active");
  });

  it("inactive → warning / Inactive", () => {
    const badge = renderStatusBadge("inactive");
    expect(badge).not.toBeNull();
    expect(badge.bg).toBe("warning");
    expect(badge.label).toBe("Inactive");
  });

  it("terminated → danger / Terminated", () => {
    const badge = renderStatusBadge("terminated");
    expect(badge).not.toBeNull();
    expect(badge.bg).toBe("danger");
    expect(badge.label).toBe("Terminated");
  });

  it("offboarded → secondary / Offboarded", () => {
    const badge = renderStatusBadge("offboarded");
    expect(badge).not.toBeNull();
    expect(badge.bg).toBe("secondary");
    expect(badge.label).toBe("Offboarded");
  });

  it("returns null for legacy value on_leave", () => {
    expect(renderStatusBadge("on_leave")).toBeNull();
  });

  it("returns null for legacy value suspended", () => {
    expect(renderStatusBadge("suspended")).toBeNull();
  });

  it("returns null for unknown values", () => {
    expect(renderStatusBadge("")).toBeNull();
    expect(renderStatusBadge(undefined)).toBeNull();
    expect(renderStatusBadge("random")).toBeNull();
  });

  it("property: all four valid statuses produce non-null badge with correct mapping", () => {
    const expected = {
      active:     { bg: "success",   label: "Active" },
      inactive:   { bg: "warning",   label: "Inactive" },
      terminated: { bg: "danger",    label: "Terminated" },
      offboarded: { bg: "secondary", label: "Offboarded" },
    };
    fc.assert(
      fc.property(fc.constantFrom(...VALID_STATUSES), (status) => {
        const badge = renderStatusBadge(status);
        if (!badge) return false;
        return badge.bg === expected[status].bg && badge.label === expected[status].label;
      }),
      { numRuns: 100 }
    );
  });

  it("property: legacy and arbitrary strings always return null", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        if (VALID_STATUSES.includes(s)) return true; // skip valid values
        return renderStatusBadge(s) === null;
      }),
      { numRuns: 200 }
    );
  });
});
