/**
 * Keep assignedUsers and teamMembers in sync.
 * Legacy data often has people in assignedUsers only — they can see the project
 * but disappear from the Team tab (which prefers teamMembers when non-empty).
 */

/**
 * @param {object} project
 * @returns {string[]}
 */
export function collectProjectRosterUserIds(project) {
  if (!project) return [];

  const ids = new Set();

  const headId = String(project.projectHead?._id || project.projectHead || "");
  if (headId && headId !== "undefined" && headId !== "null") {
    ids.add(headId);
  }

  for (const user of project.assignedUsers || []) {
    const id = String(user?._id || user || "");
    if (id) ids.add(id);
  }

  for (const member of project.teamMembers || []) {
    if (member?.isActive === false) continue;
    const id = String(member?.user?._id || member?.user || "");
    if (id) ids.add(id);
  }

  return [...ids];
}

/**
 * User IDs present on assignedUsers / projectHead but missing from active teamMembers.
 *
 * @param {object} project
 * @returns {string[]}
 */
export function getMissingTeamMemberUserIds(project) {
  if (!project) return [];

  const activeTeamIds = new Set(
    (project.teamMembers || [])
      .filter((member) => member?.isActive !== false)
      .map((member) => String(member?.user?._id || member?.user || ""))
      .filter(Boolean)
  );

  const missing = [];

  for (const user of project.assignedUsers || []) {
    const id = String(user?._id || user || "");
    if (id && !activeTeamIds.has(id)) {
      missing.push(id);
    }
  }

  const headId = String(project.projectHead?._id || project.projectHead || "");
  if (headId && headId !== "undefined" && headId !== "null" && !activeTeamIds.has(headId)) {
    missing.push(headId);
  }

  return [...new Set(missing)];
}

/**
 * Persist missing teamMembers rows for assignedUsers / projectHead.
 * Mutates and saves a mongoose document when changes are needed.
 *
 * @param {import('mongoose').Document} projectDoc
 * @param {{ assignedBy?: import('mongoose').Types.ObjectId | string | null }} [options]
 * @returns {Promise<{ healed: boolean, addedUserIds: string[] }>}
 */
export async function healProjectTeamMembership(projectDoc, options = {}) {
  if (!projectDoc) {
    return { healed: false, addedUserIds: [] };
  }

  if (!Array.isArray(projectDoc.teamMembers)) {
    projectDoc.teamMembers = [];
  }
  if (!Array.isArray(projectDoc.assignedUsers)) {
    projectDoc.assignedUsers = [];
  }

  const missingIds = getMissingTeamMemberUserIds(projectDoc);
  if (missingIds.length === 0) {
    return { healed: false, addedUserIds: [] };
  }

  const headId = String(projectDoc.projectHead?._id || projectDoc.projectHead || "");
  const assignedIdSet = new Set(
    (projectDoc.assignedUsers || []).map((user) => String(user?._id || user || ""))
  );

  for (const userId of missingIds) {
    const inactive = projectDoc.teamMembers.find(
      (member) =>
        String(member?.user?._id || member?.user || "") === userId &&
        member?.isActive === false
    );

    if (inactive) {
      inactive.isActive = true;
      if (!inactive.role) {
        inactive.role = userId === headId ? "project-head" : "other";
      }
    } else {
      projectDoc.teamMembers.push({
        user: userId,
        role: userId === headId ? "project-head" : "other",
        assignedBy: options.assignedBy || null,
        assignedAt: new Date(),
        isActive: true,
      });
    }

    if (!assignedIdSet.has(userId)) {
      projectDoc.assignedUsers.push(userId);
      assignedIdSet.add(userId);
    }
  }

  await projectDoc.save();
  return { healed: true, addedUserIds: missingIds };
}
