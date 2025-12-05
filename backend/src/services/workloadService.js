import Task from "../models/taskModel.js";
import Slot from "../models/slotModel.js";
import User from "../models/userModel.js";
import Project from "../models/projectModel.js";

// Default workload thresholds
const DEFAULT_THRESHOLDS = {
  available: 3,  // 0-3 tasks = Available
  busy: 6,       // 4-6 tasks = Busy
  // 7+ tasks = Overloaded
};

/**
 * Get active tasks for an employee
 * Active tasks are those with status: Pending, In Progress, or Review
 */
const getActiveTasks = async (employeeId) => {
  try {
    // Get active regular tasks
    const tasks = await Task.find({
      assignedTo: employeeId,
      status: { $in: ["todo", "in-progress", "review"] }
    }).select("_id title status dueDate priority project");

    // Get active work assignments (slots)
    const slots = await Slot.find({
      assignedTo: employeeId,
      status: { $in: ["Pending", "In Progress", "Review", "Revision"] }
    }).select("_id title status dueDate priority project");

    // Combine both types
    return [...tasks, ...slots];
  } catch (error) {
    console.error("Error getting active tasks:", error);
    throw error;
  }
};

/**
 * Check if a task/slot is overdue
 */
const isOverdue = (dueDate, status) => {
  if (!dueDate) return false;
  
  const now = new Date();
  const due = new Date(dueDate);
  
  // Not overdue if already completed/approved
  const completedStatuses = ["done", "Completed", "Approved"];
  if (completedStatuses.includes(status)) return false;
  
  return due < now;
};

/**
 * Check if a task is due this week
 */
const isDueThisWeek = (dueDate) => {
  if (!dueDate) return false;
  
  const now = new Date();
  const due = new Date(dueDate);
  
  // Get start of this week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Get end of this week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return due >= startOfWeek && due <= endOfWeek;
};

/**
 * Determine capacity level based on task count and thresholds
 */
const determineCapacity = (taskCount, thresholds = DEFAULT_THRESHOLDS) => {
  if (taskCount <= thresholds.available) return "available";
  if (taskCount <= thresholds.busy) return "busy";
  return "overloaded";
};

/**
 * Calculate workload metrics for a single employee
 */
export const calculateWorkload = async (employeeId, thresholds = DEFAULT_THRESHOLDS) => {
  try {
    const activeTasks = await getActiveTasks(employeeId);
    
    const workload = {
      totalActive: activeTasks.length,
      dueThisWeek: activeTasks.filter(task => isDueThisWeek(task.dueDate)).length,
      overdue: activeTasks.filter(task => isOverdue(task.dueDate, task.status)).length,
      capacity: determineCapacity(activeTasks.length, thresholds),
      tasks: activeTasks // Include task details for breakdown
    };
    
    return workload;
  } catch (error) {
    console.error("Error calculating workload:", error);
    throw error;
  }
};

/**
 * Calculate workload for multiple employees
 */
export const calculateWorkloadForEmployees = async (employeeIds, thresholds = DEFAULT_THRESHOLDS) => {
  try {
    const workloads = await Promise.all(
      employeeIds.map(async (employeeId) => {
        const workload = await calculateWorkload(employeeId, thresholds);
        return {
          employeeId,
          ...workload
        };
      })
    );
    
    return workloads;
  } catch (error) {
    console.error("Error calculating workload for employees:", error);
    throw error;
  }
};

/**
 * Get workload for all employees in a department
 */
export const getDepartmentWorkload = async (departmentId, thresholds = DEFAULT_THRESHOLDS) => {
  try {
    // Get all employees in the department
    const employees = await User.find({
      department: departmentId,
      role: { $in: ["employee", "hod"] }
    }).select("_id name email designation avatar");
    
    // Calculate workload for each employee
    const workloads = await Promise.all(
      employees.map(async (employee) => {
        const workload = await calculateWorkload(employee._id, thresholds);
        return {
          employee: {
            _id: employee._id,
            name: employee.name,
            email: employee.email,
            designation: employee.designation,
            avatar: employee.avatar
          },
          ...workload
        };
      })
    );
    
    // Sort by workload level: overloaded first, then busy, then available
    const capacityOrder = { overloaded: 0, busy: 1, available: 2 };
    workloads.sort((a, b) => capacityOrder[a.capacity] - capacityOrder[b.capacity]);
    
    return workloads;
  } catch (error) {
    console.error("Error getting department workload:", error);
    throw error;
  }
};

/**
 * Get workload for all team members in a project
 */
export const getProjectWorkload = async (projectId, thresholds = DEFAULT_THRESHOLDS) => {
  try {
    // Get project with team members
    const project = await Project.findById(projectId)
      .populate("projectHead", "_id name email designation avatar")
      .populate("teamMembers", "_id name email designation avatar");
    
    if (!project) {
      throw new Error("Project not found");
    }
    
    // Combine project head and team members
    const allMembers = [
      ...(project.projectHead ? [project.projectHead] : []),
      ...(project.teamMembers || [])
    ];
    
    // Remove duplicates
    const uniqueMembers = Array.from(
      new Map(allMembers.map(member => [member._id.toString(), member])).values()
    );
    
    // Calculate workload for each team member
    const workloads = await Promise.all(
      uniqueMembers.map(async (member) => {
        const workload = await calculateWorkload(member._id, thresholds);
        return {
          employee: {
            _id: member._id,
            name: member.name,
            email: member.email,
            designation: member.designation,
            avatar: member.avatar
          },
          ...workload
        };
      })
    );
    
    // Sort by workload level
    const capacityOrder = { overloaded: 0, busy: 1, available: 2 };
    workloads.sort((a, b) => capacityOrder[a.capacity] - capacityOrder[b.capacity]);
    
    return workloads;
  } catch (error) {
    console.error("Error getting project workload:", error);
    throw error;
  }
};

/**
 * Get workload trends for an employee (30-day history)
 */
export const getWorkloadTrends = async (employeeId, days = 30, thresholds = DEFAULT_THRESHOLDS) => {
  try {
    const trends = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Calculate workload for each of the past N days
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(23, 59, 59, 999);
      
      // Get tasks that were active on this date
      const tasks = await Task.find({
        assignedTo: employeeId,
        createdAt: { $lte: date },
        $or: [
          { status: { $in: ["todo", "in-progress", "review"] } },
          { completedAt: { $gte: date } }
        ]
      });
      
      const slots = await Slot.find({
        assignedTo: employeeId,
        createdAt: { $lte: date },
        $or: [
          { status: { $in: ["Pending", "In Progress", "Review", "Revision"] } },
          { approvedAt: { $gte: date } }
        ]
      });
      
      const taskCount = tasks.length + slots.length;
      const capacity = determineCapacity(taskCount, thresholds);
      
      trends.unshift({
        date: date.toISOString().split('T')[0],
        taskCount,
        capacity
      });
    }
    
    return trends;
  } catch (error) {
    console.error("Error getting workload trends:", error);
    throw error;
  }
};

export default {
  calculateWorkload,
  calculateWorkloadForEmployees,
  getDepartmentWorkload,
  getProjectWorkload,
  getWorkloadTrends,
  determineCapacity,
  DEFAULT_THRESHOLDS
};
