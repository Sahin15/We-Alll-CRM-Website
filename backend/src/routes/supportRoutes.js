import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import SupportCategory from "../models/supportContactModel.js";

const router = express.Router();

const DEFAULT_CATEGORIES = [
  // HR & Administrative Support
  { category: "leave_wfh_attendance",  label: "Leave, WFH & Attendance Queries",  section: "hr_admin",   description: "Leave requests, WFH requests, attendance issues", isDefault: true, order: 1 },
  { category: "official_documents",    label: "Official Documents",                section: "hr_admin",   description: "Offer Letters, Designations", isDefault: true, order: 2 },
  { category: "resignation_exit",      label: "Resignation & Exit Formalities",    section: "hr_admin",   description: "Resignation and exit process queries", isDefault: true, order: 3 },
  // Operations & Grievance
  { category: "general_office",        label: "General Office Queries",            section: "operations", description: "General day-to-day office queries", isDefault: true, order: 4 },
  { category: "complaints_issues",     label: "Complaints & Issues",               section: "operations", description: "Complaints and grievances", isDefault: true, order: 5 },
];

// Ensure all 5 default categories exist — upsert label/description/isDefault/order/section but never overwrite emails/phones
const seedDefaults = async () => {
  // Remove old categories that no longer belong to the default set
  const validSlugs = DEFAULT_CATEGORIES.map(c => c.category);
  await SupportCategory.deleteMany({ isDefault: true, category: { $nin: validSlugs } });

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await SupportCategory.findOne({ category: cat.category });
    if (!existing) {
      await SupportCategory.create({
        category:    cat.category,
        label:       cat.label,
        section:     cat.section,
        description: cat.description,
        isDefault:   true,
        order:       cat.order,
        emails:      {},
        phones:      [],
        isActive:    true,
      });
    } else {
      // Update label/description/order/isDefault/section but leave emails/phones untouched
      await SupportCategory.updateOne(
        { category: cat.category },
        { $set: { label: cat.label, section: cat.section, description: cat.description, isDefault: true, order: cat.order } }
      );
    }
  }
};

// GET all active categories — all authenticated users
router.get("/", protect, async (req, res) => {
  try {
    await seedDefaults();
    const cats = await SupportCategory.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all categories including inactive — admin/superadmin (MUST be before /:category)
router.get("/all", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    await seedDefaults();
    const cats = await SupportCategory.find().sort({ order: 1, createdAt: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST create a custom category — admin/superadmin
router.post("/", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    const { label, description, order, section } = req.body;
    if (!label?.trim()) return res.status(400).json({ message: "Label is required" });

    // Generate slug from label
    const category = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const exists = await SupportCategory.findOne({ category });
    if (exists) return res.status(400).json({ message: "A category with this name already exists" });

    const cat = await SupportCategory.create({
      category,
      label: label.trim(),
      description: description || "",
      section: section || "operations",
      isDefault: false,
      order: order || 99,
    });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update a category — admin/superadmin (MUST be after /all)
router.put("/:category", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    const { emails, phones, description, label, isActive, order } = req.body;
    const update = { updatedBy: req.user._id };
    if (emails !== undefined)      update.emails = emails;
    if (phones !== undefined)      update.phones = phones;
    if (description !== undefined) update.description = description;
    if (label !== undefined)       update.label = label;
    if (isActive !== undefined)    update.isActive = isActive;
    if (order !== undefined)       update.order = order;

    const cat = await SupportCategory.findOneAndUpdate(
      { category: req.params.category },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE a custom category — admin/superadmin (MUST be after /all)
router.delete("/:category", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    const slug = req.params.category;
    const cat = await SupportCategory.findOne({ category: slug });
    if (!cat) return res.status(404).json({ message: `Category "${slug}" not found` });
    if (cat.isDefault) return res.status(400).json({ message: "Default categories cannot be deleted" });
    await SupportCategory.deleteOne({ _id: cat._id });
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("DELETE /support-contacts error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
