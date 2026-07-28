import { describe, it, expect } from "@jest/globals";
import {
  validatePostingHandoffInput,
  applyPostingHandoffFields,
  validatePostUrls,
} from "../src/services/creativePostingService.js";

describe("Posting handoff", () => {
  it("leaves postingAssignedTo and postingDate null when requiresPosting is false (client posts)", () => {
    const validated = validatePostingHandoffInput({ requiresPosting: false });
    expect(validated.valid).toBe(true);
    expect(validated.postingAssignedTo).toBeNull();
    expect(validated.postingDate).toBeNull();
    expect(validated.postingStatus).toBe("not_required");

    const workItem = {
      dueDate: new Date("2026-08-01"),
      requiresPosting: true,
      postingAssignedTo: "someone",
      postingDate: new Date("2026-08-05"),
    };
    applyPostingHandoffFields(workItem, validated);
    expect(workItem.postingAssignedTo).toBeNull();
    expect(workItem.postingDate).toBeNull();
    expect(workItem.postingStatus).toBe("not_required");
    expect(workItem.requiresPosting).toBe(false);
    expect(workItem.dueDate.toISOString().slice(0, 10)).toBe("2026-08-01");
  });

  it("requires postingAssignedTo and postingDate when requiresPosting is true", () => {
    expect(
      validatePostingHandoffInput({ requiresPosting: true }).error
    ).toMatch(/Posting team member/i);

    expect(
      validatePostingHandoffInput({
        requiresPosting: true,
        postingAssignedTo: "user-1",
      }).error
    ).toMatch(/Posting date/i);
  });

  it("stores postingDate separately from creative dueDate", () => {
    const dueDate = new Date("2026-08-01");
    const postingDate = new Date("2026-08-10");
    const validated = validatePostingHandoffInput({
      requiresPosting: true,
      postingAssignedTo: "poster-1",
      postingDate,
    });
    expect(validated.valid).toBe(true);

    const workItem = { dueDate };
    applyPostingHandoffFields(workItem, validated);
    expect(workItem.postingDate.toISOString().slice(0, 10)).toBe("2026-08-10");
    expect(workItem.dueDate.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(workItem.postingDate.getTime()).not.toBe(workItem.dueDate.getTime());
  });

  it("auto-assigns posting fields when member and date selected", () => {
    const validated = validatePostingHandoffInput({
      requiresPosting: true,
      postingAssignedTo: "poster-1",
      postingDate: "2026-08-12",
    });
    expect(validated.valid).toBe(true);
    expect(validated.postingAssignedTo).toBe("poster-1");
    expect(validated.postingStatus).toBe("pending");
    expect(validated.postingDate).toBeInstanceOf(Date);
  });

  it("requires at least one valid URL to mark posting done", () => {
    expect(validatePostUrls([]).valid).toBe(false);
    expect(validatePostUrls(["not-a-url"]).valid).toBe(false);
    expect(
      validatePostUrls(["https://instagram.com/p/abc", "https://example.com/x"]).valid
    ).toBe(true);
  });
});
