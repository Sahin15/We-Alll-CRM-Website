import { describe, it, expect } from "@jest/globals";
import {
  toISTDateKey,
  getISTDayBounds,
  dedupeAttendanceByISTDay,
  preferAttendanceRecord,
} from "../src/utils/attendanceISTDay.js";

describe("attendanceISTDay", () => {
  it("maps UTC midnight and IST midnight to the same IST day key", () => {
    expect(toISTDateKey("2026-08-13T00:00:00.000Z")).toBe("2026-08-13");
    expect(toISTDateKey("2026-08-12T18:30:00.000Z")).toBe("2026-08-13");
  });

  it("returns IST day bounds covering both storage styles", () => {
    const { start, endExclusive } = getISTDayBounds("2026-08-13");
    expect(start.toISOString()).toBe("2026-08-12T18:30:00.000Z");
    expect(endExclusive.toISOString()).toBe("2026-08-13T18:30:00.000Z");
    expect(start <= new Date("2026-08-13T00:00:00.000Z")).toBe(true);
    expect(new Date("2026-08-13T00:00:00.000Z") < endExclusive).toBe(true);
  });

  it("dedupes leave-approval UTC midnight and enrich IST midnight into one row", () => {
    const emp = "6923fcb4f4c5d17d7604641a";
    const rows = dedupeAttendanceByISTDay([
      {
        _id: "enrich",
        employee: emp,
        date: new Date("2026-08-12T18:30:00.000Z"),
        status: "on-leave",
        notes: "On casual leave",
        createdAt: new Date("2026-08-12T06:01:22.439Z"),
      },
      {
        _id: "approval",
        employee: emp,
        date: new Date("2026-08-13T00:00:00.000Z"),
        status: "on-leave",
        notes: "On casual leave (Approved by 6923fbfbf4c5d17d760463c0)",
        createdAt: new Date("2026-08-06T10:13:32.318Z"),
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe("approval");
  });

  it("prefers Approved-by leave notes when status ties", () => {
    const kept = preferAttendanceRecord(
      { status: "on-leave", notes: "On casual leave", createdAt: new Date("2026-08-12") },
      {
        status: "on-leave",
        notes: "On casual leave (Approved by x)",
        createdAt: new Date("2026-08-06"),
      }
    );
    expect(kept.notes).toMatch(/Approved by/);
  });
});
