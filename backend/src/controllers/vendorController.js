import Vendor from '../models/vendorModel.js';

// POST /vendors — create vendor
export const createVendor = async (req, res) => {
  try {
    const { name, primaryContact, categories, address, gstNumber, panNumber, rating, bankDetails, notes } = req.body;

    // Validate required fields
    const errors = [];
    if (!name || !name.trim()) errors.push('name: required');
    if (!primaryContact) {
      errors.push('primaryContact: required');
    } else {
      if (!primaryContact.name || !primaryContact.name.trim()) errors.push('primaryContact.name: required');
      if (!primaryContact.email || !primaryContact.email.trim()) errors.push('primaryContact.email: required');
      if (!primaryContact.phone || !primaryContact.phone.trim()) errors.push('primaryContact.phone: required');
    }
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      errors.push('categories: at least one category is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Check duplicate name
    const existing = await Vendor.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: `Vendor with name "${name.trim()}" already exists` });
    }

    const vendor = await Vendor.create({
      name: name.trim(),
      primaryContact,
      categories,
      address,
      gstNumber,
      panNumber,
      rating: rating || null,
      bankDetails,
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Vendor created', vendor });
  } catch (error) {
    console.error('createVendor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /vendors — list vendors
export const listVendors = async (req, res) => {
  try {
    const { search, category, rating, includeInactive } = req.query;
    const query = {};

    // By default only return active vendors
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    if (category) {
      query.categories = category;
    }

    if (rating) {
      query.rating = Number(rating);
    }

    let vendors;
    if (search && search.trim()) {
      // Use text search on name
      vendors = await Vendor.find(
        { ...query, $text: { $search: search.trim() } },
        { score: { $meta: 'textScore' } }
      )
        .populate('createdBy', 'name email')
        .sort({ score: { $meta: 'textScore' } });
    } else {
      vendors = await Vendor.find(query)
        .populate('createdBy', 'name email')
        .sort({ name: 1 });
    }

    res.json(vendors);
  } catch (error) {
    console.error('listVendors error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /vendors/:id — get vendor with bank details
export const getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .select('+bankDetails.accountNumber')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('getVendor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /vendors/:id — update vendor
export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const allowedFields = [
      'name', 'primaryContact', 'additionalContacts', 'categories',
      'address', 'gstNumber', 'panNumber', 'rating', 'bankDetails', 'notes', 'documents',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    vendor.updatedBy = req.user._id;
    await vendor.save();

    res.json({ message: 'Vendor updated', vendor });
  } catch (error) {
    console.error('updateVendor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /vendors/:id/deactivate — deactivate vendor
export const deactivateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    vendor.isActive = false;
    vendor.updatedBy = req.user._id;
    await vendor.save();

    res.json({ message: 'Vendor deactivated', vendor });
  } catch (error) {
    console.error('deactivateVendor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
