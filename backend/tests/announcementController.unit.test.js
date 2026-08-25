import { describe, it, expect } from "@jest/globals";
import mongoose from "mongoose";
import Announcement from "../src/models/announcementModel.js";

describe("announcement model validation", () => {
  it("accepts low priority", () => {
    const id = new mongoose.Types.ObjectId();
    const doc = new Announcement({
      title: "Test",
      content: "Body",
      priority: "low",
      createdBy: id,
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});
