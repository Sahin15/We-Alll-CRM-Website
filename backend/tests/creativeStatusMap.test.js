import { describe, it, expect } from "@jest/globals";
import {
  mapsToSlotComplete,
  mapsToSlotRelease,
  CREATIVE_STATUSES,
  isCreativeWorkflow,
} from "../src/utils/creativeStatusMap.js";

describe("creativeStatusMap", () => {
  it("maps Delivered to slot complete (legacy Done equivalent)", () => {
    expect(mapsToSlotComplete("Delivered")).toBe(true);
    expect(mapsToSlotComplete("Done")).toBe(true);
    expect(mapsToSlotComplete("Approved")).toBe(false);
    expect(mapsToSlotComplete("Closed")).toBe(false);
    expect(mapsToSlotComplete("Posted")).toBe(false);
    expect(mapsToSlotComplete("Awaiting Posting")).toBe(false);
  });

  it("maps Cancelled to slot release", () => {
    expect(mapsToSlotRelease("Cancelled")).toBe(true);
    expect(mapsToSlotRelease("Delivered")).toBe(false);
  });

  it("includes all creative statuses from the spec", () => {
    expect(CREATIVE_STATUSES).toEqual(
      expect.arrayContaining([
        "Backlog",
        "Assigned",
        "In Progress",
        "Submitted for Review",
        "Changes Requested",
        "Rework In Progress",
        "QA Review",
        "Approved",
        "Delivered",
        "Awaiting Posting",
        "Posted",
        "Closed",
        "Cancelled",
      ])
    );
  });

  it("detects creative workflow mode", () => {
    expect(isCreativeWorkflow({ workflowMode: "creative" })).toBe(true);
    expect(isCreativeWorkflow({ workflowType: "design" })).toBe(true);
    expect(isCreativeWorkflow({ workflowType: "video-production" })).toBe(true);
    expect(isCreativeWorkflow({ workflowType: "development" })).toBe(false);
  });
});
