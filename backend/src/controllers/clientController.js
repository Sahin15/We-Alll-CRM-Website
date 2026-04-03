import Client from "../models/clientModel.js";
import Project from "../models/projectModel.js";
import WorkItem from "../models/workItemModel.js";
import Department from "../models/departmentModel.js";
import Bill from "../models/billModel.js";
import Payment from "../models/paymentModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import logger from '../utils/logger.js';
import { buildTextSearch } from '../utils/queryOptimizer.js';
import { securityService } from '../services/securityService.js';
import NotificationService from "../services/notificationService.js";

// Add new client
export const createClient = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      address,
      whatsappnumber,
      ownername,
      industry,
      website,
      targetAudience,
      audienceGender,
      previousChallenges,
      legalGuidelines,
      yearlyTurnover,
      expectations,
      serviceCompany,
    } = req.body;

    

    if (!req.user || !req.user.id) {
      
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!name || !email) {
      
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      
      return res.status(400).json({ message: "Client already exists" });
    }

    // Prepare client data, excluding empty enum fields
    const clientData = {
      name: securityService.sanitizeClientData(name),
      email: securityService.sanitizeClientData(email),
      phone,
      whatsappnumber,
      company: securityService.sanitizeClientData(company),
      ownername: securityService.sanitizeClientData(ownername),
      address: securityService.sanitizeClientData(address),
      industry: securityService.sanitizeClientData(industry),
      website: securityService.sanitizeClientData(website),
      targetAudience: securityService.sanitizeClientData(targetAudience),
      previousChallenges: securityService.sanitizeClientData(previousChallenges),
      legalGuidelines: securityService.sanitizeClientData(legalGuidelines),
      yearlyTurnover,
      expectations: securityService.sanitizeClientData(expectations),
    };

    // Add createdBy if user is authenticated
    if (req.user && req.user.id) {
      clientData.createdBy = req.user.id;
    }

    // Only add serviceCompany if it's not empty
    if (serviceCompany && serviceCompany.trim() !== '') {
      clientData.serviceCompany = serviceCompany;
    }

    // Only add audienceGender if it's not empty
    if (audienceGender && audienceGender.trim() !== '') {
      clientData.audienceGender = audienceGender;
    }

    const client = await Client.create(clientData);
    

    // Automatically create a project for the new client
    try {
      
      
      
      // Test if Project model is available
      if (!Project) {
        throw new Error('Project model is not available');
      }
      
      const projectData = {
        name: `${name} Project`,
        description: `Project for ${name}${company ? ` (${company})` : ''}`,
        client: client._id,
        status: 'Pending', // Use correct enum value
        priority: 'medium',
        startDate: new Date(),
        createdBy: req.user.id,
      };

      const project = await Project.create(projectData);
      
      
      
      

      // Send a clean response without circular references
      const responseData = {
        message: "Client and project created successfully",
        client: {
          _id: client._id,
          name: client.name,
          email: client.email,
          company: client.company
        },
        project: {
          _id: project._id,
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          client: project.client
        }
      };

      res.status(201).json(responseData);
      

      // Notify sales team about new client
      try {
        const creator = await User.findById(req.user.id).select('name');
        const creatorName = creator?.name || 'Team member';
        await NotificationService.sendToRole(
          'sales',
          '🤝 New Client Added',
          `${creatorName} added a new client: ${name}${company ? ` (${company})` : ''}`,
          {
            type: 'client_created',
            data: { clientId: client._id.toString(), clientName: name },
            actionUrl: `/clients/${client._id}`,
            senderId: req.user.id,
          }
        );
      } catch (notificationError) {
        
      }
    } catch (projectError) {
      
      
      
      
      
      
      
      // Client was created successfully, but project creation failed
      // Still return success for client creation
      res.status(201).json({
        message: "Client created successfully, but project creation failed",
        client,
        projectError: projectError.message,
      });
    }
  } catch (error) {
    
    
    
    
    
    
    logger.error("Error creating client:", error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      
      return res.status(400).json({ 
        message: "Validation error", 
        errors: validationErrors,
        details: error.message 
      });
    }
    
    // Handle duplicate key error (email already exists)
    if (error.code === 11000) {
      
      return res.status(400).json({ 
        message: "Client with this email already exists" 
      });
    }
    
    
    res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all clients (optimized but backward compatible)
export const getClients = async (req, res) => {
  try {
    const { search, status, industry } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      Object.assign(query, buildTextSearch(search, ['name', 'email', 'company', 'ownername']));
    }
    
    // Status filter
    if (status) query.status = status;
    
    // Industry filter
    if (industry) query.industry = industry;
    
    logger.info('getClients query:', query);
    
    // Optimized query WITHOUT pagination (backward compatible)
    const clients = await Client.find(query)
      .select('name email phone whatsappnumber company ownername address industry website targetAudience audienceGender previousChallenges legalGuidelines yearlyTurnover expectations serviceCompany status isVip vipLevel vipSince createdAt assignedDepartments')
      .populate('createdBy', 'name email')
      .populate('assignedDepartments', 'name')
      .sort({ isVip: -1, vipLevel: 1, createdAt: -1 }) // VIP clients first
      .lean();
    
    logger.success(`Found ${clients.length} clients`);
    
    // Return simple array (backward compatible)
    res.status(200).json(clients);
  } catch (error) {
    logger.error("Error fetching clients:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single client by ID
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("assignedDepartments", "name");
    
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Permission check
    const isAdminRole = ['admin', 'superadmin', 'hr', 'manager', 'hod'].includes(req.user.role);
    
    if (!isAdminRole) {
      // For employees, check if they're assigned to any project for this client
      const Project = (await import('../models/projectModel.js')).default;
      
      const assignedProject = await Project.findOne({
        client: req.params.id,
        $or: [
          { projectHead: req.user.id },
          { assignedUsers: req.user.id },
          { 'teamMembers.user': req.user.id }
        ]
      });

      

      if (!assignedProject) {
        
        return res.status(403).json({ 
          message: "Access denied. You must be assigned to a project for this client to view their details." 
        });
      }
      
      
    }

    res.status(200).json(client);
  } catch (error) {
    logger.error("Error fetching client:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get clients accessible to employee/HoD (based on department assignments)
export const getEmployeeClients = async (req, res) => {
  try {
    const { search, status, industry } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    logger.info(`🔍 Getting clients for user: ${userId} (${userRole})`);
    
    let clientIds = [];
    
    if (userRole === 'hod') {
      // HoD can see clients assigned to their department
      const user = await User.findById(userId).select('headOfDepartment isHeadOfDepartment');
      
      if (user.isHeadOfDepartment && user.headOfDepartment) {
        // Check if this is an administrative department
        const department = await Department.findById(user.headOfDepartment).select('type');
        
        if (department && department.type === 'administrative') {
          // Administrative department HoDs can see all clients
          logger.info(`📋 Administrative HoD - access to all clients`);
          const allClients = await Client.find().select('_id').lean();
          clientIds = allClients.map(client => client._id.toString());
        } else {
          // Operational department HoDs see only clients assigned to their department
          const departmentClients = await Client.find({
            assignedDepartments: user.headOfDepartment
          }).select('_id').lean();
          
          clientIds = departmentClients.map(client => client._id.toString());
          logger.info(`📋 Operational HoD department clients: [${clientIds.join(', ')}]`);
        }
      }
    } else if (userRole === 'employee') {
      // Check if employee is in an administrative department
      const user = await User.findById(userId).populate('department', 'type');
      
      if (user.department && user.department.type === 'administrative') {
        // Administrative department employees can see all clients
        logger.info(`📋 Administrative employee - access to all clients`);
        const allClients = await Client.find().select('_id').lean();
        clientIds = allClients.map(client => client._id.toString());
      } else {
        // Regular employees can see clients from projects they're assigned to
        const userProjects = await Project.find({
          $or: [
            { assignedUsers: userId },
            { projectHead: userId },
            { 'teamMembers.user': userId },
            { createdBy: userId }
          ]
        })
        .select('client')
        .populate('client', '_id')
        .lean();
        
        clientIds = [...new Set(
          userProjects
            .filter(project => project.client)
            .map(project => project.client._id.toString())
        )];
        
        logger.info(`📋 Employee project clients: [${clientIds.join(', ')}]`);
      }
    }
    
    if (clientIds.length === 0) {
      logger.info(`❌ No clients found for user: ${userId}`);
      return res.status(200).json([]);
    }
    
    // Build query for clients
    let query = { _id: { $in: clientIds } };
    
    // Apply additional filters
    if (search) {
      Object.assign(query, buildTextSearch(search, ['name', 'email', 'company', 'ownername']));
    }
    
    if (status) query.status = status;
    if (industry) query.industry = industry;
    
    logger.info('🔍 Final client query:', query);
    
    // Get filtered clients with department information
    const clients = await Client.find(query)
      .select('name email phone whatsappnumber company ownername address industry website targetAudience audienceGender previousChallenges legalGuidelines yearlyTurnover expectations serviceCompany status isVip vipLevel vipSince createdAt assignedDepartments')
      .populate('createdBy', 'name email')
      .populate('assignedDepartments', 'name')
      .sort({ isVip: -1, vipLevel: 1, createdAt: -1 })
      .lean();
    
    logger.success(`✅ Found ${clients.length} accessible clients for user: ${userId}`);
    clients.forEach(client => {
      logger.info(`  - Client: "${client.name}" (Departments: ${client.assignedDepartments?.map(d => d.name).join(', ') || 'None'})`);
    });
    
    res.status(200).json(clients);
  } catch (error) {
    logger.error("❌ Error fetching employee clients:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update client
export const updateClient = async (req, res) => {
  try {
    // Sanitize string fields
    const sanitizedData = { ...req.body };
    
    // Apply light sanitization to string fields
    const stringFields = ['name', 'email', 'company', 'ownername', 'address', 'industry', 'website', 'targetAudience', 'previousChallenges', 'legalGuidelines', 'expectations'];
    stringFields.forEach(field => {
      if (sanitizedData[field]) {
        sanitizedData[field] = securityService.sanitizeClientData(sanitizedData[field]);
      }
    });
    
    // Convert phone numbers to Number type if provided
    if (sanitizedData.phone) {
      sanitizedData.phone = Number(sanitizedData.phone);
    }
    if (sanitizedData.whatsappnumber) {
      sanitizedData.whatsappnumber = Number(sanitizedData.whatsappnumber);
    }
    if (sanitizedData.yearlyTurnover) {
      sanitizedData.yearlyTurnover = Number(sanitizedData.yearlyTurnover);
    }

    // Get the current client to check if status is changing to "Lost"
    const currentClient = await Client.findById(req.params.id);
    if (!currentClient) return res.status(404).json({ message: "Client not found" });

    const isStatusChangingToLost = sanitizedData.status === "Lost" && currentClient.status !== "Lost";

    const client = await Client.findByIdAndUpdate(req.params.id, sanitizedData, {
      new: true,
    });
    if (!client) return res.status(404).json({ message: "Client not found" });

    // Notify admins/managers when client status changes
    if (sanitizedData.status && sanitizedData.status !== currentClient.status) {
      try {
        const updater = await User.findById(req.user.id).select('name');
        const updaterName = updater?.name || 'Team member';
        const notifyRoles = ['admin', 'superadmin', 'manager'];
        const managers = await User.find({ role: { $in: notifyRoles } }).select('_id');
        for (const manager of managers) {
          await NotificationService.sendToUser(
            manager._id,
            '🔄 Client Status Changed',
            `${client.name} status changed from "${currentClient.status}" to "${sanitizedData.status}" by ${updaterName}`,
            {
              type: 'client_status_changed',
              data: {
                clientId: client._id.toString(),
                clientName: client.name,
                oldStatus: currentClient.status,
                newStatus: sanitizedData.status,
              },
              actionUrl: `/clients/${client._id}`,
              senderId: req.user.id,
            }
          );
        }
      } catch (notificationError) {
        
      }
    }

    // If status changed to "Lost", put all projects and work items on hold
    if (isStatusChangingToLost) {
      try {
        // Update all projects for this client to "On Hold"
        await Project.updateMany(
          { client: client._id },
          { status: 'On Hold' }
        );

        // Get all projects for this client to update their work items
        const projects = await Project.find({ client: client._id });
        const projectIds = projects.map(p => p._id);

        // Update all work items for these projects to "On Hold"
        await WorkItem.updateMany(
          { project: { $in: projectIds } },
          { status: 'On Hold' }
        );

        logger.info(`Client ${client._id} status changed to Lost. Updated ${projects.length} projects and their work items to On Hold.`);
      } catch (error) {
        logger.error('Error updating projects and work items when client status changed to Lost:', error);
        // Don't fail the client update if this fails, just log it
      }
    }

    res.status(200).json({ message: "Client updated", client });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete client
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.status(200).json({ message: "Client deleted" });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Client Overview (aggregated data for client portal)
export const getClientOverview = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // If the requester is a client, enforce access to their own client record only
    if (user.role === "client") {
      const clientByEmail = await Client.findOne({ email: user.email }).select(
        "_id name email"
      );
      if (!clientByEmail || clientByEmail._id.toString() !== id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const clientId = id;

    // Projects and assigned team members
    const projects = await Project.find({ client: clientId })
      .select(
        "name status progress priority startDate endDate assignedUsers milestones tasks deliverables services"
      )
      .populate("assignedUsers", "name email role");

    const memberMap = new Map();
    projects.forEach((p) => {
      (p.assignedUsers || []).forEach((u) => {
        memberMap.set(u._id.toString(), u);
      });
    });
    const teamMembers = Array.from(memberMap.values());

    // Bills and payments
    const bills = await Bill.find({ client: clientId })
      .select(
        "billNumber totalAmount paidAmount balanceAmount status dueDate issueDate"
      )
      .sort({ issueDate: -1 });
    const payments = await Payment.find({ client: clientId })
      .select(
        "amount paidAmount balanceAmount status paymentDate paymentMethod bill"
      )
      .sort({ paymentDate: -1 });

    // Billing summary
    const totalBilled = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalDue = bills.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);
    const prepaidBalance = payments
      .filter((p) => !p.bill && p.status === "paid")
      .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

    // Bill categories
    const today = new Date();
    const isUpcoming = (due) =>
      due && due > today && (due - today) / (1000 * 60 * 60 * 24) <= 7;
    const isDue = (b) =>
      ["sent", "partial", "draft"].includes(b.status) &&
      b.balanceAmount > 0 &&
      b.dueDate &&
      b.dueDate >= today;

    const paidBills = bills.filter((b) => b.status === "paid");
    const overdueBills = bills.filter((b) => b.status === "overdue");
    const upcomingBills = bills.filter(
      (b) =>
        ["sent", "partial", "draft"].includes(b.status) && isUpcoming(b.dueDate)
    );
    const dueBills = bills.filter(isDue);

    // Notifications (recent for the requester)
    const notifications = await Notification.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(10);
    const unreadCount = await Notification.countDocuments({
      user: user.id,
      isRead: false,
    });

    return res.status(200).json({
      projects,
      teamMembers,
      billingSummary: { totalBilled, totalPaid, totalDue, prepaidBalance },
      bills: {
        paid: paidBills,
        due: dueBills,
        overdue: overdueBills,
        upcoming: upcomingBills,
      },
      payments,
      notifications: { unreadCount, items: notifications },
    });
  } catch (error) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Client Onboarding - Initiate onboarding
export const initiateOnboarding = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planType,
      planStartDate,
      planEndDate,
      billingCycle,
      monthlyBudget,
      servicesSubscribed,
      paymentTerms,
      accountManager,
    } = req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.onboardingStatus = "in_progress";
    client.onboardingDate = new Date();
    if (planType) client.planType = planType;
    if (planStartDate) client.planStartDate = new Date(planStartDate);
    if (planEndDate) client.planEndDate = new Date(planEndDate);
    if (billingCycle) client.billingCycle = billingCycle;
    if (typeof monthlyBudget === "number") client.monthlyBudget = monthlyBudget;
    if (Array.isArray(servicesSubscribed))
      client.servicesSubscribed = servicesSubscribed;
    if (paymentTerms) client.paymentTerms = paymentTerms;
    if (accountManager) client.accountManager = accountManager;

    await client.save();

    return res.status(200).json({ message: "Onboarding initiated", client });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update onboarding status
export const updateOnboardingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { onboardingStatus } = req.body;

    if (
      !onboardingStatus ||
      !["pending", "in_progress", "completed"].includes(onboardingStatus)
    ) {
      return res.status(400).json({ message: "Invalid onboarding status" });
    }

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.onboardingStatus = onboardingStatus;
    await client.save();

    return res
      .status(200)
      .json({ message: "Onboarding status updated", client });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Complete onboarding
export const completeOnboarding = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.onboardingStatus = "completed";
    client.status = "active";
    await client.save();

    // Create notification for client user
    const clientUser = await User.findOne({
      email: client.email,
      role: "client",
    });
    if (clientUser) {
      await Notification.create({
        user: clientUser._id,
        type: "onboarding_completed",
        title: "Welcome! Onboarding Complete",
        message: `Your onboarding is complete. Your ${client.planType} plan is now active.`,
        link: `/clients/${client._id}`,
        metadata: { clientId: client._id, planType: client.planType },
        priority: "medium",
      });
    }

    return res.status(200).json({ message: "Onboarding completed", client });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Get onboarding details
export const getOnboardingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Enforce client access
    if (req.user.role === "client") {
      const clientByEmail = await Client.findOne({
        email: req.user.email,
      }).select("_id");
      if (!clientByEmail || clientByEmail._id.toString() !== id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const client = await Client.findById(id)
      .populate("accountManager", "name email")
      .select(
        "onboardingStatus onboardingDate planType planStartDate planEndDate billingCycle monthlyBudget servicesSubscribed paymentTerms accountManager status"
      );

    if (!client) return res.status(404).json({ message: "Client not found" });

    return res.status(200).json(client);
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Assign account manager
export const assignAccountManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountManager } = req.body;

    if (!accountManager) {
      return res.status(400).json({ message: "accountManager is required" });
    }

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.accountManager = accountManager;
    await client.save();

    return res
      .status(200)
      .json({ message: "Account manager assigned", client });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Update client plan
export const updateClientPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planType,
      planStartDate,
      planEndDate,
      billingCycle,
      monthlyBudget,
      servicesSubscribed,
    } = req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (planType) client.planType = planType;
    if (planStartDate) client.planStartDate = new Date(planStartDate);
    if (planEndDate) client.planEndDate = new Date(planEndDate);
    if (billingCycle) client.billingCycle = billingCycle;
    if (typeof monthlyBudget === "number") client.monthlyBudget = monthlyBudget;
    if (Array.isArray(servicesSubscribed))
      client.servicesSubscribed = servicesSubscribed;

    await client.save();

    return res.status(200).json({ message: "Client plan updated", client });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Renew client plan
export const renewClientPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { planEndDate } = req.body;

    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (planEndDate) {
      client.planEndDate = new Date(planEndDate);
      client.status = "active";
      await client.save();
    }

    return res.status(200).json({ message: "Plan renewed", client });
  } catch (error) {
    
    return res.status(500).json({ message: "Server error" });
  }
};

// Assign departments to client (HR/Manager only)
export const assignDepartmentsToClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentIds } = req.body;

    // Only HR, Manager, Admin, SuperAdmin can assign departments
    if (!['hr', 'manager', 'admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. HR/Manager privileges required to assign departments.' 
      });
    }

    if (!departmentIds || !Array.isArray(departmentIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Department IDs array is required' 
      });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: "Client not found" 
      });
    }

    // Update client with assigned departments
    client.assignedDepartments = departmentIds;
    client.departmentAssignedBy = req.user.id;
    client.departmentAssignedAt = new Date();

    await client.save();

    // Populate departments for response
    await client.populate('assignedDepartments', 'name');

    logger.info(`Departments assigned to client: ${client.name} - Departments: ${client.assignedDepartments.map(d => d.name).join(', ')}`);

    res.status(200).json({
      success: true,
      message: 'Departments assigned successfully',
      client: {
        _id: client._id,
        name: client.name,
        email: client.email,
        assignedDepartments: client.assignedDepartments,
        departmentAssignedBy: client.departmentAssignedBy,
        departmentAssignedAt: client.departmentAssignedAt
      }
    });
  } catch (error) {
    logger.error("Error assigning departments to client:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get clients by department (for HoDs)
export const getClientsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { search, status, industry } = req.query;

    // Build query
    let query = { assignedDepartments: departmentId };
    
    // Apply filters
    if (search) {
      Object.assign(query, buildTextSearch(search, ['name', 'email', 'company', 'ownername']));
    }
    
    if (status) query.status = status;
    if (industry) query.industry = industry;

    const clients = await Client.find(query)
      .select('name email phone company serviceCompany status industry isVip vipLevel vipSince createdAt assignedDepartments')
      .populate('createdBy', 'name email')
      .populate('assignedDepartments', 'name')
      .sort({ isVip: -1, vipLevel: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (error) {
    logger.error("Error getting clients by department:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};
export const toggleClientVip = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVip, vipLevel, vipNotes } = req.body;

    // Only admin, superadmin, hr, manager can toggle VIP status
    if (!['admin', 'superadmin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required to manage VIP status.' 
      });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: "Client not found" 
      });
    }

    // Update VIP status
    client.isVip = isVip;
    if (isVip) {
      client.vipLevel = vipLevel || 'gold';
      client.vipSince = client.vipSince || new Date();
      if (vipNotes) client.vipNotes = vipNotes;
    } else {
      // Reset VIP fields when removing VIP status
      client.vipLevel = 'standard';
      client.vipSince = null;
      client.vipNotes = null;
    }

    await client.save();

    logger.info(`Client VIP status updated: ${client.name} - VIP: ${isVip} (Level: ${client.vipLevel})`);

    res.status(200).json({
      success: true,
      message: `Client ${isVip ? 'marked as VIP' : 'VIP status removed'}`,
      client: {
        _id: client._id,
        name: client.name,
        email: client.email,
        isVip: client.isVip,
        vipLevel: client.vipLevel,
        vipSince: client.vipSince,
        vipNotes: client.vipNotes
      }
    });
  } catch (error) {
    logger.error("Error toggling client VIP status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get VIP clients only
export const getVipClients = async (req, res) => {
  try {
    const { vipLevel } = req.query;
    
    let query = { isVip: true };
    if (vipLevel && vipLevel !== 'all') {
      query.vipLevel = vipLevel;
    }

    const vipClients = await Client.find(query)
      .select('name email phone company isVip vipLevel vipSince vipNotes status industry createdAt')
      .populate('createdBy', 'name email')
      .sort({ vipSince: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: vipClients,
      count: vipClients.length
    });
  } catch (error) {
    logger.error("Error getting VIP clients:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};