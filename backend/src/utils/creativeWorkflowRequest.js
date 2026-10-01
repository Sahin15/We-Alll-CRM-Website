import {
  getCreativeWorkflowTypeForDepartment,
  resolvePrimaryProjectCreativeDepartment,
} from "../constants/departmentNames.js";

const CREATIVE_WORKFLOW_TYPES = new Set([
  "design",
  "design-advanced",
  "video-production",
]);

/**
 * Apply creative vs standard workflow from API body (explicit toggle + legacy fields).
 * @param {Record<string, unknown>} workItemData
 * @param {Record<string, unknown>} body
 * @param {{ assigneeDepartmentNames?: string[], projectDepartmentNames?: string[] }} [context]
 */
export function applyCreativeWorkflowFromRequest(workItemData, body, context = {}) {
  const useCreativeWorkflow = body.useCreativeWorkflow;
  const workflowMode = body.workflowMode;
  const workflowType = body.workflowType;

  const explicitStandard =
    useCreativeWorkflow === false || workflowMode === "standard";

  const explicitCreative =
    useCreativeWorkflow === true ||
    workflowMode === "creative" ||
    (workflowType && CREATIVE_WORKFLOW_TYPES.has(String(workflowType)));

  if (explicitStandard && !explicitCreative) {
    workItemData.workflowMode = "standard";
    if (
      !workflowType ||
      workflowType === "standard" ||
      CREATIVE_WORKFLOW_TYPES.has(String(workItemData.workflowType))
    ) {
      workItemData.workflowType = "standard";
    }
    return;
  }

  if (!explicitCreative) {
    return;
  }

  workItemData.workflowMode = "creative";

  if (workflowType && CREATIVE_WORKFLOW_TYPES.has(String(workflowType))) {
    workItemData.workflowType = workflowType;
    return;
  }

  const deptNameSources = [
    ...(context.projectDepartmentNames || []),
    ...(context.assigneeDepartmentNames || []),
  ].filter(Boolean);

  const resolvedTypes = deptNameSources
    .map((name) => getCreativeWorkflowTypeForDepartment(name))
    .filter(Boolean);

  workItemData.workflowType = resolvedTypes.includes("video-production")
    ? "video-production"
    : "design";
}

/**
 * @param {object|null|undefined} project
 * @returns {string[]}
 */
export function collectProjectDepartmentNameList(project) {
  if (!project) return [];
  const names = [];
  const primary = resolvePrimaryProjectCreativeDepartment(project);
  if (primary) names.push(primary);
  if (project.department?.name) names.push(project.department.name);
  if (Array.isArray(project.departments)) {
    project.departments.forEach((dept) => {
      if (dept?.name) names.push(dept.name);
    });
  }
  return names;
}
