import mongoose from 'mongoose';

/**
 * Stable valid MongoDB ObjectId for authz unit tests.
 * PROJECT-scoped permissions call scopeResolver → clientAccessService.toObjectId(),
 * which requires a 24-char hex string (real User._id shape).
 *
 * @param {string} [label] - Optional label for deterministic ids in debugging
 * @returns {mongoose.Types.ObjectId}
 */
export function testObjectId(label = 'user') {
  const hex = Buffer.from(String(label).padEnd(12, '0').slice(0, 12)).toString('hex');
  return new mongoose.Types.ObjectId(hex.padEnd(24, '0').slice(0, 24));
}

/**
 * Minimal user stub for policyEngine / authz middleware tests.
 *
 * @param {string} role
 * @param {object} [overrides]
 * @returns {{ _id: mongoose.Types.ObjectId, role: string }}
 */
export function makeAuthzTestUser(role, overrides = {}) {
  const label = overrides._idLabel || role;
  return {
    _id: overrides._id ?? testObjectId(label),
    role,
    ...overrides,
  };
}
