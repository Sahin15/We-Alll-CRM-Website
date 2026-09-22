/**
 * Canonical department names — must match backend/src/constants/departmentNames.js
 */
export const CANONICAL_DEPARTMENT_NAMES = [
  "Content Writing",
  "Graphic",
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
  "content writing department": "Content Writing",
  engineering: "Development",
  design: "Graphic",
  graphics: "Graphic",
  "graphic design": "Graphic",
  "graphic designer": "Graphic",
  "graphics department": "Graphic",
  "human resources": "HR",
  marketing: "Social Media",
  "social media marketing": "Social Media",
  "posting department": "Posting",
  "posting dept": "Posting",
  video: "Video Production",
  "video editing": "Video Production",
  "video department": "Video Production",
};

/**
 * @param {string} normalized lowercased trimmed name
 * @returns {string|null}
 */
function resolveLegacyDepartmentPatterns(normalized) {
  if (
    normalized === "graphics" ||
    normalized === "graphic" ||
    normalized.includes("graphic design") ||
    (normalized.includes("graphic") && !normalized.includes("tele"))
  ) {
    return "Graphic";
  }
  if (
    normalized.includes("video production") ||
    normalized.includes("video edit") ||
    (normalized.includes("video") && !normalized.includes("telecaller"))
  ) {
    return "Video Production";
  }
  if (
    normalized.includes("posting") &&
    !normalized.includes("marketing") &&
    !normalized.includes("social")
  ) {
    return "Posting";
  }
  if (normalized.includes("social media")) {
    return "Social Media";
  }
  return null;
}

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

  const alias = DEPARTMENT_NAME_ALIASES[normalized];
  if (alias) return alias;

  return resolveLegacyDepartmentPatterns(normalized);
}

export const CREATIVE_DEPARTMENT_NAMES = new Set([
  "Graphic",
  "Video Production",
]);

export const CREATIVE_PROJECT_TEAM_ROLES = new Set([
  "graphic-designer",
  "ui-designer",
  "ux-designer",
  "designer",
  "video-editor",
  "video-creator",
  "photo-editor",
  "creative-director",
]);

/** @param {string|null|undefined} role @returns {boolean} */
export function isCreativeTeamRole(role) {
  if (!role || typeof role !== "string") return false;
  return CREATIVE_PROJECT_TEAM_ROLES.has(role.trim().toLowerCase());
}

/**
 * @param {object|null|undefined} project
 * @param {string|{ _id?: string }} userId
 * @returns {string|null}
 */
export function getProjectTeamMemberRole(project, userId) {
  if (!project?.teamMembers?.length || !userId) return null;
  const targetId = String(typeof userId === "object" ? userId._id : userId);
  const entry = project.teamMembers.find((member) => {
    if (member?.isActive === false) return false;
    const memberId = member.user?._id || member.user;
    return memberId && String(memberId) === targetId;
  });
  return entry?.role || null;
}

/**
 * @param {{ user?: { _id?: string, department?: { name?: string } }, project?: object|null }} params
 * @returns {boolean}
 */
export function assigneeQualifiesForCreativePosting({ user, project }) {
  if (user && isCreativeDepartmentName(user.department?.name)) {
    return true;
  }
  const userId = user?._id || user;
  if (project && userId && isCreativeTeamRole(getProjectTeamMemberRole(project, userId))) {
    return true;
  }
  return false;
}

/**
 * @param {object|null|undefined} project
 * @returns {string[]}
 */
export function collectProjectDepartmentNames(project) {
  if (!project) return [];
  const names = [];
  if (project.department) {
    if (typeof project.department === "object" && project.department.name) {
      names.push(project.department.name);
    }
  }
  if (Array.isArray(project.departments)) {
    project.departments.forEach((dept) => {
      if (typeof dept === "object" && dept?.name) {
        names.push(dept.name);
      }
    });
  }
  return names;
}

/**
 * @param {object|null|undefined} project
 * @returns {string|null}
 */
export function resolvePrimaryProjectCreativeDepartment(project) {
  const names = collectProjectDepartmentNames(project);
  for (const name of names) {
    const canonical = resolveCanonicalDepartmentName(name);
    if (canonical && CREATIVE_DEPARTMENT_NAMES.has(canonical)) {
      return canonical;
    }
  }
  if (names.length > 0) {
    return resolveCanonicalDepartmentName(names[0]);
  }
  return null;
}

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
  if (canonical === "Graphic") return "design";
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
