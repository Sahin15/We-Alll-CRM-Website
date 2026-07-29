import { describe, it, expect } from "@jest/globals";
import NotificationService from "../src/services/notificationService.js";

describe("sendSalarySlipNotification", () => {
  it("is implemented on NotificationService", () => {
    expect(typeof NotificationService.sendSalarySlipNotification).toBe("function");
  });
});
