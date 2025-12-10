import WorkItem from "../models/workItemModel.js";
import Project from "../models/projectModel.js";
import User from "../models/userModel.js";
import CalendarEvent from "../models/calendarEventModel.js";
import { getAdvancedWorkflowByDepartment } from "../utils/departmentWorkflowConfig.js";
import { notifyWorkItemAssigned, notifyStageCompleted, notifyWorkflowProgressed } from "./notificationService.js";
import logger from "../utils/logger.js";

/**
 * Workflow Automation Service
 * Handles automated task progression and stage management
 */
class WorkflowAutomationService {
  
  /**
   * Initialize work item with advanced workflow
   */
  static async initializeWorkItemWorkflow(workItem, project) {
    try {
      const department = await project.populate("department");
      const workflow = getAdvancedWorkflowByDepartment(department.department.name);
      
      if (!workflow || !workflow.stages) {
        return workItem; // Use standard workflow
      }
      
      // Set initial stage
      const firstStage = workflow.stages[0];
      workItem.currentStage = firstStage.id;
      workItem.workflowType = workflow.type;
      workItem.nextStage = workflow.stages[1]?.id || null;
      
      // Create stage assignments based on project team members
      const stageAssignments = await this.createStageAssignments(workflow, project);
      workItem.stageAssignments = stageAssignments;
      
      // Initialize stage history
      workItem.stageHistory = [{
        stage: firstStage.id,
        assignedTo: stageAssignments.find(sa => sa.stage === firstStage.id)?.assignedTo,
        startedAt: new Date(),
        status: "pending",
      }];
      
      // Create calendar events for each stage
      await this.createWorkflowCalendarEvents(workItem, workflow, project);
      
      await workItem.save();
      
      logger.info(`Initialized advanced workflow for work item: ${workItem._id}`);
      return workItem;
      
    } catch (error) {
      logger.error("Error initializing workflow:", error);
      throw error;
    }
  }
  
  /**
   * Create stage assignments based on project team members and their roles
   */
  static async createStageAssignments(workflow, project) {
    const assignments = [];
    
    for (const stage of workflow.stages) {
      // Find team members with matching roles for this stage
      const eligibleMembers = project.teamMembers.filter(member => 
        stage.roles.includes(member.role)
      );
      
      if (eligibleMembers.length > 0) {
        // Assign to the first eligible member (can be enhanced with workload balancing)
        const assignedMember = eligibleMembers[0];
        
        assignments.push({
          stage: stage.id,
          assignedTo: assignedMember.user,
          role: assignedMember.role,
          isRequired: true,
          estimatedHours: stage.estimatedHours || 0,
        });
      } else {
        // Fallback to project head if no specific role found
        assignments.push({
          stage: stage.id,
          assignedTo: project.projectHead,
          role: "project-head",
          isRequired: true,
          estimatedHours: stage.estimatedHours || 0,
        });
      }
    }
    
    return assignments;
  }
  
