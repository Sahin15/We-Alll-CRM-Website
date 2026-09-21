import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { normalizeLeadPhone } from "../src/utils/normalizeLeadPhone.js";
import {
  websiteLeadOriginCheck,
  isWebsiteLeadOriginAllowed,
  getWebsiteLeadRequestOrigin,
} from "../src/middleware/websiteLeadMiddleware.js";

const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const constructedLeads = [];

jest.unstable_mockModule("../src/models/leadModel.js", () => {
  function LeadMock(data) {
    Object.assign(this, data);
    this._id = "507f1f77bcf86cd799439011";
    this.notesHistory = this.notesHistory || [];
    this.save = jest.fn().mockResolvedValue(this);
    constructedLeads.push(this);
  }
  LeadMock.findOne = mockFindOne;
  LeadMock.findById = mockFindById;
  return { default: LeadMock };
});

const { createWebsiteLead } = await import(
  "../src/controllers/leadController.js"
);

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("normalizeLeadPhone", () => {
  it("strips formatting and country code for Indian numbers", () => {
    expect(normalizeLeadPhone("+91 98765 43210")).toEqual({
      ok: true,
      phoneNumber: 9876543210,
    });
  });

  it("rejects invalid phone", () => {
    expect(normalizeLeadPhone("abc").ok).toBe(false);
  });
});

describe("websiteLeadOriginCheck", () => {
  it("allows wealll.com Origin", () => {
    expect(
      isWebsiteLeadOriginAllowed("https://wealll.com", [
        "https://wealll.com",
      ])
    ).toBe(true);
  });

  it("returns 403 when Origin is missing", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    websiteLeadOriginCheck(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for disallowed Origin", () => {
    const req = { headers: { origin: "https://evil.example" } };
    const res = mockRes();
    const next = jest.fn();

    websiteLeadOriginCheck(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("reads origin from Referer when Origin header absent", () => {
    const req = {
      headers: { referer: "https://www.wealll.com/contact?utm=ads" },
    };
    expect(getWebsiteLeadRequestOrigin(req)).toBe("https://www.wealll.com");
  });
});

describe("createWebsiteLead", () => {
  beforeEach(() => {
    mockFindOne.mockReset();
    mockFindById.mockReset();
    constructedLeads.length = 0;
  });

  it("defaults source to Website when omitted", async () => {
    mockFindOne.mockResolvedValue(null);
    mockFindById.mockReturnValue({
      populate() {
        return this;
      },
    });

    const req = {
      body: {
        fullName: "Test User",
        phone: "+91 9876543210",
        reference: "Google Ads LP",
      },
    };
    const res = mockRes();

    await createWebsiteLead(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicate).toBe(false);
    expect(constructedLeads[0].source).toBe("Website");
    expect(mockFindOne).toHaveBeenCalledWith({ phone: 9876543210 });
  });

  it("stores custom campaign source from the client", async () => {
    mockFindOne.mockResolvedValue(null);
    mockFindById.mockReturnValue({
      populate() {
        return this;
      },
    });

    const req = {
      body: {
        fullName: "Campaign User",
        phone: "9876543211",
        source: "Google Ads - Bridal",
      },
    };
    const res = mockRes();

    await createWebsiteLead(req, res);

    expect(res.statusCode).toBe(201);
    expect(constructedLeads[0].source).toBe("Google Ads - Bridal");
  });

  it("appends note on duplicate phone and returns 200", async () => {
    const existingLead = {
      _id: "507f1f77bcf86cd799439012",
      phone: 9876543210,
      notesHistory: [{ note: "First note" }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindOne.mockResolvedValue(existingLead);
    mockFindById.mockReturnValue({
      populate() {
        return this;
      },
    });

    const req = {
      body: {
        fullName: "Test User",
        phone: "9876543210",
        notes: "Follow-up message",
        reference: "Bridal LP",
        source: "Facebook - Growth",
      },
    };
    const res = mockRes();

    await createWebsiteLead(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(existingLead.notesHistory.length).toBe(2);
    expect(existingLead.notesHistory[1].note).toContain("Website form resubmission");
    expect(existingLead.notesHistory[1].note).toContain("Source: Facebook - Growth");
    expect(existingLead.save).toHaveBeenCalled();
  });

  it("returns 400 for invalid phone", async () => {
    const req = {
      body: { fullName: "Test User", phone: "not-a-phone" },
    };
    const res = mockRes();

    await createWebsiteLead(req, res);

    expect(res.statusCode).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});
