import Project from '../../models/projectModel.js';
import Client from '../../models/clientModel.js';
import { buildProjectListQuery } from '../../services/resourceVisibilityService.js';
import { requirePermission } from '../aiAccess.js';

/**
 * Projects visible through the existing project list rules.
 * Credentials and member lists are not selected.
 * @param {object} user
 */
export async function getProjectStatus(user) {
  requirePermission(
    user,
    'projects.project.view',
    'You do not have permission to view projects.'
  );

  let query;
  if (user.role === 'client') {
    const client = await Client.findOne({ email: user.email }).select('_id').lean();
    if (!client) {
      return { type: 'project_status', count: 0, projects: [] };
    }
    query = { client: client._id };
  } else {
    query = buildProjectListQuery(user, {});
  }

  const rows = await Project.find(query)
    .select('name status progress')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  const projects = rows.map((row) => ({
    name: row.name,
    status: row.status,
    progress: typeof row.progress === 'number' ? row.progress : 0,
  }));

  return { type: 'project_status', count: projects.length, projects };
}
