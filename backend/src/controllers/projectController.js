import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import Client from "../models/clientModel.js";

// Create new project
export const createProject = async (req, res) => {
  try {
    const { name, client, description, endDate, assignedUsers } = req.body;

    if (!name || !client) {
      return res
        .status(400)
        .json({ message: "Project name and client are required" });
    }

    const project = await Project.create({
      name,
      client,
      description,
      endDate,
      assignedUsers,
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Error in createProject:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    let query = {};
    
    // Employees can only see projects they are assigned to
    if (req.user.role === "employee") {
      query = { assignedUsers: req.user.id };
    }
    
    // Clients can only see their own projects
    if (req.user.role === "client") {
      const clientByEmail = await Client.findOne({
        email: req.user.email,
      }).select("_id");
      
      if (clientByEmail) {
        query = { client: clientByEmail._id };
      } else {
        // Client not found, return empty array
        return res.status(200).json([]);
      }
    }
    
    // Admin, superadmin, hr, hod, manager can see all projects
    const projects = await Project.find(query)
      .populate("client", "name email")
      .populate("assignedUsers", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error in getProjects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update project status
export const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.status = status;
    await project.save();

    res.status(200).json({ message: "Project status updated", project });
  } catch (error) {
    console.error("Error in updateProjectStatus:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Assign user to a project
export const assignUserToProject = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    const user = await User.findById(userId);

    if (!project || !user) {
      return res.status(404).json({ message: "Project or User not found" });
    }

    if (!project.assignedUsers.includes(userId)) {
      project.assignedUsers.push(userId);
      await project.save();
    }

    res.status(200).json({ message: "User assigned to project", project });
  } catch (error) {
    console.error("Error in assignUserToProject:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove user from a project
export const removeUserFromProject = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.assignedUsers = project.assignedUsers.filter(
      (id) => id.toString() !== userId
    );

    await project.save();

    res.status(200).json({ message: "User removed from project", project });
  } catch (error) {
    console.error("Error in removeUserFromProject:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all projects assigned to the logged-in user
export const getProjectsForUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({ assignedUsers: userId })
      .populate("client", "name email")
      .populate("assignedUsers", "name email");

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error in getProjectsForUser:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single project by ID (clients can only see their own)
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📋 Fetching project ${id} for user ${req.user.email} (${req.user.role})`);

    const project = await Project.findById(id)
      .populate("client", "name email")
      .populate("assignedUsers", "name email role")
      .populate("tasks.assignedTo", "name email");

    if (!project) {
      console.log(`❌ Project ${id} not found`);
      return res.status(404).json({ message: "Project not found" });
    }

    if (req.user.role === "client") {
      const clientByEmail = await Client.findOne({
        email: req.user.email,
      }).select("_id");
      if (
        !clientByEmail ||
        project.client._id.toString() !== clientByEmail._id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Employees can only see projects they are assigned to
    if (req.user.role === "employee") {
      const assignedUserIds = project.assignedUsers.map(user => {
        const userId = user._id || user;
        return userId.toString();
      });
      
      console.log(`👥 Project assigned users:`, assignedUserIds);
      console.log(`👤 Current user ID:`, req.user.id);
      
      const isAssigned = assignedUserIds.includes(req.user.id);
      
      if (!isAssigned) {
        console.log(`❌ Access denied - user not assigned to project`);
        return res.status(403).json({
          message: "Access denied. You can only view projects you are assigned to.",
        });
      }
      
      console.log(`✅ Access granted - user is assigned to project`);
    }

    return res.status(200).json(project);
  } catch (error) {
    console.error("Error in getProjectById:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update project (full update)
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    Object.keys(req.body || {}).forEach((k) => {
      project[k] = req.body[k];
    });

    await project.save();

    return res.status(200).json({ message: "Project updated", project });
  } catch (error) {
    console.error("Error in updateProject:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update project progress
export const updateProjectProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;

    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return res
        .status(400)
        .json({ message: "Progress must be a number between 0 and 100" });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.progress = progress;

    if (progress === 0) project.status = "Pending";
    else if (progress > 0 && progress < 100) project.status = "In Progress";
    else if (progress === 100) project.status = "Completed";

    await project.save();

    return res
      .status(200)
      .json({ message: "Project progress updated", project });
  } catch (error) {
    console.error("Error in updateProjectProgress:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add milestone
export const addMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;

    if (!title)
      return res.status(400).json({ message: "Milestone title is required" });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.milestones.push({ title, description, dueDate, status });
    await project.save();

    return res.status(201).json({ message: "Milestone added", project });
  } catch (error) {
    console.error("Error in addMilestone:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update milestone
export const updateMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const milestone = project.milestones.id(milestoneId);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });

    Object.keys(req.body || {}).forEach((k) => {
      milestone[k] = req.body[k];
    });

    if (milestone.status === "completed" && !milestone.completedAt) {
      milestone.completedAt = new Date();
    }

    await project.save();

    return res.status(200).json({ message: "Milestone updated", project });
  } catch (error) {
    console.error("Error in updateMilestone:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add task
export const addTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, status, priority, dueDate } =
      req.body;

    if (!title)
      return res.status(400).json({ message: "Task title is required" });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.tasks.push({
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
    });
    await project.save();

    return res.status(201).json({ message: "Task added", project });
  } catch (error) {
    console.error("Error in addTask:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const { id, taskId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const task = project.tasks.id(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    Object.keys(req.body || {}).forEach((k) => {
      task[k] = req.body[k];
    });

    if (task.status === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    }

    await project.save();

    return res.status(200).json({ message: "Task updated", project });
  } catch (error) {
    console.error("Error in updateTask:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Add deliverable
export const addDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, fileUrl, status } = req.body;

    if (!title)
      return res.status(400).json({ message: "Deliverable title is required" });

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.deliverables.push({ title, description, fileUrl, status });
    await project.save();

    return res.status(201).json({ message: "Deliverable added", project });
  } catch (error) {
    console.error("Error in addDeliverable:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update deliverable
export const updateDeliverable = async (req, res) => {
  try {
    const { id, deliverableId } = req.params;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const deliverable = project.deliverables.id(deliverableId);
    if (!deliverable)
      return res.status(404).json({ message: "Deliverable not found" });

    Object.keys(req.body || {}).forEach((k) => {
      deliverable[k] = req.body[k];
    });

    if (deliverable.status === "delivered" && !deliverable.deliveredAt) {
      deliverable.deliveredAt = new Date();
    }

    await project.save();

    return res.status(200).json({ message: "Deliverable updated", project });
  } catch (error) {
    console.error("Error in updateDeliverable:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    return res.status(200).json({ message: "Project deleted" });
  } catch (error) {
    console.error("Error in deleteProject:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
