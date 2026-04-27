import Asset from '../models/assetModel.js';
import AssetAssignment from '../models/assetAssignmentModel.js';
import AssetRepair from '../models/assetRepairModel.js';
import User from '../models/userModel.js';

const createAsset = async (req, res) => {
  try {
    const { name, category, brand, model, serialNumber, purchaseDate, purchaseCost, vendorName, invoiceNumber, invoiceUrl, warrantyStartDate, warrantyEndDate, warrantyProvider, warrantyDocumentUrl, notes, condition } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Name and category are required' });
    }

    if (serialNumber) {
      const existingAsset = await Asset.findOne({ serialNumber, isDeleted: false });
      if (existingAsset) {
        return res.status(400).json({ success: false, message: 'Serial number already exists' });
      }
    }

    // Generate assetId
    let assetId;
    try {
      const lastAsset = await Asset.findOne({}, { assetId: 1 }).sort({ createdAt: -1 }).lean();
      let nextNumber = 1;
      if (lastAsset && lastAsset.assetId) {
        const match = lastAsset.assetId.match(/AST(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      assetId = `AST${String(nextNumber).padStart(4, '0')}`;
    } catch (err) {
      // Fallback to timestamp-based ID
      assetId = `AST${Date.now().toString().slice(-8)}`;
    }

    const asset = new Asset({
      assetId,
      name, category, brand, model, serialNumber, purchaseDate, purchaseCost, vendorName, invoiceNumber, invoiceUrl, warrantyStartDate, warrantyEndDate, warrantyProvider, warrantyDocumentUrl, notes,
      condition: condition || 'good',
      status: 'available',
      createdBy: req.user._id,
    });

    await asset.save();
    res.status(201).json({ success: true, data: asset, message: `Asset created successfully with ID: ${asset.assetId}` });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllAssets = async (req, res) => {
  try {
    const { search, category, status, employee, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    let query = { isDeleted: false };

    if (search) {
      query.$or = [{ assetId: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }];
    }
    if (category) query.category = category;
    if (status) query.status = status;
    if (employee) query['currentAssignment.employee'] = employee;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const assets = await Asset.find(query)
      .populate('currentAssignment.employee', 'name email department')
      .populate('createdBy', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Asset.countDocuments(query);
    res.status(200).json({
      success: true,
      data: assets,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('currentAssignment.employee', 'name email department')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAsset = async (req, res) => {
  try {
    const { name, category, brand, model, serialNumber, purchaseDate, purchaseCost, vendorName, invoiceNumber, invoiceUrl, warrantyStartDate, warrantyEndDate, warrantyProvider, warrantyDocumentUrl, notes, condition, status } = req.body;
    const asset = await Asset.findById(req.params.id);

    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (serialNumber && serialNumber !== asset.serialNumber) {
      const existingAsset = await Asset.findOne({ serialNumber, isDeleted: false, _id: { $ne: req.params.id } });
      if (existingAsset) {
        return res.status(400).json({ success: false, message: 'Serial number already exists' });
      }
    }

    if (name) asset.name = name;
    if (category) asset.category = category;
    if (brand) asset.brand = brand;
    if (model) asset.model = model;
    if (serialNumber) asset.serialNumber = serialNumber;
    if (purchaseDate) asset.purchaseDate = purchaseDate;
    if (purchaseCost) asset.purchaseCost = purchaseCost;
    if (vendorName) asset.vendorName = vendorName;
    if (invoiceNumber) asset.invoiceNumber = invoiceNumber;
    if (invoiceUrl) asset.invoiceUrl = invoiceUrl;
    if (warrantyStartDate) asset.warrantyStartDate = warrantyStartDate;
    if (warrantyEndDate) asset.warrantyEndDate = warrantyEndDate;
    if (warrantyProvider) asset.warrantyProvider = warrantyProvider;
    if (warrantyDocumentUrl) asset.warrantyDocumentUrl = warrantyDocumentUrl;
    if (notes) asset.notes = notes;
    if (condition) asset.condition = condition;
    if (status) asset.status = status;

    asset.updatedBy = req.user._id;
    await asset.save();
    res.status(200).json({ success: true, data: asset, message: 'Asset updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    asset.isDeleted = true;
    asset.updatedBy = req.user._id;
    await asset.save();
    res.status(200).json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const assignAsset = async (req, res) => {
  try {
    const { employeeId, assignedDate, conditionAtAssignment, remarks } = req.body;

    if (!employeeId || !assignedDate || !conditionAtAssignment) {
      return res.status(400).json({ success: false, message: 'Employee ID, assigned date, and condition are required' });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    if (asset.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Asset is not available for assignment' });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const assignment = new AssetAssignment({
      asset: asset._id,
      employee: employeeId,
      assignedBy: req.user._id,
      assignedDate,
      conditionAtAssignment,
      remarks,
      status: 'active',
    });

    await assignment.save();

    asset.status = 'assigned';
    asset.currentAssignment = { employee: employeeId, assignedDate, condition: conditionAtAssignment };
    asset.updatedBy = req.user._id;
    await asset.save();
    await asset.populate('currentAssignment.employee', 'name email department');

    res.status(201).json({ success: true, data: { asset, assignment }, message: 'Asset assigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const returnAsset = async (req, res) => {
  try {
    const { returnDate, conditionOnReturn, returnRemarks } = req.body;

    if (!returnDate || !conditionOnReturn) {
      return res.status(400).json({ success: false, message: 'Return date and condition are required' });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    if (asset.status !== 'assigned') {
      return res.status(400).json({ success: false, message: 'Asset is not currently assigned' });
    }

    const assignment = await AssetAssignment.findOne({ asset: asset._id, status: 'active' });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'No active assignment found' });
    }

    assignment.returnDate = returnDate;
    assignment.conditionOnReturn = conditionOnReturn;
    assignment.returnRemarks = returnRemarks;
    assignment.returnedTo = req.user._id;

    let newStatus = 'available';
    if (conditionOnReturn === 'needs_repair') {
      newStatus = 'under_repair';
    } else if (conditionOnReturn === 'lost') {
      newStatus = 'lost';
      assignment.status = 'lost';
    } else {
      assignment.status = 'returned';
    }

    await assignment.save();

    asset.status = newStatus;
    asset.currentAssignment = null;
    asset.updatedBy = req.user._id;
    await asset.save();

    if (conditionOnReturn === 'needs_repair') {
      const repair = new AssetRepair({
        asset: asset._id,
        reportedBy: req.user._id,
        assignment: assignment._id,
        problemDescription: 'Returned with damage — needs repair',
        repairDate: new Date(),
        status: 'pending',
      });
      await repair.save();
    }

    res.status(200).json({ success: true, data: { asset, assignment }, message: 'Asset returned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAsLost = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    if (asset.status !== 'assigned') {
      return res.status(400).json({ success: false, message: 'Only assigned assets can be marked as lost' });
    }

    const assignment = await AssetAssignment.findOne({ asset: asset._id, status: 'active' });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'No active assignment found' });
    }

    assignment.status = 'lost';
    assignment.returnDate = new Date();
    assignment.conditionOnReturn = 'lost';
    assignment.returnedTo = req.user._id;
    await assignment.save();

    asset.status = 'lost';
    asset.currentAssignment = null;
    asset.updatedBy = req.user._id;
    await asset.save();

    res.status(200).json({ success: true, data: { asset, assignment }, message: 'Asset marked as lost' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendToRepair = async (req, res) => {
  try {
    const { problemDescription, repairVendor, repairCost, repairDate, expectedReturnDate } = req.body;

    if (!problemDescription || !repairDate) {
      return res.status(400).json({ success: false, message: 'Problem description and repair date are required' });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset || asset.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    if (!['available', 'assigned'].includes(asset.status)) {
      return res.status(400).json({ success: false, message: 'Asset cannot be sent to repair in current status' });
    }

    const repair = new AssetRepair({
      asset: asset._id,
      reportedBy: req.user._id,
      problemDescription,
      repairVendor,
      repairCost,
      repairDate,
      expectedReturnDate,
      status: 'pending',
    });

    await repair.save();

    asset.status = 'under_repair';
    asset.updatedBy = req.user._id;
    await asset.save();

    res.status(201).json({ success: true, data: { asset, repair }, message: 'Asset sent to repair' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAssignmentHistory = async (req, res) => {
  try {
    const { asset, employee, status, page = 1, limit = 20, sortBy = 'assignedDate', sortOrder = 'desc' } = req.query;
    let query = {};

    if (asset) query.asset = asset;
    if (employee) query.employee = employee;
    if (status) query.status = status;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const history = await AssetAssignment.find(query)
      .populate('asset', 'assetId name category')
      .populate('employee', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('returnedTo', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AssetAssignment.countDocuments(query);
    res.status(200).json({
      success: true,
      data: history,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAssetHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const history = await AssetAssignment.find({ asset: req.params.id })
      .populate('employee', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('returnedTo', 'name email')
      .sort({ assignedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AssetAssignment.countDocuments({ asset: req.params.id });
    res.status(200).json({
      success: true,
      data: history,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllRepairs = async (req, res) => {
  try {
    const { status, asset, page = 1, limit = 20, sortBy = 'repairDate', sortOrder = 'desc' } = req.query;
    let query = {};

    if (status) query.status = status;
    if (asset) query.asset = asset;

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const repairs = await AssetRepair.find(query)
      .populate('asset', 'assetId name category')
      .populate('reportedBy', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AssetRepair.countDocuments(query);
    res.status(200).json({
      success: true,
      data: repairs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createRepair = async (req, res) => {
  try {
    const { asset, problemDescription, repairVendor, repairCost, repairDate, expectedReturnDate } = req.body;

    if (!asset || !problemDescription || !repairDate) {
      return res.status(400).json({ success: false, message: 'Asset, problem description, and repair date are required' });
    }

    const assetDoc = await Asset.findById(asset);
    if (!assetDoc || assetDoc.isDeleted) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const repair = new AssetRepair({
      asset,
      reportedBy: req.user._id,
      problemDescription,
      repairVendor,
      repairCost,
      repairDate,
      expectedReturnDate,
      status: 'pending',
    });

    await repair.save();
    res.status(201).json({ success: true, data: repair, message: 'Repair record created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRepair = async (req, res) => {
  try {
    const { problemDescription, repairVendor, repairCost, repairDate, expectedReturnDate, status, repairNotes } = req.body;
    const repair = await AssetRepair.findById(req.params.repairId);

    if (!repair) {
      return res.status(404).json({ success: false, message: 'Repair record not found' });
    }

    if (problemDescription) repair.problemDescription = problemDescription;
    if (repairVendor) repair.repairVendor = repairVendor;
    if (repairCost) repair.repairCost = repairCost;
    if (repairDate) repair.repairDate = repairDate;
    if (expectedReturnDate) repair.expectedReturnDate = expectedReturnDate;
    if (status) repair.status = status;
    if (repairNotes) repair.repairNotes = repairNotes;

    await repair.save();
    res.status(200).json({ success: true, data: repair, message: 'Repair record updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const completeRepair = async (req, res) => {
  try {
    const repair = await AssetRepair.findById(req.params.repairId);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Repair record not found' });
    }

    repair.status = 'completed';
    repair.actualReturnDate = new Date();
    await repair.save();

    const asset = await Asset.findById(repair.asset);
    if (asset) {
      asset.status = 'available';
      asset.updatedBy = req.user._id;
      await asset.save();

      const assignment = await AssetAssignment.findOne({ asset: asset._id, status: 'active' });
      if (assignment) {
        assignment.status = 'returned';
        assignment.returnDate = new Date();
        assignment.returnedTo = req.user._id;
        await assignment.save();
      }
    }

    res.status(200).json({ success: true, data: repair, message: 'Repair completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const total = await Asset.countDocuments({ isDeleted: false });
    const assigned = await Asset.countDocuments({ status: 'assigned', isDeleted: false });
    const available = await Asset.countDocuments({ status: 'available', isDeleted: false });
    const underRepair = await Asset.countDocuments({ status: 'under_repair', isDeleted: false });
    const lost = await Asset.countDocuments({ status: 'lost', isDeleted: false });

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const warrantyExpiringSoon = await Asset.countDocuments({
      warrantyEndDate: { $lte: thirtyDaysFromNow, $gte: new Date() },
      status: { $nin: ['retired', 'lost'] },
      isDeleted: false,
    });

    const byCategory = await Asset.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const recentAssignments = await AssetAssignment.find()
      .populate('asset', 'assetId name category')
      .populate('employee', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentRepairs = await AssetRepair.find()
      .populate('asset', 'assetId name category')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentActivities = [...recentAssignments, ...recentRepairs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    const overdueReturns = await AssetAssignment.countDocuments({
      status: 'active',
      assignedDate: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    });

    const longRunningRepairs = await AssetRepair.countDocuments({
      status: { $in: ['pending', 'in_progress'] },
      repairDate: { $lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    });

    res.status(200).json({
      success: true,
      data: {
        summary: { total, assigned, available, underRepair, lost, warrantyExpiringSoon },
        byCategory,
        recentActivities,
        alerts: { overdueReturns, warrantiesExpiringThisMonth: warrantyExpiringSoon, longRunningRepairs },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({
      'currentAssignment.employee': req.user._id,
      status: 'assigned',
      isDeleted: false,
    }).populate('currentAssignment.employee', 'name email department');

    res.status(200).json({ success: true, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWarrantyAssets = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const assets = await Asset.find({
      warrantyEndDate: { $exists: true, $ne: null },
      isDeleted: false,
    })
      .sort({ warrantyEndDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Asset.countDocuments({
      warrantyEndDate: { $exists: true, $ne: null },
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      data: assets,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  assignAsset,
  returnAsset,
  markAsLost,
  sendToRepair,
  getAssignmentHistory,
  getAssetHistory,
  getAllRepairs,
  createRepair,
  updateRepair,
  completeRepair,
  getDashboard,
  getMyAssets,
  getWarrantyAssets,
};
