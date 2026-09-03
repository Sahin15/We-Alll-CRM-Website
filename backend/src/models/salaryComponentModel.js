import mongoose from "mongoose";
import {
  COMPONENT_TYPES,
  CALC_METHODS,
} from "../services/payroll/salaryComponentCatalog.js";

const salaryComponentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Component code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Component name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: COMPONENT_TYPES,
      required: [true, "Component type is required"],
    },
    taxable: {
      type: Boolean,
      default: true,
    },
    statutory: {
      type: Boolean,
      default: false,
    },
    calcMethod: {
      type: String,
      enum: CALC_METHODS,
      default: "fixed",
    },
    defaultFormula: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    /** Maps to V1 SalaryStructure flat field when applicable */
    v1Field: {
      type: String,
      default: "",
      trim: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

salaryComponentSchema.index({ type: 1, isActive: 1, displayOrder: 1 });
salaryComponentSchema.index({ v1Field: 1 });

const SalaryComponent = mongoose.model("SalaryComponent", salaryComponentSchema);

export default SalaryComponent;
