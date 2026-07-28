/**
 * Department-Specific Workflow Configurations
 * Each department can have its own workflow, statuses, and UI requirements
 */

// Standard 4-stage workflow (default for all departments)
export const STANDARD_WORKFLOW = {
  type: "standard",
  name: "Standard Workflow",
  statuses: ["To Do", "In Progress", "Review", "Done"],
  statusColors: {
    "To Do": "#6B7280",
    "In Progress": "#3B82F6",
    "Review": "#F59E0B",
    "Done": "#10B981",
  },
  requiredFields: ["title", "assignedTo", "dueDate"],
  optionalFields: ["description", "priority", "tags", "estimatedHours"],
};

// Social Media Marketing Department Workflow
export const SOCIAL_MEDIA_WORKFLOW = {
  type: "social-media",
  name: "Social Media Marketing",
  statuses: ["To Do", "In Progress", "Review", "Done"],
  statusColors: {
    "To Do": "#6B7280",
    "In Progress": "#3B82F6",
    "Review": "#F59E0B",
    "Done": "#10B981",
  },
  requiredFields: ["title", "assignedTo", "dueDate", "platform", "postType"],
  optionalFields: [
    "description",
    "caption",
    "hashtags",
    "contentBucket",
    "priority",
    "tags",
  ],
  customFields: [
    {
      name: "designStatus",
      label: "Design Status",
      type: "select",
      options: ["Planned", "In Design", "Ready for Review", "Approved", "Needs Revision"],
      default: "Planned",
    },
    {
      name: "postingStatus",
      label: "Posting Status",
      type: "select",
      options: ["Scheduled", "Posted", "Failed"],
      default: "Scheduled",
    },
    {
      name: "approvalRequired",
      label: "Requires Approval",
      type: "boolean",
      default: true,
    },
  ],
  platforms: ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "Pinterest", "TikTok"],
  postTypes: ["Post", "Story", "Reel", "Carousel", "Video", "Article", "Poll"],
};

// Software Development Department Workflow
export const DEVELOPMENT_WORKFLOW = {
  type: "development",
  name: "Software Development",
  statuses: ["To Do", "In Progress", "Review", "Done"],
  statusColors: {
    "To Do": "#6B7280",
    "In Progress": "#3B82F6",
    "Review": "#F59E0B",
    "Done": "#10B981",
  },
  requiredFields: ["title", "assignedTo", "dueDate"],
  optionalFields: ["description", "priority", "tags", "estimatedHours"],
  customFields: [
    {
      name: "taskType",
      label: "Task Type",
      type: "select",
      options: ["Feature", "Bug Fix", "Refactor", "Documentation", "Testing"],
      default: "Feature",
    },
    {
      name: "codeReviewStatus",
      label: "Code Review",
      type: "select",
      options: ["Not Started", "In Review", "Changes Requested", "Approved"],
      default: "Not Started",
    },
    {
      name: "testingStatus",
      label: "Testing Status",
      type: "select",
      options: ["Not Tested", "Testing", "Passed", "Failed"],
      default: "Not Tested",
    },
    {
      name: "branch",
      label: "Git Branch",
      type: "text",
      default: "",
    },
    {
      name: "pullRequestUrl",
      label: "Pull Request URL",
      type: "url",
      default: "",
    },
  ],
};

// Graphic Design Department Workflow
export const DESIGN_WORKFLOW = {
  type: "design",
  name: "Graphic Design",
  statuses: ["To Do", "In Progress", "Review", "Done"],
  statusColors: {
    "To Do": "#6B7280",
    "In Progress": "#3B82F6",
    "Review": "#F59E0B",
    "Done": "#10B981",
  },
  requiredFields: ["title", "assignedTo", "dueDate"],
  optionalFields: ["description", "priority", "tags", "estimatedHours"],
  customFields: [
    {
      name: "designType",
      label: "Design Type",
      type: "select",
      options: ["Logo", "Banner", "Brochure", "UI/UX", "Illustration", "Infographic", "Other"],
      default: "Other",
    },
    {
      name: "designPhase",
      label: "Design Phase",
      type: "select",
      options: ["Concept", "Draft", "Refinement", "Final", "Delivered"],
      default: "Concept",
    },
    {
      name: "revisionCount",
      label: "Revision Count",
      type: "number",
      default: 0,
    },
    {
      name: "clientFeedback",
      label: "Client Feedback",
      type: "textarea",
      default: "",
    },
    {
      name: "dimensions",
      label: "Dimensions",
      type: "text",
      default: "",
    },
  ],
};

// Video Production Department Workflow
export const VIDEO_WORKFLOW = {
  type: "video-production",
  name: "Video Production",
  statuses: ["To Do", "In Progress", "Review", "Done"],
  statusColors: {
    "To Do": "#6B7280",
    "In Progress": "#3B82F6",
    "Review": "#F59E0B",
    "Done": "#10B981",
  },
  requiredFields: ["title", "assignedTo", "dueDate"],
  optionalFields: ["description", "priority", "tags", "estimatedHours"],
  customFields: [
    {
      name: "videoType",
      label: "Video Type",
      type: "select",
      options: ["Promotional", "Tutorial", "Testimonial", "Event", "Animation", "Other"],
      default: "Other",
    },
    {
      name: "editingPhase",
      label: "Editing Phase",
      type: "select",
      options: ["Pre-Production", "Filming", "Rough Cut", "Fine Cut", "Color Grading", "Final"],
      default: "Pre-Production",
    },
    {
      name: "duration",
      label: "Duration (seconds)",
      type: "number",
      default: 0,
    },
    {
      name: "renderStatus",
      label: "Render Status",
      type: "select",
      options: ["Not Started", "Rendering", "Completed", "Failed"],
      default: "Not Started",
    },
    {
      name: "publishPlatforms",
      label: "Publish Platforms",
      type: "multiselect",
      options: ["YouTube", "Instagram", "Facebook", "LinkedIn", "TikTok", "Website"],
      default: [],
    },
  ],
};