  /**
   * Progress work item to next stage
   */
  static async progressToNextStage(workItemId, completedBy, notes = "") {
    try {
      const workItem = await WorkItem.findById(workItemId)
        .populate("project")
        .populate("stageAssignments.assignedTo", "name email");
      
      if (!workItem) {
        throw new Error("Work item not found");
      }
      
      const workflow = getAdvancedWorkflowByDepartment(workItem.project.department?.name);
      if (!workflow) {
        return workItem; // Standard workflow
      }
      
      const currentStageIndex = workflow.stages.findIndex(s => s.id === workItem.currentStage);
      if (currentStageIndex === -1) {
        throw new Error("Invalid current stage");
      }
      
      // Mark current stage as completed
      const currentStageHistory = workItem.stageHistory.find(
        sh => sh.stage === workItem.currentStage && !sh.completedAt
      );
      
      if (currentStageHistory) {
        currentStageHistory.completedAt = new Date();
        currentStageHistory.status = "completed";
        currentStageHistory.notes = notes;
        
        // Calculate time spent
        const timeSpent = Math.round(
          (currentStageHistory.completedAt - currentStageHistory.startedAt) / (1000 * 60)
        );
        currentStageHistory.timeSpent = timeSpent;
      }
      
      // Check if there's a next stage
      const nextStageIndex = currentStageIndex + 1;
      if (nextStageIndex < workflow.stages.length) {
        const nextStage = workflow.stages[nextStageIndex];
        
        // Update work item stage
        workItem.currentStage = nextStage.id;
        workItem.nextStage = workflow.stages[nextStageIndex + 1]?.id || null;
        
        // Find assignee for next stage
        const nextStageAssignment = workItem.stageAssignments.find(
          sa => sa.stage === nextStage.id
        );
        
        if (nextStageAssignment) {
          // Add new stage to history
          workItem.stageHistory.push({
            stage: nextStage.id,
            assignedTo: nextStageAssignment.assignedTo,
            startedAt: new Date(),
            status: "in-progress",
          });
          
          // Update main assignedTo field
          workItem.assignedTo = nextStageAssignment.assignedTo;
          
          // Send notification to next assignee
          await notifyWorkflowProgressed(workItem, nextStage, nextStageAssignment.assignedTo);
        }
        
        // Update calendar events
        await this.updateWorkflowCalendarEvents(workItem, workflow);
        
      } else {
        // Final stage completed - mark work item as done
        workItem.status = "Done";
        workItem.completedAt = new Date();
        workItem.currentStage = null;
        workItem.nextStage = null;
        
        // Notify completion
        await notifyStageCompleted(workItem, completedBy);
      }
      
      await workItem.save();
      
      logger.info(`Work item ${workItemId} progressed to stage: ${workItem.currentStage}`);
      return workItem;
      
    } catch (error) {
      logger.error("Error progressing workflow:", error);
      throw error;
    }
  }
  
  /**
   * Create calendar events for workflow stages
   */
  static async createWorkflowCalendarEvents(workItem, workflow, project) {
    try {
      const events = [];
      let currentDate = new Date(workItem.dueDate);
      
      // Work backwards from due date to create stage deadlines
      for (let i = workflow.stages.length - 1; i >= 0; i--) {
        const stage = workflow.stages[i];
        const stageAssignment = workItem.stageAssignments.find(sa => sa.stage === stage.id);
        
        if (stageAssignment) {
          const stageEndDate = new Date(currentDate);
          const stageStartDate = new Date(currentDate);
          stageStartDate.setHours(stageStartDate.getHours() - (stage.estimatedHours || 1));
          
          const event = new CalendarEvent({
            title: `${workItem.title} - ${stage.name}`,
            description: `${stage.name} stage for work item: ${workItem.title}`,
            eventType: "work-item",
            sourceId: workItem._id,
            sourceModel: "WorkItem",
            startDate: stageStartDate,
            endDate: stageEndDate,
            assignedTo: [{
              user: stageAssignment.assignedTo,
              role: stageAssignment.role,
              isRequired: true,
            }],
            department: project.department,
            project: project._id,
            workflowStage: stage.id,
            workflowType: workflow.type,
            priority: workItem.priority,
            createdBy: workItem.createdBy,
            isAutoGenerated: true,
            autoGeneratedBy: "workflow-stage",
            tags: [`stage-${stage.id}`, ...workItem.tags],
          });
          
          events.push(event);
          
          // Move to previous stage deadline
          currentDate = new Date(stageStartDate);
          currentDate.setHours(currentDate.getHours() - 1); // 1 hour buffer
        }
      }
      
      // Save all events
      await CalendarEvent.insertMany(events);
      
      logger.info(`Created ${events.length} calendar events for work item: ${workItem._id}`);
      
    } catch (error) {
      logger.error("Error creating workflow calendar events:", error);
    }
  }
  
