/**
 * Employee ID format: WA-YY-XXXX (e.g. WA-26-0002)
 * - WA: company prefix
 * - YY: last two digits of joining year
 * - XXXX: global sequence (4 digits, zero-padded)
 */

const EMPLOYEE_ID_REGEX = /^WA-(\d{2})-(\d{4})$/i;

/**
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function normalizeEmployeeId(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim().toUpperCase();
}

/**
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export function isValidEmployeeIdFormat(value) {
  return EMPLOYEE_ID_REGEX.test(normalizeEmployeeId(value));
}

/**
 * @param {import('mongoose').Model} User
 * @param {string} employeeId
 * @param {string|null} [excludeUserId]
 * @returns {Promise<boolean>}
 */
export async function isEmployeeIdTaken(User, employeeId, excludeUserId = null) {
  const normalized = normalizeEmployeeId(employeeId);
  if (!normalized) {
    return false;
  }

  const filter = {
    employeeId: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  };
  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  return Boolean(await User.exists(filter));
}

/**
 * @param {Date|string} joiningDate
 * @param {number} sequenceNumber
 * @returns {string}
 */
export function formatEmployeeId(joiningDate, sequenceNumber) {
  if (!joiningDate) {
    throw new Error("Joining date is required");
  }

  const date = new Date(joiningDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid joining date");
  }

  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error("Sequence number must be a positive integer");
  }

  const year = date.getFullYear().toString().slice(-2);
  const sequence = String(sequenceNumber).padStart(4, "0");
  return `WA-${year}-${sequence}`;
}

/**
 * Extract the numeric sequence from a WA-YY-XXXX employee ID.
 * @param {string|null|undefined} employeeId
 * @returns {number|null}
 */
export function parseEmployeeIdSequence(employeeId) {
  if (!employeeId || typeof employeeId !== "string") {
    return null;
  }

  const match = employeeId.trim().toUpperCase().match(EMPLOYEE_ID_REGEX);
  if (!match) {
    return null;
  }

  const sequence = parseInt(match[2], 10);
  return Number.isNaN(sequence) ? null : sequence;
}

/**
 * @param {import('mongoose').Model} User
 * @returns {Promise<number>}
 */
export async function getMaxEmployeeIdSequence(User) {
  const employeesWithIds = await User.find({
    employeeId: { $exists: true, $nin: [null, ""] },
  })
    .select("employeeId")
    .lean();

  let maxSequence = 1;

  for (const employee of employeesWithIds) {
    const sequence = parseEmployeeIdSequence(employee.employeeId);
    if (sequence !== null && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return maxSequence;
}

/**
 * Allocate the next unique employee ID while preserving the WA-YY-XXXX template.
 * @param {import('mongoose').Model} User
 * @param {{ joiningDate: string|Date, employmentType?: string, excludeUserId?: string }} options
 * @returns {Promise<{ employeeId: string, sequence: number }>}
 */
export async function generateNextEmployeeId(User, options = {}) {
  const { joiningDate, employmentType, excludeUserId = null } = options;

  if (!joiningDate) {
    throw new Error("Joining date is required");
  }

  if (employmentType && employmentType !== "full-time") {
    throw new Error("Only permanent (full-time) employees can be assigned an employee ID");
  }

  const maxSequence = await getMaxEmployeeIdSequence(User);
  let candidateSequence = maxSequence + 1;
  let employeeId = formatEmployeeId(joiningDate, candidateSequence);

  let attempts = 0;
  while (await isEmployeeIdTaken(User, employeeId, excludeUserId)) {
    candidateSequence += 1;
    employeeId = formatEmployeeId(joiningDate, candidateSequence);
    attempts += 1;
    if (attempts > 1000) {
      throw new Error("Unable to allocate a unique employee ID");
    }
  }

  return {
    employeeId: normalizeEmployeeId(employeeId),
    sequence: candidateSequence,
  };
}
