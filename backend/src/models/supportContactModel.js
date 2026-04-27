import mongoose from "mongoose";

const emailSetSchema = new mongoose.Schema({
  main: { type: String, trim: true, default: "" },
  cc1:  { type: String, trim: true, default: "" },
  cc2:  { type: String, trim: true, default: "" },
  bcc:  { type: String, trim: true, default: "" },
}, { _id: false });

const phoneContactSchema = new mongoose.Schema({
  name:  { type: String, trim: true, default: "" },
  role:  { type: String, trim: true, default: "" },
  phone: { type: String, trim: true, default: "" },
}, { _id: true });

const supportCategorySchema = new mongoose.Schema({
  // slug-style key, e.g. "leave_wfh_attendance", "complaints_issues", or custom "it_support"
  category:    { type: String, required: true, unique: true, trim: true },
  label:       { type: String, required: true, trim: true },
  section:     { type: String, enum: ["hr_admin", "operations"], default: "operations" }, // which main section
  description: { type: String, default: "" },
  emails:      { type: emailSetSchema, default: () => ({}) },
  phones:      { type: [phoneContactSchema], default: [] },
  isDefault:   { type: Boolean, default: false }, // true = cannot be deleted
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 99 },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("SupportCategory", supportCategorySchema);
