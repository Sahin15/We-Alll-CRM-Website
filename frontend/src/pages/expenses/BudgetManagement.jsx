import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Table, Badge, Modal } from "react-bootstrap";
import { FaArrowLeft, FaEdit, FaSave, FaTimes, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getAllBudgets, setBudget, setBulkBudgets, getFinancialYears } from "../../api/expenseApi";
import { useAuth } from "../../context/AuthContext";
import toast from "../../utils/toast";
import "./ExpenseManagement.css";

const BudgetManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Role-based access control
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return (
      <Container className="py-5 text-center">
        <Alert variant="danger">
          <h4>Access Denied</h4>
          <p>You don't have permission to access Budget Management. Only Admin and Super Admin can manage budgets.</p>
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            <FaArrowLeft className="me-2" />
            Go Back
          </Button>
        </Alert>
      </Container>
    );
  }

  const [budgets, setBudgets] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    limit: "",
    description: "",
  });

  const CATEGORIES = [
    { value: "travel", label: "Travel" },
    { value: "food", label: "Food & Meals" },
    { value: "accommodation", label: "Accommodation" },
    { value: "office_supplies", label: "Office Supplies" },
    { value: "client_meeting", label: "Client Meeting" },
    { value: "training", label: "Training" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  useEffect(() => {
    if (selectedFinancialYear) {
      fetchBudgets();
    }
  }, [selectedFinancialYear]);

  const fetchFinancialYears = async () => {
    try {
      const response = await getFinancialYears();
      setFinancialYears(response.financialYears || []);
      setSelectedFinancialYear(response.currentFinancialYear);
    } catch (error) {
      console.error("Error fetching financial years:", error);
      toast.error("Failed to load financial years");
    }
  };

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await getAllBudgets({ financialYear: selectedFinancialYear });
      setBudgets(response.budgets || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setEditingId(budget._id);
      setFormData({
        category: budget.category,
        limit: budget.limit,
        description: budget.description,
      });
    } else {
      setEditingId(null);
      setFormData({
        category: "",
        limit: "",
        description: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      category: "",
      limit: "",
      description: "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveBudget = async () => {
    try {
      if (!formData.category || !formData.limit) {
        toast.warning("Please fill in all required fields");
        return;
      }

      if (parseFloat(formData.limit) < 0) {
        toast.warning("Budget limit cannot be negative");
        return;
      }

      setSubmitting(true);
      await setBudget({
        category: formData.category,
        limit: parseFloat(formData.limit),
        description: formData.description,
        financialYear: selectedFinancialYear,
      });

      toast.success(`Budget for ${formData.category} updated successfully`);
      handleCloseModal();
      fetchBudgets();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error(error.response?.data?.message || "Failed to save budget");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getCategoryLabel = (category) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button
            variant="outline-secondary"
            size="sm"
            className="me-3"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
          <h2 className="mb-0">Budget Management</h2>
        </div>
        <div className="d-flex align-items-end gap-3">
          <div>
            <Form.Label className="small text-muted mb-1 d-block">Financial Year</Form.Label>
            <Form.Select
              value={selectedFinancialYear}
              onChange={(e) => setSelectedFinancialYear(e.target.value)}
              style={{ minWidth: "150px" }}
            >
              {financialYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Form.Select>
          </div>
          <Button
            variant="primary"
            onClick={() => handleOpenModal()}
          >
            <FaPlus className="me-2" />
            Add Budget
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert variant="info" className="mb-4">
        <strong>Budget Management:</strong> Set spending limits for each expense category for the financial year (April to March). 
        These limits will be used to track and alert when expenses exceed the budget. 
        <br />
        <small><strong>Current Financial Year:</strong> {selectedFinancialYear}</small>
      </Alert>

      {/* Budgets Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Category Budgets</h6>
        </Card.Header>
        <Card.Body>
          {budgets.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No budgets configured yet. Click "Add Budget" to create one.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Category</th>
                    <th>Budget Limit</th>
                    <th>Description</th>
                    <th>Last Updated</th>
                    <th>Updated By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((budget) => (
                    <tr key={budget._id}>
                      <td>
                        <Badge bg="primary">
                          {getCategoryLabel(budget.category)}
                        </Badge>
                      </td>
                      <td>
                        <strong>{formatCurrency(budget.limit)}</strong>
                      </td>
                      <td>
                        <small>{budget.description || "-"}</small>
                      </td>
                      <td>
                        <small>
                          {new Date(budget.updatedAt).toLocaleDateString("en-IN")}
                        </small>
                      </td>
                      <td>
                        <small>{budget.updatedBy?.name || "-"}</small>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleOpenModal(budget)}
                          title="Edit Budget"
                        >
                          <FaEdit />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Budget Form Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? "Edit Budget" : "Add New Budget"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Category *</Form.Label>
              <Form.Select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                disabled={editingId !== null}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Budget Limit (₹) *</Form.Label>
              <Form.Control
                type="number"
                name="limit"
                value={formData.limit}
                onChange={handleInputChange}
                placeholder="Enter budget limit"
                min="0"
                step="100"
              />
              <Form.Text className="text-muted">
                Maximum amount that can be spent in this category
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter budget description (optional)"
                rows={3}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            <FaTimes className="me-2" />
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveBudget}
            disabled={submitting}
          >
            <FaSave className="me-2" />
            {submitting ? "Saving..." : "Save Budget"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BudgetManagement;
