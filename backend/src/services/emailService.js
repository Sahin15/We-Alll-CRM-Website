import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
  }

  // Initialize email transporter based on configuration (lazy initialization)
  initializeTransporter() {
    if (this.transporter) {
      return; // Already initialized
    }

    const emailProvider = process.env.EMAIL_PROVIDER || 'brevo'; // Changed default to Brevo
    
    logger.info(`Initializing email transporter with provider: ${emailProvider}`);
    
    switch (emailProvider.toLowerCase()) {
      case 'brevo':
      case 'sendinblue':
        if (!process.env.BREVO_USER || !process.env.BREVO_API_KEY) {
          logger.error('Brevo credentials missing. Please set BREVO_USER and BREVO_API_KEY in .env');
          throw new Error('Brevo credentials not configured');
        }
        this.transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.BREVO_USER,
            pass: process.env.BREVO_API_KEY,
          },
        });
        logger.info('✅ Brevo email transporter initialized');
        break;
        
      case 'gmail':
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
          logger.error('Gmail credentials missing');
          throw new Error('Gmail credentials not configured');
        }
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });
        logger.info('✅ Gmail email transporter initialized');
        break;
        
      case 'mailgun':
        if (!process.env.MAILGUN_SMTP_USER || !process.env.MAILGUN_SMTP_PASSWORD) {
          logger.error('Mailgun credentials missing');
          throw new Error('Mailgun credentials not configured');
        }
        this.transporter = nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILGUN_SMTP_USER,
            pass: process.env.MAILGUN_SMTP_PASSWORD,
          },
        });
        logger.info('✅ Mailgun email transporter initialized');
        break;
        
      default:
        logger.error(`Invalid email provider specified: ${emailProvider}`);
        throw new Error(`Invalid email provider: ${emailProvider}`);
    }
  }

  // Send single email
  async sendEmail(emailOptions) {
    try {
      // Initialize transporter if not already done
      this.initializeTransporter();
      
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'We Alll'}" <${process.env.FROM_EMAIL}>`,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
        attachments: emailOptions.attachments || [],
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${emailOptions.to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${emailOptions.to}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send bulk emails with rate limiting and tracking
  async sendBulkEmailsWithTracking(recipients, emailTemplate, options = {}) {
    const results = [];
    // Improved rate limiting settings for Gmail
    const batchSize = options.batchSize || 3;  // Reduced from 5 to 3
    const delay = options.delay || 5000;       // Increased from 2s to 5s
    const emailDelay = options.emailDelay || 1500; // Add delay between individual emails
    const batchId = options.batchId;
    const userId = options.userId;

    logger.info(`Starting bulk email send to ${recipients.length} recipients (Batch: ${batchId})`);
    logger.info(`Rate limiting: ${batchSize} emails per batch, ${delay}ms batch delay, ${emailDelay}ms email delay`);

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(recipients.length / batchSize);
      
      logger.info(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
      
      // Process emails in batch with individual delays
      const batchResults = [];
      for (let j = 0; j < batch.length; j++) {
        const recipient = batch[j];
        
        try {
          // Personalize email content
          const personalizedContent = this.personalizeEmail(emailTemplate, recipient);
          
          const emailOptions = {
            to: recipient.email,
            subject: personalizedContent.subject,
            html: personalizedContent.html,
            text: personalizedContent.text,
          };

          const result = await this.sendEmail(emailOptions);
          
          const emailResult = {
            leadId: recipient.id,
            recipient: recipient.email,
            name: recipient.name,
            success: result.success,
            messageId: result.messageId,
            error: result.error,
            sentAt: new Date(),
            batchId: batchId,
            batchNumber: batchNumber
          };
          
          batchResults.push(emailResult);
          
          // Log individual email result
          if (result.success) {
            logger.info(`✅ Email sent to ${recipient.email} (${j + 1}/${batch.length} in batch ${batchNumber})`);
          } else {
            logger.error(`❌ Email failed to ${recipient.email}: ${result.error}`);
          }
          
          // Add delay between individual emails within batch (except last email)
          if (j < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, emailDelay));
          }
          
        } catch (error) {
          const emailResult = {
            leadId: recipient.id,
            recipient: recipient.email,
            name: recipient.name,
            success: false,
            error: error.message,
            sentAt: new Date(),
            batchId: batchId,
            batchNumber: batchNumber
          };
          
          batchResults.push(emailResult);
          logger.error(`❌ Email exception for ${recipient.email}: ${error.message}`);
        }
      }

      results.push(...batchResults);

      // Log batch completion
      const batchSuccess = batchResults.filter(r => r.success).length;
      const batchFailed = batchResults.filter(r => !r.success).length;
      logger.info(`Batch ${batchNumber} completed: ${batchSuccess} sent, ${batchFailed} failed`);

      // Delay between batches to avoid rate limiting (except for last batch)
      if (i + batchSize < recipients.length) {
        logger.info(`Waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const successRate = ((successCount / results.length) * 100).toFixed(1);

    logger.info(`Bulk email completed: ${successCount}/${results.length} sent (${successRate}% success rate) (Batch: ${batchId})`);

    // Analyze failures for rate limiting indicators
    const rateLimitFailures = results.filter(r => 
      !r.success && (
        r.error?.includes('rate') || 
        r.error?.includes('limit') || 
        r.error?.includes('quota') ||
        r.error?.includes('too many') ||
        r.error?.includes('throttle')
      )
    );

    if (rateLimitFailures.length > 0) {
      logger.warn(`⚠️ Rate limiting detected: ${rateLimitFailures.length} rate limit errors`);
    }

    return {
      total: recipients.length,
      sent: successCount,
      failed: failureCount,
      successRate: parseFloat(successRate),
      results: results,
      batchId: batchId,
      rateLimitFailures: rateLimitFailures.length
    };
  }

  // Personalize email content with recipient data
  personalizeEmail(template, recipient) {
    let subject = template.subject;
    let html = template.html;
    let text = template.text;

    // Replace placeholders with recipient data
    const replacements = {
      '{{name}}': recipient.name || recipient.fullName || 'Valued Customer',
      '{{Name}}': recipient.name || recipient.fullName || 'Valued Customer', // Handle capital N
      '{{email}}': recipient.email || '',
      '{{company}}': recipient.company || recipient.companyName || '',
      '{{phone}}': recipient.phone || '',
      '{{service}}': Array.isArray(recipient.service) ? recipient.service.join(', ') : (recipient.service || ''),
      '{{budget}}': recipient.budget || '',
      '{{source}}': recipient.source || '',
    };

    Object.keys(replacements).forEach(placeholder => {
      const value = replacements[placeholder];
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      html = html.replace(new RegExp(placeholder, 'g'), value);
      text = text.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, html, text };
  }

  // Generate Vyapaar Expo thank you email template
  generateVyapaarExpoTemplate() {
    const subject = "Thank you for visiting We Alll at Vyapaar Expo - Let's grow your business together!";
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You - We Alll</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .logo { max-width: 150px; height: auto; margin-bottom: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
            .services { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
            .service-tag { background: #2196F3; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; }
            .cta-button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #333; color: white; border-radius: 10px; }
            .contact-info { margin: 15px 0; }
            @media (max-width: 600px) { .container { padding: 10px; } .services { justify-content: center; } }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://your-domain.com/logo.png" alt="We Alll Logo" class="logo">
                <h1>Thank You for Visiting Us!</h1>
                <p>Vyapaar Expo, New Town</p>
            </div>
            
            <div class="content">
                <h2>Dear {{name}},</h2>
                
                <p>It was wonderful meeting you at the <strong>Vyapaar Expo in New Town</strong>! Thank you for taking the time to visit our booth and showing interest in our services.</p>
                
                <div class="highlight">
                    <h3>🚀 Ready to Transform Your Business?</h3>
                    <p>At <strong>We Alll</strong>, we specialize in helping businesses like {{company}} achieve their digital goals through our comprehensive services.</p>
                </div>
                
                <h3>Our Services Include:</h3>
                <div class="services">
                    <span class="service-tag">Digital Marketing</span>
                    <span class="service-tag">Web Development</span>
                    <span class="service-tag">SEO Optimization</span>
                    <span class="service-tag">Social Media Marketing</span>
                    <span class="service-tag">Logo Design</span>
                    <span class="service-tag">App Development</span>
                    <span class="service-tag">Branding Solutions</span>
                </div>
                
                <p>Based on our conversation, we understand you're interested in <strong>{{service}}</strong> services. We'd love to discuss how we can help you achieve your business objectives.</p>
                
                <div class="highlight">
                    <h3>🎁 Special Vyapaar Expo Offer</h3>
                    <p><strong>Get 20% OFF</strong> on your first project with us! This exclusive offer is valid for all Vyapaar Expo visitors until the end of this month.</p>
                </div>
                
                <center>
                    <a href="tel:+91-XXXXXXXXXX" class="cta-button">📞 Call Us Now</a>
                    <a href="https://wa.me/91XXXXXXXXXX" class="cta-button">💬 WhatsApp Us</a>
                </center>
                
                <h3>Why Choose We Alll?</h3>
                <ul>
                    <li>✅ <strong>Proven Track Record:</strong> 500+ successful projects delivered</li>
                    <li>✅ <strong>Expert Team:</strong> Skilled professionals in every domain</li>
                    <li>✅ <strong>Affordable Pricing:</strong> Quality services within your budget</li>
                    <li>✅ <strong>24/7 Support:</strong> We're always here to help you grow</li>
                    <li>✅ <strong>Local Expertise:</strong> Understanding of the local market</li>
                </ul>
                
                <p>We're excited to be part of your business journey and help you achieve remarkable growth!</p>
                
                <p>Looking forward to hearing from you soon.</p>
                
                <p>Best regards,<br>
                <strong>Team We Alll</strong><br>
                Your Digital Growth Partners</p>
            </div>
            
            <div class="footer">
                <h3>We Alll - Digital Solutions</h3>
                <div class="contact-info">
                    <p>📧 Email: info@wealll.com</p>
                    <p>📞 Phone: +91-XXXXXXXXXX</p>
                    <p>💬 WhatsApp: +91-XXXXXXXXXX</p>
                    <p>🌐 Website: www.wealll.com</p>
                    <p>📍 Address: Unit 8A, 4th Floor, Tower 1, Globsyn Crystal, Salt Lake Electronics Complex, Street No. 17, EP Block, Sector V, Kolkata – 700091, West Bengal, India</p>
                </div>
                <p style="font-size: 12px; margin-top: 20px;">
                    This email was sent because you visited our booth at Vyapaar Expo, New Town. 
                    If you don't want to receive future emails, please reply with "UNSUBSCRIBE".
                </p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
Dear {{name}},

Thank you for visiting We Alll at Vyapaar Expo in New Town!

It was wonderful meeting you and discussing your business needs. We're excited to help {{company}} achieve digital growth.

SPECIAL VYAPAAR EXPO OFFER: Get 20% OFF on your first project!

Our Services:
- Digital Marketing
- Web Development  
- SEO Optimization
- Social Media Marketing
- Logo Design
- App Development
- Branding Solutions

Contact Us:
Phone: +91-XXXXXXXXXX
WhatsApp: +91-XXXXXXXXXX
Email: info@wealll.com
Website: www.wealll.com

Best regards,
Team We Alll
Your Digital Growth Partners
    `;

    return { subject, html, text };
  }

  // Generate General Follow-up email template
  generateGeneralFollowupTemplate() {
    const subject = "Thank you for your interest in We Alll - Let's discuss your digital needs";
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Follow-up - We Alll</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #e8f4fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
            .services { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
            .service-tag { background: #2196F3; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; }
            .cta-button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #333; color: white; border-radius: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Thank You for Your Interest!</h1>
                <p>We're excited to help grow your business</p>
            </div>
            
            <div class="content">
                <h2>Dear {{name}},</h2>
                
                <p>Thank you for showing interest in <strong>We Alll's</strong> digital services. We're excited about the opportunity to help {{company}} achieve its digital goals.</p>
                
                <div class="highlight">
                    <h3>🚀 Ready to Transform Your Digital Presence?</h3>
                    <p>Our team specializes in delivering comprehensive digital solutions that drive real business results.</p>
                </div>
                
                <h3>Our Core Services:</h3>
                <div class="services">
                    <span class="service-tag">Digital Marketing</span>
                    <span class="service-tag">Web Development</span>
                    <span class="service-tag">SEO Optimization</span>
                    <span class="service-tag">Social Media Marketing</span>
                    <span class="service-tag">Content Creation</span>
                    <span class="service-tag">Graphic Design</span>
                </div>
                
                <p>We'd love to schedule a consultation to discuss how we can help you achieve your objectives.</p>
                
                <center>
                    <a href="tel:+91-XXXXXXXXXX" class="cta-button">📞 Schedule a Call</a>
                    <a href="https://wa.me/91XXXXXXXXXX" class="cta-button">💬 WhatsApp Us</a>
                </center>
                
                <p>Best regards,<br>
                <strong>Team We Alll</strong></p>
            </div>
            
            <div class="footer">
                <h3>We Alll - Digital Solutions</h3>
                <p>📧 info@wealll.com | 📞 +91-XXXXXXXXXX | 🌐 www.wealll.com</p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
Dear {{name}},

Thank you for showing interest in We Alll's digital services. We're excited about the opportunity to help {{company}} achieve its digital goals.

Our Core Services:
- Digital Marketing
- Web Development  
- SEO Optimization
- Social Media Marketing
- Content Creation
- Graphic Design

We'd love to schedule a consultation to discuss how we can help you achieve your objectives.

Contact Us:
Phone: +91-XXXXXXXXXX
WhatsApp: +91-XXXXXXXXXX
Email: info@wealll.com

Best regards,
Team We Alll
    `;

    return { subject, html, text };
  }

  // Generate Service Inquiry Response template
  generateServiceInquiryTemplate() {
    const subject = "Your Service Inquiry - We Alll Digital Solutions";
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Inquiry Response - We Alll</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .service-details { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }
            .cta-button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #333; color: white; border-radius: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Service Inquiry Response</h1>
                <p>Detailed information about {{service}}</p>
            </div>
            
            <div class="content">
                <h2>Dear {{name}},</h2>
                
                <p>Thank you for your inquiry about our <strong>{{service}}</strong> services. We're excited to help {{company}}.</p>
                
                <div class="service-details">
                    <h3>🎯 {{service}} Services Include:</h3>
                    <ul>
                        <li>Comprehensive strategy development</li>
                        <li>Professional implementation</li>
                        <li>Regular monitoring and optimization</li>
                        <li>Detailed reporting and analytics</li>
                        <li>Ongoing support</li>
                    </ul>
                </div>
                
                <center>
                    <a href="tel:+91-XXXXXXXXXX" class="cta-button">📞 Book Consultation</a>
                    <a href="https://wa.me/91XXXXXXXXXX" class="cta-button">💬 Chat on WhatsApp</a>
                </center>
                
                <p>Best regards,<br>
                <strong>Team We Alll</strong></p>
            </div>
            
            <div class="footer">
                <h3>We Alll - Digital Solutions</h3>
                <p>📧 info@wealll.com | 📞 +91-XXXXXXXXXX | 🌐 www.wealll.com</p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
Dear {{name}},

Thank you for your inquiry about our {{service}} services. We're excited to help {{company}}.

{{service}} Services Include:
- Comprehensive strategy development
- Professional implementation
- Regular monitoring and optimization
- Detailed reporting and analytics
- Ongoing support

Contact Us:
Phone: +91-XXXXXXXXXX
WhatsApp: +91-XXXXXXXXXX
Email: info@wealll.com

Best regards,
Team We Alll
    `;

    return { subject, html, text };
  }

  // Generate Vyapaar Expo 2.0 Thank You template
  generateVyapaarExpo2Template() {
    const subject = "Thank You for Connecting at Vyapaar Expo 2.0 - WeAlll";
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Thank You for Connecting with WeAlll</title>
    </head>
    <body style="margin:0; padding:0; background-color:#eef2f6; font-family:Arial, Helvetica, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f6; padding:30px 0;">
            <tr>
                <td align="center">
                    <!-- Main Container -->
                    <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td align="center" style="padding:10px 20px;">
                                <img src="https://wealll.com/wp-content/uploads/2025/04/Wealll_new.png" alt="WeAlll - Grow Together" width="180" style="display:block; max-width:100%;">
                            </td>
                        </tr>
                        
                        <!-- Brand Color Strip -->
                        <tr>
                            <td>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td height="6" width="25%" style="background:#1F6AE1;"></td>
                                        <td height="6" width="25%" style="background:#2FB65D;"></td>
                                        <td height="6" width="25%" style="background:#F4C430;"></td>
                                        <td height="6" width="25%" style="background:#E53935;"></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding:38px 45px; color:#222222;">
                                <h1 style="margin:0 0 18px; font-size:24px; color:#1F6AE1; line-height:1.3;">Thank You for Connecting at Vyapaar Expo 2.0</h1>
                                
                                <p style="font-size:15px; line-height:1.7; margin:0 0 14px;">Dear <strong>{{name}}</strong>,</p>
                                
                                <p style="font-size:15px; line-height:1.7; margin:0 0 16px;">It was a pleasure meeting you at <strong>Vyapaar Expo 2.0</strong> at the <strong>Biswa Bangla Convention Center</strong>. Thank you for visiting the <strong>WeAlll</strong> stall and connecting with our team.</p>
                                
                                <p style="font-size:15px; line-height:1.7; margin:0 0 20px;"><strong>WeAlll</strong> is an <strong>AI-driven digital marketing company in Kolkata</strong>, helping businesses grow faster with smart strategy, creativity, and measurable results. We provide <strong>end-to-end marketing solutions</strong>.</p>
                                
                                <!-- Services -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc; border-left:5px solid #2FB65D; padding:18px; margin-bottom:25px;">
                                    <tr>
                                        <td style="font-size:14px; line-height:1.7;">
                                            ✅ AI-Powered SEO & Local SEO<br>
                                            ✅ Performance Marketing & Lead Generation<br>
                                            ✅ Social Media & Influencer Marketing<br>
                                            ✅ Branding, Logo Design & Visual Identity<br>
                                            ✅ Commercial Shoots & Creative Production<br>
                                            ✅ End-to-End Digital Growth Strategy
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA -->
                                <table align="center" cellpadding="0" cellspacing="0" style="margin:30px auto;">
                                    <tr>
                                        <td align="center" style="background:#25D366; border-radius:6px;">
                                            <a href="https://wa.me/918240858613?text=Hello%20Team%20WeAlll%2C%0A%0AI%20met%20you%20at%20Vyapaar%20Expo%202.0%20and%20would%20like%20to%20book%20a%20free%20consultation%20to%20discuss%20digital%20marketing%20and%20business%20growth%20solutions.Looking%20forward%20to%20connecting.%0A%0AThank%20you!" style="display:inline-block; padding:14px 34px; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">📱 Book a Free Consultation</a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="font-size:14px; margin-top:28px;">
                                    Warm regards,<br>
                                    <strong style="color:#2FB65D;">Team WeAlll</strong><br>
                                    <span style="color:#555;">AI-Driven Digital Marketing | End-to-End Growth Solutions</span><br>
                                    <strong>Grow Together</strong>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background:#0b1220; padding:32px 25px; text-align:center; color:#ffffff;">
                                <img src="https://wealll.com/wp-content/uploads/2025/04/Wealll_new.png" alt="WeAlll Logo" width="140" style="display:block; margin:0 auto 14px;">
                                
                                <!-- Social Links -->
                                <p style="margin:10px 0 16px; font-size:13px;">
                                    <a href="https://www.linkedin.com/company/we-alll/" style="color:#ffffff; text-decoration:none;">LinkedIn</a>&nbsp;|&nbsp;
                                    <a href="https://www.instagram.com/wealll_official/" style="color:#ffffff; text-decoration:none;">Instagram</a>&nbsp;|&nbsp;
                                    <a href="https://www.facebook.com/people/We-Alll/61556163594429/" style="color:#ffffff; text-decoration:none;">Facebook</a>&nbsp;|&nbsp;
                                    <a href="https://wa.me/918240858613" style="color:#ffffff; text-decoration:none;">WhatsApp</a>
                                </p>
                                
                                <!-- Contact Info -->
                                <p style="margin:0 0 12px; font-size:13px; line-height:1.9;">
                                    📞 <a href="tel:+918240858613" style="color:#ffffff; text-decoration:none;">+91 82408 58613</a>&nbsp;|&nbsp;
                                    📧 <a href="mailto:amit@wealll.com" style="color:#ffffff; text-decoration:none;">amit@wealll.com</a>&nbsp;|&nbsp;
                                    🌐 <a href="https://wealll.com" style="color:#ffffff; text-decoration:none;">wealll.com</a>
                                </p>
                                
                                <p style="margin:10px 0 18px; font-size:12px; line-height:1.6; color:#cbd5e1;">
                                    📍 Unit 8A, 4th Floor, Tower 1, Globsyn Crystal, Salt Lake Electronics Complex,<br>
                                    Street No. 17, EP Block, Sector V, Kolkata – 700091, West Bengal, India
                                </p>
                                
                                <p style="margin:0; font-size:11px; color:#94a3b8;">© 2026 WeAlll. All Rights Reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;

    const text = `
Dear {{name}},

Thank You for Connecting at Vyapaar Expo 2.0

It was a pleasure meeting you at Vyapaar Expo 2.0 at the Biswa Bangla Convention Center. Thank you for visiting the WeAlll stall and connecting with our team.

WeAlll is an AI-driven digital marketing company in Kolkata, helping businesses grow faster with smart strategy, creativity, and measurable results. We provide end-to-end marketing solutions.

Our Services:
✅ AI-Powered SEO & Local SEO
✅ Performance Marketing & Lead Generation
✅ Social Media & Influencer Marketing
✅ Branding, Logo Design & Visual Identity
✅ Commercial Shoots & Creative Production
✅ End-to-End Digital Growth Strategy

Book a Free Consultation: https://wa.me/918240858613?text=Hello%20Team%20WeAlll%2C%0A%0AI%20met%20you%20at%20Vyapaar%20Expo%202.0%20and%20would%20like%20to%20book%20a%20free%20consultation%20to%20discuss%20digital%20marketing%20and%20business%20growth%20solutions.Looking%20forward%20to%20connecting.%0A%0AThank%20you!

Warm regards,
Team WeAlll
AI-Driven Digital Marketing | End-to-End Growth Solutions
Grow Together

Contact Us:
📞 +91 82408 58613
📧 amit@wealll.com
🌐 wealll.com
📍 Unit 8A, 4th Floor, Tower 1, Globsyn Crystal, Salt Lake Electronics Complex, Street No. 17, EP Block, Sector V, Kolkata – 700091, West Bengal, India

© 2026 WeAlll. All Rights Reserved.
    `;

    return { subject, html, text };
  }

  // Test email configuration
  async testConnection() {
    try {
      // Initialize transporter if not already done
      this.initializeTransporter();
      
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }
      
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return { success: true, message: 'Email service is working correctly' };
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();