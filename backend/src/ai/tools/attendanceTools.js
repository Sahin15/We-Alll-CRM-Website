import Attendance from '../../models/attendanceModel.js';
import User from '../../models/userModel.js';
import Department from '../../models/departmentModel.js';
import { AiAccessError } from '../aiErrors.js';
import {
  assertDepartmentInScope,
  hasPersonalAttendance,
  isWideScope,
  ownDepartmentId,
  requirePermission,
} from '../aiAccess.js';
import { findDepartmentByName } from '../departmentLookup.js';
import { currentIstYearMonth, dayRangeIST } from '../istPeriod.js';
import { getTodayRangeIST } from '../../utils/timezone.js';
import { mergeActiveEmployeeFilter } from '../../utils/employeeQueryUtils.js';
import { can } from '../../authz/policyEngine.js';

/**
 * @param {Array<{ status?: string }>} rows
 */
export function countAttendanceStatuses(rows) {
  const summary = { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0 };
  for (const row of rows || []) {
    if (row.status === 'present') summary.present += 1;
    else if (row.status === 'absent') summary.absent += 1;
    else if (row.status === 'late') summary.late += 1;
    else if (row.status === 'half-day') summary.halfDay += 1;
    else if (row.status === 'on-leave') summary.onLeave += 1;
  }
  return summary;
}

/**
 * Personal attendance for the authenticated user only.
 * @param {object} user
 */
export async function getMyAttendance(user) {
  requirePermission(
    user,
    'attendance.record.view_self',
    'You do not have permission to view attendance.'
  );

  if (!hasPersonalAttendance(user)) {
    return {
      type: 'attendance_summary',
      personalRecords: false,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
    };
  }

  const { bounds } = currentIstYearMonth();
  const rows = await Attendance.find({
    employee: user._id,
    date: { $gte: bounds.start, $lte: bounds.end },
  })
    .select('status')
    .lean();

  return {
    type: 'attendance_summary',
    personalRecords: true,
    ...countAttendanceStatuses(rows),
  };
}

/**
 * People whose attendance this user may read. Ids are not returned to the client.
 * @param {object} user
 * @param {{ allowed: boolean, scope?: string }} decision
 * @param {string} [departmentName]
 * @param {boolean} [withNames]
 */
async function peopleInAttendanceScope(user, decision, departmentName, withNames = false) {
  let department = null;
  if (departmentName) {
    department = await findDepartmentByName(departmentName);
    assertDepartmentInScope(user, decision, department._id);
  } else if (!isWideScope(decision.scope)) {
    const own = ownDepartmentId(user);
    if (!own) {
      throw new AiAccessError(403, 'You can only view information for your own department.');
    }
    department = await Department.findById(own).select('_id name').lean();
    if (!department) {
      throw new AiAccessError(400, 'That department was not found.');
    }
  }

  const filter = mergeActiveEmployeeFilter({
    role: { $nin: ['client', 'admin', 'superadmin'] },
  });
  if (department) filter.department = department._id;

  const people = await User.find(filter)
    .select(withNames ? '_id name department' : '_id department')
    .limit(1000)
    .lean();
  return { department, people };
}

/**
 * @param {unknown} value
 */
function idKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value);
}

/**
 * Company-wide month totals split by the department stored on each person.
 * @param {Array<{ _id?: unknown, department?: unknown }>} people
 * @param {Array<{ status?: string, employee?: unknown }>} rows
 */
