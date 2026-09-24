import { describe, expect, test, jest, beforeEach } from "@jest/globals";

const mockFindOne = jest.fn();
const mockFind = jest.fn();

jest.unstable_mockModule("../src/models/departmentModel.js", () => ({
  default: {
    findOne: (...args) => mockFindOne(...args),
    find: (...args) => mockFind(...args),
  },
}));

const { resolveDepartmentIdForFilter } = await import(
  "../src/utils/departmentLookup.js"
);

describe("resolveDepartmentIdForFilter", () => {
  beforeEach(() => {
    mockFindOne.mockReset();
    mockFind.mockReset();
  });

  test("returns ObjectId string unchanged", async () => {
    const id = "507f1f77bcf86cd799439011";
    await expect(resolveDepartmentIdForFilter(id)).resolves.toBe(id);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  test("matches legacy department name via canonical resolution", async () => {
    mockFindOne.mockReturnValue({
      select: () => ({
        lean: async () => null,
      }),
    });
    mockFind.mockReturnValue({
      select: () => ({
        lean: async () => [
          { _id: "dept-posting", name: "Posting Department" },
        ],
      }),
    });

    const id = await resolveDepartmentIdForFilter("Posting");
    expect(id).toBe("dept-posting");
  });
});
