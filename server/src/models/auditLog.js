const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: [true, 'Actor reference is required'],
      index: true
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: ['hide_content', 'restore_content', 'suspend_user', 'unsuspend_user', 'dismiss_report', 'assign_role', 'grant_badge', 'update_badge'],
      index: true
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: ['post', 'reply', 'project', 'buildLog', 'user', 'report'],
      index: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
