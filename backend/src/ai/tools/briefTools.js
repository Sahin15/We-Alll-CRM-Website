import { AiAccessError } from '../aiErrors.js';
import { getAttendanceReport } from './attendanceTools.js';
import { getPendingLeaves } from './leaveTools.js';
import { getMeetings } from './meetingTools.js';

/**
 * @param {() => Promise<object>} load
 */
async function optionalSection(load) {
  try {
    return await load();
  } catch (error) {
    if (error instanceof AiAccessError && error.status === 403) return null;
    throw error;
  }
}

/**
 * Today's attendance, pending leave, and today's meetings,
 * each limited to what this person can already see.
 * @param {object} user
 */
export async function getMorningBrief(user) {
  const attendance = await optionalSection(() => getAttendanceReport(user, { period: 'today' }));
  const leaves = await optionalSection(() => getPendingLeaves(user));
  const meetings = await optionalSection(() => getMeetings(user));

  if (!attendance && !leaves && !meetings) {
    throw new AiAccessError(403, 'You do not have permission to view that information.');
  }

  return {
    type: 'morning_brief',
    attendance,
    leaves,
    meetings,
  };
}
