import { describe, it, expect } from "@jest/globals";
import { mapsToSlotComplete, mapsToSlotRelease } from "../src/utils/creativeStatusMap.js";

/**
 * Slot parity expectations for creative workflow (unit-level mapping gate).
 * Full DB integration covered by existing slot* tests + Delivered/Cancelled mapping.
 */
describe("Creative workflow ↔ Slot parity (mapping)", () => {
  it("completes slot once on Delivered (Done equivalent), not mid-review statuses", () => {
    const midCycle = [
      "In Progress",
      "Submitted for Review",
      "Changes Requested",
      "Rework In Progress",
      "QA Review",
      "Approved",
      "Awaiting Posting",
      "Posted",
      "Closed",
    ];
    midCycle.forEach((status) => {
      expect(mapsToSlotComplete(status)).toBe(status === "Delivered" ? true : false);
    });
    expect(mapsToSlotComplete("Delivered")).toBe(true);
    expect(mapsToSlotComplete("Done")).toBe(true);
  });

  it("releases slot on Cancelled only", () => {
    expect(mapsToSlotRelease("Cancelled")).toBe(true);
    expect(mapsToSlotRelease("Delivered")).toBe(false);
    expect(mapsToSlotRelease("Posted")).toBe(false);
  });

  it("never maps revision-only concepts to slot complete", () => {
    expect(mapsToSlotComplete("draft")).toBe(false);
    expect(mapsToSlotComplete("submitted")).toBe(false);
  });
});
