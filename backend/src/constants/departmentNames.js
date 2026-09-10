/**
 * Canonical department names — one entry per real department.
 * Legacy alias strings (e.g. "Video", "Posting Department") map here via DEPARTMENT_NAME_ALIASES.
 */
export const CANONICAL_DEPARTMENT_NAMES = [
  "Content Writing",
  "Graphics",
  "Development",
  "Digital Marketing",
  "Finance",
  "General",
  "HR",
  "IT",
  "Posting",
  "Sales",
  "Social Media",
  "Telecaller",
  "Video Production",
];

/**
 * Maps legacy / duplicate names → single canonical name (case-insensitive keys).
 * Used when validating edits against old DB records and normalizing on save.
 */
export const DEPARTMENT_NAME_ALIASES = {
  content: "Content Writing",
  "content posting": "Posting",
  engineering: "Development",
  design: "Graphics",
  "human resources": "HR",
  marketing: "Social Media",
  "posting department": "Posting",
  video: "Video Production",
};

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isCanonicalDepartmentName(name) {
  return resolveCanonicalDepartmentName(name) !== null;
}

/**
 * Resolve to the single canonical department name (exact or alias).
 * @param {string} name
 * @returns {string|null}
 */
export function resolveCanonicalDepartmentName(name) {
  if (!name || typeof name !== "string") return null;
  const normalized = name.trim().toLowerCase();

  const direct = CANONICAL_DEPARTMENT_NAMES.find(
    (dept) => dept.toLowerCase() === normalized
  );
  if (direct) return direct;

  return DEPARTMENT_NAME_ALIASES[normalized] || null;
}

/** Departments that use the creative Main Task workflow (Graphics / Video Production). */
export const CREATIVE_DEPARTMENT_NAMES = new Set([
  "Graphics",
  "Video Production",
]);

/** @param {string} name @returns {boolean} */
export function isCreativeDepartmentName(name) {
  const canonical = resolveCanonicalDepartmentName(name);
  return canonical !== null && CREATIVE_DEPARTMENT_NAMES.has(canonical);
}

/** @param {string} name @returns {boolean} */
export function isPostingDepartmentName(name) {
  return resolveCanonicalDepartmentName(name) === "Posting";
}

/** @param {string} name @returns {boolean} */
export function isHrDepartmentName(name) {
  return resolveCanonicalDepartmentName(name) === "HR";
}

/** @param {string} name @returns {boolean} */
export function isSalesDepartmentName(name) {
  return resolveCanonicalDepartmentName(name) === "Sales";
}

/** @param {string} name @returns {boolean} */
export function isTelecallerDepartmentName(name) {
  return resolveCanonicalDepartmentName(name) === "Telecaller";
}

/**
 * Creative Main Task workflowType for a department name.
 * @param {string} name
 * @returns {"design"|"video-production"|null}
 */
export function getCreativeWorkflowTypeForDepartment(name) {
  const canonical = resolveCanonicalDepartmentName(name);
  if (canonical === "Video Production") return "video-production";
  if (canonical === "Graphics") return "design";
  return null;
}

/**
 * Default department type for seeding.
 * @param {string} name
 * @returns {"operational"|"administrative"}
 */
export function getDefaultDepartmentType(name) {
  const canonical = resolveCanonicalDepartmentName(name) || name;
  return ["HR", "Finance", "IT"].includes(canonical)
    ? "administrative"
    : "operational";
}
