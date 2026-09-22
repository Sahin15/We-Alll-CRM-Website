/**
 * Canonical department names — one entry per real department.
 * Legacy alias strings (e.g. "Video", "Posting Department") map here via DEPARTMENT_NAME_ALIASES.
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

/**
 * Maps legacy / duplicate names → single canonical name (case-insensitive keys).
 * Used when validating edits against old DB records and normalizing on save.
 */
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
 * Last-resort mapping for legacy DB department strings (prod vs local naming drift).
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

  const alias = DEPARTMENT_NAME_ALIASES[normalized];
  if (alias) return alias;

  return resolveLegacyDepartmentPatterns(normalized);
}

/** Departments that use the creative Main Task workflow (Graphic / Video Production). */
export const CREATIVE_DEPARTMENT_NAMES = new Set([
  "Graphic",
  "Video Production",
]);

/** Project team roles that imply Graphic / Video creative work (Create Project role picker). */
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
 * Whether assign-work should offer creative workflow + Posting handoff.
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
 * Prefer Graphics / Video when a project spans multiple departments.
 * @param {object|null|undefined} project
 * @returns {string|null} canonical department name
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
  if (canonical === "Graphic") return "design";
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
