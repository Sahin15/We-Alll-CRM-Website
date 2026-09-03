import HiringRequest from "../models/hiringRequestModel.js";
import HiringApplication from "../models/hiringApplicationModel.js";
import User from "../models/userModel.js";
import NotificationService from "../services/notificationService.js";
import {
  assertHrAccess,
  assertHoDAccess,
  canAccessHiringRequest,
  generateRequestNumber,
  hasCompanyWideHiringRequestAccess,
  getHoDDepartment,
  resolveHiringDepartmentForCreate,
} from "../utils/hiringAccess.js";
import { hasPermission } from "../authz/policyEngine.js";
import { getEffectivePermissionGrant } from "../services/resourceVisibilityService.js";
import { SCOPES } from "../authz/scopes.js";

const populateRequest = [
  { path: "department", select: "name" },
  { path: "raisedBy", select: "name email" },
  { path: "reviewedBy", select: "name email" },
  { path: "assignedHr", select: "name email" },
];

export const listHiringRequests = async (req, res) => {
  try {
    const { status, search, department } = req.query;
    const query = {};

    if (hasCompanyWideHiringRequestAccess(req.user)) {
      if (status) query.status = status;
      if (department) query.department = department;
    } else if (hasPermission(req.user, "hiring.request.view")) {
      const grant = getEffectivePermissionGrant(req.user, "hiring.request.view");
      const isCompanyWide =
        grant &&
        (grant.scope === SCOPES.COMPANY || grant.scope === SCOPES.PLATFORM);

      if (isCompanyWide) {
        if (status) query.status = status;
        if (department) query.department = department;
      } else {
        const hodDept = await getHoDDepartment(req.user._id || req.user.id);
        const deptId = hodDept?._id || req.user.department;
        if (!deptId) {
          return res.status(403).json({ message: "Access denied" });
        }
        query.department = deptId;
        if (status) query.status = status;
      }
    } else {
      const hodDept = await assertHoDAccess(req, res);
      if (!hodDept) return;
      query.department = hodDept._id;
      if (status) query.status = status;
    }

    if (search) {
      query.$or = [
        { requestNumber: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    const requests = await HiringRequest.find(query)
      .populate(populateRequest)
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("listHiringRequests:", error);
    res.status(500).json({ message: "Failed to fetch hiring requests", error: error.message });
  }
};

export const getHiringRequest = async (req, res) => {
  try {
    const request = await HiringRequest.findById(req.params.id).populate(populateRequest);
    if (!request) {
      return res.status(404).json({ message: "Hiring request not found" });
    }

    if (!(await canAccessHiringRequest(req, request))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const applications = await HiringApplication.find({ hiringRequest: request._id })
      .populate("applicant", "name email phone status resumeUrl skills experienceYears")
      .populate("offerId", "offerNumber status")
      .populate("interviews.interviewers", "name email")
      .sort({ updatedAt: -1 });

    res.json({ request, applications });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch hiring request", error: error.message });
  }
};

export const getHiringRequestApplications = async (req, res) => {
  try {
    const request = await HiringRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Hiring request not found" });
    }
    if (!(await canAccessHiringRequest(req, request))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const applications = await HiringApplication.find({ hiringRequest: request._id })
      .populate("applicant")
      .populate("offerId", "offerNumber status documentUrl")
      .populate("interviews.interviewers", "name email")
      .populate("addedBy", "name email")
      .sort({ updatedAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch applications", error: error.message });
  }
};

export const createHiringRequest = async (req, res) => {
  try {
    const hodDept = await resolveHiringDepartmentForCreate(req, res);
    if (!hodDept) return;

    const {
      designation,
      employmentType,
      headcount,
      skills,
      experienceRange,
      jobDescription,
      urgency,
      justification,
      preferredJoiningDate,
      budgetNotes,
    } = req.body;

    if (!designation?.trim() || !justification?.trim()) {
      return res.status(400).json({ message: "Designation and justification are required" });
    }

    const requestNumber = await generateRequestNumber(HiringRequest);

    const request = await HiringRequest.create({
      requestNumber,
      department: hodDept._id,
      raisedBy: req.user._id,
      designation: designation.trim(),
      employmentType: employmentType || "full-time",
      headcount: Math.max(1, parseInt(headcount, 10) || 1),
      skills,
      experienceRange,
      jobDescription,
      urgency: urgency || "medium",
      justification: justification.trim(),
      preferredJoiningDate: preferredJoiningDate ? new Date(preferredJoiningDate) : undefined,
      budgetNotes,
      status: "draft",
    });

    const populated = await HiringRequest.findById(request._id).populate(populateRequest);
    res.status(201).json(populated);
  } catch (error) {
    console.error("createHiringRequest:", error);
    res.status(500).json({ message: "Failed to create hiring request", error: error.message });
  }
};

export const updateHiringRequest = async (req, res) => {
  try {
    const request = await HiringRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Hiring request not found" });
    }

    if (request.status === "draft") {
      const hodDept = await assertHoDAccess(req, res);
      if (!hodDept) return;
      if (String(request.department) !== String(hodDept._id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const fields = [
        "designation",
        "employmentType",
        "headcount",
        "skills",
        "experienceRange",
        "jobDescription",
        "urgency",
        "justification",
        "preferredJoiningDate",
        "budgetNotes",
      ];
      fields.forEach((f) => {
        if (req.body[f] !== undefined) {
          if (f === "headcount") {
            request.headcount = Math.max(1, parseInt(req.body[f], 10) || 1);
          } else if (f === "preferredJoiningDate") {
            request.preferredJoiningDate = req.body[f] ? new Date(req.body[f]) : undefined;
          } else {
            request[f] = req.body[f];
          }
        }
      });
      await request.save();
      const populated = await HiringRequest.findById(request._id).populate(populateRequest);
      return res.json(populated);
    }

    if (!assertHrAccess(req, res)) return;

    if (req.body.status === "in_progress" && ["submitted", "on_hold"].includes(request.status)) {
      request.status = "in_progress";
    }
    if (req.body.assignedHr) request.assignedHr = req.body.assignedHr;
    if (req.body.hrNotes !== undefined) request.hrNotes = req.body.hrNotes;

    await request.save();
    const populated = await HiringRequest.findById(request._id).populate(populateRequest);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update hiring request", error: error.message });
  }
};

export const submitHiringRequest = async (req, res) => {
  try {
    const hodDept = await assertHoDAccess(req, res);
    if (!hodDept) return;

    const request = await HiringRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Hiring request not found" });
    }
    if (String(request.department) !== String(hodDept._id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (request.status !== "draft") {
      return res.status(400).json({ message: "Only draft requests can be submitted" });
    }

    request.status = "submitted";
    await request.save();

    const hod = await User.findById(req.user._id).select("name");
    const deptName = hodDept.name;

    try {
      await NotificationService.sendToRole(
        "hr",
        "New hiring request",
        `${hod?.name || "HoD"} submitted ${request.requestNumber} for ${request.designation} (${deptName})`,
        {
          type: "hiring_request",
          data: { hiringRequestId: request._id.toString() },
          actionUrl: `/hr/hiring/requests/${request._id}`,
          senderId: req.user._id,
        }
      );
    } catch (notifErr) {
      console.error("submitHiringRequest notification:", notifErr.message);
    }

    const populated = await HiringRequest.findById(request._id).populate(populateRequest);
    res.json({ message: "Hiring request submitted", request: populated });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit hiring request", error: error.message });
  }
};

export const reviewHiringRequest = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const { action, hrNotes, rejectionReason } = req.body;
    const validActions = ["hr_approved", "hr_rejected", "on_hold"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: "Invalid review action" });
    }

    const request = await HiringRequest.findById(req.params.id).populate("department", "name");
    if (!request) {
      return res.status(404).json({ message: "Hiring request not found" });
    }
    if (!["submitted", "on_hold"].includes(request.status)) {
      return res.status(400).json({ message: "Request is not pending HR review" });
    }

    request.status = action;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    if (hrNotes) request.hrNotes = hrNotes;
    if (action === "hr_rejected") request.rejectionReason = rejectionReason || "";
    if (action === "hr_approved") {
      request.assignedHr = req.user._id;
      request.status = "in_progress";
    }

    await request.save();

    try {
      const statusLabel =
        action === "hr_approved"
          ? "approved — hiring in progress"
          : action === "hr_rejected"
            ? "rejected"
            : "placed on hold";

      await NotificationService.sendToUser(
        request.raisedBy,
        "Hiring request update",
        `Your request ${request.requestNumber} was ${statusLabel}`,
        {
          type: "hiring_request",
          data: { hiringRequestId: request._id.toString() },
          actionUrl: `/hod/hiring/requests`,
          senderId: req.user._id,
        }
      );
    } catch (notifErr) {
      console.error("reviewHiringRequest notification:", notifErr.message);
    }

    const populated = await HiringRequest.findById(request._id).populate(populateRequest);
    res.json({ message: "Review recorded", request: populated });
  } catch (error) {
    res.status(500).json({ message: "Failed to review hiring request", error: error.message });
  }
};

export const getPendingCount = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;
    const count = await HiringRequest.countDocuments({ status: "submitted" });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch count", error: error.message });
  }
};
