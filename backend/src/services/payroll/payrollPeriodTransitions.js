/**
 * Payroll period status machine (Milestone 1).
 * Pure helpers — no DB — so transitions can be unit-tested safely.
 */

export const PERIOD_STATUSES = Object.freeze([
  "open",
  "frozen",
  "locked",
  "paid",
]);

/** @type {Record<string, string[]>} */
const ALLOWED = Object.freeze({
  open: ["frozen"],
  frozen: ["open", "locked"],
  locked: ["frozen", "paid"],
  paid: [],
});

/** Named actions map to a single legal edge */
export const PERIOD_ACTIONS = Object.freeze({
  freeze: { from: "open", to: "frozen" },
  unfreeze: { from: "frozen", to: "open" },
  lock: { from: "frozen", to: "locked" },
  unlock: { from: "locked", to: "frozen", requireUnlockReason: true },
  markPaid: { from: "locked", to: "paid" },
});

/**
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export function canTransition(fromStatus, toStatus) {
  const allowed = ALLOWED[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * @param {string} fromStatus
 * @returns {string[]}
 */
export function getAllowedTransitions(fromStatus) {
  return [...(ALLOWED[fromStatus] || [])];
}

/**
 * Validate a status change. Unlock (locked → frozen) requires unlockReason.
 *
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {{ unlockReason?: string }} [options]
 * @throws {Error}
 */
export function assertTransition(fromStatus, toStatus, options = {}) {
  if (!canTransition(fromStatus, toStatus)) {
    throw new Error(
      `Cannot transition payroll period from ${fromStatus} to ${toStatus}`
    );
  }

  if (fromStatus === "locked" && toStatus === "frozen") {
    const reason =
      typeof options.unlockReason === "string"
        ? options.unlockReason.trim()
        : "";
    if (!reason) {
      throw new Error(
        "unlockReason is required to unlock a locked payroll period"
      );
    }
  }
}

/**
 * Validate a named payroll-period action against current status.
 *
 * @param {keyof typeof PERIOD_ACTIONS} action
 * @param {string} currentStatus
 * @param {{ unlockReason?: string }} [options]
 * @returns {{ toStatus: string }}
 * @throws {Error}
 */
export function assertPeriodAction(action, currentStatus, options = {}) {
  const spec = PERIOD_ACTIONS[action];
  if (!spec) {
    throw new Error(`Unknown payroll period action: ${action}`);
  }

  if (currentStatus !== spec.from) {
    throw new Error(
      `Cannot ${action} payroll period while status is ${currentStatus} (expected ${spec.from})`
    );
  }

  assertTransition(currentStatus, spec.to, {
    unlockReason: spec.requireUnlockReason ? options.unlockReason : undefined,
  });

  return { toStatus: spec.to };
}
