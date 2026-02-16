import mongoose from 'mongoose';

const emailCampaignSchema = new mongoose.Schema({
  // Campaign Information
  campaignName: {
    type: String,
    default: function() {
      return `Campaign ${new Date().toLocaleDateString()}`;
    }
  },
  template: {
    type: String,
    required: true,
    enum: ['vyapaar-expo', 'vyapaar-expo-2', 'general-followup', 'service-inquiry']
  },
  templateName: {
    type: String,
    required: true
  },
  
  // Lead Information
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  leadName: {
    type: String,
    required: true
  },
  leadEmail: {
    type: String,
    required: true
  },
  leadCompany: {
    type: String
  },
  
  // Email Details
  subject: {
    type: String,
    required: true
  },
  emailContent: {
    html: String,
    text: String
  },
  
  // Sending Information
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sentByName: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'bounced', 'opened', 'clicked'],
    default: 'pending'
  },
  
  // Email Service Response
  messageId: {
    type: String // Email service message ID
  },
  errorMessage: {
    type: String // If failed, store error message
  },
  
  // Engagement Tracking (for future enhancement)
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  
  // Metadata
  batchId: {
    type: String // For bulk email campaigns
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
emailCampaignSchema.index({ leadId: 1, sentAt: -1 });
emailCampaignSchema.index({ sentBy: 1, sentAt: -1 });
emailCampaignSchema.index({ status: 1 });
emailCampaignSchema.index({ template: 1 });
emailCampaignSchema.index({ batchId: 1 });

// Virtual for lead email count
emailCampaignSchema.virtual('leadEmailCount', {
  ref: 'EmailCampaign',
  localField: 'leadId',
  foreignField: 'leadId',
  count: true
});

// Static method to get lead email statistics
emailCampaignSchema.statics.getLeadEmailStats = async function(leadId) {
  const stats = await this.aggregate([
    { $match: { leadId: new mongoose.Types.ObjectId(leadId) } },
    {
      $group: {
        _id: '$leadId',
        totalEmails: { $sum: 1 },
        sentEmails: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failedEmails: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        lastEmailSent: { $max: '$sentAt' },
        templates: { $addToSet: '$template' }
      }
    }
  ]);
  
  return stats[0] || {
    totalEmails: 0,
    sentEmails: 0,
    failedEmails: 0,
    lastEmailSent: null,
    templates: []
  };
};

// Static method to get bulk email statistics
emailCampaignSchema.statics.getBulkEmailStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        totalSent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        uniqueLeads: { $addToSet: '$leadId' }
      }
    },
    {
      $project: {
        totalCampaigns: 1,
        totalSent: 1,
        totalFailed: 1,
        uniqueLeadsCount: { $size: '$uniqueLeads' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCampaigns: 0,
    totalSent: 0,
    totalFailed: 0,
    uniqueLeadsCount: 0
  };
};

const EmailCampaign = mongoose.model('EmailCampaign', emailCampaignSchema);

export default EmailCampaign;