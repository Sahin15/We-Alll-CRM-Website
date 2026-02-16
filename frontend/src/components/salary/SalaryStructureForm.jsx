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
import { toast } from "react-toastify";
import { salaryStructureApi } from "../../api/salaryApi";
import api from "../../services/api";

const SalaryStructureForm = ({ show, onHide, structure, onSuccess }) => {
  const [formData, setFormData] = useState({
    employee: "",
    effectiveFrom: "",
    basicSalary: "", // Empty string instead of 0
    hra: "",
    specialAllowance: "",
    transportAllowance: "",
    medicalAllowance: "",
    providentFund: "",
    professionalTax: "200", // Default value as string
    tds: "",
    esi: "",
    otherDeductions: [], // Array for custom deductions
    notes: "",
  });
  const [employees, setEmployees] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState({
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0,
    ctc: 0,
  });

  useEffect(() => {
    if (show) {
      fetchEmployees();
      if (structure) {
        // Edit mode
        setFormData({
          employee: structure.employee._id,
          effectiveFrom: new Date(structure.effectiveFrom).toISOString().split("T")[0],
          basicSalary: structure.basicSalary.toString(),
          hra: structure.hra.toString(),
          specialAllowance: structure.specialAllowance.toString(),
          transportAllowance: structure.transportAllowance.toString(),
          medicalAllowance: structure.medicalAllowance.toString(),
          providentFund: structure.providentFund.toString(),
          professionalTax: structure.professionalTax.toString(),
          tds: structure.tds.toString(),
          esi: structure.esi.toString(),
          otherDeductions: structure.otherDeductions || [],
          notes: structure.notes || "",
        });
      } else {
        // Create mode
        resetForm();
      }
    }
  }, [show, structure]);

  useEffect(() => {
    calculateTotals();
  }, [formData]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/users/employees");
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const resetForm = () => {
    setFormData({
      employee: "",
      effectiveFrom: "",
      basicSalary: "", // Empty string instead of 0
      hra: "",
      specialAllowance: "",
      transportAllowance: "",
      medicalAllowance: "",
      providentFund: "",
      professionalTax: "200", // Default value as string
      tds: "",
      esi: "",
      otherDeductions: [], // Array for custom deductions
      notes: "",
    });
  };

  const calculateTotals = () => {
    const {
      basicSalary,
      hra,
      specialAllowance,
      transportAllowance,
      medicalAllowance,
      providentFund,
      professionalTax,
      tds,
      esi,
      otherDeductions,
    } = formData;

    // Convert all values to numbers, handle empty strings as 0
    const basicSalaryNum = basicSalary === "" ? 0 : Number(basicSalary) || 0;
    const hraNum = hra === "" ? 0 : Number(hra) || 0;
    const specialAllowanceNum = specialAllowance === "" ? 0 : Number(specialAllowance) || 0;
    const transportAllowanceNum = transportAllowance === "" ? 0 : Number(transportAllowance) || 0;
    const medicalAllowanceNum = medicalAllowance === "" ? 0 : Number(medicalAllowance) || 0;
    const providentFundNum = providentFund === "" ? 0 : Number(providentFund) || 0;
    const professionalTaxNum = professionalTax === "" ? 0 : Number(professionalTax) || 0;
    const tdsNum = tds === "" ? 0 : Number(tds) || 0;
    const esiNum = esi === "" ? 0 : Number(esi) || 0;

    // Calculate other deductions total
    const otherDeductionsNum = Array.isArray(otherDeductions) 
      ? otherDeductions.reduce((sum, deduction) => sum + (Number(deduction.amount) || 0), 0)
      : 0;

    const grossSalary = 
      basicSalaryNum +
      hraNum +
      specialAllowanceNum +
      transportAllowanceNum +
      medicalAllowanceNum;

    const totalDeductions = 
      providentFundNum +
      professionalTaxNum +
      tdsNum +
      esiNum +
      otherDeductionsNum;

    const netSalary = grossSalary - totalDeductions;
    const ctc = grossSalary * 12;

    setCalculations({
      grossSalary,
      totalDeductions,
      netSalary,
      ctc,
    });
  };

  const handleInputChange = (field, value) => {
    // Allow empty string or valid numbers for numeric fields
    const numericFields = [
      'basicSalary', 'hra', 'specialAllowance', 'transportAllowance', 
      'medicalAllowance', 'providentFund', 'professionalTax', 'tds', 'esi'
    ];
    
    if (numericFields.includes(field)) {
      if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleBasicSalaryChange = (value) => {
    // Allow empty string or valid numbers
    if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
      // No automatic calculations - company doesn't use HRA or PF currently
      // All allowances and deductions are set manually
      setFormData((prev) => ({
        ...prev,
        basicSalary: value, // Keep as string for input display
      }));
    }
  };

  // Helper functions for managing other deductions
  const addOtherDeduction = () => {
    setFormData((prev) => ({
      ...prev,
      otherDeductions: [
        ...prev.otherDeductions,
        { name: "", amount: "", reason: "" }
      ]
    }));
  };

  const updateOtherDeduction = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      otherDeductions: prev.otherDeductions.map((deduction, i) => 
        i === index ? { ...deduction, [field]: value } : deduction
      )
    }));
  };

  const removeOtherDeduction = (index) => {
    setFormData((prev) => ({
      ...prev,
      otherDeductions: prev.otherDeductions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee || !formData.effectiveFrom || !formData.basicSalary || formData.basicSalary === "" || Number(formData.basicSalary) <= 0) {
      toast.error("Please fill in all required fields with valid values");
      return;
    }

    try {
      setLoading(true);

      const data = {
        ...formData,
        basicSalary: Number(formData.basicSalary) || 0,
        hra: Number(formData.hra) || 0,
        specialAllowance: Number(formData.specialAllowance) || 0,
        transportAllowance: Number(formData.transportAllowance) || 0,
        medicalAllowance: Number(formData.medicalAllowance) || 0,
        providentFund: Number(formData.providentFund) || 0,
        professionalTax: Number(formData.professionalTax) || 0,
        tds: Number(formData.tds) || 0,
        esi: Number(formData.esi) || 0,
        otherDeductions: formData.otherDeductions.map(deduction => ({
          name: deduction.name,
          amount: Number(deduction.amount) || 0,
          reason: deduction.reason || ""
        })).filter(deduction => deduction.name && deduction.amount > 0), // Only include valid deductions
      };

      if (structure) {
        await salaryStructureApi.update(structure._id, data);
        toast.success("Salary structure updated successfully");
      } else {
        await salaryStructureApi.create(data);
        toast.success("Salary structure created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving salary structure:", error);
      const message = error.response?.data?.message || "Failed to save salary structure";
      toast.error(message);
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

  return (
    <>
      {/* Add CSS for smooth dropdown interactions */}
      <style>
        {`
          .dropdown-item-hover:hover {
            background-color: #f8f9fa !important;
            transition: background-color 0.15s ease-in-out;
          }
          .salary-dropdown-container {
            position: relative;
            z-index: 10000;
          }
          .salary-dropdown-list {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            z-index: 999999;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            max-height: 200px;
            overflow-y: auto;
            margin-top: 2px;
          }
        `}
      </style>
      
      <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          {structure ? "Edit Salary Structure" : "Create Salary Structure"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ position: 'relative', zIndex: 1 }}>
          <Row>
            <Col md={8}>
              {/* Basic Information */}
              <Card className="mb-3" style={{ overflow: 'visible', position: 'relative', zIndex: 100 }}>
                <Card.Header>
                  <strong>Basic Information</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Employee *</Form.Label>
                        {!!structure ? (
                          // Edit mode - show selected employee as disabled field
                          <Form.Control
                            type="text"
                            value={structure.employee.name}
                            disabled
                          />
                        ) : (
                          // Create mode - show searchable dropdown
                          <div className="salary-dropdown-container">
                            <Form.Control
                              type="text"
                              placeholder="Type to search employees..."
                              value={employeeSearchTerm}
                              onChange={(e) => {
                                setEmployeeSearchTerm(e.target.value);
                                setShowEmployeeDropdown(true);
                                handleInputChange("employee", ''); // Clear selection when typing
                              }}
                              onFocus={() => setShowEmployeeDropdown(true)}
                              required={!formData.employee}
                            />
                            
                            {/* Selected employee display */}
                            {formData.employee && !showEmployeeDropdown && (
                              <div className="mt-2">
                                <span className="badge bg-primary me-2">
                                  {employees.find(emp => emp._id === formData.employee)?.name}
                                  <button
                                    type="button"
                                    className="btn-close btn-close-white ms-2"
                                    style={{ fontSize: '0.7em' }}
                                    onClick={() => {
                                      handleInputChange("employee", '');
                                      setEmployeeSearchTerm('');
                                    }}
                                  ></button>
                                </span>
                              </div>
                            )}

                            {/* Dropdown list */}
                            {showEmployeeDropdown && (
                              <div className="salary-dropdown-list">
                                {employees
                                  .filter(emp => 
                                    emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map((employee) => (
                                    <div
                                      key={employee._id}
                                      className="p-2 border-bottom dropdown-item-hover"
                                      style={{ 
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => {
                                        handleInputChange("employee", employee._id);
                                        setEmployeeSearchTerm(employee.name);
                                        setShowEmployeeDropdown(false);
                                      }}
                                    >
                                      <div className="fw-medium">{employee.name}</div>
                                      {employee.department && (
                                        <small className="text-muted">{employee.department.name}</small>
                                      )}
                                    </div>
                                  ))
                                }
                                {employees.filter(emp => 
                                  emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                                ).length === 0 && (
                                  <div className="p-3 text-muted text-center">
                                    No employees found matching "{employeeSearchTerm}"
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Click outside to close dropdown */}
                            {showEmployeeDropdown && (
                              <div 
                                className="position-fixed w-100 h-100"
                                style={{ top: 0, left: 0, zIndex: 999998 }} // Just below dropdown
                                onClick={() => setShowEmployeeDropdown(false)}
                              />
                            )}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Effective From *</Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.effectiveFrom}
                          onChange={(e) => handleInputChange("effectiveFrom", e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Earnings */}
              <Card className="mb-3" style={{ position: 'relative', zIndex: 1 }}>
                <Card.Header className="bg-success text-white">
                  <strong>Earnings</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Basic Salary *</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.basicSalary}
                          onChange={(e) => handleBasicSalaryChange(e.target.value)}
                          placeholder="Enter basic salary"
                          required
                          min="1"
                        />
                        <Form.Text className="text-muted">
                          All allowances and deductions are set manually as per company policy
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>HRA (House Rent Allowance)</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.hra}
                          onChange={(e) => handleInputChange("hra", e.target.value)}
                          placeholder="Enter HRA amount (currently 0)"
                          min="0"
                        />
                        <Form.Text className="text-muted">
                          Currently set to 0. Can be configured manually when company implements HRA policy.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Special Allowance</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.specialAllowance}
                          onChange={(e) => handleInputChange("specialAllowance", e.target.value)}
                          placeholder="Enter special allowance"
                          min="0"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Transport Allowance</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.transportAllowance}
                          onChange={(e) => handleInputChange("transportAllowance", e.target.value)}
                          placeholder="Enter transport allowance"
                          min="0"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Medical Allowance</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.medicalAllowance}
                          onChange={(e) => handleInputChange("medicalAllowance", e.target.value)}
                          placeholder="Enter medical allowance"
                          min="0"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Deductions */}
              <Card className="mb-3">
                <Card.Header className="bg-danger text-white">
                  <strong>Deductions</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Provident Fund (PF)</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.providentFund}
                          onChange={(e) => handleInputChange("providentFund", e.target.value)}
                          placeholder="Enter PF amount (currently 0)"
                          min="0"
                        />
                        <Form.Text className="text-muted">
                          Currently set to 0. Can be configured manually when company implements PF policy.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Professional Tax</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.professionalTax}
                          onChange={(e) => handleInputChange("professionalTax", e.target.value)}
                          placeholder="Enter professional tax"
                          min="0"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>TDS</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.tds}
                          onChange={(e) => handleInputChange("tds", e.target.value)}
                          placeholder="Enter TDS amount"
                          min="0"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>ESI</Form.Label>
                        <Form.Control
                          type="number"
                          value={formData.esi}
                          onChange={(e) => handleInputChange("esi", e.target.value)}
                          placeholder="Enter ESI amount"
                          min="0"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  {/* Other Deductions Section */}
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Other Deductions</h6>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={addOtherDeduction}
                      >
                        + Add Deduction
                      </Button>
                    </div>
                    
                    {formData.otherDeductions.map((deduction, index) => (
                      <Card key={index} className="mb-3 border-secondary">
                        <Card.Body className="py-3">
                          <Row>
                            <Col md={4}>
                              <Form.Group className="mb-2">
                                <Form.Label className="small">Deduction Name *</Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="e.g., Loan EMI, Advance Recovery"
                                  value={deduction.name}
                                  onChange={(e) => updateOtherDeduction(index, 'name', e.target.value)}
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={3}>
                              <Form.Group className="mb-2">
                                <Form.Label className="small">Amount *</Form.Label>
                                <Form.Control
                                  type="number"
                                  placeholder="0"
                                  value={deduction.amount}
                                  onChange={(e) => updateOtherDeduction(index, 'amount', e.target.value)}
                                  min="0"
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group className="mb-2">
                                <Form.Label className="small">Reason</Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="Optional reason for deduction"
                                  value={deduction.reason}
                                  onChange={(e) => updateOtherDeduction(index, 'reason', e.target.value)}
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>
                            <Col md={1} className="d-flex align-items-end">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeOtherDeduction(index)}
                                className="mb-2"
                              >
                                ×
                              </Button>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    ))}
                    
                    {formData.otherDeductions.length === 0 && (
                      <div className="text-center py-3 text-muted">
                        <small>No additional deductions added. Click "Add Deduction" to add custom deductions.</small>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>

              {/* Notes */}
              <Card>
                <Card.Header>
                  <strong>Notes</strong>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Add any notes about this salary structure..."
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* Summary */}
            <Col md={4}>
              <Card className="sticky-top">
                <Card.Header className="bg-primary text-white">
                  <strong>Summary</strong>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <h6>Earnings</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Basic Salary</small>
                      <small>{formatCurrency(formData.basicSalary === "" ? 0 : Number(formData.basicSalary) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>HRA</small>
                      <small>{formatCurrency(formData.hra === "" ? 0 : Number(formData.hra) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Allowances</small>
                      <small>
                        {formatCurrency(
                          (formData.specialAllowance === "" ? 0 : Number(formData.specialAllowance) || 0) +
                          (formData.transportAllowance === "" ? 0 : Number(formData.transportAllowance) || 0) +
                          (formData.medicalAllowance === "" ? 0 : Number(formData.medicalAllowance) || 0)
                        )}
                      </small>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Gross Salary</strong>
                      <strong className="text-success">
                        {formatCurrency(calculations.grossSalary)}
                      </strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h6>Deductions</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <small>PF</small>
                      <small>{formatCurrency(formData.providentFund === "" ? 0 : Number(formData.providentFund) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>TDS</small>
                      <small>{formatCurrency(formData.tds === "" ? 0 : Number(formData.tds) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Others (PT + ESI)</small>
                      <small>
                        {formatCurrency(
                          (formData.professionalTax === "" ? 0 : Number(formData.professionalTax) || 0) + 
                          (formData.esi === "" ? 0 : Number(formData.esi) || 0)
                        )}
                      </small>
                    </div>
                    {formData.otherDeductions.length > 0 && (
                      <div className="d-flex justify-content-between mb-1">
                        <small>Custom Deductions</small>
                        <small>
                          {formatCurrency(
                            formData.otherDeductions.reduce((sum, deduction) => 
                              sum + (Number(deduction.amount) || 0), 0
                            )
                          )}
                        </small>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Total Deductions</strong>
                      <strong className="text-danger">
                        {formatCurrency(calculations.totalDeductions)}
                      </strong>
                    </div>
                  </div>

                  <Alert variant="success" className="text-center">
                    <h5 className="mb-1">Net Salary</h5>
                    <h3 className="mb-0">{formatCurrency(calculations.netSalary)}</h3>
                  </Alert>

                  <Alert variant="info" className="text-center">
                    <h6 className="mb-1">Annual CTC</h6>
                    <h4 className="mb-0">{formatCurrency(calculations.ctc)}</h4>
                  </Alert>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>Save Structure</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
    </>
  );
};

export default SalaryStructureForm;