async function departmentBreakdown(people, rows) {
  const deptByPerson = new Map();
  for (const person of people) {
    const deptId = idKey(person.department?._id || person.department);
    if (deptId) deptByPerson.set(idKey(person._id), deptId);
  }
  const ids = [...new Set(deptByPerson.values())];
  if (!ids.length) return [];

  const docs = await Department.find({ _id: { $in: ids } }).select('_id name').lean();
  const nameById = new Map(docs.map((doc) => [idKey(doc._id), doc.name]));
  const buckets = new Map();
  for (const id of ids) {
    const name = nameById.get(id);
    if (!name) continue;
    buckets.set(id, { name, present: 0, late: 0, absent: 0, onLeave: 0, halfDay: 0 });
  }

  for (const row of rows) {
    const bucket = buckets.get(deptByPerson.get(idKey(row.employee)));
    if (!bucket) continue;
    if (row.status === 'present') bucket.present += 1;
    else if (row.status === 'late') bucket.late += 1;
    else if (row.status === 'absent') bucket.absent += 1;
    else if (row.status === 'on-leave') bucket.onLeave += 1;
    else if (row.status === 'half-day') bucket.halfDay += 1;
  }

  return [...buckets.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Attendance counts for the people this role may see.
 * "today" is recorded statuses for the current IST day.
 * "month" is the current IST month across that same group.
 * A user who cannot view other people receives their own attendance instead,
 * unless they named a department.
 * @param {object} user
 * @param {{ departmentName?: string, period?: string }} args
 */
/**
 * @param {string} period
 */
function reportPeriod(period) {
  if (period === 'month' || period === 'yesterday') return period;
  return 'today';
}

export async function getAttendanceReport(user, args = {}) {
  const period = reportPeriod(args.period);
  const decision = can(user, 'attendance.record.view');

  if (!decision.allowed) {
    if (args.departmentName) {
      requirePermission(
        user,
        'attendance.record.view',
        'You do not have permission to view department attendance.'
      );
    }
    if (period === 'month') return getMyAttendance(user);
    return getMyAttendanceToday(user, period);
  }

  const { department, people } = await peopleInAttendanceScope(
    user,
    decision,
    args.departmentName
  );
  const ids = people.map((person) => person._id);
  const range = period === 'month'
    ? currentIstYearMonth().bounds
    : dayRangeIST(period === 'yesterday' ? -1 : 0);
  const date = period === 'month'
    ? { $gte: range.start, $lte: range.end }
    : { $gte: range.start, $lt: range.end };
  const rows = ids.length
    ? await Attendance.find({
        employee: { $in: ids },
        date,
      })
        .select('status employee')
        .lean()
    : [];
  const departments = period === 'month' && !department
    ? await departmentBreakdown(people, rows)
    : [];

  return {
    type: 'attendance_report',
    period,
    scope: department ? 'department' : 'company',
    departmentName: department?.name || '',
    employeeCount: ids.length,
    departments,
    ...countAttendanceStatuses(rows),
  };
}

/**
 * The signed-in user's recorded status for today or yesterday.
 * @param {object} user
 * @param {'today'|'yesterday'} [period]
 */
async function getMyAttendanceToday(user, period = 'today') {
  requirePermission(
    user,
    'attendance.record.view_self',
    'You do not have permission to view attendance.'
  );
  if (!hasPersonalAttendance(user)) {
    return {
      type: 'attendance_report',
      period,
      scope: 'self',
      personalRecords: false,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
    };
  }

  const range = period === 'yesterday' ? dayRangeIST(-1) : getTodayRangeIST();
  const date = period === 'yesterday'
    ? { $gte: range.start, $lt: range.end }
    : { $gte: range.start, $lte: range.end };
  const rows = await Attendance.find({
    employee: user._id,
    date,
  })
    .select('status')
    .lean();

  return {
    type: 'attendance_report',
    period,
    scope: 'self',
    personalRecords: true,
    employeeCount: 1,
    ...countAttendanceStatuses(rows),
  };
}

/**
 * Names of people marked late, absent, or on leave.
 * Company roles see the company, a head of department sees their department,
 * and everyone else sees only themselves.
 * @param {object} user
 * @param {{ departmentName?: string, period?: string }} args
 */
export async function getAttendanceExceptions(user, args = {}) {
  const period = args.period === 'yesterday' ? 'yesterday' : 'today';
  const decision = can(user, 'attendance.record.view');

  if (!decision.allowed) {
    if (args.departmentName) {
      requirePermission(
        user,
        'attendance.record.view',
        'You do not have permission to view department attendance.'
      );
    }
    return myException(user, period);
  }

  const { department, people } = await peopleInAttendanceScope(
    user,
    decision,
    args.departmentName,
    true
  );
  const ids = people.map((person) => person._id);
  const range = dayRangeIST(period === 'yesterday' ? -1 : 0);
  const rows = ids.length
    ? await Attendance.find({
        employee: { $in: ids },
        date: { $gte: range.start, $lt: range.end },
        status: { $in: ['late', 'absent', 'on-leave'] },
      })
        .select('status employee')
        .lean()
    : [];

  const nameById = new Map(people.map((person) => [idKey(person._id), person.name || 'Employee']));
  const grouped = { late: [], absent: [], onLeave: [] };
  for (const row of rows) {
    const name = nameById.get(idKey(row.employee));
    if (!name) continue;
    if (row.status === 'late') grouped.late.push(name);
    else if (row.status === 'absent') grouped.absent.push(name);
    else if (row.status === 'on-leave') grouped.onLeave.push(name);
  }

  return {
    type: 'attendance_people',
    period,
    scope: department ? 'department' : 'company',
    departmentName: department?.name || '',
    ...grouped,
  };
}

/**
 * @param {object} user
 * @param {'today'|'yesterday'} period
 */
async function myException(user, period) {
  requirePermission(
    user,
    'attendance.record.view_self',
    'You do not have permission to view attendance.'
  );
  const grouped = { late: [], absent: [], onLeave: [] };
  if (!hasPersonalAttendance(user)) {
    return {
      type: 'attendance_people',
      period,
      scope: 'self',
      personalRecords: false,
      ...grouped,
    };
  }

  const range = dayRangeIST(period === 'yesterday' ? -1 : 0);
  const rows = await Attendance.find({
    employee: user._id,
    date: { $gte: range.start, $lt: range.end },
    status: { $in: ['late', 'absent', 'on-leave'] },
  })
    .select('status')
    .lean();

  const name = user.name || 'You';
  for (const row of rows) {
    if (row.status === 'late') grouped.late.push(name);
    else if (row.status === 'absent') grouped.absent.push(name);
    else if (row.status === 'on-leave') grouped.onLeave.push(name);
  }

  return {
    type: 'attendance_people',
    period,
    scope: 'self',
    personalRecords: true,
    ...grouped,
  };
}
