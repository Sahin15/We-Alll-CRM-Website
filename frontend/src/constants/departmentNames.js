/**
 * Canonical department names — must match backend/src/constants/departmentNames.js
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

/** Legacy names that map to a canonical department (case-insensitive keys). */
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

/**
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
 * Names not yet created in the database (case-insensitive).
 * @param {string[]} existingNames
 * @returns {string[]}
 */
export function getAvailableDepartmentNames(existingNames = []) {
  const taken = new Set(
    existingNames.map((name) => String(name).trim().toLowerCase())
  );
  return CANONICAL_DEPARTMENT_NAMES.filter(
    (name) => !taken.has(name.toLowerCase())
  );
}

/**
 * Options for edit mode — canonical list plus any legacy DB name not yet aliased away.
 * @param {string[]} existingNames
 * @returns {string[]}
 */
export function getDepartmentNameOptions(existingNames = []) {
  const merged = new Set(CANONICAL_DEPARTMENT_NAMES);
  existingNames.forEach((name) => {
    const canonical =
      CANONICAL_DEPARTMENT_NAMES.find(
        (dept) => dept.toLowerCase() === String(name).trim().toLowerCase()
      ) ||
      DEPARTMENT_NAME_ALIASES[String(name).trim().toLowerCase()] ||
      name;
    merged.add(canonical);
  });
  return Array.from(merged).sort((a, b) => a.localeCompare(b));
}
