import HiringApplication from "../models/hiringApplicationModel.js";
import HiringRequest from "../models/hiringRequestModel.js";
import Applicant from "../models/applicantModel.js";
import Offer from "../models/offerModel.js";
import User from "../models/userModel.js";
import NotificationService from "../services/notificationService.js";
import { assertHrAccess } from "../utils/hiringAccess.js";
import {
  HIRING_STAGES,
  validateStageTransition,
  validateDecisionReason,
  validateSelectStage,
} from "../utils/hiringPipeline.js";

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

const populateApplication = [
  { path: "applicant" },
  { path: "hiringRequest", select: "requestNumber designation status department raisedBy" },
  { path: "addedBy", select: "name email" },
  { path: "offerId", select: "offerNumber status" },
  { path: "interviews.scheduledBy", select: "name email" },
  { path: "interviews.completedBy", select: "name email" },
  { path: "interviews.interviewers", select: "name email designation" },
  { path: "stageHistory.changedBy", select: "name email" },
];

const pushStageHistory = (application, stage, userId, notes) => {
  application.stage = stage;
  application.stageHistory.push({
    stage,
    changedBy: userId,
    changedAt: new Date(),
    notes: notes || "",
  });
};

const loadApplication = async (id) =>
  HiringApplication.findById(id).populate(populateApplication);

export const getHiringApplication = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const application = await loadApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  } catch (error) {
    console.error("getHiringApplication:", error);
    res.status(500).json({ message: "Failed to fetch application", error: error.message });
  }
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

    const populated = await loadApplication(application._id);
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Applicant already linked to this request" });
    }
    console.error("createHiringApplication:", error);
    res.status(500).json({ message: "Failed to create application", error: error.message });
  }
};

export const updateApplicationStage = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const { stage, notes, decisionReason } = req.body;
    if (!HIRING_STAGES.includes(stage)) {
      return res.status(400).json({ message: "Invalid stage" });
    }

    const application = await HiringApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const transition = validateStageTransition(application.stage, stage);
    if (!transition.allowed) {
      return res.status(400).json({ message: transition.message });
    }

    const reasonCheck = validateDecisionReason(stage, decisionReason);
    if (!reasonCheck.valid) {
      return res.status(400).json({ message: reasonCheck.message });
    }

    const selectCheck = validateSelectStage(stage, application);
    if (!selectCheck.valid) {
      return res.status(400).json({ message: selectCheck.message });
    }

    if (stage === "rejected") {
      application.decisionReason = decisionReason.trim();
    } else if (stage === "selected") {
      application.decisionReason = undefined;
    }

    pushStageHistory(application, stage, req.user._id, notes);
    await application.save();

    const populated = await loadApplication(application._id);
    res.json(populated);
  } catch (error) {
    console.error("updateApplicationStage:", error);
    res.status(500).json({ message: "Failed to update stage", error: error.message });
  }
};

export const scheduleInterview = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const application = await HiringApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!["shortlisted", "interviewed"].includes(application.stage)) {
      return res.status(400).json({
        message: "Interviews can only be scheduled for shortlisted or interviewed candidates",
      });
    }

    const {
      title,
      scheduledAt,
      durationMinutes,
      mode,
      locationOrLink,
      interviewerIds,
      round,
    } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: "Invalid scheduledAt date" });
    }

    const nextRound =
      round ||
      (application.interviews?.length
        ? Math.max(...application.interviews.map((i) => i.round || 1)) + 1
        : 1);

    application.interviews.push({
      round: nextRound,
      title: title?.trim() || `Round ${nextRound}`,
      scheduledAt: scheduledDate,
      durationMinutes: durationMinutes || 45,
      mode: mode || "video",
      locationOrLink: locationOrLink?.trim(),
      interviewers: Array.isArray(interviewerIds) ? interviewerIds : [],
      status: "scheduled",
      scheduledBy: req.user._id,
    });

    if (application.stage !== "interview_scheduled") {
      pushStageHistory(
        application,
        "interview_scheduled",
        req.user._id,
        `Interview round ${nextRound} scheduled`
      );
    }

    await application.save();

    const populated = await loadApplication(application._id);
    const request = await HiringRequest.findById(application.hiringRequest).select("raisedBy requestNumber");

    try {
      await NotificationService.sendToUser(
        request?.raisedBy,
        "Interview scheduled",
        `Interview scheduled for ${populated.applicant?.name} (${request?.requestNumber})`,
        {
          type: "hiring_interview",
          data: {
            hiringRequestId: application.hiringRequest.toString(),
            applicationId: application._id.toString(),
          },
          actionUrl: `/hr/hiring/applications/${application._id}`,
          senderId: req.user._id,
        }
      );
    } catch (notifErr) {
      console.error("scheduleInterview notification:", notifErr.message);
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error("scheduleInterview:", error);
    res.status(500).json({ message: "Failed to schedule interview", error: error.message });
  }
};

export const completeInterview = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const application = await HiringApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const interview = application.interviews.id(req.params.interviewId);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (interview.status === "completed") {
      return res.status(400).json({ message: "Interview is already completed" });
    }

    const { remarks, rating, recommendation, status } = req.body;
    const finalStatus = status || "completed";

    if (!["completed", "cancelled", "no_show"].includes(finalStatus)) {
      return res.status(400).json({ message: "Invalid interview status" });
    }

    if (finalStatus === "completed" && !remarks?.trim()) {
      return res.status(400).json({ message: "Interview remarks are required when completing" });
    }

    interview.status = finalStatus;
    interview.remarks = remarks?.trim() || interview.remarks;
    if (rating) interview.rating = rating;
    if (recommendation) interview.recommendation = recommendation;
    interview.completedBy = req.user._id;
    interview.completedAt = new Date();

    if (finalStatus === "completed" && application.stage === "interview_scheduled") {
      pushStageHistory(
        application,
        "interviewed",
        req.user._id,
        `Round ${interview.round} completed`
      );
    }

    await application.save();

    const populated = await loadApplication(application._id);
    res.json(populated);
  } catch (error) {
    console.error("completeInterview:", error);
    res.status(500).json({ message: "Failed to update interview", error: error.message });
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
