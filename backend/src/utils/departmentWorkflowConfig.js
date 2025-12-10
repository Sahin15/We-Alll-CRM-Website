/**
 * Advanced Department Workflow Configuration
 * Defines automated task progression and role-based workflows
 */

// Social Media Marketing Workflow with Automated Progression
export const SOCIAL_MEDIA_ADVANCED_WORKFLOW = {
  type: "social-media-advanced",
  name: "Social Media Marketing (Advanced)",
  
  // Sequential workflow stages
  stages: [
    {
      id: "planning",
      name: "Content Planning",
      roles: ["social-media-manager", "content-creator"],
      requiredFields: ["contentType", "platform", "targetAudience"],
      autoProgressTo: "content-creation",
      estimatedHours: 2,
    },
    {
      id: "content-creation",
      name: "Content Creation",
      roles: ["photo-editor", "video-creator", "graphic-designer"],
      requiredFields: ["contentAssets"],
      autoProgressTo: "caption-writing",
      estimatedHours: 4,
    },
    {
      id: "caption-writing",
      name: "Caption & Copy Writing",
      roles: ["caption-writer", "copywriter"],
      requiredFields: ["caption", "hashtags"],
      autoProgressTo: "ads-setup",
      estimatedHours: 1,
    },
    {
      id: "ads-setup",
      name: "Ads Configuration",
      roles: ["ads-specialist"],
      requiredFields: ["adBudget", "targetingCriteria"],
      autoProgressTo: "review",
      estimatedHours: 2,
      optional: true, // Only for paid campaigns
    },
    {
      id: "review",
      name: "Content Review",
      roles: ["social-media-manager", "project-head"],
      requiredFields: ["approvalStatus"],
      autoProgressTo: "posting",
      estimatedHours: 0.5,
    },
    {
      id: "posting",
      name: "Content Publishing",
      roles: ["posting-manager", "social-media-manager"],
      requiredFields: ["publishedAt", "postUrl"],
      autoProgressTo: "monitoring",
      estimatedHours: 0.5,
    },
    {
      id: "monitoring",
      name: "Performance Monitoring",
      roles: ["community-manager", "social-media-manager"],
      requiredFields: ["engagementMetrics"],
      autoProgressTo: null, // Final stage
      estimatedHours: 1,
    },
  ],
  
  // Role-based permissions
  rolePermissions: {
    "social-media-manager": {
      canCreate: true,
      canAssign: true,
      canApprove: true,
      canView: "all",
      canEdit: "all",
    },
    "content-creator": {
      canCreate: false,
      canAssign: false,
      canApprove: false,
      canView: "assigned",
      canEdit: "assigned",
    },
    "photo-editor": {
      canCreate: false,
      canAssign: false,
      canApprove: false,
      canView: "assigned",
      canEdit: "assigned",
    },
    "caption-writer": {
      canCreate: false,
      canAssign: false,
      canApprove: false,
      canView: "assigned",
      canEdit: "assigned",
    },
    "ads-specialist": {
      canCreate: false,
      canAssign: false,
      canApprove: false,
      canView: "assigned",
      canEdit: "assigned",
    },
    "posting-manager": {
      canCreate: false,
      canAssign: false,
      canApprove: false,
      canView: "assigned",
      canEdit: "assigned",
    },
  },
  
  // Calendar view configuration
  calendarConfig: {
    defaultView: "timeline", // timeline, kanban, calendar
    groupBy: "stage", // stage, assignee, platform
    colorScheme: {
      planning: "#6B7280",
      "content-creation": "#3B82F6",
      "caption-writing": "#8B5CF6",
      "ads-setup": "#F59E0B",
      review: "#EF4444",
      posting: "#10B981",
      monitoring: "#06B6D4",
    },
    showDependencies: true,
    showProgress: true,
  },
  
  // Automation rules
  automationRules: [
    {
      trigger: "stage_completed",
      condition: "all_required_fields_filled",
      action: "auto_progress_to_next_stage",
      notifyRoles: ["next_stage_assignee", "project-head"],
    },
    {
      trigger: "overdue",
      condition: "24_hours_past_due",
      action: "escalate_to_manager",
      notifyRoles: ["social-media-manager", "hod"],
    },
    {
      trigger: "approval_required",
      condition: "review_stage_reached",
      action: "notify_approvers",
      notifyRoles: ["social-media-manager", "project-head"],
    },
  ],
};

