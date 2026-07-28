import { describe, it, expect } from "@jest/globals";
import { validatePostUrls } from "../src/services/creativePostingService.js";
import {
  mapsToSlotComplete,
  isCreativeWorkflow,
} from "../src/utils/creativeStatusMap.js";

describe("creativeWorkflowService contracts", () => {
  it("treats design and video workflow types as creative", () => {
    expect(isCreativeWorkflow({ workflowType: "design" })).toBe(true);
    expect(isCreativeWorkflow({ workflowType: "video-production" })).toBe(true);
  });

  it("Delivered is the only creative status that completes slots", () => {
    expect(mapsToSlotComplete("Delivered")).toBe(true);
    expect(mapsToSlotComplete("Approved")).toBe(false);
    expect(mapsToSlotComplete("Awaiting Posting")).toBe(false);
  });

  it("posting submit requires valid URLs (slot-safe handoff proof)", () => {
    expect(validatePostUrls(["https://example.com/post/1"]).urls).toHaveLength(1);
  });
});
