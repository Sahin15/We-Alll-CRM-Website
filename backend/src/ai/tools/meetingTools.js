import Meeting from '../../models/meetingModel.js';
import { requirePermission } from '../aiAccess.js';
import { todayIstRange } from '../istPeriod.js';

/**
 * Today's meetings for the signed-in user only, including admins.
 * @param {object} user
 */
export async function getMeetings(user) {
  requirePermission(
    user,
    'company.meeting.view',
    'You do not have permission to view meetings.'
  );

  const { start, end } = todayIstRange();
  const rows = await Meeting.find({
    $or: [{ organizer: user._id }, { attendees: user._id }],
    date: { $gte: start, $lt: end },
    status: { $ne: 'cancelled' },
  })
    .select('title startTime status')
    .sort({ startTime: 1 })
    .limit(10)
    .lean();

  return {
    type: 'meetings',
    count: rows.length,
    items: rows.map((row) => ({
      title: row.title,
      startTime: row.startTime || '',
      status: row.status || '',
    })),
  };
}
