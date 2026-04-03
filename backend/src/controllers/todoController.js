import Todo from "../models/todoModel.js";

// Get all todos for the logged-in user
export const getMyTodos = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { user: req.user._id };

    if (status && status !== "all") {
      query.status = status;
    }

    const todos = await Todo.find(query).sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      todos,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create a new todo
export const createTodo = async (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Todo title is required",
      });
    }

    // Get the highest order number for this user
    const lastTodo = await Todo.findOne({ user: req.user._id })
      .sort({ order: -1 })
      .select("order");

    const order = lastTodo ? lastTodo.order + 1 : 0;

    const todo = await Todo.create({
      user: req.user._id,
      title: title.trim(),
      description: description?.trim(),
      priority: priority || "medium",
      dueDate: dueDate || null,
      order,
    });

    res.status(201).json({
      success: true,
      message: "Todo created successfully",
      todo,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update a todo
export const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, status } = req.body;

    const todo = await Todo.findOne({ _id: id, user: req.user._id });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    if (title !== undefined) todo.title = title.trim();
    if (description !== undefined) todo.description = description?.trim();
    if (priority !== undefined) todo.priority = priority;
    if (dueDate !== undefined) todo.dueDate = dueDate;
    if (status !== undefined) {
      todo.status = status;
      if (status === "completed" && !todo.completedAt) {
        todo.completedAt = new Date();
      } else if (status === "pending") {
        todo.completedAt = null;
      }
    }

    await todo.save();

    res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      todo,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Toggle todo status (complete/pending)
export const toggleTodoStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const todo = await Todo.findOne({ _id: id, user: req.user._id });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    todo.status = todo.status === "completed" ? "pending" : "completed";
    todo.completedAt = todo.status === "completed" ? new Date() : null;

    await todo.save();

    res.status(200).json({
      success: true,
      message: `Todo marked as ${todo.status}`,
      todo,
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete a todo
export const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;

    const todo = await Todo.findOneAndDelete({ _id: id, user: req.user._id });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Reorder todos
export const reorderTodos = async (req, res) => {
  try {
    const { todos } = req.body; // Array of { id, order }

    if (!Array.isArray(todos)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
      });
    }

    // Update all todos in bulk
    const bulkOps = todos.map((item) => ({
      updateOne: {
        filter: { _id: item.id, user: req.user._id },
        update: { $set: { order: item.order } },
      },
    }));

    await Todo.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Todos reordered successfully",
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get todo statistics
export const getTodoStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, completed, pending, overdue] = await Promise.all([
      Todo.countDocuments({ user: userId }),
      Todo.countDocuments({ user: userId, status: "completed" }),
      Todo.countDocuments({ user: userId, status: "pending" }),
      Todo.countDocuments({
        user: userId,
        status: "pending",
        dueDate: { $lt: new Date() },
      }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        completed,
        pending,
        overdue,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
