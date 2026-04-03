import mongoose from 'mongoose';

const fcmTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    deviceType: {
      type: String,
      enum: ['web', 'mobile', 'tablet'],
      default: 'web',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
fcmTokenSchema.index({ user: 1, isActive: 1 });

// Method to mark token as used
fcmTokenSchema.methods.markAsUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// Static method to get active tokens for user
fcmTokenSchema.statics.getActiveTokens = function(userId) {
  return this.find({
    user: userId,
    isActive: true,
  }).select('token');
};

// Static method to deactivate old tokens
fcmTokenSchema.statics.deactivateOldTokens = function(userId, keepToken) {
  return this.updateMany(
    {
      user: userId,
      token: { $ne: keepToken },
    },
    {
      isActive: false,
    }
  );
};

const FCMToken = mongoose.model('FCMToken', fcmTokenSchema);

export default FCMToken;
