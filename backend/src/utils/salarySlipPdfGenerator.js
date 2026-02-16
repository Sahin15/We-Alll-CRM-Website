import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "number-to-words";
const { toWords } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to format currency - Fixed rupee symbol issue
const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${formatted}`;
};

// Helper function to convert number to words
const amountInWords = (amount) => {
  try {
    const words = toWords(Math.floor(amount));
    return words.charAt(0).toUpperCase() + words.slice(1) + " Rupees Only";
  } catch (error) {
    return "Amount in words unavailable";
  }
};

// Generate salary slip PDF
export const generateSalarySlipPDF = async (salarySlip, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
      });

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Company details - We Alll information
      const companyName = "We Alll";
      const companyAddress = "Cluster Rajarhat 76, 14/4c, Action Area I, Newtown, Koch Pukur, West Bengal 700156 India";

      // Colors - matching the design
      const primaryColor = "#2c3e50";
      const secondaryColor = "#7f8c8d";
      const accentColor = "#27ae60"; // Green for highlights
      const lightGray = "#f8f9fa";
      const borderColor = "#e9ecef";

      // Header Section with Logo and Company Info
      let yPosition = 50;
      
      // Try to load company logo - multiple fallback paths
      let logoPath = path.join(process.cwd(), "backend", "uploads", "we-alll-logo.png");
      
      // Fallback paths if first doesn't work
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), "uploads", "we-alll-logo.png");
      }
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), "backend", "uploads", "Wealll_mini.png");
      }
      if (!fs.existsSync(logoPath)) {
        logoPath = path.join(process.cwd(), "uploads", "Wealll_mini.png");
      }
      
      let logoLoaded = false;
      if (fs.existsSync(logoPath)) {
        try {
          console.log(`✅ Loading logo from: ${logoPath}`);
          doc.image(logoPath, 50, yPosition, { width: 100, height: 50, fit: [100, 50] });
          logoLoaded = true;
        } catch (error) {
          console.error("❌ Logo load failed:", error.message);
        }
      } else {
        console.warn(`⚠️  Logo file not found at: ${logoPath}`);
      }
      
      // Fallback to text if logo didn't load
      if (!logoLoaded) {
        console.log("📝 Using text fallback for logo");
        doc.fontSize(24).fillColor(primaryColor).font("Helvetica-Bold");
        doc.text("We Alll", 50, yPosition + 10);
      }

      // Company name and address (next to logo) - better alignment
      doc.fontSize(18).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text(companyName, 160, yPosition);
      
      doc.fontSize(9).fillColor(secondaryColor).font("Helvetica");
      doc.text(companyAddress, 160, yPosition + 25, { width: 280 });

      // Payslip title and month (right side) - fixed text collision
      doc.fontSize(11).fillColor(secondaryColor).font("Helvetica");
      doc.text("Payslip For the Month", 420, yPosition + 5, { width: 125, align: "right" });
      doc.fontSize(16).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text(salarySlip.payPeriod, 420, yPosition + 22, { width: 125, align: "right" });

      // Horizontal line
      yPosition += 90;
      doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderColor).stroke();

      // Main content area
      yPosition += 20;

      // Left side - Employee Summary with all details
      doc.fontSize(12).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text("EMPLOYEE SUMMARY", 50, yPosition);

      yPosition += 25;
      doc.fontSize(10).fillColor(secondaryColor).font("Helvetica");

      // Show last 3 digits of bank account for employee assurance
      let bankDisplay = "***";
      if (salarySlip.employee.bankDetails?.accountNumber) {
        const accountNumber = salarySlip.employee.bankDetails.accountNumber.toString();
        if (accountNumber.length >= 3) {
          bankDisplay = "***" + accountNumber.slice(-3);
        }
      }

      const employeeDetails = [
        { label: "Employee Name", value: salarySlip.employee.name },
        { label: "Employee ID", value: salarySlip.employee.employeeId || "N/A" },
        { label: "Designation", value: salarySlip.employee.designation || "N/A" },
        { label: "Department", value: salarySlip.employee.department?.name || salarySlip.employee.department || "N/A" },
        { label: "Pay Period", value: salarySlip.payPeriod },
        { label: "Payment Date", value: new Date(salarySlip.paymentDate).toLocaleDateString("en-GB") },
        { label: "Bank Account", value: bankDisplay }
      ];

      employeeDetails.forEach((detail, index) => {
        const detailY = yPosition + (index * 18);
        doc.fillColor(secondaryColor).text(detail.label, 50, detailY);
        doc.text(":", 150, detailY);
        doc.fillColor(primaryColor).text(detail.value, 170, detailY);
      });

      // Right side - Beautiful Net Pay Card (adjusted position) with rounded corners
      const cardX = 350;
      const cardY = yPosition - 10;
      const cardWidth = 195;
      const cardHeight = 140; // Increased height

      // Green card background with rounded corners
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 8).fill("#e8f5e8");
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 8).strokeColor("#27ae60").stroke();

      // Net pay amount (large)
      doc.fontSize(22).fillColor(accentColor).font("Helvetica-Bold");
      doc.text(formatCurrency(salarySlip.netSalary), cardX + 10, cardY + 15, { 
        width: cardWidth - 20, 
        align: "center" 
      });

      // "Total Net Pay" label
      doc.fontSize(11).fillColor(secondaryColor).font("Helvetica");
      doc.text("Total Net Pay", cardX + 10, cardY + 50, { 
        width: cardWidth - 20, 
        align: "center" 
      });

      // Attendance info in card
      doc.fontSize(9).fillColor(secondaryColor);
      doc.text(`Paid Days`, cardX + 20, cardY + 75);
      doc.text(`: ${salarySlip.daysWorked}`, cardX + 80, cardY + 75);
      doc.text(`LOP Days`, cardX + 20, cardY + 90);
      doc.text(`: ${salarySlip.unpaidLeaves}`, cardX + 80, cardY + 90);

      // Earnings and Deductions Table
      yPosition += 160;

      // Table header
      doc.rect(50, yPosition, 495, 30).fill(lightGray);
      doc.rect(50, yPosition, 495, 30).strokeColor(borderColor).stroke();

      doc.fontSize(11).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text("EARNINGS", 70, yPosition + 10);
      doc.text("AMOUNT", 200, yPosition + 10);
      doc.text("DEDUCTIONS", 320, yPosition + 10);
      doc.text("AMOUNT", 450, yPosition + 10);

      yPosition += 30;

      // Earnings items
      const earnings = [
        { label: "Basic", amount: salarySlip.earnings.basicSalary },
        { label: "House Rent Allowance", amount: salarySlip.earnings.hra },
        { label: "Special Allowance", amount: salarySlip.earnings.specialAllowance },
        { label: "Transport Allowance", amount: salarySlip.earnings.transportAllowance },
        { label: "Medical Allowance", amount: salarySlip.earnings.medicalAllowance },
      ];

      // Add other earnings if present
      if (salarySlip.earnings.bonus > 0) earnings.push({ label: "Bonus", amount: salarySlip.earnings.bonus });
      if (salarySlip.earnings.overtime > 0) earnings.push({ label: "Overtime", amount: salarySlip.earnings.overtime });
      if (salarySlip.earnings.arrears > 0) earnings.push({ label: "Arrears", amount: salarySlip.earnings.arrears });

      // Deductions items
      const deductions = [
        { label: "Income Tax", amount: salarySlip.deductions.tds },
        { label: "Provident Fund", amount: salarySlip.deductions.providentFund },
        { label: "Professional Tax", amount: salarySlip.deductions.professionalTax },
      ];

      if (salarySlip.deductions.esi > 0) deductions.push({ label: "ESI", amount: salarySlip.deductions.esi });
      if (salarySlip.deductions.lossOfPay > 0) deductions.push({ label: "Loss of Pay", amount: salarySlip.deductions.lossOfPay });
      if (salarySlip.deductions.advances > 0) deductions.push({ label: "Advance", amount: salarySlip.deductions.advances });

      // Draw table rows
      const maxRows = Math.max(earnings.length, deductions.length);
      doc.fontSize(10).fillColor(primaryColor).font("Helvetica");

      for (let i = 0; i < maxRows; i++) {
        const rowY = yPosition + (i * 20);
        
        // Alternate row background
        if (i % 2 === 0) {
          doc.rect(50, rowY, 495, 20).fill("#fafafa");
        }

        // Earnings
        if (i < earnings.length) {
          doc.fillColor(primaryColor).text(earnings[i].label, 70, rowY + 5);
          doc.text(formatCurrency(earnings[i].amount), 150, rowY + 5, { width: 100, align: "right" });
        }

        // Deductions
        if (i < deductions.length) {
          doc.fillColor(primaryColor).text(deductions[i].label, 320, rowY + 5);
          doc.text(formatCurrency(deductions[i].amount), 400, rowY + 5, { width: 100, align: "right" });
        }
      }

      yPosition += (maxRows * 20) + 10;

      // Totals row
      doc.rect(50, yPosition, 495, 25).fill(lightGray);
      doc.rect(50, yPosition, 495, 25).strokeColor(borderColor).stroke();

      doc.fontSize(11).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text("Gross Earnings", 70, yPosition + 8);
      doc.text(formatCurrency(salarySlip.totalEarnings), 150, yPosition + 8, { width: 100, align: "right" });
      doc.text("Total Deductions", 320, yPosition + 8);
      doc.text(formatCurrency(salarySlip.totalDeductions), 400, yPosition + 8, { width: 100, align: "right" });

      yPosition += 35;

      // Total Net Pay - Highlighted section with proper formatting and rounded corners
      doc.roundedRect(50, yPosition, 495, 45, 8).fill("#f0f8f0");
      doc.roundedRect(50, yPosition, 495, 45, 8).strokeColor(accentColor).stroke();

      doc.fontSize(14).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text("NET SALARY", 70, yPosition + 8);
      
      // Fixed the gross earnings - total deductions line
      doc.fontSize(10).fillColor(secondaryColor).font("Helvetica");
      doc.text(`Gross Earnings ${formatCurrency(salarySlip.totalEarnings)} - Total Deductions ${formatCurrency(salarySlip.totalDeductions)}`, 70, yPosition + 28);

      doc.fontSize(18).fillColor(accentColor).font("Helvetica-Bold");
      doc.text(formatCurrency(salarySlip.netSalary), 350, yPosition + 12, { width: 145, align: "right" });

      yPosition += 55;

      // Amount in words
      doc.fontSize(10).fillColor(secondaryColor).font("Helvetica-Oblique");
      doc.text(`Amount In Words : ${amountInWords(salarySlip.netSalary)}`, 50, yPosition, { 
        width: 495, 
        align: "center" 
      });

      yPosition += 30;

      // Horizontal line
      doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderColor).stroke();

      // ATTENDANCE SUMMARY Section
      yPosition += 20;
      doc.fontSize(12).fillColor(primaryColor).font("Helvetica-Bold");
      doc.text("ATTENDANCE SUMMARY", 50, yPosition);

      yPosition += 20;
      doc.fontSize(10).fillColor(secondaryColor).font("Helvetica");

      const attendanceData = [
        { label: "Total Working Days", value: salarySlip.totalWorkingDays },
        { label: "Days Worked", value: salarySlip.daysWorked },
        { label: "Paid Leaves", value: salarySlip.paidLeaves },
        { label: "Unpaid Leaves", value: salarySlip.unpaidLeaves }
      ];

      // Create a neat 2x2 grid for attendance data
      attendanceData.forEach((item, index) => {
        const xPos = 70 + (index % 2) * 220;
        const yPos = yPosition + Math.floor(index / 2) * 20;
        doc.fillColor(secondaryColor).text(`${item.label}:`, xPos, yPos);
        doc.fillColor(primaryColor).text(`${item.value}`, xPos + 120, yPos);
      });

      yPosition += 50;

      // Horizontal line
      doc.moveTo(50, yPosition).lineTo(545, yPosition).strokeColor(borderColor).stroke();

      // Footer
      yPosition += 20;
      doc.fontSize(9).fillColor(secondaryColor).font("Helvetica-Oblique");
      doc.text("— This is a system-generated document. —", 50, yPosition, { 
        width: 495, 
        align: "center" 
      });

      // Finalize PDF
      doc.end();

      stream.on("finish", () => {
        resolve(outputPath);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default generateSalarySlipPDF;
