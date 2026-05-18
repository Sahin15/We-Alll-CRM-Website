import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    categories: [
      {
        type: String,
        enum: [
          'IT Hardware',
          'IT Software',
          'Office Supplies',
          'Furniture',
          'Services',
          'Marketing',
          'Travel',
          'Maintenance',
          'Other',
        ],
      },
    ],
    primaryContact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
    },
    additionalContacts: [
      {
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        role: { type: String },
      },
    ],
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: 'India' },
    },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Bank details — stored encrypted at application layer
    bankDetails: {
      accountNumber: { type: String, select: false }, // encrypted
      ifscCode: { type: String },
      bankName: { type: String },
      branchName: { type: String },
      accountHolderName: { type: String },
    },

    // Documents (up to 10)
    documents: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileSize: { type: Number },
        mimeType: { type: String },
        label: { type: String }, // e.g. "GST Certificate", "PAN Card"
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Denormalised total spend (updated when payments are recorded)
    totalSpend: {
      type: Number,
      default: 0,
    },

    notes: { type: String, maxlength: 1000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

vendorSchema.index({ name: 'text' });
vendorSchema.index({ categories: 1 });
vendorSchema.index({ rating: 1 });
vendorSchema.index({ isActive: 1 });

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
