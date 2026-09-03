import { jest } from "@jest/globals";
import {
  formatEmployeeId,
  parseEmployeeIdSequence,
  generateNextEmployeeId,
  getMaxEmployeeIdSequence,
  normalizeEmployeeId,
} from "../src/services/employeeIdService.js";

describe("employeeIdService", () => {
  test("formatEmployeeId uses WA-YY-XXXX template", () => {
    expect(formatEmployeeId("2026-07-16", 2)).toBe("WA-26-0002");
    expect(formatEmployeeId("2026-07-16", 42)).toBe("WA-26-0042");
  });

  test("parseEmployeeIdSequence reads sequence from existing IDs", () => {
    expect(parseEmployeeIdSequence("WA-26-0002")).toBe(2);
    expect(parseEmployeeIdSequence("wa-25-0143")).toBe(143);
    expect(parseEmployeeIdSequence("INVALID")).toBeNull();
  });

  test("getMaxEmployeeIdSequence finds highest sequence across records", async () => {
    const User = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { employeeId: "WA-24-0002" },
            { employeeId: "WA-26-0033" },
            { employeeId: "legacy-id" },
          ]),
        }),
      }),
    };

    await expect(getMaxEmployeeIdSequence(User)).resolves.toBe(33);
  });

  test("generateNextEmployeeId increments from max existing sequence", async () => {
    const User = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { employeeId: "WA-26-0033" },
          ]),
        }),
      }),
      exists: jest.fn().mockResolvedValue(false),
    };

    const result = await generateNextEmployeeId(User, {
      joiningDate: "2026-07-16",
      employmentType: "full-time",
    });

    expect(result).toEqual({
      employeeId: "WA-26-0034",
      sequence: 34,
    });
  });

  test("generateNextEmployeeId rejects non full-time employees", async () => {
    const User = { find: jest.fn(), exists: jest.fn() };

    await expect(
      generateNextEmployeeId(User, {
        joiningDate: "2026-07-16",
        employmentType: "intern",
      })
    ).rejects.toThrow("Only permanent (full-time) employees");
  });

  test("normalizeEmployeeId uppercases WA ids", () => {
    expect(normalizeEmployeeId(" wa-26-0002 ")).toBe("WA-26-0002");
  });
});
