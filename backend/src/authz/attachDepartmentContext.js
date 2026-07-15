/**
 * Authorization V2 — Resolve user department name for legacy department gates.
 */

import Department from '../models/departmentModel.js';

/**
 * @param {import('express').Request} req
 * @returns {Promise<string|null>}
 */
export async function attachAuthzDepartmentName(req) {
  if (req.authzDepartmentName !== undefined) {
    return req.authzDepartmentName;
  }

  if (!req.user) {
    req.authzDepartmentName = null;
    return null;
  }

  if (!req.user.department) {
    req.authzDepartmentName = '';
    return '';
  }

  const department = await Department.findById(req.user.department).select('name').lean();
  req.authzDepartmentName = department?.name?.toLowerCase() || '';
  return req.authzDepartmentName;
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function attachDepartmentForAuthz(req, res, next) {
  try {
    await attachAuthzDepartmentName(req);
    next();
  } catch (error) {
    console.error('[authz] Failed to resolve department for authorization:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during authorization',
    });
  }
}
