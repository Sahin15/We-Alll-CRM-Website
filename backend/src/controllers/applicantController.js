import Applicant from "../models/applicantModel.js";
import User from "../models/userModel.js";
import { uploadDocumentToS3 } from "../utils/documentUpload.js";
import { assertHrAccess } from "../utils/hiringAccess.js";

export const listApplicants = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const { status, search, source, tag } = req.query;
    const query = {};
    if (status) query.status = status;
    else query.status = { $ne: "archived" };
    if (source) query.source = source;
    if (tag) query.tags = tag;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { skills: { $regex: search, $options: "i" } },
      ];
    }

    const applicants = await Applicant.find(query)
      .populate("addedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(applicants);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch applicants", error: error.message });
  }
};

export const getApplicant = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const applicant = await Applicant.findById(req.params.id).populate(
      "addedBy",
      "name email"
    );
    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }
    res.json(applicant);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch applicant", error: error.message });
  }
};

const checkEmailAvailable = async (email, excludeApplicantId) => {
  const normalized = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalized });
  if (existingUser) {
    return "An employee profile already exists with this email";
  }
  const query = { email: normalized, status: { $ne: "archived" } };
  if (excludeApplicantId) query._id = { $ne: excludeApplicantId };
  const existingApplicant = await Applicant.findOne(query);
  if (existingApplicant) {
    return "An applicant with this email already exists";
  }
  return null;
};

export const createApplicant = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const {
      name,
      email,
      phone,
      skills,
      experienceYears,
      currentCompany,
      expectedCtc,
      source,
      tags,
      notes,
    } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const emailError = await checkEmailAvailable(email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    let resumeUrl, resumeFilename, resumeSize;
    const file = req.file;
    if (file) {
      resumeUrl = await uploadDocumentToS3(
        file.buffer,
        file.originalname,
        file.mimetype,
        "applicant-resumes"
      );
      resumeFilename = file.originalname;
      resumeSize = file.size;
    }

    const parsedTags = tags
      ? Array.isArray(tags)
        ? tags
        : String(tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
      : [];

    const applicant = await Applicant.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone,
      skills,
      experienceYears: experienceYears ? Number(experienceYears) : undefined,
      currentCompany,
      expectedCtc,
      source: source || "other",
      tags: parsedTags,
      notes,
      resumeUrl,
      resumeFilename,
      resumeSize,
      addedBy: req.user._id,
    });

    const populated = await Applicant.findById(applicant._id).populate(
      "addedBy",
      "name email"
    );
    res.status(201).json(populated);
  } catch (error) {
    console.error("createApplicant:", error);
    res.status(500).json({ message: "Failed to create applicant", error: error.message });
  }
};

export const updateApplicant = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const applicant = await Applicant.findById(req.params.id);
    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    const fields = [
      "name",
      "phone",
      "skills",
      "experienceYears",
      "currentCompany",
      "expectedCtc",
      "source",
      "notes",
      "status",
    ];

    if (req.body.email && req.body.email !== applicant.email) {
      const emailError = await checkEmailAvailable(req.body.email, applicant._id);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }
      applicant.email = req.body.email.trim().toLowerCase();
    }

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === "experienceYears") {
          applicant.experienceYears = req.body[f] ? Number(req.body[f]) : undefined;
        } else {
          applicant[f] = req.body[f];
        }
      }
    });

    if (req.body.tags !== undefined) {
      applicant.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : String(req.body.tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }

    await applicant.save();
    const populated = await Applicant.findById(applicant._id).populate(
      "addedBy",
      "name email"
    );
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update applicant", error: error.message });
  }
};

export const uploadApplicantResume = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const applicant = await Applicant.findById(req.params.id);
    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Resume file is required" });
    }

    const resumeUrl = await uploadDocumentToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "applicant-resumes"
    );

    applicant.resumeUrl = resumeUrl;
    applicant.resumeFilename = req.file.originalname;
    applicant.resumeSize = req.file.size;
    await applicant.save();

    res.json(applicant);
  } catch (error) {
    res.status(500).json({ message: "Failed to upload resume", error: error.message });
  }
};

export const archiveApplicant = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;

    const applicant = await Applicant.findById(req.params.id);
    if (!applicant) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    applicant.status = "archived";
    await applicant.save();
    res.json({ message: "Applicant archived", applicant });
  } catch (error) {
    res.status(500).json({ message: "Failed to archive applicant", error: error.message });
  }
};
