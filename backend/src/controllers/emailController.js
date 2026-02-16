import emailService from '../services/emailService.js';
import Lead from '../models/leadModel.js';
import EmailCampaign from '../models/emailCampaignModel.js';
import logger from '../utils/logger.js';

// Send bulk emails to selected leads
export const sendBulkEmail = async (req, res) => {
  try {
    const { leadIds, template, customTemplate } = req.body;

    if (!leadIds || leadIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No leads selected for email sending' 
      });
    }

    // Fetch lead details
    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select('fullName email companyName phone service budget source')
      .lean();

    if (leads.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No valid leads found' 
      });
    }

    // Prepare recipients
    const recipients = leads.map(lead => ({
      id: lead._id,
      name: lead.fullName,
      email: lead.email,
      company: lead.companyName,
      phone: lead.phone,
      service: lead.service,
      budget: lead.budget,
      source: lead.source,
    }));

    // Get email template
    let emailTemplate;
    let templateName;
    if (template === 'vyapaar-expo') {
      emailTemplate = emailService.generateVyapaarExpoTemplate();
      templateName = 'Vyapaar Expo Thank You';
    } else if (template === 'vyapaar-expo-2') {
      emailTemplate = emailService.generateVyapaarExpo2Template();
      templateName = 'Vyapaar Expo 2.0 Thank You';
    } else if (template === 'general-followup') {
      emailTemplate = emailService.generateGeneralFollowupTemplate();
      templateName = 'General Follow-up';
    } else if (template === 'service-inquiry') {
      emailTemplate = emailService.generateServiceInquiryTemplate();
      templateName = 'Service Inquiry Response';
    } else if (customTemplate) {
      emailTemplate = customTemplate;
      templateName = 'Custom Template';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'No email template specified' 
      });
    }

    // Generate batch ID for this campaign
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create email campaign records before sending
    const campaignRecords = recipients.map(recipient => ({
      campaignName: `Bulk Email - ${templateName}`,
      template: template,
      templateName: templateName,
      leadId: recipient.id,
      leadName: recipient.name,
      leadEmail: recipient.email,
      leadCompany: recipient.company,
      subject: emailTemplate.subject,
      emailContent: {
        html: emailTemplate.html,
        text: emailTemplate.text
      },
      sentBy: req.user.id,
      sentByName: req.user.fullName || req.user.email,
      status: 'pending',
      batchId: batchId
    }));

    // Insert campaign records
    const createdCampaigns = await EmailCampaign.insertMany(campaignRecords);
    logger.info(`Created ${createdCampaigns.length} email campaign records for batch ${batchId}`);

    // Send bulk emails with improved rate limiting for Gmail
    const result = await emailService.sendBulkEmailsWithTracking(recipients, emailTemplate, {
      batchSize: 3,        // Reduced batch size for better reliability
      delay: 5000,         // 5 seconds between batches
      emailDelay: 1500,    // 1.5 seconds between individual emails
      batchId: batchId,
      userId: req.user.id
    });

    // Update campaign records with results
    for (let i = 0; i < result.results.length; i++) {
      const emailResult = result.results[i];
      const campaign = createdCampaigns[i];
      
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        status: emailResult.success ? 'sent' : 'failed',
        messageId: emailResult.messageId,
        errorMessage: emailResult.error,
        sentAt: new Date()
      });

      // Update lead email stats
      if (emailResult.success) {
        await Lead.findByIdAndUpdate(emailResult.leadId || recipients[i].id, {
          $inc: { 'emailStats.totalEmailsSent': 1 },
          $set: {
            'emailStats.lastEmailSentAt': new Date(),
            'emailStats.lastEmailTemplate': templateName,
            'emailStats.emailStatus': 'sent'
          }
        });
      } else {
        await Lead.findByIdAndUpdate(emailResult.leadId || recipients[i].id, {
          $set: {
            'emailStats.emailStatus': 'failed'
          }
        });
      }
    }

    // Log the email campaign
    logger.info(`Bulk email campaign completed by user ${req.user.id}: ${result.sent}/${result.total} emails sent (Batch: ${batchId})`);

    res.status(200).json({
      success: true,
      message: `Email campaign completed: ${result.sent} sent, ${result.failed} failed`,
      data: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        batchId: batchId,
        results: result.results,
      }
    });

  } catch (error) {
    logger.error('Bulk email sending failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send bulk emails', 
      error: error.message 
    });
  }
};

// Get available email templates
export const getEmailTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'vyapaar-expo',
        name: 'Vyapaar Expo Thank You',
        description: 'Thank you email for Vyapaar Expo leads with special offer',
        preview: 'Thank you for visiting We Alll at Vyapaar Expo...',
      },
      {
        id: 'vyapaar-expo-2',
        name: 'Vyapaar Expo 2.0 Thank You',
        description: 'Professional thank you email for Vyapaar Expo 2.0 at Biswa Bangla Convention Center',
        preview: 'Thank you for connecting at Vyapaar Expo 2.0...',
      },
      {
        id: 'general-followup',
        name: 'General Follow-up',
        description: 'General follow-up email for leads and prospects',
        preview: 'Thank you for your interest in our services...',
      },
      {
        id: 'service-inquiry',
        name: 'Service Inquiry Response',
        description: 'Response to service inquiry with detailed information',
        preview: 'Thank you for inquiring about our services...',
      }
    ];

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error('Failed to get email templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get email templates' 
    });
  }
};

