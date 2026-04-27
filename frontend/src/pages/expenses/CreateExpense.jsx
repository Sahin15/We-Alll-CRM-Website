import { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from "react-bootstrap";
import { FaArrowLeft, FaPlus, FaUpload, FaTimes, FaFileImage } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "../../utils/toast";
import { expenseApi } from "../../api/expenseApi";
import api from "../../services/api";
import { EXPENSE_PURPOSES_ARRAY, EXPENSE_TYPES_ARRAY } from "../../utils/expenseConstants";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" },
];

const CreateExpense = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [formData, setFormData] = useState({
    expensePurpose: "",
    expenseType: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    merchant: "",
    paymentMethod: "",
    notes: "",
  });

  const isReceiptRequired = parseFloat(formData.amount) >= 500;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReceiptChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an image (JPG, PNG, GIF) or PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setReceiptFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }

    // Upload immediately
    await uploadReceipt(file);
  };

  const uploadReceipt = async (file) => {
    try {
      setUploadingReceipt(true);
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await api.post('/upload/expense-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setReceiptUrl(response.data.imageUrl);
      toast.success("Receipt uploaded successfully");
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error(error.response?.data?.message || "Failed to upload receipt");
      setReceiptFile(null);
      setReceiptPreview(null);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.expensePurpose || !formData.expenseType || !formData.amount || !formData.date || !formData.description || !formData.paymentMethod) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    // Check if receipt is required
    if (isReceiptRequired && !receiptUrl) {
      toast.error("Receipt is required for expenses of ₹500 or more");
      return;
    }

    try {
      setLoading(true);
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        receiptUrl: receiptUrl || null,
        receiptFileName: receiptFile?.name || null,
      };

      await expenseApi.createExpense(expenseData);
      toast.success("Expense created successfully");
      navigate("/expenses/my-expenses");
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error(error.response?.data?.message || "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="mb-0">Create New Expense</h2>
        </div>
      </div>

      <Row className="mb-4">
        <Col lg={8} className="mx-auto">
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                {/* Purpose and Type Row */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Expense Purpose <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        name="expensePurpose"
                        value={formData.expensePurpose}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Purpose</option>
                        {EXPENSE_PURPOSES_ARRAY.map((purpose) => (
                          <option key={purpose.value} value={purpose.value}>
                            {purpose.label}
                          </option>
                        ))}
                      </Form.Select>
                      <small className="text-muted">Why was this expense made?</small>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        Expense Type <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        name="expenseType"
                        value={formData.expenseType}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Type</option>
                        {EXPENSE_TYPES_ARRAY.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Form.Select>
                      <small className="text-muted">What was spent on?</small>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Amount and Date Row */}
                <Row>
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
                </Row>

                {/* Payment Method */}
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

                {/* Receipt Upload */}
                <Form.Group className="mb-4">
                  <Form.Label>
                    Receipt/Proof {isReceiptRequired && <span className="text-danger">*</span>}
                  </Form.Label>
                  {isReceiptRequired && (
                    <Alert variant="warning" className="py-2 mb-2">
                      <small>Receipt is mandatory for expenses of ₹500 or more</small>
                    </Alert>
                  )}
                  {!isReceiptRequired && formData.amount && (
                    <Alert variant="info" className="py-2 mb-2">
                      <small>Receipt is optional for expenses under ₹500</small>
                    </Alert>
                  )}
                  
                  {!receiptFile ? (
                    <div className="border-2 border-dashed rounded p-4 text-center" style={{ borderStyle: 'dashed', borderColor: '#dee2e6' }}>
                      <FaUpload size={32} className="text-muted mb-2" />
                      <p className="mb-2">Upload receipt or proof of expense</p>
                      <Form.Control
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleReceiptChange}
                        disabled={uploadingReceipt}
                        className="d-none"
                        id="receiptUpload"
                      />
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => document.getElementById('receiptUpload').click()}
                        disabled={uploadingReceipt}
                      >
                        {uploadingReceipt ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <FaUpload className="me-2" />
                            Choose File
                          </>
                        )}
                      </Button>
                      <p className="text-muted small mt-2 mb-0">
                        Supported: JPG, PNG, GIF, PDF (Max 10MB)
                      </p>
                    </div>
                  ) : (
                    <Card className="border">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            {receiptPreview ? (
                              <img
                                src={receiptPreview}
                                alt="Receipt preview"
                                style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                className="rounded me-3"
                              />
                            ) : (
                              <FaFileImage size={40} className="text-muted me-3" />
                            )}
                            <div>
                              <p className="mb-0 fw-medium">{receiptFile.name}</p>
                              <small className="text-muted">
                                {(receiptFile.size / 1024).toFixed(2)} KB
                              </small>
                            </div>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={handleRemoveReceipt}
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  )}
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
                    disabled={loading}
                    className="d-flex align-items-center"
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FaPlus className="me-2" />
                        Create Expense
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

export default CreateExpense;
