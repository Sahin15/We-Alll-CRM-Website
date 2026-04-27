import api from "../services/api";

export const supportApi = {
  getCategories:    ()           => api.get("/support-contacts"),
  getAllCategories:  ()           => api.get("/support-contacts/all"),
  createCategory:   (data)       => api.post("/support-contacts", data),
  updateCategory:   (slug, data) => api.put(`/support-contacts/${slug}`, data),
  deleteCategory:   (slug)       => api.delete(`/support-contacts/${slug}`),
};
