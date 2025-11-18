import Invoice from "../models/invoiceModel.js";
import Subscription from "../models/subscriptionModel.js";
import Payment from "../models/paymentModel.js";
import Client from "../models/clientModel.js";

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
              "1 East Surdaha, 254/150, 254/159, Basudevpur Purba, North Twenty Four Parganas, West Bengal, 743127",
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
  } catch (error) {
    console.error("Error creating invoice:", error);
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
    console.error("Error fetching invoices:", error.message);
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
    console.error("Error fetching invoice:", error.message);
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
    console.error("Error fetching my invoices:", error.message);
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
    console.error("Error fetching client invoices:", error.message);
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
    console.error("Error updating invoice:", error);
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

    return res.status(200).json({
      message: "Invoice status updated successfully",
      invoice,
    });
  } catch (error) {
    console.error("Error updating invoice status:", error.message);
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

    // TODO: Send email to client with invoice PDF

    return res.status(200).json({
      message: "Invoice sent successfully",
      invoice,
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
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

    // TODO: Implement PDF generation using puppeteer or pdfkit
    // For now, return an error indicating it's not implemented
    
    return res.status(501).json({
      message: "PDF generation feature is not yet implemented. This feature will be added in a future update.",
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.clientDetails?.name,
        totalAmount: invoice.totalAmount,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete invoice
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
