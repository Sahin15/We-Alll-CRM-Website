import Invoice from "../models/invoiceModel.js";
import Subscription from "../models/subscriptionModel.js";
import Payment from "../models/paymentModel.js";
import Client from "../models/clientModel.js";
import User from "../models/userModel.js";
import NotificationService from "../services/notificationService.js";

// Create invoice
export const createInvoice = async (req, res) => {
  try {
    const {
      subscription: subscriptionId,
      company,
      issueDate,
      dueDate,
      referenceNumber,
      otherReferences,
      planDetails,
      addOns,
      customItems,
      subtotal,
      discount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      totalTax,
      totalAmount,
      notes,
      termsAndConditions,
    } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ message: "Subscription is required" });
    }

    if (!company) {
      return res.status(400).json({ message: "Company is required" });
    }

    // Fetch subscription details
    const subscription = await Subscription.findById(subscriptionId).populate(
      "client"
    );

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (!subscription.client) {
      return res.status(400).json({ message: "Subscription has no associated client" });
    }

    const client = subscription.client;

    // Prepare company details based on company
    const companyDetails =
      company === "We Alll"
        ? {
            name: "We Alll",
            address:
              "1 East Gurdaha, 254/159, 254/159, Basudevpur Purba, North Twenty Four Parganas, West Bengal, 743127",
            phone: 1234567890,
            email: "accounts@wealll.com",
            gstin: "19MYNPS0053A1Z7",
            stateCode: "19",
            stateName: "West Bengal",
            logo: "/logos/wealll-logo.png",
            bankDetails: {
              accountHolderName: "We Alll",
              bankName: "State Bank of India",
              accountNumber: "43288356277",
              ifscCode: "SHYAMNAGAR(ARULIA) & SBIN016920",
              branch: "Shyamnagar",
            },
          }
        : {
            name: "Kolkata Digital",
            address: "Your Address Here",
            phone: 987654321,
            email: "accounts@kolkatadigital.com",
            gstin: "GST_NUMBER_HERE",
            stateCode: "19",
            stateName: "West Bengal",
            logo: "/logos/kolkata-digital-logo.png",
            bankDetails: {
              accountHolderName: "Kolkata Digital",
              bankName: "Bank Name",
              accountNumber: "ACCOUNT_NUMBER",
              ifscCode: "IFSC_CODE",
              branch: "Branch Name",
            },
          };

    // Prepare client details
    const clientDetails = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      gstin: client.gstNumber || "",
      stateCode: "19",
      stateName: "West Bengal",
    };

    // Create invoice
    const invoice = await Invoice.create({
      client: subscription.client._id,
      subscription: subscriptionId,
      company,
      companyDetails,
      clientDetails,
      referenceNumber,
      otherReferences,
      planDetails,
      addOns: addOns || [],
      customItems: customItems || [],
      subtotal,
      cgstRate: cgstRate || 9,
      cgstAmount: cgstAmount || 0,
      sgstRate: sgstRate || 9,
      sgstAmount: sgstAmount || 0,
      totalTax: totalTax || 0,
      discount: discount || 0,
      totalAmount,
      status: "draft",
      issueDate: issueDate || new Date(),
      dueDate,
      notes,
      termsAndConditions:
        termsAndConditions ||
        "We declare that this invoice shows the actual price of the Services described and that all particulars are true and correct.",
      createdBy: req.user.id,
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("client", "name email phone")
      .populate("subscription")
      .populate("createdBy", "name email");

    return res.status(201).json({
      message: "Invoice created successfully",
      invoice: populatedInvoice,
    });

    // Notify account managers about new invoice
    try {
      const accountManagers = await User.find({ role: { $in: ['admin', 'superadmin', 'accounts'] } }).select('_id');
      for (const am of accountManagers) {
        await NotificationService.sendToUser(
          am._id,
          '🧾 Invoice Generated',
          `Invoice ${populatedInvoice.invoiceNumber} for ${client.name} (₹${totalAmount}) has been created`,
          {
            type: 'invoice_generated',
            data: { invoiceId: invoice._id.toString(), invoiceNumber: populatedInvoice.invoiceNumber, amount: totalAmount },
            actionUrl: `/invoices/${invoice._id}`,
            senderId: req.user.id,
          }
        );
      }
    } catch (notificationError) {
      
    }
  } catch (error) {
        return res.status(500).json({
      message: "Server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const { client, status, company } = req.query;
    const filter = {};

    if (client) filter.client = client;
    if (status) filter.status = status;
    if (company) filter.company = company;

    const invoices = await Invoice.find(filter)
      .populate("client", "name email phone company")
      .populate("subscription", "subscriptionNumber")
      .populate("payment", "transactionId status")
      .populate("createdBy", "name email")
      .sort({ issueDate: -1 });

    return res.status(200).json(invoices);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client", "name email phone company address gstNumber")
      .populate("subscription")
      .populate("payment")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json(invoice);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get logged-in client's own invoices
export const getMyInvoices = async (req, res) => {
  try {
    // Get client ID from logged-in user
    const Client = (await import("../models/clientModel.js")).default;
    const client = await Client.findOne({ email: req.user.email });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const invoices = await Invoice.find({ client: client._id })
      .populate("subscription", "subscriptionNumber")
      .populate("payment", "transactionId status")
      .sort({ issueDate: -1 });

    return res.status(200).json(invoices);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get client invoices (admin viewing specific client)
export const getClientInvoices = async (req, res) => {
  try {
    const { clientId } = req.params;

    const invoices = await Invoice.find({ client: clientId })
      .populate("subscription", "subscriptionNumber")
      .populate("payment", "transactionId status")
      .sort({ issueDate: -1 });

    return res.status(200).json(invoices);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update invoice
export const updateInvoice = async (req, res) => {
  try {
    const {
      issueDate,
      dueDate,
      referenceNumber,
      otherReferences,
      planDetails,
      addOns,
      customItems,
      subtotal,
      discount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      totalTax,
      totalAmount,
      notes,
      termsAndConditions,
    } = req.body;

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Update fields
    if (issueDate) invoice.issueDate = issueDate;
    if (dueDate) invoice.dueDate = dueDate;
    if (referenceNumber !== undefined) invoice.referenceNumber = referenceNumber;
    if (otherReferences !== undefined) invoice.otherReferences = otherReferences;
    if (planDetails) invoice.planDetails = planDetails;
    if (addOns) invoice.addOns = addOns;
    if (customItems) invoice.customItems = customItems;
    if (subtotal !== undefined) invoice.subtotal = subtotal;
    if (discount !== undefined) invoice.discount = discount;
    if (cgstRate !== undefined) invoice.cgstRate = cgstRate;
    if (cgstAmount !== undefined) invoice.cgstAmount = cgstAmount;
    if (sgstRate !== undefined) invoice.sgstRate = sgstRate;
    if (sgstAmount !== undefined) invoice.sgstAmount = sgstAmount;
    if (totalTax !== undefined) invoice.totalTax = totalTax;
    if (totalAmount !== undefined) invoice.totalAmount = totalAmount;
    if (notes !== undefined) invoice.notes = notes;
    if (termsAndConditions !== undefined)
      invoice.termsAndConditions = termsAndConditions;

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("client", "name email phone")
      .populate("subscription")
      .populate("createdBy", "name email");

    return res.status(200).json({
      message: "Invoice updated successfully",
      invoice: populatedInvoice,
    });
  } catch (error) {
    
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update invoice status
export const updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.status = status;

    if (status === "paid") {
      invoice.paidDate = new Date();
    }

    if (status === "sent") {
      invoice.sentAt = new Date();
    }

    await invoice.save();

    // Send notifications based on status change
    try {
      const populatedForNotif = await Invoice.findById(invoice._id).populate('client', 'name');
      const clientName = populatedForNotif?.client?.name || 'Client';
      const invoiceNum = invoice.invoiceNumber || invoice._id.toString();

      if (status === 'paid') {
        // Notify finance/accounts team
        const financeTeam = await User.find({ role: { $in: ['accounts', 'admin', 'superadmin'] } }).select('_id');
        for (const member of financeTeam) {
          await NotificationService.sendToUser(
            member._id,
            '✅ Invoice Paid',
            `Invoice ${invoiceNum} from ${clientName} has been marked as paid`,
            {
              type: 'invoice_paid',
              data: { invoiceId: invoice._id.toString(), invoiceNumber: invoiceNum },
              actionUrl: `/invoices/${invoice._id}`,
              senderId: req.user.id,
            }
          );
        }
      } else if (status === 'overdue') {
        // Notify account managers
        const managers = await User.find({ role: { $in: ['admin', 'superadmin', 'manager', 'accounts'] } }).select('_id');
        for (const manager of managers) {
          await NotificationService.sendToUser(
            manager._id,
            '⚠️ Invoice Overdue',
            `Invoice ${invoiceNum} for ${clientName} is now overdue`,
            {
              type: 'invoice_overdue',
              data: { invoiceId: invoice._id.toString(), invoiceNumber: invoiceNum },
              actionUrl: `/invoices/${invoice._id}`,
              senderId: req.user.id,
            }
          );
        }
      }
    } catch (notificationError) {
      
    }

    return res.status(200).json({
      message: "Invoice status updated successfully",
      invoice,
    });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Send invoice
export const sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.status = "sent";
    invoice.sentAt = new Date();
    await invoice.save();

    // Notify account managers that invoice was sent to client
    try {
      const populatedForNotif = await Invoice.findById(invoice._id).populate('client', 'name');
      const clientName = populatedForNotif?.client?.name || 'Client';
      const invoiceNum = invoice.invoiceNumber || invoice._id.toString();
      const managers = await User.find({ role: { $in: ['admin', 'superadmin', 'accounts', 'manager'] } }).select('_id');
      for (const manager of managers) {
        await NotificationService.sendToUser(
          manager._id,
          '📤 Invoice Sent',
          `Invoice ${invoiceNum} has been sent to ${clientName}`,
          {
            type: 'invoice_sent',
            data: { invoiceId: invoice._id.toString(), invoiceNumber: invoiceNum },
            actionUrl: `/invoices/${invoice._id}`,
            senderId: req.user.id,
          }
        );
      }
    } catch (notificationError) {
      
    }

    // TODO: Send email to client with invoice PDF

    return res.status(200).json({
      message: "Invoice sent successfully",
      invoice,
    });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Generate PDF
export const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client")
      .populate("subscription");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const buffer = await generateGSTInvoicePDF(invoice);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${invoice.invoiceNumber}.pdf`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Helper function to format date as DD/MM/YYYY
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to generate GST Invoice PDF
const generateGSTInvoicePDF = async (invoice) => {
  const PDFDocument = (await import('pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 30,
      size: 'A4',
      bufferPages: false,
      autoFirstPage: true
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const pageWidth = doc.page.width - 60;
    let yPos = 40;

    // Title - centered
    doc.fontSize(16).font('Helvetica-Bold').text('Tax Invoice', 30, yPos, { 
      width: pageWidth, 
      align: 'center' 
    });
    
    // Original copy - right aligned
    doc.fontSize(9).font('Helvetica').text('(ORIGINAL FOR RECIPIENT)', 30, yPos, { 
      width: pageWidth, 
      align: 'right' 
    });
    yPos += 30;

    // Main border - carefully calculated to fit on one page
    // A4 height: 842pts, top margin: 40, title+space: 30, footer: 20, bottom margin: 30
    // Available: 842 - 40 - 30 - 20 - 30 = 722, but we start at yPos=70, so max height = 752
    const mainBorderHeight = 700;
    doc.rect(30, yPos, pageWidth, mainBorderHeight).stroke();

    // Top section with company and invoice details
    const topSectionHeight = 120;
    doc.rect(30, yPos, pageWidth, topSectionHeight).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + topSectionHeight).stroke();

    // Left side - Company Details
    let leftX = 35;
    let leftY = yPos + 5;
    doc.fontSize(10).font('Helvetica-Bold').text(invoice.companyDetails?.name || 'We Alll', leftX, leftY);
    leftY += 12;
    doc.fontSize(8).font('Helvetica');
    const address = invoice.companyDetails?.address || '1 East Gurdaha, 254/150, Basudevpur Purba, North Twenty Four Parganas, West Bengal, 743127';
    const addressLines = doc.heightOfString(address, { width: 300 });
    doc.text(address, leftX, leftY, { width: 300 });
    leftY += addressLines + 5;
    doc.text(`GSTIN/UIN: ${invoice.companyDetails?.gstin || '19MYNPS0053A1Z7'}`, leftX, leftY);
    leftY += 10;
    doc.text(`State Name  : ${invoice.companyDetails?.stateName || 'West Bengal'}, Code : ${invoice.companyDetails?.stateCode || '19'}`, leftX, leftY);
    leftY += 10;
    doc.text(`E-Mail : ${invoice.companyDetails?.email || 'accounts@wealll.com'}`, leftX, leftY);

    // Right side - Invoice Details
    let rightX = 355;
    let rightY = yPos + 5;
    
    doc.rect(350, yPos, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('Invoice No.', rightX, rightY);
    doc.fontSize(8).font('Helvetica').text(invoice.invoiceNumber || 'N/A', 450, rightY);
    doc.fontSize(8).font('Helvetica-Bold').text('Dated', 500, rightY);
    rightY += 15;

    doc.rect(350, yPos + 15, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica').text(formatDate(invoice.issueDate), 450, rightY);
    doc.fontSize(8).font('Helvetica-Bold').text('Other References', 500, rightY);
    rightY += 15;

    doc.rect(350, yPos + 30, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('Reference No. & Date.', rightX, rightY);
    doc.fontSize(8).font('Helvetica').text(invoice.referenceNumber || '', 450, rightY);
    rightY += 15;

    doc.rect(350, yPos + 45, pageWidth - 320, 15).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text("Buyer's Order No.", rightX, rightY);
    doc.fontSize(8).font('Helvetica').text(invoice.buyerOrderNumber || '', 450, rightY);
    doc.fontSize(8).font('Helvetica-Bold').text('Dated', 500, rightY);

    yPos += topSectionHeight;

    // Buyer section
    const buyerSectionHeight = 80;
    doc.rect(30, yPos, pageWidth, buyerSectionHeight).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + buyerSectionHeight).stroke();

    leftY = yPos + 5;
    doc.fontSize(8).font('Helvetica-Bold').text('Buyer (Bill to)', leftX, leftY);
    leftY += 12;
    doc.fontSize(9).font('Helvetica-Bold').text((invoice.clientDetails?.name || 'CLIENT NAME').toUpperCase(), leftX, leftY);
    leftY += 12;
    doc.fontSize(8).font('Helvetica').text(invoice.clientDetails?.address || 'Client Address', leftX, leftY, { width: 300 });
    leftY += 20;
    doc.text(`GSTIN/UIN        : ${invoice.clientDetails?.gstin || 'N/A'}`, leftX, leftY);
    leftY += 10;
    doc.text(`State Name       : ${invoice.clientDetails?.stateName || 'N/A'}, Code : ${invoice.clientDetails?.stateCode || 'N/A'}`, leftX, leftY);

    yPos += buyerSectionHeight;

    // Items table header
    const tableTop = yPos;
    doc.rect(30, tableTop, pageWidth, 20).stroke();
    doc.moveTo(50, tableTop).lineTo(50, tableTop + 20).stroke();
    doc.moveTo(350, tableTop).lineTo(350, tableTop + 20).stroke();
    doc.moveTo(450, tableTop).lineTo(450, tableTop + 20).stroke();

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Sl', 33, tableTop + 5);
    doc.text('No', 33, tableTop + 11);
    doc.text('Particulars', 180, tableTop + 7);
    doc.text('HSN/SAC', 365, tableTop + 7);
    doc.text('Amount', 490, tableTop + 7);

    yPos = tableTop + 20;

    // Items rows - compact height to fit on one page
    const itemsHeight = 280;
    doc.rect(30, yPos, pageWidth, itemsHeight).stroke();
    doc.moveTo(50, yPos).lineTo(50, yPos + itemsHeight).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + itemsHeight).stroke();
    doc.moveTo(450, yPos).lineTo(450, yPos + itemsHeight).stroke();

    let itemY = yPos + 10;
    let itemIndex = 1;

    // Add plan details
    if (invoice.planDetails) {
      doc.fontSize(8).font('Helvetica').text(itemIndex.toString(), 35, itemY);
      doc.fontSize(9).font('Helvetica-Bold').text(invoice.planDetails.name, 55, itemY, { width: 280 });
      itemY += 12;
      doc.fontSize(8).font('Helvetica').text(invoice.planDetails.description || '', 55, itemY, { width: 280 });
      itemY += 10;
      doc.text(`Rs. ${invoice.planDetails.amount.toFixed(2)}`, 55, itemY);
      doc.text(invoice.planDetails.hsnSac || '9983', 360, itemY - 22);
      doc.text(`Rs. ${invoice.planDetails.amount.toFixed(2)}`, 460, itemY - 22, { width: 100, align: 'right' });
      
      const cgstAmount = (invoice.planDetails.amount * invoice.cgstRate) / 100;
      itemY += 15;
      doc.text(`Output CGST @ ${invoice.cgstRate}%`, 300, itemY);
      doc.text(`Rs. ${cgstAmount.toFixed(2)}`, 460, itemY, { width: 100, align: 'right' });
      itemY += 10;
      doc.text(`Output SGST @ ${invoice.sgstRate}%`, 300, itemY);
      doc.text(`Rs. ${cgstAmount.toFixed(2)}`, 460, itemY, { width: 100, align: 'right' });
      itemY += 25;
      itemIndex++;
    }

    // Add add-ons
    invoice.addOns?.forEach((addon) => {
      if (itemY > yPos + itemsHeight - 50) return;
      doc.fontSize(8).font('Helvetica').text(itemIndex.toString(), 35, itemY);
      doc.fontSize(9).font('Helvetica-Bold').text(addon.name, 55, itemY, { width: 280 });
      itemY += 12;
      doc.fontSize(8).font('Helvetica').text(`${addon.quantity} x Rs. ${addon.unitPrice.toFixed(2)} = Rs. ${addon.amount.toFixed(2)}`, 55, itemY);
      doc.text(addon.hsnSac || '9983', 360, itemY - 12);
      doc.text(`Rs. ${addon.amount.toFixed(2)}`, 460, itemY - 12, { width: 100, align: 'right' });
      itemY += 25;
      itemIndex++;
    });

    // Add custom items
    invoice.customItems?.forEach((item) => {
      if (itemY > yPos + itemsHeight - 50) return;
      doc.fontSize(8).font('Helvetica').text(itemIndex.toString(), 35, itemY);
      doc.fontSize(9).font('Helvetica-Bold').text(item.description, 55, itemY, { width: 280 });
      itemY += 12;
      doc.fontSize(8).font('Helvetica').text(`${item.quantity} x Rs. ${item.unitPrice.toFixed(2)} = Rs. ${item.amount.toFixed(2)}`, 55, itemY);
      doc.text(item.hsnSac || '9983', 360, itemY - 12);
      doc.text(`Rs. ${item.amount.toFixed(2)}`, 460, itemY - 12, { width: 100, align: 'right' });
      itemY += 25;
      itemIndex++;
    });

    yPos += itemsHeight;

    // Total row
    doc.rect(30, yPos, pageWidth, 20).stroke();
    doc.moveTo(450, yPos).lineTo(450, yPos + 20).stroke();
    doc.fontSize(9).font('Helvetica-Bold').text('Total', 400, yPos + 7);
    doc.text(`Rs. ${invoice.totalAmount.toFixed(2)}`, 460, yPos + 7, { width: 100, align: 'right' });

    yPos += 20;

    // Amount in words
    doc.rect(30, yPos, pageWidth, 15).stroke();
    doc.fontSize(8).font('Helvetica-Bold').text('Amount Chargeable (in words)', 35, yPos + 5);
    yPos += 15;

    doc.rect(30, yPos, pageWidth, 15).stroke();
    const amountInWords = numberToWords(invoice.totalAmount);
    doc.fontSize(9).font('Helvetica-Bold').text(`INR ${amountInWords} Only`, 35, yPos + 5);
    yPos += 15;

    // Tax breakdown table - Header row (increased height)
    const taxTableTop = yPos;
    doc.rect(30, taxTableTop, pageWidth, 22).stroke();
    
    // Column widths for tax table - adjusted to match image
    const col1 = 90;   // HSN/SAC
    const col2 = 110;  // Taxable Value  
    const col3 = 60;   // CGST Rate
    const col4 = 75;   // CGST Amount
    const col5 = 60;   // SGST Rate
    const col6 = 75;   // SGST Amount
    const col7 = 85;   // Total Tax
    
    // Draw vertical lines - only major column separators, not between Rate and Amount
    const taxTableHeight = 54;
    doc.moveTo(30 + col1, taxTableTop).lineTo(30 + col1, taxTableTop + taxTableHeight).stroke();
    doc.moveTo(30 + col1 + col2, taxTableTop).lineTo(30 + col1 + col2, taxTableTop + taxTableHeight).stroke();
    // CGST column (merged Rate and Amount)
    doc.moveTo(30 + col1 + col2 + col3 + col4, taxTableTop).lineTo(30 + col1 + col2 + col3 + col4, taxTableTop + taxTableHeight).stroke();
    // SGST column (merged Rate and Amount)
    doc.moveTo(30 + col1 + col2 + col3 + col4 + col5 + col6, taxTableTop).lineTo(30 + col1 + col2 + col3 + col4 + col5 + col6, taxTableTop + taxTableHeight).stroke();
    
    // Headers - draw borders first, then text
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('HSN/SAC', 48, taxTableTop + 8);
    doc.text('Taxable', 148, taxTableTop + 5);
    doc.text('Value', 153, taxTableTop + 11);
    
    // CGST header - centered across Rate and Amount columns with padding from left border
    const cgstStart = 30 + col1 + col2;
    const cgstWidth = col3 + col4;
    doc.text('CGST', cgstStart + (cgstWidth / 2) - 8, taxTableTop + 3);
    doc.moveTo(cgstStart, taxTableTop + 14).lineTo(cgstStart + cgstWidth, taxTableTop + 14).stroke();
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Rate', cgstStart + 12, taxTableTop + 16);
    doc.text('Amount', cgstStart + col3 + 10, taxTableTop + 16);
    
    // SGST header - centered across Rate and Amount columns with padding from left border
    const sgstStart = 30 + col1 + col2 + col3 + col4;
    const sgstWidth = col5 + col6;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('SGST/UTGST', sgstStart + (sgstWidth / 2) - 18, taxTableTop + 3);
    doc.moveTo(sgstStart, taxTableTop + 14).lineTo(sgstStart + sgstWidth, taxTableTop + 14).stroke();
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Rate', sgstStart + 12, taxTableTop + 16);
    doc.text('Amount', sgstStart + col5 + 10, taxTableTop + 16);
    
    // Total Tax Amount - add left padding to avoid border overlap
    const totalTaxStart = 30 + col1 + col2 + col3 + col4 + col5 + col6;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Total', totalTaxStart + 15, taxTableTop + 5);
    doc.text('Tax Amount', totalTaxStart + 8, taxTableTop + 11);
    
    yPos = taxTableTop + 22;
    
    // Data row - with proper left padding for all columns
    doc.rect(30, yPos, pageWidth, 16).stroke();
    doc.fontSize(8).font('Helvetica');
    doc.text(invoice.planDetails?.hsnSac || '9983', 52, yPos + 6);
    doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, 145, yPos + 6);
    // CGST Rate - add left padding
    doc.text(`${invoice.cgstRate}%`, 30 + col1 + col2 + 8, yPos + 6);
    // CGST Amount - add left padding
    doc.text(`Rs. ${invoice.cgstAmount.toFixed(2)}`, 30 + col1 + col2 + col3 + 8, yPos + 6);
    // SGST Rate - add left padding
    doc.text(`${invoice.sgstRate}%`, 30 + col1 + col2 + col3 + col4 + 8, yPos + 6);
    // SGST Amount - add left padding
    doc.text(`Rs. ${invoice.sgstAmount.toFixed(2)}`, 30 + col1 + col2 + col3 + col4 + col5 + 8, yPos + 6);
    // Total Tax - shift more to the right to align with header
    doc.text(`Rs. ${invoice.totalTax.toFixed(2)}`, 30 + col1 + col2 + col3 + col4 + col5 + col6 + 20, yPos + 6);
    
    yPos += 16;
    
    // Total row - with proper left padding
    doc.rect(30, yPos, pageWidth, 16).stroke();
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Total', 52, yPos + 6);
    doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, 145, yPos + 6);
    // CGST Amount total - add left padding
    doc.text(`Rs. ${invoice.cgstAmount.toFixed(2)}`, 30 + col1 + col2 + col3 + 8, yPos + 6);
    // SGST Amount total - add left padding
    doc.text(`Rs. ${invoice.sgstAmount.toFixed(2)}`, 30 + col1 + col2 + col3 + col4 + col5 + 8, yPos + 6);
    // Total Tax - shift more to the right to align with header
    doc.text(`Rs. ${invoice.totalTax.toFixed(2)}`, 30 + col1 + col2 + col3 + col4 + col5 + col6 + 20, yPos + 6);
    
    yPos += 16;

    // Tax amount in words
    doc.rect(30, yPos, pageWidth, 16).stroke();
    const taxInWords = numberToWords(invoice.totalTax);
    doc.fontSize(8).font('Helvetica-Bold').text(`Tax Amount (in words) :  INR ${taxInWords} Only`, 35, yPos + 6);

    yPos += 16;

    // Bank details and signature section
    const bankSectionHeight = 70;
    doc.rect(30, yPos, pageWidth, bankSectionHeight).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + bankSectionHeight).stroke();

    // Bank details (left side)
    leftY = yPos + 5;
    doc.fontSize(9).font('Helvetica-Bold').text("Company's Bank Details", leftX, leftY);
    leftY += 12;
    doc.fontSize(8).font('Helvetica');
    const bankDetails = invoice.companyDetails?.bankDetails;
    doc.text(`A/c Holder's Name  : ${bankDetails?.accountHolderName || 'We Alll'}`, leftX, leftY);
    leftY += 10;
    doc.text(`Bank Name          : ${bankDetails?.bankName || 'State Bank of India'}`, leftX, leftY);
    leftY += 10;
    doc.text(`A/c No.            : ${bankDetails?.accountNumber || '43288356277'}`, leftX, leftY);
    leftY += 10;
    doc.text(`Branch & IFS Code  : ${bankDetails?.branch || 'SHYAMNAGAR(GARULIA)'} & ${bankDetails?.ifscCode || 'SBIN0016920'}`, leftX, leftY, { width: 300 });
    leftY += 13;
    doc.fontSize(7).text(`for ${invoice.companyDetails?.name || 'We Alll'}`, leftX, leftY);

    // Signature (right side)
    doc.fontSize(8).font('Helvetica').text('Authorised Signatory', 460, yPos + bankSectionHeight - 12);

    yPos += bankSectionHeight;

    // Declaration section
    const declarationHeight = 30;
    doc.rect(30, yPos, pageWidth, declarationHeight).stroke();
    doc.moveTo(350, yPos).lineTo(350, yPos + declarationHeight).stroke();
    
    // Declaration (left side)
    doc.fontSize(8).font('Helvetica-Bold').text('Declaration', 35, yPos + 4);
    doc.fontSize(7).font('Helvetica').text('We declare that this invoice shows the actual price of the', 35, yPos + 14);
    doc.text('Services described and that all particulars are true and correct.', 35, yPos + 22);
    
    // Authorised Signatory (right side - already placed above)

    yPos += declarationHeight;

    // Note: Footer text removed to prevent blank page - all content now fits within main border

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

// Delete invoice
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};
