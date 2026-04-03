import SalaryStructureTemplate from "../models/salaryStructureTemplateModel.js";
import SalaryStructure from "../models/salaryStructureModel.js";
import User from "../models/userModel.js";
import Department from "../models/departmentModel.js";

class TemplateManagementService {
  /**
   * Create a new salary structure template
   * @param {Object} templateData - Template data
   * @param {string} createdBy - User ID who created the template
   * @returns {Object} Created template
   */
  async createTemplate(templateData, createdBy) {
    try {
      // Validate required fields
      const { name, department, designation, basicSalary, effectiveFrom } = templateData;
      
      if (!name || !department || !designation || !basicSalary || !effectiveFrom) {
        throw new Error("Name, department, designation, basic salary, and effective date are required");
      }

      // Check if template with same name already exists
      const existingTemplate = await SalaryStructureTemplate.findOne({ name });
      if (existingTemplate) {
        throw new Error("Template with this name already exists");
      }

      // Create template
      const template = new SalaryStructureTemplate({
        ...templateData,
        createdBy,
        version: 1,
        isActive: true
      });

      await template.save();
      
      // Populate references
      await template.populate("department", "name");
      await template.populate("createdBy", "name email");

      return template;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Object} Template
   */
  async getTemplate(templateId) {
    try {
      const template = await SalaryStructureTemplate.findById(templateId)
        .populate("department", "name")
        .populate("createdBy", "name email")
        .populate("approvedBy", "name email");

      if (!template) {
        throw new Error("Template not found");
      }

      return template;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get all templates with optional filters
   * @param {Object} filters - Filter criteria
   * @returns {Array} Array of templates
   */
  async getTemplates(filters = {}) {
    try {
      const query = {};
      
      if (filters.department) {
        query.department = filters.department;
      }
      
      if (filters.designation) {
        query.designation = new RegExp(filters.designation, 'i');
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const templates = await SalaryStructureTemplate.find(query)
        .populate("department", "name")
        .populate("createdBy", "name email")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 });

      return templates;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get templates by department
   * @param {string} departmentId - Department ID
   * @returns {Array} Array of templates
   */
  async getTemplatesByDepartment(departmentId) {
    try {
      const templates = await SalaryStructureTemplate.find({
        department: departmentId,
        isActive: true
      })
      .populate("department", "name")
      .populate("createdBy", "name email")
      .sort({ designation: 1, version: -1 });

      return templates;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get active template for department and designation
   * @param {string} departmentId - Department ID
   * @param {string} designation - Designation
   * @returns {Object} Active template
   */
  async getActiveTemplate(departmentId, designation) {
    try {
      const template = await SalaryStructureTemplate.getActiveTemplate(departmentId, designation);
      return template;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Update template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Update data
   * @param {string} updatedBy - User ID who updated
   * @returns {Object} Updated template
   */
  async updateTemplate(templateId, updates, updatedBy) {
    try {
      const template = await SalaryStructureTemplate.findById(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      // Create new version if template is already approved and in use
      if (template.approvedBy && template.isActive) {
        return await this.createNewVersion(templateId, updates, updatedBy);
      }

      // Update current template if not yet approved
      Object.assign(template, updates);
      await template.save();

      // Populate references
      await template.populate("department", "name");
      await template.populate("createdBy", "name email");

      return template;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Create new version of template
   * @param {string} templateId - Original template ID
   * @param {Object} updates - Update data
   * @param {string} createdBy - User ID who created new version
   * @returns {Object} New template version
   */
  async createNewVersion(templateId, updates, createdBy) {
    try {
      const newTemplate = await SalaryStructureTemplate.createNewVersion(
        templateId,
        updates,
        createdBy
      );

      // Populate references
      await newTemplate.populate("department", "name");
      await newTemplate.populate("createdBy", "name email");

      return newTemplate;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Approve template
   * @param {string} templateId - Template ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Object} Approved template
   */
  async approveTemplate(templateId, approvedBy) {
    try {
      const template = await SalaryStructureTemplate.findById(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      template.approvedBy = approvedBy;
      await template.save();

      // Populate references
      await template.populate("department", "name");
      await template.populate("createdBy", "name email");
      await template.populate("approvedBy", "name email");

      return template;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Apply template to employees
   * @param {string} templateId - Template ID
   * @param {Array} employeeIds - Array of employee IDs
   * @param {Date} effectiveDate - Effective date for new structures
   * @param {string} appliedBy - User ID who applied template
   * @returns {Object} Application results
   */
  async applyTemplate(templateId, employeeIds, effectiveDate, appliedBy) {
    try {
      const results = await SalaryStructureTemplate.applyToEmployees(
        templateId,
        employeeIds,
        effectiveDate,
        appliedBy
      );

      return results;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Bulk apply template to all employees in department with specific designation
   * @param {string} templateId - Template ID
   * @param {string} departmentId - Department ID
   * @param {string} designation - Designation
   * @param {Date} effectiveDate - Effective date
   * @param {string} appliedBy - User ID who applied
   * @returns {Object} Application results
   */
  async bulkApplyTemplate(templateId, departmentId, designation, effectiveDate, appliedBy) {
    try {
      // Get employees matching criteria
      const employees = await User.find({
        department: departmentId,
        designation: designation,
        status: "active",
        role: { $in: ["employee", "hod"] }
      });

      if (employees.length === 0) {
        return {
          success: [],
          failed: [],
          message: "No employees found matching the criteria"
        };
      }

      const employeeIds = employees.map(emp => emp._id);
      
      const results = await this.applyTemplate(
        templateId,
        employeeIds,
        effectiveDate,
        appliedBy
      );

      return {
        ...results,
        targetEmployees: employees.length,
        criteria: { departmentId, designation }
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Auto-generate salary structure for new employee
   * @param {string} employeeId - Employee ID
   * @param {string} appliedBy - User ID who triggered auto-generation
   * @returns {Object} Generated salary structure or null if no template found
   */
  async autoGenerateForNewEmployee(employeeId, appliedBy) {
    try {
      // Get employee details
      const employee = await User.findById(employeeId).populate("department");
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Find active template for employee's department and designation
      const template = await this.getActiveTemplate(
        employee.department._id,
        employee.designation
      );

      if (!template) {
        
        return null;
      }

      // Apply template to employee
      const results = await this.applyTemplate(
        template._id,
        [employeeId],
        new Date(),
        appliedBy
      );

      return {
        template,
        results,
        employee: {
          id: employee._id,
          name: employee.name,
          designation: employee.designation,
          department: employee.department.name
        }
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Deactivate template
   * @param {string} templateId - Template ID
   * @param {string} deactivatedBy - User ID who deactivated
   * @returns {Object} Deactivated template
   */
  async deactivateTemplate(templateId, deactivatedBy) {
    try {
      const template = await SalaryStructureTemplate.findById(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      template.isActive = false;
      await template.save();

      return template;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Delete template (only if not used)
   * @param {string} templateId - Template ID
   * @param {string} deletedBy - User ID who deleted
   * @returns {boolean} Success status
   */
  async deleteTemplate(templateId, deletedBy) {
    try {
      const template = await SalaryStructureTemplate.findById(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      // Check if template has been used
      const usageCount = await SalaryStructure.countDocuments({
        generatedFromTemplate: templateId
      });

      if (usageCount > 0) {
        throw new Error("Cannot delete template that has been used to generate salary structures");
      }

      await SalaryStructureTemplate.findByIdAndDelete(templateId);
      return true;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get template usage statistics
   * @param {string} templateId - Template ID
   * @returns {Object} Usage statistics
   */
  async getTemplateUsageStats(templateId) {
    try {
      const template = await SalaryStructureTemplate.findById(templateId)
        .populate("department", "name");

      if (!template) {
        throw new Error("Template not found");
      }

      // Count salary structures generated from this template
      const usageCount = await SalaryStructure.countDocuments({
        generatedFromTemplate: templateId
      });

      // Get employees using this template
      const employeesUsingTemplate = await SalaryStructure.find({
        generatedFromTemplate: templateId,
        isActive: true
      })
      .populate("employee", "name employeeId designation")
      .select("employee templateVersion createdAt");

      return {
        template: {
          id: template._id,
          name: template.name,
          department: template.department.name,
          designation: template.designation,
          version: template.version
        },
        usage: {
          totalUsage: usageCount,
          activeUsage: employeesUsingTemplate.length,
          employees: employeesUsingTemplate
        },
        generatedAt: new Date()
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get all template versions for a template name
   * @param {string} templateName - Template name
   * @returns {Array} Array of template versions
   */
  async getTemplateVersions(templateName) {
    try {
      const versions = await SalaryStructureTemplate.find({ name: templateName })
        .populate("department", "name")
        .populate("createdBy", "name email")
        .populate("approvedBy", "name email")
        .sort({ version: -1 });

      return versions;
    } catch (error) {
      
      throw error;
    }
  }
}

export default TemplateManagementService;