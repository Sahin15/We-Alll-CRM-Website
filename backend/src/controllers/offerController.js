import bcrypt from "bcryptjs";
import Offer from "../models/offerModel.js";
import User from "../models/userModel.js";
import Department from "../models/departmentModel.js";
import Document from "../models/documentModel.js";
import Applicant from "../models/applicantModel.js";
import HiringRequest from "../models/hiringRequestModel.js";
import HiringApplication from "../models/hiringApplicationModel.js";
import { generateOfferLetterPdfFromTemplate } from "../services/offerLetterPdfService.js";
import { uploadDocumentToS3, deleteDocumentFromS3 } from "../utils/documentUpload.js";

const HR_ROLES = ["hr", "admin", "superadmin", "manager"];

const assertHrAccess = (req, res) => {
  if (!HR_ROLES.includes(req.user.role)) {
    res.status(403).json({ message: "Insufficient permissions" });
    return false;
  }
  return true;
};

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

const buildOfferVariables = async (offer) => {
  let departmentName = "—";
  if (offer.proposedDepartment) {
    const dept = await Department.findById(offer.proposedDepartment).select("name");
    departmentName = dept?.name || "—";
  }
  return {
    offerNumber: offer.offerNumber,
    letterDate: new Date(),
    candidateName: offer.candidateName,
    proposedDesignation: offer.proposedDesignation,
    departmentName,
    employmentType: offer.employmentType,
    proposedJoiningDate: offer.proposedJoiningDate,
    workLocation: offer.workLocation,
    ctc: offer.ctc,
    ctcDisplay: offer.ctcDisplay,
    probationPeriod: offer.probationPeriod,
    noticePeriod: offer.noticePeriod,
    offerValidTill: offer.offerValidTill,
    customClause: offer.variableSnapshot?.customClause || "",
  };
};

export const listOffers = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const { status, search, hiringRequestId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (hiringRequestId) query.hiringRequestId = hiringRequestId;
    if (search) {
      query.$or = [
        { candidateName: { $regex: search, $options: "i" } },
        { candidateEmail: { $regex: search, $options: "i" } },
        { offerNumber: { $regex: search, $options: "i" } },
      ];
    }

    const offers = await Offer.find(query)
      .populate("proposedDepartment", "name")
      .populate("createdBy", "name email")
      .populate("convertedUserId", "name email employeeId")
      .populate("hiringRequestId", "requestNumber designation status")
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    console.error("listOffers:", error);
    res.status(500).json({ message: "Failed to fetch offers", error: error.message });
  }
};

export const getOffer = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const offer = await Offer.findById(req.params.id)
      .populate("proposedDepartment", "name")
      .populate("createdBy", "name email")
      .populate("convertedUserId", "name email employeeId")
      .populate("hiringRequestId", "requestNumber designation status");

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.json(offer);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch offer", error: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      proposedDesignation,
      proposedDepartment,
      proposedJoiningDate,
      employmentType,
      ctc,
      ctcDisplay,
      probationPeriod,
      noticePeriod,
      workLocation,
      offerValidTill,
      notes,
      customClause,
      hiringRequestId,
      hiringApplicationId,
      applicantId,
    } = req.body;

    if (!candidateName?.trim() || !candidateEmail?.trim()) {
      return res.status(400).json({ message: "Candidate name and email are required" });
    }

    const existingEmail = await User.findOne({ email: candidateEmail.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        message: "An employee profile already exists with this email. Use employee documents instead.",
      });
    }

    const offerNumber = await generateOfferNumber();

    const offer = await Offer.create({
      offerNumber,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim().toLowerCase(),
      candidatePhone,
      proposedDesignation,
      proposedDepartment: proposedDepartment || undefined,
      proposedJoiningDate: proposedJoiningDate ? new Date(proposedJoiningDate) : undefined,
      employmentType: employmentType || "full-time",
      ctc,
      ctcDisplay,
      probationPeriod,
      noticePeriod,
      workLocation,
      offerValidTill: offerValidTill ? new Date(offerValidTill) : undefined,
      notes,
      variableSnapshot: { customClause },
      hiringRequestId: hiringRequestId || undefined,
      hiringApplicationId: hiringApplicationId || undefined,
      applicantId: applicantId || undefined,
      createdBy: req.user._id,
      status: "draft",
    });

    const populated = await Offer.findById(offer._id)
      .populate("proposedDepartment", "name")
      .populate("createdBy", "name email")
      .populate("hiringRequestId", "requestNumber");

    res.status(201).json(populated);
  } catch (error) {
    console.error("createOffer:", error);
    res.status(500).json({ message: "Failed to create offer", error: error.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    if (offer.status === "converted") {
      return res.status(400).json({ message: "Cannot edit a converted offer" });
    }

    const allowed = [
      "candidateName",
      "candidateEmail",
      "candidatePhone",
      "proposedDesignation",
      "proposedDepartment",
      "proposedJoiningDate",
      "employmentType",
      "ctc",
      "ctcDisplay",
      "probationPeriod",
      "noticePeriod",
      "workLocation",
      "offerValidTill",
      "notes",
      "status",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "proposedJoiningDate" || key === "offerValidTill") {
          offer[key] = req.body[key] ? new Date(req.body[key]) : undefined;
        } else {
          offer[key] = req.body[key];
        }
      }
    }

    if (req.body.customClause !== undefined) {
      offer.variableSnapshot = {
        ...offer.variableSnapshot,
        customClause: req.body.customClause,
      };
    }

    await offer.save();

    const populated = await Offer.findById(offer._id)
      .populate("proposedDepartment", "name")
      .populate("createdBy", "name email")
      .populate("convertedUserId", "name email employeeId");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update offer", error: error.message });
  }
};

