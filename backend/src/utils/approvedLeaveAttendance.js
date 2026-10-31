import { attendanceStatusFromClockIn } from "./attendanceStatusFromClockIn.js";

/**
 * @param {string} leaveType
 * @returns {boolean}
 */
export function isHalfDayLeaveType(leaveType) {
  return String(leaveType || "").trim().toLowerCase() === "half_day";
}

/**
 * Apply one approved leave day to attendance (full-day vs half-day rules).
 *
 * @param {object} params
 * @param {import('mongoose').Model} params.Attendance
 * @param {object} params.leaveRequest
 * @param {object|null|undefined} params.existingRecord
 * @param {Date} params.istMidnight
 * @param {import('mongoose').Types.ObjectId|string} params.approvedBy
 * @returns {Promise<'created'|'updated'|'deleted_placeholder'|'skipped'>}
 */
export async function applyApprovedLeaveToAttendanceDay({
  Attendance,
  leaveRequest,
  existingRecord,
  istMidnight,
  approvedBy,
}) {
  const leaveType = leaveRequest.leaveType;
  const approvalNote = `On ${leaveType} leave (Approved by ${approvedBy})`;

  if (isHalfDayLeaveType(leaveType)) {
    if (existingRecord?.clockIn) {
      const doc = await Attendance.findById(existingRecord._id);
      if (!doc) return "skipped";

      const halfDayNote = `Half-day leave approved (${approvalNote})`;
      doc.notes = doc.notes ? `${doc.notes} | ${halfDayNote}` : halfDayNote;
      doc.approvedBy = approvedBy;
      doc.isManuallyModified = false;
      doc.status = attendanceStatusFromClockIn(doc.clockIn);
      await doc.save();
      return "updated";
    }

    if (
      existingRecord &&
      existingRecord.status === "on-leave" &&
      !existingRecord.clockIn
    ) {
      await Attendance.deleteOne({ _id: existingRecord._id });
      return "deleted_placeholder";
    }

    return "skipped";
  }

  if (!existingRecord) {
    await Attendance.create({
      employee: leaveRequest.employee,
      date: istMidnight,
      status: "on-leave",
      workHours: 0,
      overtime: 0,
      notes: approvalNote,
      approvedBy,
      isManuallyModified: true,
      originalStatus: "on-leave",
    });
    return "created";
  }

  await Attendance.findByIdAndUpdate(
    existingRecord._id,
    {
      status: "on-leave",
      clockIn: undefined,
      clockOut: undefined,
      workHours: 0,
      overtime: 0,
      breaks: [],
      totalBreakTime: 0,
      notes: approvalNote,
      approvedBy,
      isManuallyModified: true,
      originalStatus: existingRecord.status,
    },
    { new: true }
  );
  return "updated";
}

/**
 * Whether approved leave should override this attendance row in list enrichment.
 *
 * @param {object} leave
 * @param {object} attendanceRow
 * @returns {boolean}
 */
export function shouldApplyFullDayLeaveOverlay(leave, attendanceRow) {
  if (isHalfDayLeaveType(leave.leaveType)) {
    return false;
  }
  return attendanceRow?.status === "absent" || !attendanceRow?.status;
}

/**
 * Legacy rows: half-day leave approval used to mark full on-leave and clear clock-in.
 *
 * @param {object} leave
 * @param {object} attendanceRow
 * @returns {object}
 */
export function repairHalfDayLeaveAttendanceDisplay(leave, attendanceRow) {
  if (!isHalfDayLeaveType(leave.leaveType) || !attendanceRow) {
    return attendanceRow;
  }
  if (attendanceRow.status !== "on-leave") {
    return attendanceRow;
  }
  return {
    ...attendanceRow,
    status: "half-day",
    notes:
      attendanceRow.notes ||
      `Half-day leave approved (${leave.leaveType})`,
  };
}
