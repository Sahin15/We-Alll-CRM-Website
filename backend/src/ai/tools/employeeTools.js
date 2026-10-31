import User from '../../models/userModel.js';
import Department from '../../models/departmentModel.js';
import { AiAccessError } from '../aiErrors.js';
import {
  assertDepartmentInScope,
  isWideScope,
  ownDepartmentId,
  requirePermission,
} from '../aiAccess.js';
import { findDepartmentByName } from '../departmentLookup.js';

/**
 * Headcount by role. Names, contact details, and pay are not loaded.
 * @param {object} user
 * @param {{ departmentName?: string }} args
 */
export async function getEmployeeSummary(user, args = {}) {
  const decision = requirePermission(
    user,
    'team.user.view',
    'You do not have permission to view employee summaries.'
  );

  const filter = {
    isActive: { $ne: false },
    role: { $nin: ['client'] },
  };
  let departmentName = '';

  if (args.departmentName) {
    const department = await findDepartmentByName(args.departmentName);
    assertDepartmentInScope(user, decision, department._id);
    filter.department = department._id;
    departmentName = department.name;
  } else if (!isWideScope(decision.scope)) {
    const own = ownDepartmentId(user);
    if (!own) {
      throw new AiAccessError(403, 'You can only view information for your own department.');
    }
    const department = await Department.findById(own).select('_id name').lean();
    if (!department) {
      throw new AiAccessError(400, 'That department was not found.');
    }
    filter.department = department._id;
    departmentName = department.name;
  }

  const rows = await User.find(filter).select('role').limit(1000).lean();
  const byRole = {};
  for (const row of rows) {
    const role = row.role || 'unknown';
    byRole[role] = (byRole[role] || 0) + 1;
  }

  return {
    type: 'employee_summary',
    departmentName,
    total: rows.length,
    byRole,
  };
}
