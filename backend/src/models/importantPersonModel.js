import mongoose from "mongoose";

const importantPersonSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  role:     { type: String, trim: true, default: "" },
  phone:    { type: String, trim: true, default: "" },
  order:    { type: Number, default: 99 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("ImportantPerson", importantPersonSchema);
