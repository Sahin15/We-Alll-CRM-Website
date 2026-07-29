import SalaryComponent from "../models/salaryComponentModel.js";
import {
  assertComponentPayload,
  getDefaultSalaryComponents,
} from "../services/payroll/salaryComponentCatalog.js";

/**
 * List salary components (optional filters: type, isActive).
 */
export const listSalaryComponents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true" || req.query.isActive === true;
    }

    const components = await SalaryComponent.find(filter)
      .sort({ displayOrder: 1, code: 1 })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    return res.status(200).json({ success: true, data: components });
  } catch (error) {
    console.error("Error in listSalaryComponents:", error);
    return res.status(500).json({
      success: false,
      message: "Server error listing salary components",
    });
  }
};

/**
 * Get one component by id or code.
 */
export const getSalaryComponent = async (req, res) => {
  try {
    const { idOrCode } = req.params;
    const query = /^[a-fA-F0-9]{24}$/.test(idOrCode)
      ? { _id: idOrCode }
      : { code: String(idOrCode).toUpperCase() };

    const component = await SalaryComponent.findOne(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!component) {
      return res.status(404).json({
        success: false,
        message: "Salary component not found",
      });
    }

    return res.status(200).json({ success: true, data: component });
  } catch (error) {
    console.error("Error in getSalaryComponent:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching salary component",
    });
  }
};

/**
 * Create a salary component.
 */
export const createSalaryComponent = async (req, res) => {
  try {
    let payload;
    try {
      payload = assertComponentPayload(req.body);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    const existing = await SalaryComponent.findOne({ code: payload.code }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Component code ${payload.code} already exists`,
        data: existing,
      });
    }

    const component = await SalaryComponent.create({
      ...payload,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Salary component created",
      data: component,
    });
  } catch (error) {
    console.error("Error in createSalaryComponent:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Component code already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error creating salary component",
    });
  }
};

/**
 * Update a salary component (code cannot change).
 */
export const updateSalaryComponent = async (req, res) => {
  try {
    const component = await SalaryComponent.findById(req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        message: "Salary component not found",
      });
    }

    let payload;
    try {
      payload = assertComponentPayload(
        { ...req.body, code: component.code },
        { partial: true }
      );
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    // Code is immutable after create
    delete payload.code;

    Object.assign(component, payload);
    component.updatedBy = req.user._id;
    await component.save();

    return res.status(200).json({
      success: true,
      message: "Salary component updated",
      data: component,
    });
  } catch (error) {
    console.error("Error in updateSalaryComponent:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating salary component",
    });
  }
};

/**
 * Soft-deactivate a component (prefer over hard delete).
 */
export const deactivateSalaryComponent = async (req, res) => {
  try {
    const component = await SalaryComponent.findById(req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        message: "Salary component not found",
      });
    }

    component.isActive = false;
    component.updatedBy = req.user._id;
    await component.save();

    return res.status(200).json({
      success: true,
      message: "Salary component deactivated",
      data: component,
    });
  } catch (error) {
    console.error("Error in deactivateSalaryComponent:", error);
    return res.status(500).json({
      success: false,
      message: "Server error deactivating salary component",
    });
  }
};

/**
 * Seed V1-mapped default components. Skips codes that already exist.
 */
export const seedDefaultSalaryComponents = async (req, res) => {
  try {
    const defaults = getDefaultSalaryComponents();
    const results = { created: [], skipped: [] };

    for (const item of defaults) {
      const existing = await SalaryComponent.findOne({ code: item.code }).lean();
      if (existing) {
        results.skipped.push(item.code);
        continue;
      }
      await SalaryComponent.create({
        ...item,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });
      results.created.push(item.code);
    }

    return res.status(200).json({
      success: true,
      message: `Seeded ${results.created.length} components (${results.skipped.length} already existed)`,
      data: results,
    });
  } catch (error) {
    console.error("Error in seedDefaultSalaryComponents:", error);
    return res.status(500).json({
      success: false,
      message: "Server error seeding salary components",
    });
  }
};
