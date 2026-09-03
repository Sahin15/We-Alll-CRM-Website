/**
 * Employee ID utilities — format WA-YY-XXXX (e.g. WA-26-0002)
 */
import api from "../api/axios";

export const EMPLOYEE_ID_PATTERN = /^WA-\d{2}-\d{4}$/i;

/**
 * Display helper — never substitute MongoDB _id for employee ID.
 * @param {string|null|undefined} employeeId
 * @param {string} [fallback='Not assigned']
 * @returns {string}
 */
export const formatEmployeeIdDisplay = (employeeId, fallback = "Not assigned") => {
  const value = typeof employeeId === "string" ? employeeId.trim() : "";
  return value || fallback;
};

/**
 * @param {string|null|undefined} value
 * @returns {string}
 */
export const normalizeEmployeeId = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().toUpperCase();
};

/**
 * @param {Date|string} joiningDate
 * @param {number} sequenceNumber
 * @returns {string}
 */
export const formatEmployeeId = (joiningDate, sequenceNumber) => {
  if (!joiningDate) {
    throw new Error("Joining date is required");
  }

  const date = new Date(joiningDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid joining date");
  }

  if (!sequenceNumber || sequenceNumber < 1) {
    throw new Error("Sequence number must be greater than 0");
  }

  const year = date.getFullYear().toString().slice(-2);
  const sequence = String(sequenceNumber).padStart(4, "0");
  return `WA-${year}-${sequence}`;
};

/**
 * Request the next employee ID from the backend (respects existing WA-YY-XXXX records).
 * @param {string} joiningDate - YYYY-MM-DD
 * @param {string} employmentType
 * @param {string} [excludeUserId] - optional user id to ignore in collision checks
 * @returns {Promise<string>}
 */
export const generateNewEmployeeId = async (
  joiningDate,
  employmentType,
  excludeUserId = null
) => {
  if (!joiningDate) {
    throw new Error("Joining date is required");
  }

  if (employmentType !== "full-time") {
    throw new Error("Only permanent (full-time) employees can be assigned an employee ID");
  }

  try {
    const response = await api.post("/users/next-employee-id-sequence", {
      joiningDate,
      employmentType,
      excludeUserId,
    });

    const employeeId = response.data?.employeeId;
    if (!employeeId) {
      throw new Error("Server did not return an employee ID");
    }

    return employeeId;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to generate employee ID";
    throw new Error(message);
  }
};