// Development Workflow
export const DEVELOPMENT_ADVANCED_WORKFLOW = {
  type: "development-advanced",
  name: "Software Development (Advanced)",
  
  stages: [
    {
      id: "analysis",
      name: "Requirements Analysis",
      roles: ["project-head", "business-analyst"],
      autoProgressTo: "design",
      estimatedHours: 4,
    },
    {
      id: "design",
      name: "Technical Design",
      roles: ["senior-developer", "architect"],
      autoProgressTo: "development",
      estimatedHours: 8,
    },
    {
      id: "development",
      name: "Code Development",
      roles: ["developer", "frontend-developer", "backend-developer"],
      autoProgressTo: "code-review",
      estimatedHours: 40,
    },
    {
      id: "code-review",
      name: "Code Review",
      roles: ["senior-developer", "tech-lead"],
      autoProgressTo: "testing",
      estimatedHours: 4,
    },
    {
      id: "testing",
      name: "Quality Assurance",
      roles: ["qa-tester"],
      autoProgressTo: "deployment",
      estimatedHours: 8,
    },
    {
      id: "deployment",
      name: "Deployment",
      roles: ["devops-engineer", "senior-developer"],
      autoProgressTo: null,
      estimatedHours: 2,
    },
  ],
  
  calendarConfig: {
    defaultView: "gantt",
    groupBy: "assignee",
    colorScheme: {
      analysis: "#6B7280",
      design: "#8B5CF6",
      development: "#3B82F6",
      "code-review": "#F59E0B",
      testing: "#EF4444",
      deployment: "#10B981",
    },
  },
};

// Design Workflow
export const DESIGN_ADVANCED_WORKFLOW = {
  type: "design-advanced",
  name: "Graphic Design (Advanced)",
  
  stages: [
    {
      id: "briefing",
      name: "Design Brief",
      roles: ["project-head", "client-liaison"],
      autoProgressTo: "concept",
      estimatedHours: 2,
    },
    {
      id: "concept",
      name: "Concept Development",
      roles: ["graphic-designer", "creative-director"],
      autoProgressTo: "design",
      estimatedHours: 8,
    },
    {
      id: "design",
      name: "Design Creation",
      roles: ["graphic-designer", "ui-designer"],
      autoProgressTo: "review",
      estimatedHours: 16,
    },
    {
      id: "review",
      name: "Client Review",
      roles: ["project-head", "client-liaison"],
      autoProgressTo: "revision",
      estimatedHours: 2,
    },
    {
      id: "revision",
      name: "Design Revision",
      roles: ["graphic-designer"],
      autoProgressTo: "finalization",
      estimatedHours: 8,
    },
    {
      id: "finalization",
      name: "Final Delivery",
      roles: ["graphic-designer", "project-head"],
      autoProgressTo: null,
      estimatedHours: 2,
    },
  ],
  
  calendarConfig: {
    defaultView: "timeline",
    groupBy: "stage",
    colorScheme: {
      briefing: "#6B7280",
      concept: "#8B5CF6",
      design: "#3B82F6",
      review: "#F59E0B",
      revision: "#EF4444",
      finalization: "#10B981",
    },
  },
};

// Export all workflows
export const ADVANCED_WORKFLOWS = {
  "social-media-advanced": SOCIAL_MEDIA_ADVANCED_WORKFLOW,
  "development-advanced": DEVELOPMENT_ADVANCED_WORKFLOW,
  "design-advanced": DESIGN_ADVANCED_WORKFLOW,
};

/**
 * Get advanced workflow by department
 */
export const getAdvancedWorkflowByDepartment = (departmentName) => {
  const departmentMap = {
    "Social Media": "social-media-advanced",
    "Marketing": "social-media-advanced",
    "Development": "development-advanced",
    "Engineering": "development-advanced",
    "Design": "design-advanced",
    "Graphics": "design-advanced",
  };
  
  const workflowType = departmentMap[departmentName] || "social-media-advanced";
  return ADVANCED_WORKFLOWS[workflowType];
};

export default {
  ADVANCED_WORKFLOWS,
  SOCIAL_MEDIA_ADVANCED_WORKFLOW,
  DEVELOPMENT_ADVANCED_WORKFLOW,
  DESIGN_ADVANCED_WORKFLOW,
  getAdvancedWorkflowByDepartment,
};