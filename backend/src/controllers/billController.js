import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import Bill from "../models/billModel.js";
import Client from "../models/clientModel.js";
import Project from "../models/projectModel.js";
import Payment from "../models/paymentModel.js";

// Resolve client access for client role (restrict to own)
const resolveClientAccess = async (req) => {
  if (req.user?.role !== "client") return null;
  const client = await Client.findOne({ email: req.user.email }).select("_id");
  return client?._id?.toString() || null;
};

// Nodemailer transporter
const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || "false").toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
};

// Generate GST Tax Invoice PDF buffer (matching exact format)
const generateInvoicePDF = async (bill) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 30,
      size: 'A4'
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const pageWidth = doc.page.width - 60; // Account for margins
    let yPos = 50;

    // Title and Original Copy
    doc.fontSize(16).font('Helvetica-Bold').text('Tax Invoice', 250, yPos, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('(ORIGINAL FOR RECIPIENT)', 400, yPos);
    yPos += 30;

    // Main border
    doc.rect(30, yPos, pageWidth, 650).stroke();

    // Top section with company and invoice details
    const topSectionHeight = 120;
    doc.rect(30, yPos, pageWidth, topSectionHeight).stroke();
    
    // Vertical divider for top section
    doc.moveTo(350, yPos).lineTo(350, yPos + topSectionHeight).stroke();

    // Left side - Company Details (Seller)
    let leftX = 35;
    let leftY = yPos + 5;
    doc.fontSize(10).font('Helvetica-Bold').text('We Alll', leftX, leftY);
    leftY += 12;
    doc.fontSize(8).font('Helvetica').text('1 East Gurdaha, 254/150, 254/150,', leftX, leftY);
    leftY += 10;
    doc.text('Basudevpur Purba, North Twenty Four Parganas,', leftX, leftY);
    leftY += 10;
    doc.text('West Bengal, 743127', leftX, leftY);
    leftY += 10;
    doc.text('GSTIN/UIN: 19MYNPS0053A1Z7', leftX, leftY);
    leftY += 10;
    doc.text('State Name  : West Bengal, Code : 19', leftX, leftY);
    leftY += 10;
    doc.text('E-Mail : accounts@wealll.com', leftX, leftY);

    // Right side - Invoice Details
    let rightX = 355;
    let rightY = yPos + 5;
    
    // Invoice No row
    doc.rect(350, yPos, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('Invoice No.', rightX, rightY);
    doc.fontSize(8).font('Helvetica').text(bill.billNumber || 'N/A', 450, rightY);
    doc.fontSize(8).font('Helvetica-Bold').text('Dated', 500, rightY);
    rightY += 15;

    // Date row
    doc.rect(350, yPos + 15, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica').text(bill.issueDate?.toISOString()?.slice(0, 10) || '', 450, rightY);
    doc.fontSize(8).font('Helvetica-Bold').text('Other References', 500, rightY);
    rightY += 15;

    // Reference row
    doc.rect(350, yPos + 30, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('Reference No. & Date.', rightX, rightY);
    rightY += 15;

    // Buyer Order row
    doc.rect(350, yPos + 45, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica').text(bill.project?.name || '', 450, rightY);
    doc.fontSize(8).font('Helvetica-Bold').text("Buyer's Order No.", rightX, rightY);
    doc.fontSize(8).font('Helvetica-Bold').text('Dated', 500, rightY);
    rightY += 15;

    yPos += topSectionHeight;

    // Buyer section
    const buyerSectionHeight = 80;
    doc.rect(30, yPos, pageWidth, buyerSectionHeight).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + buyerSectionHeight).stroke();

    leftY = yPos + 5;
    doc.fontSize(8).font('Helvetica-Bold').text('Buyer (Bill to)', leftX, leftY);
    leftY += 12;
    doc.fontSize(9).font('Helvetica-Bold').text(bill.client?.name?.toUpperCase() || 'CLIENT NAME', leftX, leftY);
    leftY += 12;
    doc.fontSize(8).font('Helvetica').text(bill.client?.address || 'Client Address', leftX, leftY, { width: 300 });
    leftY += 20;
    doc.text(`GSTIN/UIN        : ${bill.client?.gstin || 'N/A'}`, leftX, leftY);
    leftY += 10;
    doc.text(`State Name       : ${bill.client?.state || 'N/A'}, Code : ${bill.client?.stateCode || 'N/A'}`, leftX, leftY);

    yPos += buyerSectionHeight;

    // Items table header
    const tableTop = yPos;
    doc.rect(30, tableTop, pageWidth, 20).stroke();
    
    // Table columns
    doc.moveTo(50, tableTop).lineTo(50, tableTop + 20).stroke();
    doc.moveTo(350, tableTop).lineTo(350, tableTop + 20).stroke();
    doc.moveTo(450, tableTop).lineTo(450, tableTop + 20).stroke();

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Sl', 32, tableTop + 6);
    doc.text('No', 32, tableTop + 12);
    doc.text('Particulars', 180, tableTop + 8);
    doc.text('HSN/SAC', 360, tableTop + 8);
    doc.text('Amount', 490, tableTop + 8);

    yPos = tableTop + 20;

    // Items rows
    const itemsHeight = 350;
    doc.rect(30, yPos, pageWidth, itemsHeight).stroke();
    doc.moveTo(50, yPos).lineTo(50, yPos + itemsHeight).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + itemsHeight).stroke();
    doc.moveTo(450, yPos).lineTo(450, yPos + itemsHeight).stroke();

    let itemY = yPos + 10;
    bill.items.forEach((item, idx) => {
      doc.fontSize(8).font('Helvetica').text((idx + 1).toString(), 35, itemY);
      
      // Item description
      doc.fontSize(9).font('Helvetica-Bold').text(item.description, 55, itemY, { width: 280 });
      itemY += 12;
      doc.fontSize(8).font('Helvetica').text(`${item.quantity} x Rs ${item.rate.toFixed(2)} = Rs ${item.amount.toFixed(2)}`, 55, itemY);
      
      // HSN/SAC
      doc.text(item.hsnCode || '9983', 360, itemY - 12);
      
      // Amount
      doc.text(item.amount.toFixed(2), 460, itemY - 12, { width: 100, align: 'right' });
      
      itemY += 20;

      // GST breakdown (CGST + SGST)
      const cgstRate = (bill.taxRate || 18) / 2;
      const cgstAmount = (item.amount * cgstRate) / 100;
      
      doc.fontSize(8).font('Helvetica').text(`Output CGST @ ${cgstRate}%`, 300, itemY);
      doc.text(cgstAmount.toFixed(2), 460, itemY, { width: 100, align: 'right' });
      itemY += 10;
      
      doc.text(`Output SGST @ ${cgstRate}%`, 300, itemY);
      doc.text(cgstAmount.toFixed(2), 460, itemY, { width: 100, align: 'right' });
      itemY += 25;
    });

    yPos += itemsHeight;

    // Total row
    doc.rect(30, yPos, pageWidth, 20).stroke();
    doc.moveTo(450, yPos).lineTo(450, yPos + 20).stroke();
    doc.fontSize(9).font('Helvetica-Bold').text('Total', 400, yPos + 6);
    doc.text(`₹ ${bill.totalAmount.toFixed(2)}`, 460, yPos + 6, { width: 100, align: 'right' });

    yPos += 20;

    // Amount in words
    doc.rect(30, yPos, pageWidth, 15).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('Amount Chargeable (in words)', 35, yPos + 4);
    yPos += 15;

    doc.rect(30, yPos, pageWidth, 15).stroke();
    const amountInWords = numberToWords(bill.totalAmount);
    doc.fontSize(9).font('Helvetica-Bold').text(`INR ${amountInWords} Only`, 35, yPos + 4);
    yPos += 15;

    // Tax breakdown table
    doc.rect(30, yPos, pageWidth, 15).stroke();
    const colWidths = [80, 100, 80, 80, 80, 115];
    let xPos = 30;
    
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('HSN/SAC', xPos + 5, yPos + 4);
    xPos += colWidths[0];
    doc.moveTo(xPos, yPos).lineTo(xPos, yPos + 45).stroke();
    
    doc.text('Taxable', xPos + 5, yPos + 4);
    doc.text('Value', xPos + 10, yPos + 9);
    xPos += colWidths[1];
    doc.moveTo(xPos, yPos).lineTo(xPos, yPos + 45).stroke();
    
    doc.text('CGST', xPos + 15, yPos + 2);
    doc.text('Rate', xPos + 10, yPos + 8);
    doc.text('Amount', xPos + 5, yPos + 12);
    xPos += colWidths[2];
    doc.moveTo(xPos, yPos).lineTo(xPos, yPos + 45).stroke();
    
    doc.text('SGST/UTGST', xPos + 5, yPos + 2);
    doc.text('Rate', xPos + 10, yPos + 8);
    doc.text('Amount', xPos + 5, yPos + 12);
    xPos += colWidths[3];
    doc.moveTo(xPos, yPos).lineTo(xPos, yPos + 45).stroke();
    
    doc.text('Total', xPos + 15, yPos + 2);
    doc.text('Tax Amount', xPos + 5, yPos + 9);
    
    yPos += 15;
    doc.rect(30, yPos, pageWidth, 15).stroke();

    // Tax values
    xPos = 30;
    const cgstRate = (bill.taxRate || 18) / 2;
    const cgstAmount = bill.taxAmount / 2;
    
    doc.fontSize(8).font('Helvetica');
    doc.text(bill.items[0]?.hsnCode || '9983', xPos + 15, yPos + 4);
    xPos += colWidths[0];
    doc.text(bill.subtotal.toFixed(2), xPos + 20, yPos + 4);
    xPos += colWidths[1];
    doc.text(`${cgstRate}%`, xPos + 15, yPos + 4);
    doc.text(cgstAmount.toFixed(2), xPos + 5, yPos + 9);
    xPos += colWidths[2];
    doc.text(`${cgstRate}%`, xPos + 15, yPos + 4);
    doc.text(cgstAmount.toFixed(2), xPos + 5, yPos + 9);
    xPos += colWidths[3];
    doc.text(bill.taxAmount.toFixed(2), xPos + 15, yPos + 4);

    yPos += 15;
    doc.rect(30, yPos, pageWidth, 15).stroke();
    
    // Total row
    xPos = 30;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Total', xPos + 15, yPos + 4);
    xPos += colWidths[0];
    doc.text(bill.subtotal.toFixed(2), xPos + 20, yPos + 4);
    xPos += colWidths[1];
    doc.text(cgstAmount.toFixed(2), xPos + 15, yPos + 4);
    xPos += colWidths[2];
    doc.text(cgstAmount.toFixed(2), xPos + 15, yPos + 4);
    xPos += colWidths[3];
    doc.text(bill.taxAmount.toFixed(2), xPos + 15, yPos + 4);

    yPos += 15;

    // Tax amount in words
    doc.rect(30, yPos, pageWidth, 15).stroke();
    const taxInWords = numberToWords(bill.taxAmount);
    doc.fontSize(8).font('Helvetica-Bold').text(`Tax Amount (in words) :  INR ${taxInWords} Only`, 35, yPos + 4);

    yPos += 15;

    // Bank details and signature section
    doc.rect(30, yPos, pageWidth, 80).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + 80).stroke();

    // Bank details
    leftY = yPos + 5;
    doc.fontSize(9).font('Helvetica-Bold').text("Company's Bank Details", leftX, leftY);
    leftY += 12;
    doc.fontSize(8).font('Helvetica');
    doc.text("A/c Holder's Name  : We Alll", leftX, leftY);
    leftY += 10;
    doc.text("Bank Name          : State Bank of India", leftX, leftY);
    leftY += 10;
    doc.text("A/c No.            : 43288356277", leftX, leftY);
    leftY += 10;
    doc.text("Branch & IFS Code  : SHYAMNAGAR(GARULIA) & SBIN0016920", leftX, leftY);
    leftY += 10;
    doc.fontSize(7).text("for We Alll", leftX, leftY);

    // Signature
    rightY = yPos + 5;
    doc.fontSize(8).font('Helvetica').text('Authorised Signatory', 480, yPos + 60);

    yPos += 80;

    // Declaration
    doc.rect(30, yPos, pageWidth, 30).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('Declaration', 35, yPos + 5);
    doc.fontSize(7).font('Helvetica').text('We declare that this invoice shows the actual price of the', 35, yPos + 15);
    doc.text('Services described and that all particulars are true and correct.', 35, yPos + 22);

    // Footer
    doc.fontSize(8).font('Helvetica-Oblique').text('This is a Computer Generated Invoice', 200, yPos + 40);

    doc.end();
  });
};

