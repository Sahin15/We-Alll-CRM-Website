import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    phone: {
      type: Number,
    },
    company: {
      type: String,
    },
    address: {
      type: String,
    },
    whatsappnumber: {
      type: Number,
    },
    ownername: {
      type: String,
    },
    // Onboarding fields
    onboardingStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    onboardingDate: {
      type: Date,
    },
    // Services & Plan
    serviceCompany: {
      type: String,
      enum: ["We Alll", "Kolkata Digital"],
      // Which company's services the client is using
    },
    servicesSubscribed: {
      type: [String],
      default: [],
      // Examples: SEO, Social Media Marketing, PPC, Content Marketing, Email Marketing
    },
    planType: {
      type: String,
      enum: ["basic", "standard", "premium", "enterprise", "custom"],
      default: "basic",
    },
    planStartDate: {
      type: Date,
    },
    planEndDate: {
      type: Date,
    },
    planRenewalDate: {
      type: Date,
    },
    // Billing & Payment
    monthlyBudget: {
      type: Number,
      default: 0,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "yearly"],
      default: "monthly",
    },
    paymentTerms: {
      type: String,
      enum: ["net15", "net30", "net45", "advance", "custom"],
      default: "net30",
    },
    taxId: {
      type: String,
    },
    gstNumber: {
      type: String,
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // Account Management
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    notes: {
      type: String,
    },
    // Additional client onboarding fields
    industry: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    targetAudience: {
      type: String,
      trim: true,
    },
    audienceGender: {
      type: String,
      enum: ["Male", "Female", "Both", "Other", "Not Applicable"],
    },
    previousChallenges: {
      type: String,
      trim: true,
    },
    legalGuidelines: {
      type: String,
      trim: true,
    },
    yearlyTurnover: {
      type: Number,
    },
    expectations: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);
export default Client;


// find why the 