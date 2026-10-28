import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    pageId: { type: String, required: true },
    pageName: { type: String, default: "" },
    category: { type: String, default: "" },
    instagramBusinessAccountId: { type: String, default: "" },
    instagramUsername: { type: String, default: "" },
    accessTokenEnc: { type: String, default: "" },
    selected: { type: Boolean, default: false },
    leadSubscribed: { type: Boolean, default: false },
    subscriptionError: { type: String, default: "" },
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    formId: { type: String, required: true },
    formName: { type: String, default: "" },
    pageId: { type: String, default: "" },
    status: { type: String, default: "" },
    selected: { type: Boolean, default: false },
  },
  { _id: false }
);

const adAccountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true },
    name: { type: String, default: "" },
    currency: { type: String, default: "" },
    accountStatus: { type: Number },
    selected: { type: Boolean, default: false },
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: "" },
  },
  { _id: false }
);

const cursorSchema = new mongoose.Schema(
  {
    formId: { type: String, required: true },
    after: { type: String, default: "" },
    done: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const assetErrorSchema = new mongoose.Schema(
  {
    resource: { type: String, default: "" },
    message: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const metaIntegrationSchema = new mongoose.Schema(
  {
    companyScope: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["connected", "disconnected", "needs_reauth"],
      default: "disconnected",
    },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disconnectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disconnectedAt: { type: Date },
    metaUserId: { type: String, default: "" },
    metaUserName: { type: String, default: "" },
    grantedPermissions: { type: [String], default: [] },
    missingPermissions: { type: [String], default: [] },
    permissionsKnown: { type: Boolean, default: false },
    userTokenEnc: { type: String, default: "" },
    userTokenExpiresAt: { type: Date },
    pages: { type: [pageSchema], default: [] },
    forms: { type: [formSchema], default: [] },
    adAccounts: { type: [adAccountSchema], default: [] },
    businessPortfolios: { type: [businessSchema], default: [] },
    assetErrors: { type: [assetErrorSchema], default: [] },
    cursors: { type: [cursorSchema], default: [] },
    lastSyncAt: { type: Date },
    lastSuccessAt: { type: Date },
    lastError: { type: String, default: "" },
    lastErrorAt: { type: Date },
    lastWebhookAt: { type: Date },
    lastWebhookError: { type: String, default: "" },
    syncLockUntil: { type: Date },
  },
  { timestamps: true }
);

metaIntegrationSchema.index({ "pages.pageId": 1, companyScope: 1 });

const MetaIntegration = mongoose.model("MetaIntegration", metaIntegrationSchema);
export default MetaIntegration;
