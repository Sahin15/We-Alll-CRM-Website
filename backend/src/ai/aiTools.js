import { AiAccessError } from './aiErrors.js';
import { getMyAttendance, getAttendanceReport, getAttendanceExceptions } from './tools/attendanceTools.js';
import { getMyTasks, getWorkStatus } from './tools/workTools.js';
import { getPendingLeaves, getMyLeaveBalance } from './tools/leaveTools.js';
import { getProjectStatus } from './tools/projectTools.js';
import { getMeetings } from './tools/meetingTools.js';
import { getEmployeeSummary } from './tools/employeeTools.js';
import { getPendingApprovals } from './tools/approvalTools.js';
import { getCompanyNotices } from './tools/noticeTools.js';
import { getMorningBrief } from './tools/briefTools.js';

const TOOLS = {
  getMyAttendance,
  getAttendanceReport,
  getAttendanceExceptions,
  getMyTasks,
  getWorkStatus,
  getPendingLeaves,
  getMyLeaveBalance,
  getPendingApprovals,
  getCompanyNotices,
  getMorningBrief,
  getProjectStatus,
  getMeetings,
  getEmployeeSummary,
};

const ARG_KEYS = {
  getMyAttendance: ['period'],
  getAttendanceReport: ['departmentName', 'period'],
  getAttendanceExceptions: ['departmentName', 'period'],
  getMyTasks: [],
  getWorkStatus: [],
  getPendingLeaves: [],
  getMyLeaveBalance: [],
  getPendingApprovals: [],
  getCompanyNotices: ['topic'],
  getMorningBrief: [],
  getProjectStatus: [],
  getMeetings: ['when'],
  getEmployeeSummary: ['departmentName'],
};

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isAllowedTool(name) {
  return Object.prototype.hasOwnProperty.call(TOOLS, name);
}

/**
 * Keep only declared string arguments. employeeId, role, and operators are dropped or rejected.
 * @param {string} toolName
 * @param {object} raw
 */
export function validateArgs(toolName, raw) {
  if (!isAllowedTool(toolName)) {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }

  const args = {};
  for (const key of Object.keys(raw)) {
    if (!ARG_KEYS[toolName].includes(key)) continue;
    const value = raw[key];
    if (typeof value !== 'string') {
      throw new AiAccessError(400, 'Invalid AI tool request');
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 80 || /[$.]/.test(trimmed)) {
      throw new AiAccessError(400, 'Invalid AI tool request');
    }
    args[key] = trimmed;
  }

  if (toolName === 'getMyAttendance' && args.period && args.period !== 'month') {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  if (
    (toolName === 'getAttendanceReport' || toolName === 'getAttendanceExceptions')
    && args.period
    && args.period !== 'month'
    && args.period !== 'today'
    && args.period !== 'yesterday'
  ) {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  if (toolName === 'getAttendanceExceptions' && args.period === 'month') {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  if (args.topic && args.topic !== 'announcements' && args.topic !== 'policies' && args.topic !== 'both') {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  if (args.when && args.when !== 'today') {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  if (args.departmentName && !/^[A-Za-z0-9][A-Za-z0-9 &-]{0,60}$/.test(args.departmentName)) {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  return args;
}

/**
 * @param {string} toolName
 * @param {object} user
 * @param {object} args
 */
export async function runTool(toolName, user, args) {
  if (!isAllowedTool(toolName)) {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  const safeArgs = validateArgs(toolName, args || {});
  return TOOLS[toolName](user, safeArgs);
}
