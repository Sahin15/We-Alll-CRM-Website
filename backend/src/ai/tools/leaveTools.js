import LeaveRequest from '../../models/leaveRequestModel.js';
import User from '../../models/userModel.js';
import { can } from '../../authz/policyEngine.js';
import { AiAccessError } from '../aiErrors.js';
import { isWideScope, ownDepartmentId, requirePermission } from '../aiAccess.js';

/**
 * @param {object} user
 * @returns {{ mode: 'team'|'self', decision: object }}
 */
export function resolveLeaveAccess(user) {
  const team = can(user, 'leave.request.view');
  if (team.allowed) return { mode: 'team', decision: team };
  const self = requirePermission(
    user,
    'leave.request.view_self',
    'You do not have permission to view leave requests.'
  );
  return { mode: 'self', decision: self };
}

/**
 * Pending leave inside the caller's existing leave scope.
 * Reasons are omitted.
 * @param {object} user
 */
export async function getPendingLeaves(user) {
  const access = resolveLeaveAccess(user);
  const filter = { status: 'pending' };

  if (access.mode === 'team' && !isWideScope(access.decision.scope)) {
    const own = ownDepartmentId(user);
    if (!own) {
      throw new AiAccessError(403, 'You can only view information for your own department.');
    }
    const people = await User.find({ department: own }).select('_id').lean();
    filter.employee = { $in: people.map((person) => person._id) };
  }

  if (access.mode === 'self') {
    filter.employee = user._id;
  }

  let query = LeaveRequest.find(filter)
    .select('leaveType startDate endDate numberOfDays employee')
    .sort({ createdAt: -1 })
    .limit(20);

  if (access.mode === 'team') {
    query = query.populate('employee', 'name');
  }

  const rows = await query.lean();
  const items = rows.map((row) => ({
    leaveType: row.leaveType,
    startDate: row.startDate,
    endDate: row.endDate,
    days: row.numberOfDays,
    employeeName: access.mode === 'team' ? row.employee?.name || '' : '',
  }));

  return { type: 'pending_leaves', scope: access.mode, count: items.length, items };
}

/**
 * Leave balance for the signed-in person only.
 * @param {object} user
 */
export async function getMyLeaveBalance(user) {
  requirePermission(
    user,
    'leave.request.view_self',
    'You do not have permission to view leave balance.'
  );

  const balance = await LeaveRequest.getLeaveBalance(user._id);
  const earned = balance?.earned || {};
  return {
    type: 'leave_balance',
    remaining: earned.remaining || 0,
    earned: earned.earned || 0,
    used: earned.used || 0,
    eligible: Boolean(balance?.eligibleForPaidLeave),
  };
}