  /**
   * Update calendar events when workflow progresses
   */
  static async updateWorkflowCalendarEvents(workItem, workflow) {
    try {
      // Update event status for completed stages
      await CalendarEvent.updateMany(
        {
          sourceId: workItem._id,
          sourceModel: "WorkItem",
          workflowStage: { $in: workItem.stageHistory
            .filter(sh => sh.status === "completed")
            .map(sh => sh.stage)
          }
        },
        {
          status: "completed",
          completedAt: new Date(),
        }
      );
      
      // Update current stage event to in-progress
      if (workItem.currentStage) {
        await CalendarEvent.updateOne(
          {
            sourceId: workItem._id,
            sourceModel: "WorkItem",
            workflowStage: workItem.currentStage,
          },
          {
            status: "in-progress",
          }
        );
      }
      
    } catch (error) {
      logger.error("Error updating workflow calendar events:", error);
    }
  }
  
  /**
   * Get workflow progress for a work item
   */
  static async getWorkflowProgress(workItemId) {
    try {
      const workItem = await WorkItem.findById(workItemId)
        .populate("project")
        .populate("stageAssignments.assignedTo", "name email role")
        .populate("stageHistory.assignedTo", "name email");
      
      if (!workItem) {
        throw new Error("Work item not found");
      }
      
      const workflow = getAdvancedWorkflowByDepartment(workItem.project.department?.name);
      if (!workflow) {
        return null; // Standard workflow
      }
      
      const progress = {
        workItem: workItem,
        workflow: workflow,
        currentStage: workItem.currentStage,
        nextStage: workItem.nextStage,
        completedStages: workItem.stageHistory.filter(sh => sh.status === "completed"),
        totalStages: workflow.stages.length,
        progressPercentage: Math.round(
          (workItem.stageHistory.filter(sh => sh.status === "completed").length / workflow.stages.length) * 100
        ),
        estimatedCompletion: this.calculateEstimatedCompletion(workItem, workflow),
      };
      
      return progress;
      
    } catch (error) {
      logger.error("Error getting workflow progress:", error);
      throw error;
    }
  }
  
  /**
   * Calculate estimated completion date
   */
  static calculateEstimatedCompletion(workItem, workflow) {
    const remainingStages = workflow.stages.filter(stage => {
      const isCompleted = workItem.stageHistory.some(
        sh => sh.stage === stage.id && sh.status === "completed"
      );
      return !isCompleted;
    });
    
    const totalRemainingHours = remainingStages.reduce(
      (sum, stage) => sum + (stage.estimatedHours || 0), 0
    );
    
    const estimatedCompletion = new Date();
    estimatedCompletion.setHours(estimatedCompletion.getHours() + totalRemainingHours);
    
    return estimatedCompletion;
  }
  
  /**
   * Get department workflow analytics
   */
  static async getDepartmentWorkflowAnalytics(departmentId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const query = {
        "project.department": departmentId,
      };
      
      if (startDate && endDate) {
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
      
      const workItems = await WorkItem.find(query)
        .populate("project", "name department")
        .populate("assignedTo", "name email")
        .populate("stageAssignments.assignedTo", "name email role");
      
      // Calculate analytics
      const analytics = {
        totalWorkItems: workItems.length,
        byWorkflowType: {},
        byStage: {},
        byAssignee: {},
        averageCompletionTime: 0,
        bottlenecks: [],
      };
      
      workItems.forEach(workItem => {
        // Group by workflow type
        const workflowType = workItem.workflowType || "standard";
        analytics.byWorkflowType[workflowType] = (analytics.byWorkflowType[workflowType] || 0) + 1;
        
        // Group by current stage
        if (workItem.currentStage) {
          analytics.byStage[workItem.currentStage] = (analytics.byStage[workItem.currentStage] || 0) + 1;
        }
        
        // Group by assignee
        if (workItem.assignedTo) {
          const assigneeName = workItem.assignedTo.name;
          analytics.byAssignee[assigneeName] = (analytics.byAssignee[assigneeName] || 0) + 1;
        }
      });
      
      return analytics;
      
    } catch (error) {
      logger.error("Error getting department workflow analytics:", error);
      throw error;
    }
  }
}

export default WorkflowAutomationService;