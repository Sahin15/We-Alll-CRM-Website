import Department from '../models/departmentModel.js';
import { AiAccessError } from './aiErrors.js';

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Exact department name match. Does not list other departments.
 * @param {string} name
 */
export async function findDepartmentByName(name) {
  const department = await Department.findOne({
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  })
    .select('_id name')
    .lean();

  if (!department) {
    throw new AiAccessError(400, 'That department was not found.');
  }
  return department;
}
