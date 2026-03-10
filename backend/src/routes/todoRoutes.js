import express from "express";
import {
  getMyTodos,
  createTodo,
  updateTodo,
  toggleTodoStatus,
  deleteTodo,
  reorderTodos,
  getTodoStats,
} from "../controllers/todoController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected (require authentication)
router.use(protect);

// Get my todos
router.get("/", getMyTodos);

// Get todo statistics
router.get("/stats", getTodoStats);

// Create a new todo
router.post("/", createTodo);

// Update a todo
router.put("/:id", updateTodo);

// Toggle todo status
router.patch("/:id/toggle", toggleTodoStatus);

// Delete a todo
router.delete("/:id", deleteTodo);

// Reorder todos
router.post("/reorder", reorderTodos);

export default router;
