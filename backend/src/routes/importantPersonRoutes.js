import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import ImportantPerson from "../models/importantPersonModel.js";

const router = express.Router();

// GET all active — all authenticated users
router.get("/", protect, async (req, res) => {
  try {
    const persons = await ImportantPerson.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(persons);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET all including inactive — admin/superadmin
router.get("/all", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    const persons = await ImportantPerson.find().sort({ order: 1, createdAt: 1 });
    res.json(persons);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST create — admin/superadmin
router.post("/", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    const { name, role, phone, order } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const person = await ImportantPerson.create({ name: name.trim(), role, phone, order, createdBy: req.user._id });
    res.status(201).json(person);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update — admin/superadmin
router.put("/:id", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    const person = await ImportantPerson.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!person) return res.status(404).json({ message: "Not found" });
    res.json(person);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE — admin/superadmin
router.delete("/:id", protect, authorizeRoles("admin", "superadmin"), async (req, res) => {
  try {
    const person = await ImportantPerson.findByIdAndDelete(req.params.id);
    if (!person) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