export const previewOfferLetter = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const offer = await Offer.findById(req.params.id).populate(
      "proposedDepartment",
      "name"
    );
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    const pdfBuffer = await generateOfferLetterPdfFromTemplate(offer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${offer.offerNumber}-preview.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("previewOfferLetter:", error);
    res.status(500).json({ message: "Failed to generate preview", error: error.message });
  }
};

export const generateOfferLetter = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const offer = await Offer.findById(req.params.id).populate(
      "proposedDepartment",
      "name"
    );
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    if (offer.status === "converted") {
      return res.status(400).json({ message: "Offer already converted to employee" });
    }

    const vars = await buildOfferVariables(offer);
    const pdfBuffer = await generateOfferLetterPdfFromTemplate(offer);

    const fileName = `${offer.offerNumber}-offer-letter.pdf`;
    const documentUrl = await uploadDocumentToS3(
      pdfBuffer,
      fileName,
      "application/pdf",
      "documents/offers"
    );

    offer.documentUrl = documentUrl;
    offer.documentSize = pdfBuffer.length;
    offer.status = offer.status === "draft" ? "generated" : offer.status;
    offer.variableSnapshot = vars;
    await offer.save();

    const populated = await Offer.findById(offer._id)
      .populate("proposedDepartment", "name")
      .populate("createdBy", "name email");

    res.json({
      message: "Offer letter generated successfully",
      offer: populated,
      documentUrl,
    });
  } catch (error) {
    console.error("generateOfferLetter:", error);
    res.status(500).json({ message: "Failed to generate offer letter", error: error.message });
  }
};

export const convertOfferToEmployee = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    if (offer.status === "converted") {
      return res.status(400).json({ message: "Offer already converted" });
    }
    if (!offer.documentUrl) {
      return res.status(400).json({ message: "Generate the offer letter before converting" });
    }

    const { password, employeeId, designation, joiningDate } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password (min 6 characters) is required for new employee" });
    }

    const email = offer.candidateEmail;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: offer.candidateName,
      email,
      password: hashedPassword,
      phone: offer.candidatePhone,
      role: "employee",
      designation: designation || offer.proposedDesignation,
      department: offer.proposedDepartment,
      employmentType: offer.employmentType || "full-time",
      joiningDate: joiningDate
        ? new Date(joiningDate)
        : offer.proposedJoiningDate || new Date(),
      employeeId: employeeId || undefined,
      status: "active",
      nationality: "Indian",
    });

    const document = await Document.create({
      userId: user._id,
      category: "offer_letter",
      originalName: `${offer.offerNumber}-offer-letter.pdf`,
      filename: `${offer.offerNumber}-offer-letter.pdf`,
      path: offer.documentUrl,
      size: offer.documentSize || 0,
      mimetype: "application/pdf",
      description: `Offer letter from ${offer.offerNumber}`,
      title: `Offer Letter — ${offer.offerNumber}`,
      uploadedBy: req.user._id,
      isOfficial: true,
      verificationStatus: "approved",
      verifiedBy: req.user._id,
      verificationDate: new Date(),
    });

    offer.status = "converted";
    offer.convertedUserId = user._id;
    offer.convertedAt = new Date();
    offer.linkedDocumentId = document._id;
    await offer.save();

    if (offer.applicantId) {
      await Applicant.findByIdAndUpdate(offer.applicantId, {
        status: "hired",
        linkedUserId: user._id,
      });
    }

    if (offer.hiringRequestId) {
      const hiringRequest = await HiringRequest.findById(offer.hiringRequestId);
      if (hiringRequest) {
        hiringRequest.filledCount = (hiringRequest.filledCount || 0) + 1;
        if (hiringRequest.filledCount >= hiringRequest.headcount) {
          hiringRequest.status = "filled";
          hiringRequest.closedAt = new Date();
        }
        await hiringRequest.save();
      }
    }

    res.status(201).json({
      message: "Employee created and offer letter linked",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
      },
      offer,
      documentId: document._id,
    });
  } catch (error) {
    console.error("convertOfferToEmployee:", error);
    res.status(500).json({ message: "Failed to convert offer", error: error.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    if (offer.status === "converted") {
      return res.status(400).json({
        message: "Cannot delete an offer that was converted to an employee",
      });
    }

    if (offer.documentUrl) {
      try {
        await deleteDocumentFromS3(offer.documentUrl);
      } catch (err) {
        console.error("deleteOffer: S3 cleanup failed (continuing):", err.message);
      }
    }

    if (offer.hiringApplicationId) {
      await HiringApplication.findByIdAndUpdate(offer.hiringApplicationId, {
        $unset: { offerId: 1 },
      });
    }

    await Offer.findByIdAndDelete(req.params.id);

    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("deleteOffer:", error);
    res.status(500).json({ message: "Failed to delete offer", error: error.message });
  }
};

export const getOfferByUserId = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const offer = await Offer.findOne({ convertedUserId: req.params.userId })
      .populate("proposedDepartment", "name")
      .populate("hiringRequestId", "requestNumber designation status")
      .select("offerNumber status documentUrl convertedAt candidateName hiringRequestId");

    res.json(offer || null);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch linked offer", error: error.message });
  }
};
