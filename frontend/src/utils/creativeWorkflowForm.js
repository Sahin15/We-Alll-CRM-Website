import {
  assigneeQualifiesForCreativePosting,
  getCreativeWorkflowTypeForDepartment,
  resolvePrimaryProjectCreativeDepartment,
} from '../constants/departmentNames';

/**
 * Default creative workflow ON for Graphic / Video assignees (or creative project roles).
 * @param {object|null} project
 * @param {Array<object|null|undefined>} assigneeUsers
 * @returns {boolean}
 */
export function getDefaultUseCreativeWorkflow(project, assigneeUsers = []) {
  return assigneeUsers.some((user) =>
    assigneeQualifiesForCreativePosting({ user, project })
  );
}

/**
 * @param {object|null} project
 * @param {Array<object|null|undefined>} assigneeUsers
 * @returns {'design'|'video-production'}
 */
export function resolveCreativeWorkflowType(project, assigneeUsers = []) {
  const deptNameSources = [];
  const primary = resolvePrimaryProjectCreativeDepartment(project);
  if (primary) deptNameSources.push(primary);
  assigneeUsers.forEach((user) => {
    if (user?.department?.name) {
      deptNameSources.push(user.department.name);
    }
  });
  const workflowTypes = deptNameSources
    .map((name) => getCreativeWorkflowTypeForDepartment(name))
    .filter(Boolean);
  return workflowTypes.includes('video-production') ? 'video-production' : 'design';
}

/**
 * Payload fields for work item create/update from the form toggle.
 * @param {boolean} useCreativeWorkflow
 * @param {object|null} project
 * @param {Array<object|null|undefined>} assigneeUsers
 * @returns {{ useCreativeWorkflow: boolean, workflowMode: string, workflowType: string }}
 */
export function buildCreativeWorkflowPayload(
  useCreativeWorkflow,
  project,
  assigneeUsers = []
) {
  if (!useCreativeWorkflow) {
    return {
      useCreativeWorkflow: false,
      workflowMode: 'standard',
      workflowType: 'standard',
    };
  }
  return {
    useCreativeWorkflow: true,
    workflowMode: 'creative',
    workflowType: resolveCreativeWorkflowType(project, assigneeUsers),
  };
}