// Preview email template
export const previewEmail = async (req, res) => {
  try {
    const { template, sampleData } = req.body;

    let emailTemplate;
    if (template === 'vyapaar-expo') {
      emailTemplate = emailService.generateVyapaarExpoTemplate();
    } else if (template === 'vyapaar-expo-2') {
      emailTemplate = emailService.generateVyapaarExpo2Template();
    } else if (template === 'general-followup') {
      emailTemplate = emailService.generateGeneralFollowupTemplate();
    } else if (template === 'service-inquiry') {
      emailTemplate = emailService.generateServiceInquiryTemplate();
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid template specified' 
      });
    }

    // Use sample data for preview
    const sampleRecipient = sampleData || {
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Sample Company',
      phone: '+91-9876543210',
      service: ['Digital Marketing', 'Web Development'],
      budget: '50k to 80k /Month',
      source: 'Vyapaar Expo',
    };

    const personalizedEmail = emailService.personalizeEmail(emailTemplate, sampleRecipient);

    res.status(200).json({
      success: true,
      data: {
        subject: personalizedEmail.subject,
        html: personalizedEmail.html,
        text: personalizedEmail.text,
      }
    });

  } catch (error) {
    logger.error('Failed to preview email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to preview email' 
    });
  }
};

// Test email configuration
export const testEmailConfig = async (req, res) => {
  try {
    const result = await emailService.testConnection();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Email configuration is working correctly'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Email configuration test failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Email configuration test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Email configuration test failed',
      error: error.message 
    });
  }
};

// Send test email
export const sendTestEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email address is required' 
      });
    }

    const testTemplate = {
      subject: 'Test Email from We Alll CRM',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from your We Alll CRM system.</p>
        <p>If you received this email, your email configuration is working correctly!</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `,
      text: `Test Email - This is a test email from your We Alll CRM system. Sent at: ${new Date().toLocaleString()}`
    };

    const result = await emailService.sendEmail({
      to: email,
      subject: testTemplate.subject,
      html: testTemplate.html,
      text: testTemplate.text,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Test email sending failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message 
    });
  }
};

// Get email campaign history for a specific lead
export const getLeadEmailHistory = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const campaigns = await EmailCampaign.find({ leadId })
      .populate('sentBy', 'fullName email')
      .sort({ sentAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await EmailCampaign.countDocuments({ leadId });
    const stats = await EmailCampaign.getLeadEmailStats(leadId);

    res.status(200).json({
      success: true,
      data: {
        campaigns,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get lead email history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get lead email history',
      error: error.message 
    });
  }
};

// Get email campaign statistics
export const getEmailCampaignStats = async (req, res) => {
  try {
    const { startDate, endDate, template, status } = req.query;
    
    // Build query filter
    const filter = {};
    if (startDate && endDate) {
      filter.sentAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (template) filter.template = template;
    if (status) filter.status = status;

    // Get campaign statistics
    const stats = await EmailCampaign.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          sentEmails: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failedEmails: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          uniqueLeads: { $addToSet: '$leadId' },
          templateBreakdown: {
            $push: {
              template: '$template',
              templateName: '$templateName',
              status: '$status'
            }
          }
        }
      },
      {
        $project: {
          totalCampaigns: 1,
          sentEmails: 1,
          failedEmails: 1,
          uniqueLeadsCount: { $size: '$uniqueLeads' },
          successRate: {
            $multiply: [
              { $divide: ['$sentEmails', '$totalCampaigns'] },
              100
            ]
          },
          templateBreakdown: 1
        }
      }
    ]);

    // Get template-wise statistics
    const templateStats = await EmailCampaign.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$template',
          templateName: { $first: '$templateName' },
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      },
      {
        $project: {
          template: '$_id',
          templateName: 1,
          total: 1,
          sent: 1,
          failed: 1,
          successRate: {
            $multiply: [
              { $divide: ['$sent', '$total'] },
              100
            ]
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || {
          totalCampaigns: 0,
          sentEmails: 0,
          failedEmails: 0,
          uniqueLeadsCount: 0,
          successRate: 0
        },
        byTemplate: templateStats
      }
    });

  } catch (error) {
    logger.error('Failed to get email campaign stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get email campaign stats',
      error: error.message 
    });
  }
};

// Get recent email campaigns
export const getRecentEmailCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const campaigns = await EmailCampaign.find()
      .populate('leadId', 'fullName email companyName')
      .populate('sentBy', 'fullName email')
      .sort({ sentAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await EmailCampaign.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get recent email campaigns:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get recent email campaigns',
      error: error.message 
    });
  }
};