import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send salary slip email
export const sendSalarySlipEmail = async (salarySlip, pdfPath) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME || "Company"} HR" <${process.env.EMAIL_USER}>`,
      to: salarySlip.employee.email,
      subject: `Salary Slip for ${salarySlip.payPeriod}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #3498db;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .summary-box {
              background-color: white;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
              border-left: 4px solid #3498db;
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #ecf0f1;
            }
            .summary-item:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: bold;
              color: #2c3e50;
            }
            .value {
              color: #34495e;
            }
            .net-salary {
              font-size: 24px;
              font-weight: bold;
              color: #27ae60;
              text-align: center;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 10px 5px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ecf0f1;
              color: #95a5a6;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Salary Slip</h1>
              <p>${salarySlip.payPeriod}</p>
            </div>
            
            <div class="content">
              <p>Dear ${salarySlip.employee.name},</p>
              
              <p>Your salary slip for <strong>${salarySlip.payPeriod}</strong> is now available.</p>
              
              <div class="summary-box">
                <div class="summary-item">
                  <span class="label">Payment Date:</span>
                  <span class="value">${new Date(salarySlip.paymentDate).toLocaleDateString("en-IN")}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Total Earnings:</span>
                  <span class="value">₹${salarySlip.totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Total Deductions:</span>
                  <span class="value">₹${salarySlip.totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              <div class="net-salary">
                Net Salary: ₹${salarySlip.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/employee/salary-slips" class="button">
                  View in Portal
                </a>
              </p>
              
              <p style="margin-top: 30px;">
                <strong>Attendance Summary:</strong><br>
                Working Days: ${salarySlip.totalWorkingDays} | 
                Days Worked: ${salarySlip.daysWorked} | 
                Paid Leaves: ${salarySlip.paidLeaves} | 
                Unpaid Leaves: ${salarySlip.unpaidLeaves}
              </p>
              
              <p style="margin-top: 20px; font-size: 12px; color: #7f8c8d;">
                The detailed salary slip is attached to this email. You can also download it from the employee portal.
              </p>
              
              <p>If you have any questions regarding your salary slip, please contact the HR department.</p>
              
              <p>Best regards,<br>
              <strong>HR Team</strong><br>
              ${process.env.COMPANY_NAME || "Company Name"}</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || "Company Name"}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: pdfPath ? [
        {
          filename: `salary-slip-${salarySlip.month}-${salarySlip.year}.pdf`,
          path: pdfPath,
        },
      ] : [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Send bulk salary slip emails
export const sendBulkSalarySlipEmails = async (salarySlips) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const slip of salarySlips) {
    try {
      // Check if PDF exists
      const pdfPath = slip.pdfUrl
        ? path.join(process.cwd(), slip.pdfUrl.replace("/uploads", "uploads"))
        : null;

      if (pdfPath && fs.existsSync(pdfPath)) {
        await sendSalarySlipEmail(slip, pdfPath);
        results.success.push({
          employeeId: slip.employee.employeeId,
          name: slip.employee.name,
          email: slip.employee.email,
        });
      } else {
        results.failed.push({
          employeeId: slip.employee.employeeId,
          name: slip.employee.name,
          reason: "PDF not found",
        });
      }
    } catch (error) {
      results.failed.push({
        employeeId: slip.employee.employeeId,
        name: slip.employee.name,
        reason: error.message,
      });
    }
  }

  return results;
};

export default {
  sendSalarySlipEmail,
  sendBulkSalarySlipEmails,
};