// Content Writing Department Workflow
export const CONTENT_WRITING_WORKFLOW = {
  type: "content-writing",
  name: "Content Writing",
  statuses: ["To Do", "In Progress", "Review", "Done"],
  statusColors: {
    "To Do": "#6B7280",
    "In Progress": "#3B82F6",
    "Review": "#F59E0B",
    "Done": "#10B981",
  },
  requiredFields: ["title", "assignedTo", "dueDate"],
  optionalFields: ["description", "priority", "tags", "estimatedHours"],
  customFields: [
    {
      name: "contentType",
      label: "Content Type",
      type: "select",
      options: ["Blog Post", "Article", "Social Copy", "Email", "Website Copy", "Script", "Other"],
      default: "Blog Post",
    },
    {
      name: "wordCount",
      label: "Word Count",
      type: "number",
      default: 0,
    },
    {
      name: "targetWordCount",
      label: "Target Word Count",
      type: "number",
      default: 0,
    },
    {
      name: "seoKeywords",
      label: "SEO Keywords",
      type: "text",
      default: "",
    },
    {
      name: "tone",
      label: "Tone",
      type: "select",
      options: ["Professional", "Casual", "Friendly", "Formal", "Humorous", "Inspirational"],
      default: "Professional",
    },
  ],
};

// Posting Department Workflow (publishes approved creative assets)
export const POSTING_WORKFLOW = {
  type: "posting",
  name: "Posting",
  statuses: ["To Do", "In Progress", "Review", "Done"],
  statusColors: {
    "To Do": "#6B7280",
    "In Progress": "#3B82F6",
    "Review": "#F59E0B",
    "Done": "#10B981",
  },
  requiredFields: ["title", "assignedTo", "dueDate"],
  optionalFields: ["description", "priority", "tags", "estimatedHours"],
  customFields: [
    {
      name: "postUrls",
      label: "Post URL(s)",
      type: "textarea",
      default: "",
    },
    {
      name: "postingDate",
      label: "Posting Date",
      type: "date",
      default: "",
    },
    {
      name: "platforms",
      label: "Platforms",
      type: "multiselect",
      options: ["Facebook", "Instagram", "LinkedIn", "Twitter", "YouTube", "TikTok", "Website", "Other"],
      default: [],
    },
  ],
};

// Map of all workflows
export const DEPARTMENT_WORKFLOWS = {
  standard: STANDARD_WORKFLOW,
  "social-media": SOCIAL_MEDIA_WORKFLOW,
  development: DEVELOPMENT_WORKFLOW,
  design: DESIGN_WORKFLOW,
  "video-production": VIDEO_WORKFLOW,
  "content-writing": CONTENT_WRITING_WORKFLOW,
  posting: POSTING_WORKFLOW,
};

/**
 * Get workflow configuration by type
 * @param {string} workflowType - Type of workflow
 * @returns {Object} - Workflow configuration
 */
export const getWorkflowConfig = (workflowType) => {
  return DEPARTMENT_WORKFLOWS[workflowType] || STANDARD_WORKFLOW;
};

/**
 * Get workflow by department name
 * @param {string} departmentName - Name of department
 * @returns {Object} - Workflow configuration
 */
export const getWorkflowByDepartment = (departmentName) => {
  const departmentMap = {
    "Social Media": "social-media",
    "Marketing": "social-media",
    "Development": "development",
    "Engineering": "development",
    "Design": "design",
    "Graphics": "design",
    "Video": "video-production",
    "Video Production": "video-production",
    "Content": "content-writing",
    "Content Writing": "content-writing",
    "Posting": "posting",
    "Posting Department": "posting",
    "Content Posting": "posting",
  };
  
  const workflowType = departmentMap[departmentName] || "standard";
  return getWorkflowConfig(workflowType);
};

/**
 * Validate department-specific fields
 * @param {Object} workItem - Work item data
 * @param {string} workflowType - Workflow type
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export const validateDepartmentFields = (workItem, workflowType) => {
  const workflow = getWorkflowConfig(workflowType);
  const errors = [];
  
  // Check required fields
  workflow.requiredFields.forEach((field) => {
    if (!workItem[field]) {
      errors.push(`${field} is required for ${workflow.name}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get UI configuration for department workflow
 * @param {string} workflowType - Workflow type
 * @returns {Object} - UI configuration
 */
export const getWorkflowUIConfig = (workflowType) => {
  const workflow = getWorkflowConfig(workflowType);
  
  return {
    name: workflow.name,
    statuses: workflow.statuses,
    statusColors: workflow.statusColors,
    requiredFields: workflow.requiredFields,
    optionalFields: workflow.optionalFields,
    customFields: workflow.customFields || [],
    showPlatforms: workflowType === "social-media",
    showCodeReview: workflowType === "development",
    showDesignPhases: workflowType === "design",
    showVideoPhases: workflowType === "video-production",
  };
};

export default {
  DEPARTMENT_WORKFLOWS,
  STANDARD_WORKFLOW,
  SOCIAL_MEDIA_WORKFLOW,
  DEVELOPMENT_WORKFLOW,
  DESIGN_WORKFLOW,
  VIDEO_WORKFLOW,
  CONTENT_WRITING_WORKFLOW,
  POSTING_WORKFLOW,
  getWorkflowConfig,
  getWorkflowByDepartment,
  validateDepartmentFields,
  getWorkflowUIConfig,
};
