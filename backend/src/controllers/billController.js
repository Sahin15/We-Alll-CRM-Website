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

// Generate invoice PDF buffer
const generateInvoicePDF = async (bill) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    // Header
    doc.fontSize(20).text("Invoice", { align: "right" });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${bill.billNumber}`);
    doc.text(`Issue Date: ${bill.issueDate?.toISOString()?.slice(0, 10)}`);
    doc.text(`Due Date: ${bill.dueDate?.toISOString()?.slice(0, 10)}`);
    doc.moveDown();

    // Client
    doc.fontSize(14).text("Bill To:");
    doc.fontSize(12).text(`${bill.client?.name || "Client"}`);
    doc.text(`${bill.client?.email || ""}`);
    doc.moveDown();

    // Items
    doc.fontSize(14).text("Items:");
    doc.moveDown(0.5);
    bill.items.forEach((item, idx) => {
      doc
        .fontSize(12)
        .text(
          `${idx + 1}. ${item.description} - Qty: ${
            item.quantity
          } x Rate: ${item.rate.toFixed(2)} = ${item.amount.toFixed(2)}`
        );
    });
    doc.moveDown();

    // Totals
    doc.text(`Subtotal: ${Number(bill.subtotal || 0).toFixed(2)}`);
    doc.text(
      `Discount (${bill.discountType}): ${Number(
        bill.discountAmount || 0
      ).toFixed(2)}`
    );
    doc.text(
      `Tax (${bill.taxRate}%): ${Number(bill.taxAmount || 0).toFixed(2)}`
    );
    doc.fontSize(13).text(`Total: ${Number(bill.totalAmount || 0).toFixed(2)}`);
    doc.moveDown();

    if (bill.notes) {
      doc.fontSize(12).text("Notes:");
      doc.text(bill.notes);
    }

    if (bill.termsAndConditions) {
      doc.moveDown();
      doc.fontSize(12).text("Terms:");
      doc.text(bill.termsAndConditions);
    }

    doc.end();
  });
};

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
    console.error("Error in createBill:", error.message);
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
    console.error("Error in getAllBills:", error.message);
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
    console.error("Error in getBillById:", error.message);
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
    console.error("Error in updateBill:", error.message);
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
    console.error("Error in deleteBill:", error.message);
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
    console.error("Error in sendBillToClient:", error.message);
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
    console.error("Error in markBillAsPaid:", error.message);
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
    console.error("Error in getClientBills:", error.message);
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
    console.error("Error in getBillPDF:", error.message);
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
    console.error("Error in getOverdueBills:", error.message);
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
    console.error("Error in applyDiscount:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
