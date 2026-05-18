import { body, param, query } from "express-validator";

// Validation for creating work items
export const createWorkItemValidation = [
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["task", "content"])
    .withMessage("Type must be either 'task' or 'content'"),

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters")
    .escape(),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must not exceed 2000 characters")
    .escape(),

  body("project")
    .trim()
    .notEmpty()
    .withMessage("Project is required")
    .isMongoId()
    .withMessage("Invalid project ID"),

  body("assignedTo")
    .trim()
    .notEmpty()
    .withMessage("Assignee is required")
    .isMongoId()
    .withMessage("Invalid assignee ID"),

  body("priority")
    .optional()
    .trim()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be low, medium, high, or urgent"),

  body("dueDate")
    .notEmpty()
    .withMessage("Due date is required")
    .isISO8601()
    .withMessage("Invalid date format")
    .custom((value) => {
      const dueDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        throw new Error("Due date cannot be in the past");
      }
      return true;
    }),

  // Content-specific validations
  body("platform")
    .if(body("type").equals("content"))
    .trim()
    .notEmpty()
    .withMessage("Platform is required for content work items")
    .isIn(["facebook", "instagram", "twitter", "linkedin", "youtube", "website"])
    .withMessage("Invalid platform"),

  body("postType")
    .if(body("type").equals("content"))
    .trim()
    .notEmpty()
    .withMessage("Post type is required for content work items")
    .isIn(["post", "story", "reel", "video", "article", "carousel"])
    .withMessage("Invalid post type"),

  body("caption")
    .optional()
    .trim()
    .isLength({ max: 2200 })
    .withMessage("Caption must not exceed 2200 characters"),

  body("hashtags")
    .optional()
    .isArray()
    .withMessage("Hashtags must be an array"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("estimatedHours")
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage("Estimated hours must be between 0 and 1000"),
];

// Validation for updating work items
export const updateWorkItemValidation = [
  param("id")
    .trim()
    .isMongoId()
    .withMessage("Invalid work item ID"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters")
    .escape(),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must not exceed 2000 characters")
    .escape(),

  body("priority")
    .optional()
    .trim()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be low, medium, high, or urgent"),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),

  body("assignedTo")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid assignee ID"),

  body("estimatedHours")
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage("Estimated hours must be between 0 and 1000"),

  body("actualHours")
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage("Actual hours must be between 0 and 1000"),
];

// Validation for status updates
export const updateStatusValidation = [
  param("id")
    .trim()
    .isMongoId()
    .withMessage("Invalid work item ID"),

  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["To Do", "In Progress", "Review", "Done", "Cancelled"])
    .withMessage("Invalid status value"),
    
  body("cancellationReason")
    .if(body("status").equals("Cancelled"))
    .trim()
    .notEmpty()
    .withMessage("Cancellation reason is required when status is Cancelled")
    .isLength({ min: 25 })
    .withMessage("Cancellation reason must be at least 25 characters"),
];

// Validation for bulk operations
export const bulkUpdateValidation = [
  body("workItemIds")
    .isArray({ min: 1 })
    .withMessage("workItemIds must be a non-empty array"),

  body("workItemIds.*")
    .trim()
    .isMongoId()
    .withMessage("Invalid work item ID in array"),

  body("updates")
    .isObject()
    .withMessage("updates must be an object")
    .custom((value) => {
      const allowedFields = ["status", "priority", "dueDate", "assignedTo"];
      const providedFields = Object.keys(value);
      const invalidFields = providedFields.filter(
        (field) => !allowedFields.includes(field)
      );

      if (invalidFields.length > 0) {
        throw new Error(
          `Invalid update fields: ${invalidFields.join(", ")}. Allowed: ${allowedFields.join(", ")}`
        );
      }

      if (providedFields.length === 0) {
        throw new Error("At least one update field is required");
      }

      return true;
    }),

  body("updates.status")
    .optional()
    .trim()
    .isIn(["To Do", "In Progress", "Review", "Done", "Cancelled"])
    .withMessage("Invalid status value"),

  body("updates.priority")
    .optional()
    .trim()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority value"),

  body("updates.dueDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),

  body("updates.assignedTo")
    .optional()
    .trim()
    .isMongoId()
    .withMessage("Invalid assignee ID"),
];

// Validation for adding comments
export const addCommentValidation = [
  param("id")
    .trim()
    .isMongoId()
    .withMessage("Invalid work item ID"),

  body("text")
    .trim()
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment must be between 1 and 1000 characters")
    .escape(),
];

// Validation for query parameters
export const queryValidation = [
  query("status")
    .optional()
    .trim()
    .isIn(["all", "To Do", "In Progress", "Review", "Done", "Cancelled"])
    .withMessage("Invalid status filter"),

  query("type")
    .optional()
    .trim()
    .isIn(["all", "task", "content"])
    .withMessage("Invalid type filter"),

  query("priority")
    .optional()
    .trim()
    .isIn(["all", "low", "medium", "high", "urgent"])
    .withMessage("Invalid priority filter"),

  query("project")
    .optional()
    .trim()
    .custom((value) => {
      if (value === "all") return true;
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error("Invalid project ID");
      }
      return true;
    }),

  query("assignedTo")
    .optional()
    .trim()
    .custom((value) => {
      if (value === "all") return true;
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error("Invalid assignee ID");
      }
      return true;
    }),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long")
    .escape(),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid end date format"),
];
