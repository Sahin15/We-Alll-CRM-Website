import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    // Legacy field - kept for backward compatibility
    category: {
      type: String,
      enum: ["travel", "food", "accommodation", "office_supplies", "client_meeting", "training", "other"],
      default: null,
    },
    
    // New fields for dual-dimension budgeting
    expensePurpose: {
      type: String,
      enum: [
        "internal_office",
        "existing_client",
        "prospective_client",
        "seminar",
        "expo",
        "vendor_meeting",
        "recruitment",
        "training",
        "marketing_activity",
        "team_activity",
        "travel_visit",
        null // Allow null for type-only budgets
      ],
      default: null,
    },
    
    expenseType: {
      type: String,
      enum: [
        "food",
        "travel",
        "hotel",
        "transport",
        "materials",
        "entry_fee",
        "gift",
        "printing",
        "miscellaneous",
        null // Allow null for purpose-only budgets
      ],
      default: null,
    },
    
    financialYear: {
      type: String,
      required: true,
      // Format: "2024-2025" (April 2024 to March 2025)
    },
    limit: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Procurement budget tracking
    procurementCommitted: {
      type: Number,
      default: 0,
      min: 0,
      // Sum of all issued (not yet paid) PO values for this budget
    },
    procurementSpent: {
      type: Number,
      default: 0,
      min: 0,
      // Sum of all paid procurement invoices for this budget
    },
  },
  { timestamps: true }
);

// Compound unique indexes for different budget granularity levels
// Budget by Purpose only
budgetSchema.index({ expensePurpose: 1, financialYear: 1, expenseType: 1 }, { 
  unique: true,
  sparse: true,
  name: "budget_purpose_type_year_unique"
});

// Legacy index for backward compatibility
budgetSchema.index({ category: 1, financialYear: 1 }, { 
  unique: true,
  sparse: true,
  name: "budget_category_year_unique"
});

// Additional indexes for queries
budgetSchema.index({ expensePurpose: 1, financialYear: 1 });
budgetSchema.index({ expenseType: 1, financialYear: 1 });
budgetSchema.index({ financialYear: 1, isActive: 1 });

export default mongoose.model("Budget", budgetSchema);
