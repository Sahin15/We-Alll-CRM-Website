import User from "../models/userModel.js";
import Document from "../models/documentModel.js";
import Offer from "../models/offerModel.js";
import { getTemplateBySlug, listPostJoinTemplates } from "../config/hrDocumentTemplates.js";
import { generateHrDocumentPdf } from "../services/hrDocumentPdfService.js";
import { uploadDocumentToS3, deleteDocumentFromS3 } from "../utils/documentUpload.js";

const HR_ROLES = ["hr", "admin", "superadmin", "manager"];

const assertHrAccess = (req, res) => {
  if (!HR_ROLES.includes(req.user.role)) {
    res.status(403).json({ message: "Insufficient permissions" });
    return false;
  }
  return true;
};

const getNested = (obj, path) => {
  if (!path || !obj) return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

const formatDateInput = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const resolveSourceValue = (user, source) => {
  if (!source) return undefined;
  if (source === "today") return formatDateInput(new Date());
  if (source.startsWith("user.")) {
    const raw = getNested(user, source.slice(5));
    if (raw instanceof Date) return formatDateInput(raw);
    return raw ?? "";
  }
  return undefined;
};

export const buildPrefillFromUser = (user, template) => {
  const values = { letterDate: formatDateInput(new Date()) };
  for (const field of template.fields) {
    if (field.default === "today") {
      values[field.key] = formatDateInput(new Date());
    } else if (field.default !== undefined) {
      values[field.key] = field.default;
    } else if (field.source) {
      const v = resolveSourceValue(user, field.source);
      if (v !== undefined && v !== "") values[field.key] = v;
    }
  }
  return values;
};

/** Carry compensation and terms from a converted offer into post-join document forms. */
export const mergeOfferIntoPrefill = (values, offer) => {
  if (!offer) return values;
  const snap = offer.variableSnapshot || {};
  const merged = { ...values };

  const setIfEmpty = (key, val) => {
    if (val != null && String(val).trim() && !String(merged[key] ?? "").trim()) {
      merged[key] = val;
    }
  };

  setIfEmpty("ctcDisplay", offer.ctcDisplay || snap.ctcDisplay);
  setIfEmpty("probationPeriod", offer.probationPeriod || snap.probationPeriod);
  setIfEmpty("noticePeriod", offer.noticePeriod || snap.noticePeriod);
  setIfEmpty("workLocation", offer.workLocation || snap.workLocation);
  setIfEmpty("employmentType", offer.employmentType || snap.employmentType);
  setIfEmpty("designation", offer.proposedDesignation);
  setIfEmpty("employeeName", offer.candidateName);
  if (offer.proposedJoiningDate) {
    setIfEmpty("joiningDate", formatDateInput(offer.proposedJoiningDate));
  }

  return merged;
};

const loadEmployee = async (userId) => {
  const user = await User.findById(userId)
    .populate("department", "name")
    .populate("reportingManager", "name email");
  if (!user) return null;
  return user;
};

export const listTemplates = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;
    res.json(listPostJoinTemplates());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTemplateDetail = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;
    const template = getTemplateBySlug(req.params.slug);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json({
      slug: template.slug,
      name: template.name,
      category: template.category,
      onePerEmployee: template.onePerEmployee,
      fields: template.fields,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const prefillTemplate = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;
    const template = getTemplateBySlug(req.params.slug);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    const user = await loadEmployee(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const offer = await Offer.findOne({ convertedUserId: user._id })
      .select("candidateName proposedDesignation proposedJoiningDate employmentType ctcDisplay probationPeriod noticePeriod workLocation variableSnapshot")
      .lean();
    const values = mergeOfferIntoPrefill(buildPrefillFromUser(user, template), offer);
    res.json({ template: { slug: template.slug, name: template.name, category: template.category }, values });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const validateVariables = (template, variables) => {
  const missing = template.fields
    .filter((f) => f.required && !String(variables[f.key] ?? "").trim())
    .map((f) => f.label);
  if (missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
};

export const previewHrDocument = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;
    const template = getTemplateBySlug(req.params.slug);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    const err = validateVariables(template, req.body.variables || {});
    if (err) return res.status(400).json({ message: err });

    const pdfBuffer = await generateHrDocumentPdf(template.slug, req.body.variables);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${template.slug}-preview.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("previewHrDocument:", error);
    res.status(500).json({ message: "Failed to generate preview", error: error.message });
  }
};

export const generateHrDocument = async (req, res) => {
  try {
    if (!assertHrAccess(req, res)) return;
    const template = getTemplateBySlug(req.params.slug);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const userId = req.body.userId || req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await loadEmployee(userId);
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const variables = req.body.variables || {};
    const err = validateVariables(template, variables);
    if (err) return res.status(400).json({ message: err });

    if (template.onePerEmployee) {
      const existing = await Document.findOne({ userId, category: template.category });
      if (existing?.path?.startsWith("https://")) {
        try {
          await deleteDocumentFromS3(existing.path);
        } catch (e) {
          console.error("delete old doc:", e);
        }
      }
      if (existing) {
        await Document.findByIdAndDelete(existing._id);
      }
    }

    const pdfBuffer = await generateHrDocumentPdf(template.slug, variables);
    const safeName = (user.name || "employee").replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${template.slug}-${safeName}-${Date.now()}.pdf`;

    const documentUrl = await uploadDocumentToS3(
      pdfBuffer,
      fileName,
      "application/pdf",
      "documents/hr-generated"
    );

    const document = await Document.create({
      userId,
      category: template.category,
      originalName: fileName,
      filename: fileName,
      path: documentUrl,
      size: pdfBuffer.length,
      mimetype: "application/pdf",
      description: `Generated ${template.name}`,
      title: template.name,
      uploadedBy: req.user._id,
      isOfficial: true,
      verificationStatus: "approved",
      verifiedBy: req.user._id,
      verificationDate: new Date(),
    });

    res.status(201).json({
      message: `${template.name} generated successfully`,
      document: {
        _id: document._id,
        category: document.category,
        title: document.title,
        url: documentUrl,
        fileUrl: documentUrl,
        uploadedAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("generateHrDocument:", error);
    res.status(500).json({ message: "Failed to generate document", error: error.message });
  }
};
