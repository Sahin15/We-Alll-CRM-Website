import RawData from "../models/rawDataModel.js";
import Lead from "../models/leadModel.js";

const LOCK_DURATION_MINUTES = 15;

// ─── CRUD ────────────────────────────────────────────────────────────────────

// POST /api/raw-data
export const createRecord = async (req, res) => {
  try {
    const { phone } = req.body;

    // Duplicate check
    const existing = await RawData.findOne({ phone });
    if (existing) {
      return res.status(409).json({
        error: "Duplicate phone number",
        existingRecord: { id: existing._id, name: existing.name, phone: existing.phone, status: existing.status },
      });
    }

    const record = await RawData.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/raw-data
export const getRecords = async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      status, category, location, source,
      assignedCaller, search,
      sortBy = "createdAt", sortOrder = "desc",
    } = req.query;

    const filter = {};
    if (status) filter.status = { $in: status.split(",") };
    if (category) filter.category = category;
    if (location) filter.location = location;
    if (source) filter.source = source;
    if (assignedCaller) filter.assignedCaller = assignedCaller;
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];

    const total = await RawData.countDocuments(filter);
    const data = await RawData.find(filter)
      .populate("assignedCaller", "name email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/raw-data/:id
export const getRecord = async (req, res) => {
  try {
    const record = await RawData.findById(req.params.id)
      .populate("assignedCaller", "name email")
      .populate("lockedBy", "name")
      .populate("convertedLeadId", "fullName")
      .populate("callHistory.calledBy", "name");

    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/raw-data/:id
export const updateRecord = async (req, res) => {
  try {
    const record = await RawData.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/raw-data/:id
export const deleteRecord = async (req, res) => {
  try {
    const record = await RawData.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── DUPLICATE CHECK ─────────────────────────────────────────────────────────

// POST /api/raw-data/check-duplicate
export const checkDuplicate = async (req, res) => {
  try {
    const { phone } = req.body;
    const existing = await RawData.findOne({ phone });
    if (existing) {
      return res.json({ isDuplicate: true, existingRecord: existing });
    }
    res.json({ isDuplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── CALLING OPERATIONS ──────────────────────────────────────────────────────

// POST /api/raw-data/:id/lock
export const lockRecord = async (req, res) => {
  try {
    const record = await RawData.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    // Check if already locked by someone else
    if (record.recordLock && record.lockedBy?.toString() !== req.user._id.toString()) {
      const now = new Date();
      if (record.lockExpiresAt && record.lockExpiresAt > now) {
        return res.status(409).json({
          error: "Record already locked",
          lockedBy: record.lockedBy,
          lockExpiresAt: record.lockExpiresAt,
        });
      }
    }

    const lockExpiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
    record.recordLock = true;
    record.lockedBy = req.user._id;
    record.lockedAt = new Date();
    record.lockExpiresAt = lockExpiresAt;
    await record.save();

    res.json({ id: record._id, recordLock: true, lockedBy: req.user._id, lockExpiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/raw-data/:id/unlock
export const unlockRecord = async (req, res) => {
  try {
    const record = await RawData.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    record.recordLock = false;
    record.lockedBy = null;
    record.lockedAt = null;
    record.lockExpiresAt = null;
    await record.save();

    res.json({ id: record._id, recordLock: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/raw-data/:id/call-result
export const updateCallResult = async (req, res) => {
  try {
    const { status, remarks, nextCallDate, duration } = req.body;
    const record = await RawData.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    // Add to call history
    record.callHistory.push({
      calledBy: req.user._id,
      calledAt: new Date(),
      status,
      remarks,
      duration: duration || 0,
    });

    record.status = status === "No Response" || status === "Wrong Number" || status === "Not Interested"
      ? status
      : status; // keep as-is for Interested, Follow-up Needed
    record.remarks = remarks;
    record.callAttemptCount += 1;
    record.lastCallDate = new Date();
    if (nextCallDate) record.nextCallDate = new Date(nextCallDate);

    // Release lock after call
    record.recordLock = false;
    record.lockedBy = null;
    record.lockedAt = null;
    record.lockExpiresAt = null;

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/raw-data/:id/history
export const getCallHistory = async (req, res) => {
  try {
    const record = await RawData.findById(req.params.id)
      .populate("callHistory.calledBy", "name email");
    if (!record) return res.status(404).json({ error: "Record not found" });

    res.json({ id: record._id, name: record.name, phone: record.phone, callHistory: record.callHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── QUEUE ───────────────────────────────────────────────────────────────────

// GET /api/raw-data/queue/today
export const getTodayQueue = async (req, res) => {
  try {
    const callerId = req.query.callerId || req.user._id;

    const queue = await RawData.find({
      assignedCaller: callerId,
      status: { $in: ["Pending Call", "No Response", "Follow-up Needed"] },
      convertedToLead: false,
    })
      .sort({ nextCallDate: 1, createdAt: 1 })
      .limit(50);

    res.json({ callerId, total: queue.length, queue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── ASSIGNMENT ──────────────────────────────────────────────────────────────

// POST /api/raw-data/:id/assign
export const assignRecord = async (req, res) => {
  try {
    const { callerId } = req.body;
    const record = await RawData.findByIdAndUpdate(
      req.params.id,
      { assignedCaller: callerId, status: "Pending Call" },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/raw-data/bulk-assign
export const bulkAssign = async (req, res) => {
  try {
    const { recordIds, callerId } = req.body;
    await RawData.updateMany(
      { _id: { $in: recordIds } },
      { assignedCaller: callerId, status: "Pending Call" }
    );
    res.json({ assigned: recordIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/raw-data/:id/reassign
export const reassignRecord = async (req, res) => {
  try {
    const { callerId } = req.body;
    const record = await RawData.findByIdAndUpdate(
      req.params.id,
      { assignedCaller: callerId || null, status: callerId ? "Pending Call" : "New" },
      { new: true }
    ).populate("assignedCaller", "name email");
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── LEAD CONVERSION ─────────────────────────────────────────────────────────

// POST /api/raw-data/:id/convert-to-lead
export const convertToLead = async (req, res) => {
  try {
    const record = await RawData.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    if (record.status !== "Interested") return res.status(400).json({ error: "Record must be Interested to convert" });
    if (record.convertedToLead) return res.status(400).json({ error: "Already converted to lead" });

    const { leadOwnerId } = req.body;

    // Create lead from raw data
    const lead = await Lead.create({
      fullName: record.name,
      phone: record.phone,
      source: record.source,
      reference: record.reference,
      notes: record.remarks,
      assignedTo: leadOwnerId || req.user._id,
      createdBy: req.user._id,
      status: "New",
    });

    // Update raw data record
    record.convertedToLead = true;
    record.convertedLeadId = lead._id;
    record.convertedAt = new Date();
    record.convertedBy = req.user._id;
    record.status = "Converted to Lead";
    await record.save();

    res.json({ id: record._id, convertedToLead: true, convertedLeadId: lead._id, convertedAt: record.convertedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── BATCH IMPORT ────────────────────────────────────────────────────────────

// POST /api/raw-data/batch-import
export const batchImport = async (req, res) => {
  try {
    const { records, duplicateStrategy = "skip", assignToCallerId } = req.body;
    const batchId = `batch_${Date.now()}`;

    let imported = 0, skipped = 0, failed = 0;
    const duplicates = [];
    const errors = [];

    for (const row of records) {
      try {
        const existing = await RawData.findOne({ phone: row.phone });

        if (existing) {
          duplicates.push({ phone: row.phone, name: row.name, existingId: existing._id });

          if (duplicateStrategy === "skip") { skipped++; continue; }
          if (duplicateStrategy === "merge") {
            existing.callAttemptCount += row.callAttemptCount || 0;
            if (row.remarks) existing.remarks = (existing.remarks || "") + " | " + row.remarks;
            await existing.save();
            imported++;
            continue;
          }
          // "keep" falls through to create
        }

        await RawData.create({
          ...row,
          batchId,
          status: "New",
          assignedCaller: assignToCallerId || null,
          createdBy: req.user._id,
        });
        imported++;
      } catch (e) {
        failed++;
        errors.push({ name: row.name, phone: row.phone, error: e.message });
      }
    }

    res.json({ batchId, summary: { totalRecords: records.length, imported, skipped, failed }, duplicates, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

// GET /api/raw-data/dashboard/summary
export const getDashboardSummary = async (req, res) => {
  try {
    const [total, converted, rejected] = await Promise.all([
      RawData.countDocuments(),
      RawData.countDocuments({ convertedToLead: true }),
      RawData.countDocuments({ status: "Rejected" }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calledToday = await RawData.countDocuments({ lastCallDate: { $gte: today } });
    const pending = await RawData.countDocuments({ status: { $in: ["New", "Pending Call"] } });
    const noResponse = await RawData.countDocuments({ status: "No Response" });

    res.json({ total, calledToday, pending, converted, rejected, noResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/raw-data/dashboard/source-analysis
export const getSourceAnalysis = async (req, res) => {
  try {
    const data = await RawData.aggregate([
      { $group: { _id: "$source", total: { $sum: 1 }, converted: { $sum: { $cond: ["$convertedToLead", 1, 0] } } } },
      { $project: { source: "$_id", total: 1, converted: 1, conversionRate: { $round: [{ $multiply: [{ $divide: ["$converted", "$total"] }, 100] }, 1] } } },
    ]);
    res.json({ sources: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/raw-data/dashboard/category-analysis
export const getCategoryAnalysis = async (req, res) => {
  try {
    const data = await RawData.aggregate([
      { $group: { _id: "$category", total: { $sum: 1 }, converted: { $sum: { $cond: ["$convertedToLead", 1, 0] } } } },
      { $project: { category: "$_id", total: 1, converted: 1, conversionRate: { $round: [{ $multiply: [{ $divide: ["$converted", "$total"] }, 100] }, 1] } } },
    ]);
    res.json({ categories: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
