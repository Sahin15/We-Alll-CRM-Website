import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  Card,
  Alert,
  Spinner,
} from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import { toast } from "../../utils/toast";
import { salaryStructureApi } from "../../api/salaryApi";

const SalaryIncrementModal = ({ show, onHide, currentStructure, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [incrementType, setIncrementType] = useState("percentage"); // percentage or fixed
  const [incrementValue, setIncrementValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState(null);

  // Calculate preview when increment value changes
  useEffect(() => {
    if (currentStructure && incrementValue) {
      const increment = parseFloat(incrementValue);
      if (isNaN(increment) || increment < 0) return;

      let newBasicSalary = currentStructure.basicSalary;
      let newHra = currentStructure.hra;
      let newSpecialAllowance = currentStructure.specialAllowance;

      if (incrementType === "percentage") {
        const multiplier = 1 + increment / 100;
        newBasicSalary = Math.round(currentStructure.basicSalary * multiplier);
        newHra = Math.round(currentStructure.hra * multiplier);
        newSpecialAllowance = Math.round(currentStructure.specialAllowance * multiplier);
      } else {
        newBasicSalary = currentStructure.basicSalary + increment;
        newHra = currentStructure.hra + increment;
        newSpecialAllowance = currentStructure.specialAllowance + increment;
      }

      const newGrossSalary =
        newBasicSalary +
        newHra +
        newSpecialAllowance +
        currentStructure.transportAllowance +
        currentStructure.medicalAllowance;

      const newNetSalary = newGrossSalary - currentStructure.totalDeductions;
      const newCtc = newGrossSalary * 12;

      setPreview({
        oldBasicSalary: currentStructure.basicSalary,
        newBasicSalary,
        oldGrossSalary: currentStructure.grossSalary,
        newGrossSalary,
        oldNetSalary: currentStructure.netSalary,
        newNetSalary,
        oldCtc: currentStructure.ctc,
        newCtc,
        difference: newNetSalary - currentStructure.netSalary,
      });
    }
  }, [incrementValue, incrementType, currentStructure]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!incrementValue || !effectiveDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const increment = parseFloat(incrementValue);
    if (isNaN(increment) || increment < 0) {
      toast.error("Please enter a valid increment value");
      return;
    }

    try {
      setLoading(true);

      // Calculate new salary values
      let newBasicSalary = currentStructure.basicSalary;
      let newHra = currentStructure.hra;
      let newSpecialAllowance = currentStructure.specialAllowance;

      if (incrementType === "percentage") {
        const multiplier = 1 + increment / 100;
        newBasicSalary = Math.round(currentStructure.basicSalary * multiplier);
        newHra = Math.round(currentStructure.hra * multiplier);
        newSpecialAllowance = Math.round(currentStructure.specialAllowance * multiplier);
      } else {
        newBasicSalary = currentStructure.basicSalary + increment;
        newHra = currentStructure.hra + increment;
        newSpecialAllowance = currentStructure.specialAllowance + increment;
      }

      // Create new salary structure
      const newStructureData = {
        employee: currentStructure.employee._id,
        effectiveFrom: effectiveDate,
        basicSalary: newBasicSalary,
        hra: newHra,
        specialAllowance: newSpecialAllowance,
        transportAllowance: currentStructure.transportAllowance,
        medicalAllowance: currentStructure.medicalAllowance,
        otherAllowances: currentStructure.otherAllowances || [],
        providentFund: currentStructure.providentFund,
        professionalTax: currentStructure.professionalTax,
        tds: currentStructure.tds,
        esi: currentStructure.esi,
        otherDeductions: currentStructure.otherDeductions || [],
        notes: `Salary increment: ${incrementType === "percentage" ? increment + "%" : "₹" + increment}. ${notes}`,
        status: "draft",
      };

      await salaryStructureApi.create(newStructureData);
      toast.success("Salary increment created successfully. Please activate it to apply.");
      onHide();
      onSuccess();
    } catch (error) {
      console.error("Error creating salary increment:", error);
      toast.error(error.response?.data?.message || "Failed to create salary increment");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaPlus className="me-2" />
          Create Salary Increment
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!currentStructure ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2">Loading current salary structure...</p>
          </div>
        ) : (
          <>
            <Alert variant="info">
              <strong>Current Salary:</strong> {formatCurrency(currentStructure.netSalary)}/month
              <br />
              <strong>Annual CTC:</strong> {formatCurrency(currentStructure.ctc)}
            </Alert>

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Increment Type</Form.Label>
                    <Form.Select
                      value={incrementType}
                      onChange={(e) => setIncrementType(e.target.value)}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Increment Value {incrementType === "percentage" ? "(%)" : "(₹)"}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      placeholder={incrementType === "percentage" ? "e.g., 10" : "e.g., 5000"}
                      value={incrementValue}
                      onChange={(e) => setIncrementValue(e.target.value)}
                      step={incrementType === "percentage" ? "0.1" : "100"}
                      min="0"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Effective Date</Form.Label>
                <Form.Control
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  min={getMinDate()}
                  required
                />
                <Form.Text className="text-muted">
                  The date from which this salary increment will be effective
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notes (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="e.g., Annual appraisal increment, promotion increment, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Form.Group>

              {preview && (
                <Card className="mb-3 bg-light">
                  <Card.Header className="bg-primary text-white">
                    <strong>Increment Preview</strong>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Basic Salary</small>
                          <div>
                            <span className="text-muted text-decoration-line-through">
                              {formatCurrency(preview.oldBasicSalary)}
                            </span>
                            <span className="ms-2 text-success fw-bold">
                              {formatCurrency(preview.newBasicSalary)}
                            </span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Gross Salary</small>
                          <div>
                            <span className="text-muted text-decoration-line-through">
                              {formatCurrency(preview.oldGrossSalary)}
                            </span>
                            <span className="ms-2 text-success fw-bold">
                              {formatCurrency(preview.newGrossSalary)}
                            </span>
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="mb-2">
                          <small className="text-muted">Monthly Net Salary</small>
                          <div>
                            <span className="text-muted text-decoration-line-through">
                              {formatCurrency(preview.oldNetSalary)}
                            </span>
                            <span className="ms-2 text-success fw-bold">
                              {formatCurrency(preview.newNetSalary)}
                            </span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Annual CTC</small>
                          <div>
                            <span className="text-muted text-decoration-line-through">
                              {formatCurrency(preview.oldCtc)}
                            </span>
                            <span className="ms-2 text-success fw-bold">
                              {formatCurrency(preview.newCtc)}
                            </span>
                          </div>
                        </div>
                      </Col>
                    </Row>
                    <hr />
                    <div className="text-center">
                      <strong className="text-success">
                        Monthly Increase: {formatCurrency(preview.difference)}
                      </strong>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </Form>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || !currentStructure}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Creating...
            </>
          ) : (
            <>
              <FaPlus className="me-2" />
              Create Increment
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SalaryIncrementModal;
