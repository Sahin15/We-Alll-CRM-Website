import api from "../services/api";

// Get all todos
export const getMyTodos = async (params) => {
  const response = await api.get("/todos", { params });
  return response.data;
};

// Get todo statistics
export const getTodoStats = async () => {
  const response = await api.get("/todos/stats");
  return response.data;
};

// Create a new todo
export const createTodo = async (data) => {
  const response = await api.post("/todos", data);
  return response.data;
};

// Update a todo
export const updateTodo = async (id, data) => {
  const response = await api.put(`/todos/${id}`, data);
  return response.data;
};

// Toggle todo status
export const toggleTodoStatus = async (id) => {
  const response = await api.patch(`/todos/${id}/toggle`);
  return response.data;
};

// Delete a todo
export const deleteTodo = async (id) => {
  const response = await api.delete(`/todos/${id}`);
  return response.data;
};

// Reorder todos
export const reorderTodos = async (todos) => {
  const response = await api.post("/todos/reorder", { todos });
  return response.data;
};

export const todoApi = {
  getMyTodos,
  getTodoStats,
  createTodo,
  updateTodo,
  toggleTodoStatus,
  deleteTodo,
  reorderTodos,
};
