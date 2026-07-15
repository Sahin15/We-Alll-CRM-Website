import mongoose from 'mongoose';
import { SCOPES } from '../authz/scopes.js';
import { VALID_PERMISSION_KEYS } from '../authz/permissionCatalog.js';

const SCOPE_VALUES = Object.values(SCOPES);

const userPermissionGrantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    permission: {
      type: String,
      required: true,
      validate: {
        validator: (value) => VALID_PERMISSION_KEYS.has(value),
        message: 'Invalid permission key',
      },
    },
    scope: {
      type: String,
      required: true,
      enum: SCOPE_VALUES,
      default: SCOPES.COMPANY,
    },
    effect: {
      type: String,
      enum: ['grant', 'deny'],
      default: 'grant',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userPermissionGrantSchema.index({ user: 1, permission: 1 }, { unique: true });
userPermissionGrantSchema.index({ expiresAt: 1 }, { sparse: true });

export default mongoose.model('UserPermissionGrant', userPermissionGrantSchema);
