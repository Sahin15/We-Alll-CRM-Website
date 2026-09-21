import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import express from "express";
import request from "supertest";
import { protect } from "../src/middleware/authMiddleware.js";

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

jest.unstable_mockModule("../src/models/userModel.js", () => ({
  default: { findById: jest.fn() },
}));

const leadRoutes = (await import("../src/routes/leadRoutes.js")).default;

/**
 * Mirrors the historic bug: app.use("/api", router.use(protect)) before /api/leads.
 */
function buildAppWithMountOrder({ leadsBeforeCatchAll }) {
  const app = express();
  app.use(express.json());

  const projectCatchAll = express.Router();
  projectCatchAll.use(protect);
  projectCatchAll.get("/projects/:projectId/expectations", (_req, res) => {
    res.json({ ok: true });
  });

  if (leadsBeforeCatchAll) {
    app.use("/api/leads", leadRoutes);
    app.use("/api", projectCatchAll);
  } else {
    app.use("/api", projectCatchAll);
    app.use("/api/leads", leadRoutes);
  }

  return app;
}

describe("POST /api/leads/website public access (mount order)", () => {
  const originalOrigins = process.env.WEBSITE_LEAD_ALLOWED_ORIGINS;

  beforeEach(() => {
    mockFindOne.mockReset();
    mockFindById.mockReset();
    constructedLeads.length = 0;
    process.env.WEBSITE_LEAD_ALLOWED_ORIGINS =
      "https://wealll.com,https://www.wealll.com,http://localhost";
  });

  afterEach(() => {
    if (originalOrigins === undefined) {
      delete process.env.WEBSITE_LEAD_ALLOWED_ORIGINS;
    } else {
      process.env.WEBSITE_LEAD_ALLOWED_ORIGINS = originalOrigins;
    }
  });

  it("WRONG order: /api catch-all with protect before leads → 401 without JWT", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: false });

    const res = await request(app)
      .post("/api/leads/website")
      .set("Origin", "https://wealll.com")
      .send({ fullName: "Test", phone: "9876543210" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("No token, authorization denied");
  });

  it("A: correct order + allowed Origin + no JWT → creates lead (201)", async () => {
    mockFindOne.mockResolvedValue(null);
    mockFindById.mockReturnValue({
      populate() {
        return this;
      },
    });

    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads/website")
      .set("Origin", "https://wealll.com")
      .send({
        fullName: "Jane Doe",
        phone: "+91 9876543210",
        source: "Google Ads - Bridal",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicate).toBe(false);
    expect(constructedLeads[0].source).toBe("Google Ads - Bridal");
    expect(constructedLeads[0].phone).toBe(9876543210);
  });

  it("B: disallowed Origin → 403 (not 401)", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads/website")
      .set("Origin", "https://evil.example")
      .send({ fullName: "Jane Doe", phone: "9876543210" });

    expect(res.status).toBe(403);
    expect(res.body.message).toBeUndefined();
    expect(res.body.error).toMatch(/origin/i);
  });

  it("allowed www Origin succeeds without JWT", async () => {
    mockFindOne.mockResolvedValue(null);
    mockFindById.mockReturnValue({
      populate() {
        return this;
      },
    });

    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads/website")
      .set("Origin", "https://www.wealll.com")
      .send({ fullName: "Jane Doe", phone: "9876543212" });

    expect(res.status).toBe(201);
  });

  it("missing Origin → 403 per browser-only policy", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads/website")
      .send({ fullName: "Jane Doe", phone: "9876543210" });

    expect(res.status).toBe(403);
  });

  it("honeypot filled → 400", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads/website")
      .set("Origin", "https://wealll.com")
      .send({ fullName: "Bot", phone: "9876543210", _hp: "spam" });

    expect(res.status).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it("C: missing required fields → 400 validation", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads/website")
      .set("Origin", "https://wealll.com")
      .send({ phone: "9876543210" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("D: duplicate phone → 200 + notesHistory append", async () => {
    const existingLead = {
      _id: "507f1f77bcf86cd799439012",
      phone: 9876543210,
      notesHistory: [{ note: "First" }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindOne.mockResolvedValue(existingLead);
    mockFindById.mockReturnValue({
      populate() {
        return this;
      },
    });

    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads/website")
      .set("Origin", "https://wealll.com")
      .send({
        fullName: "Jane Doe",
        phone: "9876543210",
        notes: "Again",
        source: "Facebook - Growth",
      });

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(existingLead.notesHistory.length).toBe(2);
  });

  it("E: protected CRM lead list without JWT → still 401", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app).get("/api/leads");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("No token, authorization denied");
  });

  it("protected POST /api/leads without JWT → 401", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .post("/api/leads")
      .send({ fullName: "Internal", phone: "9876543210" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("No token, authorization denied");
  });

  it("F: protect remains after public routes (stack order)", () => {
    const stack = leadRoutes.stack.map((layer) => {
      if (layer.route) {
        return {
          type: "route",
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        };
      }
      const name = layer.name || layer.handle?.name || "anonymous";
      return { type: "middleware", name };
    });

    const websiteIdx = stack.findIndex(
      (l) => l.type === "route" && l.path === "/website" && l.methods.includes("post")
    );
    const protectIdx = stack.findIndex(
      (l) => l.type === "middleware" && l.name === "protect"
    );
    const listIdx = stack.findIndex(
      (l) => l.type === "route" && l.path === "/" && l.methods.includes("get")
    );

    expect(websiteIdx).toBeGreaterThanOrEqual(0);
    expect(protectIdx).toBeGreaterThan(websiteIdx);
    expect(listIdx).toBeGreaterThan(protectIdx);
  });

  it("GET /api/leads/website does not create a lead", async () => {
    const app = buildAppWithMountOrder({ leadsBeforeCatchAll: true });

    const res = await request(app)
      .get("/api/leads/website")
      .set("Origin", "https://wealll.com");

    // Parameterized GET /:id is behind protect → 401, not a create
    expect(res.status).toBe(401);
    expect(constructedLeads.length).toBe(0);
    expect(mockFindOne).not.toHaveBeenCalled();
  });
});