// Helper function to convert number to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  const numStr = Math.floor(num).toString();
  const len = numStr.length;

  if (len > 7) return 'Number too large';

  const padded = numStr.padStart(7, '0');
  const crore = parseInt(padded.substring(0, 2));
  const lakh = parseInt(padded.substring(2, 4));
  const thousand = parseInt(padded.substring(4, 5));
  const hundred = parseInt(padded.substring(5, 6));
  const ten = parseInt(padded.substring(6, 7));

  let words = '';

  if (crore > 0) {
    if (crore < 10) words += ones[crore] + ' Crore ';
    else if (crore < 20) words += teens[crore - 10] + ' Crore ';
    else words += tens[Math.floor(crore / 10)] + ' ' + ones[crore % 10] + ' Crore ';
  }

  if (lakh > 0) {
    if (lakh < 10) words += ones[lakh] + ' Lakh ';
    else if (lakh < 20) words += teens[lakh - 10] + ' Lakh ';
    else words += tens[Math.floor(lakh / 10)] + ' ' + ones[lakh % 10] + ' Lakh ';
  }

  if (thousand > 0) words += ones[thousand] + ' Thousand ';

  if (hundred > 0) words += ones[hundred] + ' Hundred ';

  const lastTwo = parseInt(padded.substring(5, 7));
  if (lastTwo > 0) {
    if (lastTwo < 10) words += ones[lastTwo];
    else if (lastTwo < 20) words += teens[lastTwo - 10];
    else words += tens[Math.floor(lastTwo / 10)] + ' ' + ones[lastTwo % 10];
  }

  return words.trim();
}

