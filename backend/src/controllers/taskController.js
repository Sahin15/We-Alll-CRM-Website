import Task from "../models/taskModel.js";
import mongoose from "mongoose";

// Get all tasks (Admin/HR/Manager only)
export const getAllTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo, project } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (project) filter.project = project;

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("assignedTo", "name email department")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error in getAllTasks:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get my tasks
export const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, project } = req.query;

    let filter = { assignedTo: userId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (project) filter.project = project;

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("assignedBy", "name email")
      .sort({ dueDate: 1, priority: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error in getMyTasks:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get task by ID
export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findById(id)
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("comments.user", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has access to this task
    if (task.assignedTo._id.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view this task" });
    }

    res.status(200).json(task);
  } catch (error) {
    console.error("Error in getTaskById:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create task (Admin/Manager only)
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      priority,
      dueDate,
      estimatedHours,
      tags,
    } = req.body;

    // If assignedTo is 'self' or not provided, assign to current user
    let taskAssignedTo = assignedTo === 'self' || !assignedTo ? req.user._id : assignedTo;

    // For employees, they can only create tasks for themselves
    // Managers/admins can assign to anyone
    const isManagerOrAdmin = ['admin', 'superadmin', 'manager', 'hod'].includes(req.user.role);
    
    if (!isManagerOrAdmin && assignedTo && assignedTo !== 'self') {
      // Employee trying to assign to someone else
      return res.status(403).json({ 
        message: "You can only create tasks for yourself. Managers can assign tasks to others." 
      });
    }

    const task = await Task.create({
      title,
      description,
      project,
      assignedTo: taskAssignedTo,
      assignedBy: req.user._id,
      priority: priority || "medium",
      dueDate,
      estimatedHours,
      tags,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Error in createTask:", error.message);
    console.error("Error details:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : null
    });
  }
};

// Update task status
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user is assigned to this task
    if (task.assignedTo.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    // Track status change in history
    if (task.status !== status) {
      task.statusHistory.push({
        status: status,
        changedBy: userId,
        changedAt: new Date(),
        note: note || `Status changed from ${task.status} to ${status}`,
      });
    }

    task.status = status;

    // Set completedAt when task is marked as done
    if (status === "done" && !task.completedAt) {
      task.completedAt = new Date();
    }

    // Clear completedAt if task is moved back from done
    if (status !== "done" && task.completedAt) {
      task.completedAt = null;
    }

    await task.save();

    res.status(200).json({
      message: "Task status updated successfully",
      task,
    });
  } catch (error) {
    console.error("Error in updateTaskStatus:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user is assigned to this task
    if (task.assignedTo.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    // Update allowed fields
    const allowedUpdates = ["description", "status", "actualHours", "tags"];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    await task.save();

    res.status(200).json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Error in updateTask:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add comment to task
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.comments.push({
      user: userId,
      text,
      createdAt: new Date(),
    });

    await task.save();

    const updatedTask = await Task.findById(id).populate("comments.user", "name email");

    res.status(200).json({
      message: "Comment added successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error in addComment:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add time entry
export const addTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, description } = req.body;
    const userId = req.user.id;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user is assigned to this task
    if (task.assignedTo.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to log time for this task" });
    }

    // Calculate duration in minutes
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end - start) / (1000 * 60));

    task.timeEntries.push({
      startTime: start,
      endTime: end,
      duration,
      description,
      date: new Date(),
    });

    // Update actual hours
    task.actualHours = task.getTotalTimeSpent() / 60;

    await task.save();

    res.status(200).json({
      message: "Time entry added successfully",
      task,
    });
  } catch (error) {
    console.error("Error in addTimeEntry:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete task (Admin only)
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTask:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get task statistics
export const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Task.aggregate([
      { $match: { assignedTo: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      dueDate: { $lt: new Date() },
      status: { $ne: "done" },
    });

    res.status(200).json({
      stats,
      totalTasks,
      overdueTasks,
    });
  } catch (error) {
    console.error("Error in getTaskStats:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get tasks by date range
export const getTasksByDateRange = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, status } = req.query;

    let query = { assignedTo: userId };

    // Filter by completion date if status is 'done'
    if (status === 'done') {
      query.status = 'done';
      if (startDate && endDate) {
        query.completedAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
    } else if (status) {
      query.status = status;
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
    } else {
      // All tasks in date range
      if (startDate && endDate) {
        query.$or = [
          {
            completedAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
          {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        ];
      }
    }

    const tasks = await Task.find(query)
      .populate("project", "name")
      .populate("assignedBy", "name email")
      .sort({ completedAt: -1, createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Error in getTasksByDateRange:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get completed tasks grouped by date
export const getCompletedTasksByDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    let startDate, endDate;

    if (month && year) {
      // Get tasks for specific month
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      // Get tasks for current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const tasks = await Task.find({
      assignedTo: userId,
      status: 'done',
      completedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("project", "name")
      .populate("assignedBy", "name email")
      .sort({ completedAt: -1 });

    // Group tasks by date
    const tasksByDate = {};
    tasks.forEach((task) => {
      const dateKey = task.completedAt.toISOString().split('T')[0];
      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
      }
      tasksByDate[dateKey].push(task);
    });

    res.json({
      startDate,
      endDate,
      totalTasks: tasks.length,
      tasksByDate,
      tasks, // Also send flat list
    });
  } catch (error) {
    console.error("Error in getCompletedTasksByDate:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get task history for a specific task
export const getTaskHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate("statusHistory.changedBy", "name email")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({
      task: {
        title: task.title,
        description: task.description,
        currentStatus: task.status,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        assignedTo: task.assignedTo,
        assignedBy: task.assignedBy,
      },
      history: task.statusHistory,
    });
  } catch (error) {
    console.error("Error in getTaskHistory:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
