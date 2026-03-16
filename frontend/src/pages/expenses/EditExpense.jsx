import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import toast from "../../utils/toast";
import { expenseApi } from "../../api/expenseApi";

const EXPENSE_CATEGORIES = [
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food & Meals" },
  { value: "accommodation", label: "Accommodation" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "client_meeting", label: "Client Meeting" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" },
];

const EditExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    date: "",
    description: "",
    merchant: "",
    paymentMethod: "",
    notes: "",
  });

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await expenseApi.getExpenseById(id);
      const expense = response.expense || response;
      
      setFormData({
        category: expense.category || "",
        amount: expense.amount || "",
        date: expense.date ? expense.date.split("T")[0] : "",
        description: expense.description || "",
        merchant: expense.merchant || "",
        paymentMethod: expense.paymentMethod || "",
        notes: expense.notes || "",
      });
    } catch (error) {
      console.error("Error fetching expense:", error);
      toast.error("Failed to load expense");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.category || !formData.amount || !formData.date || !formData.description || !formData.paymentMethod) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      setSubmitting(true);
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      await expenseApi.updateExpense(id, expenseData);
      toast.success("Expense updated successfully");
      navigate(`/expenses/${id}`);
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error(error.response?.data?.message || "Failed to update expense");
    } finally {
      setSubmitting(false);
    }
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
          <h2 className="mb-0">Edit Expense</h2>
        </div>
      </div>

      <Row className="mb-4">
        <Col lg={8} className="mx-auto">
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                {/* Category and Amount Row */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Category <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Category</option>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Amount <span className="text-danger">*</span>
                      </Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                        />
                        <span className="input-group-text">INR</span>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Date and Payment Method Row */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Expense Date <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Payment Method <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Payment Method</option>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Description */}
                <Form.Group className="mb-3">
                  <Form.Label>
                    Description <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="What was this expense for?"
                    required
                    maxLength={500}
                  />
                  <small className="text-muted">{formData.description.length}/500</small>
                </Form.Group>

                {/* Merchant */}
                <Form.Group className="mb-3">
                  <Form.Label>Merchant/Vendor</Form.Label>
                  <Form.Control
                    type="text"
                    name="merchant"
                    value={formData.merchant}
                    onChange={handleInputChange}
                    placeholder="Where did you spend the money?"
                    maxLength={200}
                  />
                </Form.Group>

                {/* Notes */}
                <Form.Group className="mb-4">
                  <Form.Label>Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional information..."
                    maxLength={1000}
                  />
                  <small className="text-muted">{formData.notes.length}/1000</small>
                </Form.Group>

                {/* Buttons */}
                <div className="d-flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(-1)}
                    className="d-flex align-items-center"
                  >
                    <FaArrowLeft className="me-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={submitting}
                    className="d-flex align-items-center"
                  >
                    {submitting ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" />
                        Update Expense
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EditExpense;
