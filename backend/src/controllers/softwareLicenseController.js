import SoftwareLicense from "../models/softwareLicenseModel.js";
import LicenseAssignment from "../models/licenseAssignmentModel.js";
import User from "../models/userModel.js";

const createLicense = async (req, res) => {
  try {
    const { softwareName, vendor, licenseType, licenseKey, purchaseDate, expiryDate, cost, currency, quantity, category, description, supportEndDate, renewalReminder, reminderDaysBefore, documentUrl, notes } = req.body;

    const license = new SoftwareLicense({
      softwareName, vendor, licenseType, licenseKey, purchaseDate, expiryDate, cost, currency, quantity, category, description, supportEndDate, renewalReminder, reminderDaysBefore, documentUrl, notes,
      createdBy: req.user._id,
    });

    await license.save();
    res.status(201).json({ success: true, message: "License created successfully", data: license });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating license", error: error.message });
  }
};

const getAllLicenses = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { softwareName: { $regex: search, $options: "i" } },
        { vendor: { $regex: search, $options: "i" } },
        { licenseId: { $regex: search, $options: "i" } },
      ];
    }

    const licenses = await SoftwareLicense.find(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await SoftwareLicense.countDocuments(query);

    res.status(200).json({
      success: true,
      data: licenses,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching licenses", error: error.message });
  }
};

const getLicenseById = async (req, res) => {
  try {
    const license = await SoftwareLicense.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!license) {
      return res.status(404).json({ success: false, message: "License not found" });
    }

    res.status(200).json({ success: true, data: license });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching license", error: error.message });
  }
};

const updateLicense = async (req, res) => {
  try {
    const updates = req.body;
    updates.updatedBy = req.user._id;

    const license = await SoftwareLicense.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!license) {
      return res.status(404).json({ success: false, message: "License not found" });
    }

    res.status(200).json({ success: true, message: "License updated successfully", data: license });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating license", error: error.message });
  }
};

const deleteLicense = async (req, res) => {
  try {
    const license = await SoftwareLicense.findByIdAndDelete(req.params.id);

    if (!license) {
      return res.status(404).json({ success: false, message: "License not found" });
    }

    await LicenseAssignment.deleteMany({ license: req.params.id });

    res.status(200).json({ success: true, message: "License deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting license", error: error.message });
  }
};

const assignLicense = async (req, res) => {
  try {
    const { licenseId, userId, installationPath, deviceInfo, notes } = req.body;

    const license = await SoftwareLicense.findById(licenseId);
    if (!license) {
      return res.status(404).json({ success: false, message: "License not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingAssignment = await LicenseAssignment.findOne({
      license: licenseId,
      assignedTo: userId,
      status: "Active",
    });

    if (existingAssignment) {
      return res.status(400).json({ success: false, message: "License already assigned to this user" });
    }

    const assignment = new LicenseAssignment({
      license: licenseId,
      assignedTo: userId,
      assignedBy: req.user._id,
      installationPath,
      deviceInfo,
      notes,
    });

    await assignment.save();
    await assignment.populate([
      { path: "license", select: "softwareName licenseId" },
      { path: "assignedTo", select: "name email" },
      { path: "assignedBy", select: "name email" },
    ]);

    res.status(201).json({ success: true, message: "License assigned successfully", data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error assigning license", error: error.message });
  }
};

const revokeLicense = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { revocationReason } = req.body;

    const assignment = await LicenseAssignment.findByIdAndUpdate(
      assignmentId,
      { status: "Revoked", revocationDate: new Date(), revocationReason },
      { new: true }
    )
      .populate("license", "softwareName licenseId")
      .populate("assignedTo", "name email");

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    res.status(200).json({ success: true, message: "License revoked successfully", data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error revoking license", error: error.message });
  }
};

const getAssignments = async (req, res) => {
  try {
    const { licenseId, userId, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (licenseId) query.license = licenseId;
    if (userId) query.assignedTo = userId;
    if (status) query.status = status;

    const assignments = await LicenseAssignment.find(query)
      .populate("license", "softwareName licenseId vendor")
      .populate("assignedTo", "name email department")
      .populate("assignedBy", "name email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ assignmentDate: -1 });

    const total = await LicenseAssignment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: assignments,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching assignments", error: error.message });
  }
};

const getExpiringLicenses = async (req, res) => {
  try {
    const { daysAhead = 30 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(daysAhead));

    const licenses = await SoftwareLicense.find({
      expiryDate: { $gte: new Date(), $lte: futureDate },
      status: { $ne: "Expired" },
    })
      .populate("createdBy", "name email")
      .sort({ expiryDate: 1 });

    res.status(200).json({ success: true, data: licenses });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching expiring licenses", error: error.message });
  }
};

const getLicenseDashboard = async (req, res) => {
  try {
    const totalLicenses = await SoftwareLicense.countDocuments();
    const activeLicenses = await SoftwareLicense.countDocuments({ status: "Active" });
    const expiredLicenses = await SoftwareLicense.countDocuments({ status: "Expired" });
    const totalAssignments = await LicenseAssignment.countDocuments({ status: "Active" });

    const categoryDistribution = await SoftwareLicense.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const recentLicenses = await SoftwareLicense.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    const expiringLicenses = await SoftwareLicense.find({
      expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      status: { $ne: "Expired" },
    })
      .sort({ expiryDate: 1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: { totalLicenses, activeLicenses, expiredLicenses, totalAssignments, categoryDistribution, recentLicenses, expiringLicenses },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching dashboard data", error: error.message });
  }
};

const getUserLicenses = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { assignedTo: userId };
    if (status) query.status = status;

    const assignments = await LicenseAssignment.find(query)
      .populate("license", "softwareName vendor licenseType expiryDate")
      .populate("assignedBy", "name email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ assignmentDate: -1 });

    const total = await LicenseAssignment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: assignments || [],
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error in getUserLicenses:", error);
    res.status(500).json({ success: false, message: "Error fetching user licenses", error: error.message });
  }
};

export default {
  createLicense,
  getAllLicenses,
  getLicenseById,
  updateLicense,
  deleteLicense,
  assignLicense,
  revokeLicense,
  getAssignments,
  getExpiringLicenses,
  getLicenseDashboard,
  getUserLicenses,
};
