import HiringRequest from "../models/hiringRequestModel.js";
import HiringApplication from "../models/hiringApplicationModel.js";
import Applicant from "../models/applicantModel.js";
import Offer from "../models/offerModel.js";
import User from "../models/userModel.js";
import NotificationService from "../services/notificationService.js";
import { assertHrAccess } from "../utils/hiringAccess.js";

const generateOfferNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `OFF-${year}-`;
  const last = await Offer.findOne({ offerNumber: new RegExp(`^${prefix}`) })
    .sort({ offerNumber: -1 })
    .select("offerNumber")
    .lean();

  let seq = 1;
  if (last?.offerNumber) {
    const part = last.offerNumber.split("-").pop();
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
};

const pushStageHistory = (application, stage, userId, notes) => {
  application.stage = stage;
  application.stageHistory.push({
    stage,
    changedBy: userId,
    changedAt: new Date(),
    notes: notes || "",
  });
};

export const createHiringApplication = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const { hiringRequestId, applicantId, notes } = req.body;
    if (!hiringRequestId || !applicantId) {
      return res.status(400).json({ message: "hiringRequestId and applicantId are required" });
    }

    const request = await HiringRequest.findById(hiringRequestId);
    if (!request) {
      return res.status(404).json({ message: "Hiring request not found" });
    }
    if (request.status !== "in_progress") {
      return res.status(400).json({
        message: "Applications can only be added to in-progress hiring requests (approve the request first)",
      });
    }

    const applicant = await Applicant.findById(applicantId);
    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    const existing = await HiringApplication.findOne({
      hiringRequest: hiringRequestId,
      applicant: applicantId,
    });
    if (existing) {
      return res.status(400).json({ message: "Applicant already linked to this request" });
    }

    const application = await HiringApplication.create({
      hiringRequest: hiringRequestId,
      applicant: applicantId,
      stage: "sourced",
      stageHistory: [
        {
          stage: "sourced",
          changedBy: req.user._id,
          changedAt: new Date(),
          notes: notes || "Added to pipeline",
        },
      ],
      addedBy: req.user._id,
    });

    const populated = await HiringApplication.findById(application._id)
      .populate("applicant")
      .populate("hiringRequest", "requestNumber designation status")
      .populate("addedBy", "name email");

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Applicant already linked to this request" });
    }
    res.status(500).json({ message: "Failed to create application", error: error.message });
  }
};

export const updateApplicationStage = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const { stage, notes } = req.body;
    const validStages = ["sourced", "shortlisted", "selected", "rejected", "withdrawn"];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    const application = await HiringApplication.findById(req.params.id).populate(
      "hiringRequest"
    );
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    pushStageHistory(application, stage, req.user._id, notes);
    await application.save();

    const populated = await HiringApplication.findById(application._id)
      .populate("applicant")
      .populate("hiringRequest", "requestNumber designation raisedBy")
      .populate("offerId", "offerNumber status");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update stage", error: error.message });
  }
};

export const createOfferFromApplication = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const application = await HiringApplication.findById(req.params.id)
      .populate("applicant")
      .populate("hiringRequest");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    if (application.stage !== "selected") {
      return res.status(400).json({ message: "Applicant must be in selected stage to create offer" });
    }
    if (application.offerId) {
      const existing = await Offer.findById(application.offerId).populate(
        "proposedDepartment",
        "name"
      );
      return res.json({ message: "Offer already exists", offer: existing, application });
    }

    const applicant = application.applicant;
    const request = application.hiringRequest;

    const existingEmail = await User.findOne({ email: applicant.email });
    if (existingEmail) {
      return res.status(400).json({
        message: "An employee profile already exists with this email",
      });
    }

    const offerNumber = await generateOfferNumber();
    const body = req.body || {};

    const offer = await Offer.create({
      offerNumber,
      candidateName: applicant.name,
      candidateEmail: applicant.email,
      candidatePhone: applicant.phone,
      proposedDesignation: body.proposedDesignation || request.designation,
      proposedDepartment: body.proposedDepartment || request.department,
      proposedJoiningDate: body.proposedJoiningDate
        ? new Date(body.proposedJoiningDate)
        : request.preferredJoiningDate,
      employmentType: body.employmentType || request.employmentType || "full-time",
      ctc: body.ctc,
      ctcDisplay: body.ctcDisplay,
      probationPeriod: body.probationPeriod || "6 months",
      noticePeriod: body.noticePeriod || "30 days",
      workLocation: body.workLocation || "Kolkata Office",
      offerValidTill: body.offerValidTill ? new Date(body.offerValidTill) : undefined,
      notes: body.notes || `From hiring request ${request.requestNumber}`,
      hiringRequestId: request._id,
      hiringApplicationId: application._id,
      applicantId: applicant._id,
      createdBy: req.user._id,
      status: "draft",
    });

    application.offerId = offer._id;
    await application.save();

    try {
      await NotificationService.sendToUser(
        request.raisedBy,
        "Offer created for hiring request",
        `An offer letter was created for ${applicant.name} (${request.requestNumber})`,
        {
          type: "hiring_offer",
          data: {
            hiringRequestId: request._id.toString(),
            offerId: offer._id.toString(),
          },
          actionUrl: `/hr/hiring/requests/${request._id}`,
          senderId: req.user._id,
        }
      );
    } catch (notifErr) {
      console.error("createOfferFromApplication notification:", notifErr.message);
    }

    const populated = await Offer.findById(offer._id)
      .populate("proposedDepartment", "name")
      .populate("createdBy", "name email")
      .populate("hiringRequestId", "requestNumber");

    res.status(201).json({
      message: "Offer created from application",
      offer: populated,
      application,
    });
  } catch (error) {
    console.error("createOfferFromApplication:", error);
    res.status(500).json({ message: "Failed to create offer", error: error.message });
  }
};
