import { describe, it, expect } from "@jest/globals";
import {
  startRevisionTimer,
  pauseRevisionTimer,
  getRevisionElapsedSeconds,
  formatDuration,
  buildRevisionTimePayload,
} from "../src/utils/creativeTimeTracking.js";

describe("creativeTimeTracking", () => {
  it("accumulates elapsed time across start and pause", () => {
    const revision = { timeTracking: {} };
    const t0 = new Date("2026-09-10T10:00:00.000Z");
    const t1 = new Date("2026-09-10T10:30:00.000Z");

    startRevisionTimer(revision, t0);
    const added = pauseRevisionTimer(revision, "submit", t1);

    expect(added).toBe(1800);
    expect(revision.timeTracking.accumulatedActiveSeconds).toBe(1800);
    expect(revision.timeTracking.activeTimerStartedAt).toBeNull();
    expect(revision.actualHours).toBe(0.5);
  });

  it("includes live segment in elapsed seconds", () => {
    const revision = {
      timeTracking: {
        accumulatedActiveSeconds: 600,
        activeTimerStartedAt: new Date("2026-09-10T11:00:00.000Z"),
      },
    };
    const now = new Date("2026-09-10T11:05:00.000Z");
    expect(getRevisionElapsedSeconds(revision, now)).toBe(900);
  });

  it("formats duration for display", () => {
    expect(formatDuration(8040)).toBe("2h 14m");
    expect(formatDuration(45)).toBe("45s");
  });

  it("builds revision time payload with timestamps", () => {
    const revision = {
      revisionNumber: 1,
      submittedAt: new Date("2026-09-10T12:44:00.000Z"),
      timeTracking: {
        workStartedAt: new Date("2026-09-10T10:30:00.000Z"),
        accumulatedActiveSeconds: 8040,
        stopReason: "submit",
      },
    };
    const payload = buildRevisionTimePayload(revision);
    expect(payload.elapsedSeconds).toBe(8040);
    expect(payload.workStartedAt).toBeTruthy();
    expect(payload.submittedAt).toBeTruthy();
  });
});
