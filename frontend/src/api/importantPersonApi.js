import api from "../services/api";

export const importantPersonApi = {
  getPersons:    ()       => api.get("/important-persons"),
  getAllPersons:  ()       => api.get("/important-persons/all"),
  createPerson:  (data)   => api.post("/important-persons", data),
  updatePerson:  (id, data) => api.put(`/important-persons/${id}`, data),
  deletePerson:  (id)     => api.delete(`/important-persons/${id}`),
};