// Create bill
export const createBill = async (req, res) => {
  try {
    const {
      client,
      items,
      dueDate,
      project,
      taxRate,
      discountType,
      discountValue,
      notes,
      termsAndConditions,
      paymentInstructions,
      issueDate,
    } = req.body;
    if (!client || !Array.isArray(items) || items.length === 0 || !dueDate) {
      return res
        .status(400)
        .json({ message: "client, items[], and dueDate are required" });
    }

    const bill = new Bill({
      client,
      project,
      items,
      taxRate,
      discountType,
      discountValue,
      notes,
      termsAndConditions,
      paymentInstructions,
      issueDate,
      dueDate,
      createdBy: req.user.id,
      status: "draft",
    });

    await bill.save(); // pre-save calculates totals and billNumber

    const populated = await Bill.findById(bill._id)
      .populate("client", "name email")
      .populate("project", "name");

    return res.status(201).json({ message: "Bill created", bill: populated });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all bills (admin/accounts) with filters
export const getAllBills = async (req, res) => {
  try {
    const { status, clientId, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (clientId) filter.client = clientId;
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) filter.issueDate.$gte = new Date(startDate);
      if (endDate) filter.issueDate.$lte = new Date(endDate);
    }

    const bills = await Bill.find(filter)
      .populate("client", "name email")
      .populate("project", "name")
      .sort({ issueDate: -1 });

    return res.status(200).json(bills);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get bill by id (client restricted)
export const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate("client", "_id name email")
      .populate("project", "name");
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const clientIdForUser = await resolveClientAccess(req);
    if (clientIdForUser && bill.client?._id?.toString() !== clientIdForUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json(bill);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update bill (use doc.save to trigger pre-save recalculation)
export const updateBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    Object.keys(req.body || {}).forEach((k) => {
      bill[k] = req.body[k];
    });

    await bill.save();

    return res.status(200).json({ message: "Bill updated", bill });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete bill
export const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    return res.status(200).json({ message: "Bill deleted" });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Send bill to client (email with PDF)
export const sendBillToClient = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate(
      "client",
      "name email"
    );
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const transporter = getTransporter();
    if (!transporter) {
      return res.status(400).json({ message: "SMTP is not configured" });
    }

    const pdfBuffer = await generateInvoicePDF(bill);

    const { FROM_EMAIL } = process.env;
    await transporter.sendMail({
      from: FROM_EMAIL || "no-reply@crm.local",
      to: bill.client.email,
      subject: `Invoice ${bill.billNumber}`,
      text: `Dear ${bill.client.name},

Please find attached your invoice ${bill.billNumber}.
Total: ${bill.totalAmount}.
Due Date: ${bill.dueDate?.toISOString()?.slice(0, 10)}

Regards,
Accounts Team`,
      attachments: [{ filename: `${bill.billNumber}.pdf`, content: pdfBuffer }],
    });

    bill.status = bill.status === "draft" ? "sent" : bill.status;
    bill.sentAt = new Date();
    await bill.save();

    return res.status(200).json({ message: "Invoice emailed", bill });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Mark bill as paid; optionally create a payment record
export const markBillAsPaid = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    bill.paidAmount = bill.totalAmount;
    bill.balanceAmount = 0;
    bill.status = "paid";
    bill.paidAt = new Date();
    await bill.save();

    // Optionally create a payment record
    const {
      createPayment = false,
      paymentMethod,
      transactionId,
      notes,
    } = req.body || {};
    let payment = null;
    if (createPayment) {
      payment = await Payment.create({
        client: bill.client,
        bill: bill._id,
        amount: bill.totalAmount,
        paidAmount: bill.totalAmount,
        balanceAmount: 0,
        paymentDate: new Date(),
        dueDate: bill.dueDate,
        status: "paid",
        paymentMethod,
        transactionId,
        notes,
        createdBy: req.user.id,
      });
    }

    return res
      .status(200)
      .json({ message: "Bill marked as paid", bill, payment });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get bills for a client (client restricted)
export const getClientBills = async (req, res) => {
  try {
    const { clientId } = req.params;

    const clientIdForUser = await resolveClientAccess(req);
    if (clientIdForUser && clientIdForUser !== clientId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const bills = await Bill.find({ client: clientId })
      .populate("project", "name")
      .sort({ issueDate: -1 });

    return res.status(200).json(bills);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Generate bill PDF (download)
export const getBillPDF = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate(
      "client",
      "name email"
    );
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const clientIdForUser = await resolveClientAccess(req);
    if (clientIdForUser && bill.client?._id?.toString() !== clientIdForUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const buffer = await generateInvoicePDF(bill);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${bill.billNumber}.pdf`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Overdue bills (admin/accounts)
export const getOverdueBills = async (req, res) => {
  try {
    const bills = await Bill.find({ status: "overdue" })
      .populate("client", "name email")
      .populate("project", "name")
      .sort({ dueDate: 1 });
    return res.status(200).json(bills);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Apply discount values and recalc
export const applyDiscount = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const { discountType, discountValue } = req.body || {};
    bill.discountType = discountType ?? bill.discountType;
    bill.discountValue =
      typeof discountValue === "number" ? discountValue : bill.discountValue;
    await bill.save();

    return res.status(200).json({ message: "Discount applied", bill });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};
