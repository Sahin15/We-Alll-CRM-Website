import {
  applyApprovedLeaveToAttendanceDay,
  isHalfDayLeaveType,
  repairHalfDayLeaveAttendanceDisplay,
  shouldApplyFullDayLeaveOverlay,
} from "../src/utils/approvedLeaveAttendance.js";
import { attendanceStatusFromClockIn } from "../src/utils/attendanceStatusFromClockIn.js";

describe("half-day leave attendance", () => {
  test("isHalfDayLeaveType", () => {
    expect(isHalfDayLeaveType("half_day")).toBe(true);
    expect(isHalfDayLeaveType("medical")).toBe(false);
  });

  test("does not overlay full-day leave rules on half-day leave rows", () => {
    expect(
      shouldApplyFullDayLeaveOverlay(
        { leaveType: "half_day" },
        { status: "absent" }
      )
    ).toBe(false);
    expect(
      shouldApplyFullDayLeaveOverlay(
        { leaveType: "medical" },
        { status: "absent" }
      )
    ).toBe(true);
  });

  test("repairs legacy on-leave display to half-day when leave is half_day", () => {
    const row = { status: "on-leave", workHours: 0 };
    const fixed = repairHalfDayLeaveAttendanceDisplay(
      { leaveType: "half_day" },
      row
    );
    expect(fixed.status).toBe("half-day");
  });

  test("half-day approval skips creating on-leave when no attendance row exists", async () => {
    let created = false;
    const Attendance = {
      create: async () => {
        created = true;
      },
    };

    const outcome = await applyApprovedLeaveToAttendanceDay({
      Attendance,
      leaveRequest: { leaveType: "half_day", employee: "emp-1" },
      existingRecord: null,
      istMidnight: new Date("2026-10-29T18:30:00.000Z"),
      approvedBy: "hr-1",
    });

    expect(outcome).toBe("skipped");
    expect(created).toBe(false);
  });

  test("attendanceStatusFromClockIn uses IST thresholds", () => {
    const morning = new Date("2026-10-30T04:00:00.000Z");
    expect(attendanceStatusFromClockIn(morning)).toBe("present");
  });
});
