import Attendance from '../../models/attendanceModel.js';
import WFHRequest from '../../models/wfhRequestModel.js';
import HiringRequest from '../../models/hiringRequestModel.js';
import { can } from '../../authz/policyEngine.js';
import { AiAccessError } from '../aiErrors.js';
import { isWideScope, ownDepartmentId } from '../aiAccess.js';

/**
 * @param {unknown} value
 */
function departmentId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || '');
}

/**
 * Pending overtime entries, matching the attendance approval list.
 * A head of department only counts their own department.
 * @param {object} user
 * @param {{ scope?: string }} decision
 */
async function countPendingOvertime(user, decision) {
  const records = await Attendance.find({ 'overtimeEntries.status': 'pending' })
    .populate({ path: 'employee', select: 'department' })
    .select('overtimeEntries employee')
    .lean();

  const own = isWideScope(decision.scope) ? '' : ownDepartmentId(user);
  let total = 0;
  for (const record of records || []) {
    const dept = departmentId(record.employee?.department);
    if (own && dept !== own) continue;
    for (const entry of record.overtimeEntries || []) {
      if (entry.status === 'pending') total += 1;
    }
  }
  return total;
}

/**
 * Pending overtime, work-from-home, and hiring counts.
 * Hiring uses the HR dashboard count for people who manage the pipeline,
 * and a department count for a head of department.
 * Work-from-home uses the same company pending list as that screen.
 * @param {object} user
 */
export async function getPendingApprovals(user) {
  const overtime = can(user, 'attendance.record.view');
  const wfh = can(user, 'leave.request.view');
  const hiringPipeline = can(user, 'hiring.pipeline.manage');
  const hiringDepartment = can(user, 'hiring.request.view');

  if (!overtime.allowed && !wfh.allowed && !hiringPipeline.allowed && !hiringDepartment.allowed) {
    throw new AiAccessError(403, 'You do not have permission to view those requests.');
  }

  const result = {
    type: 'pending_approvals',
    overtime: null,
    wfh: null,
    hiring: null,
  };

  if (overtime.allowed) {
    result.overtime = await countPendingOvertime(user, overtime);
  }
  if (wfh.allowed) {
    result.wfh = await WFHRequest.countDocuments({ status: 'pending' });
  }
  if (hiringPipeline.allowed) {
    result.hiring = await HiringRequest.countDocuments({ status: 'submitted' });
  } else if (hiringDepartment.allowed) {
    const own = ownDepartmentId(user);
    if (own && !isWideScope(hiringDepartment.scope)) {
      result.hiring = await HiringRequest.countDocuments({
        status: 'submitted',
        department: own,
      });
    }
  }

  return result;
}
