import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Alert,
  Spinner,
  Dropdown
} from "react-bootstrap";
import { toast } from "../../utils/toast";
import { 
  FaPlus, 
  FaEdit, 
  FaUsers, 
  FaTrash,
  FaChartBar,
  FaHistory
} from "react-icons/fa";
import { salaryTemplateApi } from "../../api/salaryApi";
import api from "../../services/api";

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showUsageStatsModal, setShowUsageStatsModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [usageStats, setUsageStats] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Common designations list
  const commonDesignations = [
    // Software Development
    'Software Engineer',
    'Senior Software Engineer',
    'Lead Software Engineer',
    'Principal Software Engineer',
    'Software Architect',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'Mobile App Developer',
    'DevOps Engineer',
    'QA Engineer',
    'Test Engineer',
    'Automation Engineer',
    
    // Management
    'Team Lead',
    'Technical Lead',
    'Project Manager',
    'Senior Project Manager',
    'Program Manager',
    'Product Manager',
    'Senior Product Manager',
    'Engineering Manager',
    'Development Manager',
    
    // Design & UI/UX
    'UI/UX Designer',
    'Senior UI/UX Designer',
    'Graphic Designer',
    'Product Designer',
    'Visual Designer',
    'Web Designer',
    
    // Data & Analytics
    'Data Analyst',
    'Senior Data Analyst',
    'Data Scientist',
    'Senior Data Scientist',
    'Business Analyst',
    'Senior Business Analyst',
    'Data Engineer',
    
    // Sales & Marketing
    'Sales Executive',
    'Senior Sales Executive',
    'Sales Manager',
    'Business Development Executive',
    'Marketing Executive',
    'Digital Marketing Specialist',
    'Content Writer',
    'SEO Specialist',
    
    // HR & Admin
    'HR Executive',
    'Senior HR Executive',
    'HR Manager',
    'HR Business Partner',
    'Talent Acquisition Specialist',
    'Recruiter',
    'Admin Executive',
    'Office Manager',
    
    // Finance & Accounts
    'Accountant',
    'Senior Accountant',
    'Finance Executive',
    'Finance Manager',
    'Accounts Executive',
    'Financial Analyst',
    
    // Operations
    'Operations Executive',
    'Operations Manager',
    'Process Executive',
    'Quality Analyst',
    'Customer Support Executive',
    'Technical Support Engineer',
    
    // Internships & Entry Level
    'Intern',
    'Trainee',
    'Junior Developer',
    'Associate',
    'Executive',
    
    // Leadership
    'Director',
    'Senior Director',
    'Vice President',
    'Chief Technology Officer',
    'Chief Executive Officer',
    'Head of Department',
    'Department Head'
  ].sort();
  const [templateForm, setTemplateForm] = useState({
    name: "",
    department: "",
    designation: "",
    basicSalary: "",
    hra: "",
    specialAllowance: "",
    transportAllowance: "",
    medicalAllowance: "",
    providentFund: "",
    professionalTax: "200",
    tds: "",
    esi: "",
    hraPercentage: "",
    pfPercentage: "",
    notes: ""
  });
  const [applyForm, setApplyForm] = useState({
    templateId: "",
    employeeIds: [],
    effectiveDate: "",
    bulkApply: false,
    department: "",
    designation: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTemplates(),
        fetchDepartments(),
        fetchEmployees()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await salaryTemplateApi.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/users/employees');
      console.log("Employees fetched:", response.data);
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateForm({
      name: "",
      department: "",
      designation: "",
      basicSalary: "",
      hra: "",
      specialAllowance: "",
      transportAllowance: "",
      medicalAllowance: "",
      providentFund: "",
      professionalTax: "200",
      tds: "",
      esi: "",
      hraPercentage: "",
      pfPercentage: "",
      notes: ""
    });
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      department: template.department._id,
      designation: template.designation,
      basicSalary: template.basicSalary.toString(),
      hra: template.hra.toString(),
      specialAllowance: template.specialAllowance.toString(),
      transportAllowance: template.transportAllowance.toString(),
      medicalAllowance: template.medicalAllowance.toString(),
      providentFund: template.providentFund.toString(),
      professionalTax: template.professionalTax.toString(),
      tds: template.tds.toString(),
      esi: template.esi.toString(),
      hraPercentage: template.hraPercentage?.toString() || "",
      pfPercentage: template.pfPercentage?.toString() || "",
      notes: template.notes || ""
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        ...templateForm,
        basicSalary: Number(templateForm.basicSalary),
        hra: Number(templateForm.hra) || 0,
        specialAllowance: Number(templateForm.specialAllowance) || 0,
        transportAllowance: Number(templateForm.transportAllowance) || 0,
        medicalAllowance: Number(templateForm.medicalAllowance) || 0,
        providentFund: Number(templateForm.providentFund) || 0,
        professionalTax: Number(templateForm.professionalTax) || 0,
        tds: Number(templateForm.tds) || 0,
        esi: Number(templateForm.esi) || 0,
        hraPercentage: Number(templateForm.hraPercentage) || 0,
        pfPercentage: Number(templateForm.pfPercentage) || 0,
        effectiveFrom: new Date()
      };

      if (selectedTemplate) {
        await salaryTemplateApi.update(selectedTemplate._id, templateData);
      } else {
        await salaryTemplateApi.create(templateData);
      }

      toast.success(`Template ${selectedTemplate ? 'updated' : 'created'} successfully`);
      setShowTemplateModal(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const handleApplyTemplate = (template) => {
    setApplyForm({
      templateId: template._id,
      employeeIds: [],
      effectiveDate: new Date().toISOString().split('T')[0],
      bulkApply: false,
      department: template.department._id,
      designation: template.designation
    });
    setSelectedTemplate(template);
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async () => {
    try {
      // Validation
      if (!applyForm.bulkApply && applyForm.employeeIds.length === 0) {
        toast.error("Please select at least one employee");
        return;
      }

      if (!applyForm.effectiveDate) {
        toast.error("Please select an effective date");
        return;
      }

      const body = applyForm.bulkApply 
        ? {
            department: applyForm.department,
            designation: applyForm.designation,
            effectiveDate: applyForm.effectiveDate
          }
        : {
            employeeIds: applyForm.employeeIds,
            effectiveDate: applyForm.effectiveDate
          };

      console.log("Applying template with data:", body);

      let response;
      if (applyForm.bulkApply) {
        response = await salaryTemplateApi.bulkApply(applyForm.templateId, body);
      } else {
        response = await salaryTemplateApi.apply(applyForm.templateId, body);
      }

      const data = response.data;
      console.log("Template application response:", data);
      
      toast.success(`Template applied successfully: ${data.results?.success?.length || 0} employees updated`);
      
      if (data.results?.failed?.length > 0) {
        console.warn("Some applications failed:", data.results.failed);
        toast.warning(`${data.results.failed.length} applications failed. Check console for details.`);
      }
      
      setShowApplyModal(false);
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error(error.response?.data?.message || "Failed to apply template");
    }
  };

  const handleDeleteTemplate = async (template) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      console.log("Attempting to delete template:", templateToDelete._id);
      
      const response = await salaryTemplateApi.delete(templateToDelete._id);
      console.log("Delete response:", response);
      
      toast.success("Template deleted successfully");
      setShowDeleteModal(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      console.error("Error response:", error.response);
      
      const errorMessage = error.response?.data?.message || "Failed to delete template";
      toast.error(errorMessage);
    }
  };

  const handleViewUsageStats = async (template) => {
    setSelectedTemplate(template);
    setShowUsageStatsModal(true);
    setStatsLoading(true);
    
    try {
      const response = await salaryTemplateApi.getUsageStats(template._id);
      setUsageStats(response.data);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      toast.error("Failed to load usage statistics");
      setUsageStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleViewVersionHistory = async (template) => {
    setSelectedTemplate(template);
    setShowVersionHistoryModal(true);
    setStatsLoading(true);
    
    try {
      const response = await salaryTemplateApi.getVersionHistory(template._id);
      setVersionHistory(response.data);
    } catch (error) {
      console.error("Error fetching version history:", error);
      toast.error("Failed to load version history");
      setVersionHistory([]);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateGrossSalary = () => {
    const basic = Number(templateForm.basicSalary) || 0;
    const hra = Number(templateForm.hra) || 0;
    const special = Number(templateForm.specialAllowance) || 0;
    const transport = Number(templateForm.transportAllowance) || 0;
    const medical = Number(templateForm.medicalAllowance) || 0;
    
    return basic + hra + special + transport + medical;
  };

  const calculateTotalDeductions = () => {
    const pf = Number(templateForm.providentFund) || 0;
    const pt = Number(templateForm.professionalTax) || 0;
    const tds = Number(templateForm.tds) || 0;
    const esi = Number(templateForm.esi) || 0;
    
    return pf + pt + tds + esi;
  };

  const filteredEmployees = employees.filter(emp => 
    (!applyForm.department || emp.department?._id === applyForm.department) &&
    (!applyForm.designation || emp.designation?.toLowerCase().includes(applyForm.designation.toLowerCase()))
  );

  return (
    <div>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4>Salary Structure Templates</h4>
              <p className="text-muted mb-0">Manage reusable salary structure templates</p>
            </div>
            <Button variant="primary" onClick={handleCreateTemplate}>
              <FaPlus className="me-2" />
              Create Template
            </Button>
          </div>
        </Col>
      </Row>

      {/* Templates Table */}
      <Card>
        <Card.Body style={{ overflowX: 'auto', overflowY: 'visible' }}>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Basic Salary</th>
                    <th>Gross Salary</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template._id}>
                      <td>
                        <strong>{template.name}</strong>
                        {template.notes && (
                          <br />
                        )}
                        {template.notes && (
                          <small className="text-muted">{template.notes}</small>
                        )}
                      </td>
                      <td>{template.department.name}</td>
                      <td>{template.designation}</td>
                      <td>{formatCurrency(template.basicSalary)}</td>
                      <td>{formatCurrency(template.grossSalary)}</td>
                      <td>
                        <Badge bg={template.isActive ? "success" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {template.approvedBy && (
                          <Badge bg="info" className="ms-1">Approved</Badge>
                        )}
                      </td>
                      <td>v{template.version}</td>
                      <td>
                        <Dropdown drop="start">
                          <Dropdown.Toggle variant="outline-primary" size="sm">
                            Actions
                          </Dropdown.Toggle>
                          <Dropdown.Menu style={{ zIndex: 1050 }}>
                            <Dropdown.Item onClick={() => handleEditTemplate(template)}>
                              <FaEdit className="me-2" />
                              Edit
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleApplyTemplate(template)}>
                              <FaUsers className="me-2" />
                              Apply to Employees
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleViewUsageStats(template)}>
                              <FaChartBar className="me-2" />
                              View Usage Stats
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleViewVersionHistory(template)}>
                              <FaHistory className="me-2" />
                              Version History
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item 
                              className="text-danger"
                              onClick={() => handleDeleteTemplate(template)}
                            >
                              <FaTrash className="me-2" />
                              Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Template Modal */}
      <Modal show={showTemplateModal} onHide={() => setShowTemplateModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedTemplate ? "Edit Template" : "Create New Template"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={8}>
              {/* Basic Information */}
              <Card className="mb-3">
                <Card.Header>
                  <strong>Basic Information</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Template Name *</Form.Label>
                        <Form.Control
                          type="text"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                          placeholder="e.g., Senior Developer Template"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Department *</Form.Label>
                        <Form.Select
                          value={templateForm.department}
                          onChange={(e) => setTemplateForm({...templateForm, department: e.target.value})}
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Designation *</Form.Label>
                        <Form.Select
                          value={templateForm.designation}
                          onChange={(e) => setTemplateForm({...templateForm, designation: e.target.value})}
                        >
                          <option value="">Select Designation</option>
                          {commonDesignations.map(designation => (
                            <option key={designation} value={designation}>
                              {designation}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Earnings */}
              <Card className="mb-3">
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
                          value={templateForm.basicSalary}
                          onChange={(e) => setTemplateForm({...templateForm, basicSalary: e.target.value})}
                          placeholder="Enter basic salary"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>HRA</Form.Label>
                        <Form.Control
                          type="number"
                          value={templateForm.hra}
                          onChange={(e) => setTemplateForm({...templateForm, hra: e.target.value})}
                          placeholder="Enter HRA amount"
                        />
                        <Form.Text className="text-muted">
                          Or use percentage: {templateForm.hraPercentage}% of basic salary
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
                          value={templateForm.specialAllowance}
                          onChange={(e) => setTemplateForm({...templateForm, specialAllowance: e.target.value})}
                          placeholder="Enter special allowance"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Transport Allowance</Form.Label>
                        <Form.Control
                          type="number"
                          value={templateForm.transportAllowance}
                          onChange={(e) => setTemplateForm({...templateForm, transportAllowance: e.target.value})}
                          placeholder="Enter transport allowance"
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
                          value={templateForm.medicalAllowance}
                          onChange={(e) => setTemplateForm({...templateForm, medicalAllowance: e.target.value})}
                          placeholder="Enter medical allowance"
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
                        <Form.Label>Provident Fund</Form.Label>
                        <Form.Control
                          type="number"
                          value={templateForm.providentFund}
                          onChange={(e) => setTemplateForm({...templateForm, providentFund: e.target.value})}
                          placeholder="Enter PF amount"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Professional Tax</Form.Label>
                        <Form.Control
                          type="number"
                          value={templateForm.professionalTax}
                          onChange={(e) => setTemplateForm({...templateForm, professionalTax: e.target.value})}
                          placeholder="Enter professional tax"
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
                          value={templateForm.tds}
                          onChange={(e) => setTemplateForm({...templateForm, tds: e.target.value})}
                          placeholder="Enter TDS amount"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>ESI</Form.Label>
                        <Form.Control
                          type="number"
                          value={templateForm.esi}
                          onChange={(e) => setTemplateForm({...templateForm, esi: e.target.value})}
                          placeholder="Enter ESI amount"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Auto-calculation Rules */}
              <Card className="mb-3">
                <Card.Header className="bg-info text-white">
                  <strong>Auto-calculation Rules</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>HRA Percentage</Form.Label>
                        <Form.Control
                          type="number"
                          value={templateForm.hraPercentage}
                          onChange={(e) => setTemplateForm({...templateForm, hraPercentage: e.target.value})}
                          placeholder="% of basic salary"
                          max="100"
                        />
                        <Form.Text className="text-muted">
                          If set, HRA will be calculated as percentage of basic salary
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>PF Percentage</Form.Label>
                        <Form.Control
                          type="number"
                          value={templateForm.pfPercentage}
                          onChange={(e) => setTemplateForm({...templateForm, pfPercentage: e.target.value})}
                          placeholder="% of basic salary"
                          max="100"
                        />
                        <Form.Text className="text-muted">
                          If set, PF will be calculated as percentage of basic salary
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
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
                      value={templateForm.notes}
                      onChange={(e) => setTemplateForm({...templateForm, notes: e.target.value})}
                      placeholder="Add any notes about this template..."
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>

            {/* Summary */}
            <Col md={4}>
              <Card className="sticky-top">
                <Card.Header className="bg-primary text-white">
                  <strong>Template Summary</strong>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <h6>Earnings</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Basic Salary</small>
                      <small>{formatCurrency(Number(templateForm.basicSalary) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>HRA</small>
                      <small>{formatCurrency(Number(templateForm.hra) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Allowances</small>
                      <small>
                        {formatCurrency(
                          (Number(templateForm.specialAllowance) || 0) +
                          (Number(templateForm.transportAllowance) || 0) +
                          (Number(templateForm.medicalAllowance) || 0)
                        )}
                      </small>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Gross Salary</strong>
                      <strong className="text-success">
                        {formatCurrency(calculateGrossSalary())}
                      </strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h6>Deductions</h6>
                    <div className="d-flex justify-content-between mb-1">
                      <small>PF</small>
                      <small>{formatCurrency(Number(templateForm.providentFund) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>PT</small>
                      <small>{formatCurrency(Number(templateForm.professionalTax) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>TDS</small>
                      <small>{formatCurrency(Number(templateForm.tds) || 0)}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <small>ESI</small>
                      <small>{formatCurrency(Number(templateForm.esi) || 0)}</small>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Total Deductions</strong>
                      <strong className="text-danger">
                        {formatCurrency(calculateTotalDeductions())}
                      </strong>
                    </div>
                  </div>

                  <Alert variant="success" className="text-center">
                    <h6 className="mb-1">Net Salary</h6>
                    <h4 className="mb-0">
                      {formatCurrency(calculateGrossSalary() - calculateTotalDeductions())}
                    </h4>
                  </Alert>

                  <Alert variant="info" className="text-center">
                    <h6 className="mb-1">Annual CTC</h6>
                    <h5 className="mb-0">
                      {formatCurrency(calculateGrossSalary() * 12)}
                    </h5>
                  </Alert>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveTemplate}>
            {selectedTemplate ? "Update Template" : "Create Template"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Apply Template Modal */}
      <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Apply Template to Employees</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTemplate && (
            <div>
              <Alert variant="info">
                <strong>Template:</strong> {selectedTemplate.name}<br />
                <strong>Department:</strong> {selectedTemplate.department.name}<br />
                <strong>Designation:</strong> {selectedTemplate.designation}
              </Alert>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Effective Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={applyForm.effectiveDate}
                    onChange={(e) => setApplyForm({...applyForm, effectiveDate: e.target.value})}
                  />
                </Form.Group>

                <Form.Check
                  type="checkbox"
                  label="Bulk apply to all employees matching department and designation"
                  checked={applyForm.bulkApply}
                  onChange={(e) => setApplyForm({...applyForm, bulkApply: e.target.checked})}
                  className="mb-3"
                />

                {!applyForm.bulkApply && (
                  <Form.Group className="mb-3">
                    <Form.Label>Select Employees</Form.Label>
                    {employees.length === 0 ? (
                      <Alert variant="info">Loading employees...</Alert>
                    ) : filteredEmployees.length === 0 ? (
                      <Alert variant="warning">
                        No employees found matching the template criteria.
                      </Alert>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem', padding: '0.5rem' }}>
                        {filteredEmployees.map(employee => (
                          <Form.Check
                            key={employee._id}
                            type="checkbox"
                            label={`${employee.name} (${employee.employeeId || 'N/A'}) - ${employee.designation || 'N/A'}`}
                            checked={applyForm.employeeIds.includes(employee._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setApplyForm({
                                  ...applyForm,
                                  employeeIds: [...applyForm.employeeIds, employee._id]
                                });
                              } else {
                                setApplyForm({
                                  ...applyForm,
                                  employeeIds: applyForm.employeeIds.filter(id => id !== employee._id)
                                });
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <Form.Text className="text-muted">
                      {applyForm.employeeIds.length} employee(s) selected
                    </Form.Text>
                  </Form.Group>
                )}

                {applyForm.bulkApply && (
                  <Alert variant="warning">
                    This will apply the template to all employees in <strong>{selectedTemplate.department.name}</strong> 
                    department with designation <strong>{selectedTemplate.designation}</strong>.
                  </Alert>
                )}
              </Form>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApplyModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitApplication}
            disabled={!applyForm.bulkApply && applyForm.employeeIds.length === 0}
          >
            Apply Template
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Usage Stats Modal */}
      <Modal 
        show={showUsageStatsModal} 
        onHide={() => setShowUsageStatsModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title className="d-flex align-items-center">
            <FaChartBar className="me-2" />
            Usage Statistics
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTemplate && (
            <div>
              <div className="mb-4">
                <h5 className="text-primary">{selectedTemplate.name}</h5>
                <div className="row">
                  <div className="col-md-6">
                    <small className="text-muted">Department:</small>
                    <div className="fw-bold">{selectedTemplate.department?.name}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted">Designation:</small>
                    <div className="fw-bold">{selectedTemplate.designation}</div>
                  </div>
                </div>
              </div>

              {statsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <div className="mt-2">Loading usage statistics...</div>
                </div>
              ) : usageStats ? (
                <div>
                  <Row className="mb-4">
                    <Col md={4}>
                      <Card className="text-center border-primary">
                        <Card.Body>
                          <h3 className="text-primary mb-1">{usageStats.totalUsage}</h3>
                          <small className="text-muted">Total Usage</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={4}>
                      <Card className="text-center border-success">
                        <Card.Body>
                          <h3 className="text-success mb-1">{usageStats.activeUsage}</h3>
                          <small className="text-muted">Currently Active</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={4}>
                      <Card className="text-center border-warning">
                        <Card.Body>
                          <h3 className="text-warning mb-1">
                            {usageStats.totalUsage - usageStats.activeUsage}
                          </h3>
                          <small className="text-muted">Historical Usage</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {usageStats.usageByDepartment && usageStats.usageByDepartment.length > 0 && (
                    <div>
                      <h6 className="mb-3">Usage by Department</h6>
                      <Table striped hover>
                        <thead>
                          <tr>
                            <th>Department</th>
                            <th className="text-end">Usage Count</th>
                            <th className="text-end">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageStats.usageByDepartment.map((dept, index) => {
                            const percentage = ((dept.count / usageStats.totalUsage) * 100).toFixed(1);
                            return (
                              <tr key={index}>
                                <td>{dept._id || 'Unassigned'}</td>
                                <td className="text-end">
                                  <Badge bg="primary">{dept.count}</Badge>
                                </td>
                                <td className="text-end">{percentage}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}

                  {(!usageStats.usageByDepartment || usageStats.usageByDepartment.length === 0) && (
                    <Alert variant="info" className="text-center">
                      <FaChartBar className="me-2" />
                      No usage data available for this template yet.
                    </Alert>
                  )}
                </div>
              ) : (
                <Alert variant="warning" className="text-center">
                  <FaChartBar className="me-2" />
                  Failed to load usage statistics. Please try again.
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUsageStatsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Version History Modal */}
      <Modal 
        show={showVersionHistoryModal} 
        onHide={() => setShowVersionHistoryModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-secondary text-white">
          <Modal.Title className="d-flex align-items-center">
            <FaHistory className="me-2" />
            Version History
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTemplate && (
            <div>
              <div className="mb-4">
                <h5 className="text-secondary">{selectedTemplate.name}</h5>
                <div className="row">
                  <div className="col-md-6">
                    <small className="text-muted">Current Version:</small>
                    <div className="fw-bold">v{selectedTemplate.version}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted">Last Updated:</small>
                    <div className="fw-bold">
                      {new Date(selectedTemplate.updatedAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {statsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <div className="mt-2">Loading version history...</div>
                </div>
              ) : versionHistory && versionHistory.length > 0 ? (
                <div>
                  <h6 className="mb-3">Version Timeline</h6>
                  <div className="timeline">
                    {versionHistory.map((version, index) => (
                      <div key={version._id || index} className="timeline-item mb-3">
                        <Card className={index === 0 ? "border-primary" : ""}>
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1">
                                  Version {version.version}
                                  {index === 0 && (
                                    <Badge bg="primary" className="ms-2">Current</Badge>
                                  )}
                                </h6>
                                <small className="text-muted">
                                  {new Date(version.createdAt).toLocaleDateString('en-IN')} at{' '}
                                  {new Date(version.createdAt).toLocaleTimeString('en-IN')}
                                </small>
                              </div>
                              <Badge bg={version.isActive ? "success" : "secondary"}>
                                {version.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            <div className="row">
                              <div className="col-md-6">
                                <small className="text-muted">Basic Salary:</small>
                                <div>{formatCurrency(version.basicSalary)}</div>
                              </div>
                              <div className="col-md-6">
                                <small className="text-muted">Gross Salary:</small>
                                <div>{formatCurrency(version.grossSalary)}</div>
                              </div>
                            </div>
                            
                            {version.notes && (
                              <div className="mt-2">
                                <small className="text-muted">Notes:</small>
                                <div className="text-muted">{version.notes}</div>
                              </div>
                            )}
                            
                            {version.createdBy && (
                              <div className="mt-2">
                                <small className="text-muted">Created by:</small>
                                <div>{version.createdBy.name}</div>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert variant="info" className="text-center">
                  <FaHistory className="me-2" />
                  No version history available for this template yet.
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVersionHistoryModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => setShowDeleteModal(false)}
        centered
        size="md"
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title className="d-flex align-items-center">
            <FaTrash className="me-2" />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          {templateToDelete && (
            <div>
              <div className="mb-3">
                <div 
                  className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#dc3545',
                    color: 'white'
                  }}
                >
                  <FaTrash size={32} />
                </div>
              </div>
              
              <h5 className="mb-3">Delete Template</h5>
              
              <p className="mb-3">
                Are you sure you want to delete the template{' '}
                <strong className="text-danger">"{templateToDelete.name}"</strong>?
              </p>
              
              <div className="bg-light p-3 rounded mb-3">
                <div className="row text-start">
                  <div className="col-6">
                    <small className="text-muted">Department:</small>
                    <div className="fw-bold">{templateToDelete.department?.name}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Designation:</small>
                    <div className="fw-bold">{templateToDelete.designation}</div>
                  </div>
                </div>
                <div className="row text-start mt-2">
                  <div className="col-6">
                    <small className="text-muted">Basic Salary:</small>
                    <div className="fw-bold">{formatCurrency(templateToDelete.basicSalary)}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Version:</small>
                    <div className="fw-bold">v{templateToDelete.version}</div>
                  </div>
                </div>
              </div>
              
              <div className="alert alert-warning d-flex align-items-center">
                <div className="me-2">⚠️</div>
                <div className="text-start">
                  <strong>Warning:</strong> This action cannot be undone. The template will be permanently deleted from the system.
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowDeleteModal(false)}
            className="px-4"
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDeleteTemplate}
            className="px-4 d-flex align-items-center"
          >
            <FaTrash className="me-2" />
            Delete Template
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TemplateManagement;