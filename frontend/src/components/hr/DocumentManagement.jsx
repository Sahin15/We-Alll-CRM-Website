import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Badge,
  Form,
  Modal,
  Row,
  Col,
  Alert,
  Spinner,
  InputGroup,
  Tabs,
  Tab,
} from 'react-bootstrap';
import {
  FaFileUpload,
  FaCheck,
  FaTimes,
  FaEye,
  FaDownload,
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';

const DocumentManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [documentFilter, setDocumentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  
  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploading, setUploading] = useState(false);

  // Pending Approvals
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchTerm, departmentFilter, documentFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all employees
      const empResponse = await api.get('/users');
      const employeeData = empResponse.data.filter(u => u.role === 'employee' || u.role === 'hod');
      setEmployees(employeeData);
      
      // Fetch departments
      const deptResponse = await api.get('/departments');
      setDepartments(deptResponse.data);
      
      // Fetch pending document approvals (if endpoint exists)
      try {
        const pendingResponse = await api.get('/users/documents/pending');
        setPendingApprovals(pendingResponse.data || []);
      } catch (err) {
        console.log('Pending approvals endpoint not available yet');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch employee data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (departmentFilter) {
      filtered = filtered.filter(emp => emp.department?._id === departmentFilter);
    }

    // Document status filter
    if (documentFilter !== 'all') {
      filtered = filtered.filter(emp => {
        const docs = emp.documents || {};
        switch (documentFilter) {
          case 'missing-offer':
            return !docs.offerLetter;
          case 'missing-agreement':
            return !docs.agreement;
          case 'missing-salary':
            return !docs.salarySlips || docs.salarySlips.length === 0;
          case 'complete':
            return docs.offerLetter && docs.agreement;
          case 'incomplete':
            return !docs.offerLetter || !docs.agreement;
          default:
            return true;
        }
      });
    }

    setFilteredEmployees(filtered);
  };

  const getDocumentStatus = (employee) => {
    const docs = employee.documents || {};
    const hasOffer = !!docs.offerLetter;
    const hasAgreement = !!docs.agreement;
    const hasSalarySlips = docs.salarySlips && docs.salarySlips.length > 0;

    if (hasOffer && hasAgreement && hasSalarySlips) {
      return <Badge bg="success">Complete</Badge>;
    } else if (!hasOffer && !hasAgreement) {
      return <Badge bg="danger">Missing Critical Docs</Badge>;
    } else {
      return <Badge bg="warning">Incomplete</Badge>;
    }
  };

  const handleUploadClick = (employee, type) => {
    setSelectedEmployee(employee);
    setUploadType(type);
    setUploadFile(null);
    setUploadMonth('');
    setUploadYear(new Date().getFullYear());
    setShowUploadModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF and image files are allowed');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    if (uploadType === 'salarySlip' && (!uploadMonth || !uploadYear)) {
      toast.error('Please select month and year for salary slip');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('documentType', uploadType);
      
      if (uploadType === 'salarySlip') {
        formData.append('month', uploadMonth);
        formData.append('year', uploadYear);
      }

      await api.post(`/users/${selectedEmployee._id}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleApproveDocument = async (docId, approved) => {
    try {
      await api.post(`/users/documents/${docId}/${approved ? 'approve' : 'reject'}`, {
        comments: approvalComments
      });

      toast.success(`Document ${approved ? 'approved' : 'rejected'} successfully`);
      setShowApprovalModal(false);
      setApprovalComments('');
      fetchData();
    } catch (error) {
      console.error('Error processing document approval:', error);
      toast.error('Failed to process document approval');
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading employee documents...</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">
          <FaFileUpload className="me-2" />
          Document Management
        </h5>
      </Card.Header>
      <Card.Body>
        <Tabs defaultActiveKey="overview" className="mb-3">
          {/* Overview Tab */}
          <Tab eventKey="overview" title={`Overview (${filteredEmployees.length})`}>
            {/* Filters */}
            <Row className="mb-3">
              <Col md={4}>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={documentFilter}
                  onChange={(e) => setDocumentFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="missing-offer">Missing Offer Letter</option>
                  <option value="missing-agreement">Missing Agreement</option>
                  <option value="missing-salary">No Salary Slips</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Button
                  variant="outline-secondary"
                  className="w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setDepartmentFilter('');
                    setDocumentFilter('all');
                  }}
                >
                  <FaFilter className="me-2" />
                  Clear
                </Button>
              </Col>
            </Row>

            {/* Statistics */}
            <Row className="mb-3">
              <Col md={3}>
                <Card className="bg-light">
                  <Card.Body className="text-center">
                    <h3>{employees.length}</h3>
                    <small className="text-muted">Total Employees</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="bg-success text-white">
                  <Card.Body className="text-center">
                    <h3>
                      {employees.filter(e => e.documents?.offerLetter && e.documents?.agreement).length}
                    </h3>
                    <small>Complete Docs</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="bg-warning text-white">
                  <Card.Body className="text-center">
                    <h3>
                      {employees.filter(e => !e.documents?.offerLetter || !e.documents?.agreement).length}
                    </h3>
                    <small>Incomplete Docs</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="bg-danger text-white">
                  <Card.Body className="text-center">
                    <h3>
                      {employees.filter(e => !e.documents?.offerLetter && !e.documents?.agreement).length}
                    </h3>
                    <small>Missing Critical</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Employee Table */}
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Offer Letter</th>
                    <th>Agreement</th>
                    <th>Salary Slips</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => (
                      <tr key={emp._id}>
                        <td>
                          <div>
                            <strong>{emp.name}</strong>
                            <br />
                            <small className="text-muted">{emp.employeeId}</small>
                          </div>
                        </td>
                        <td>{emp.department?.name || 'N/A'}</td>
                        <td>{getDocumentStatus(emp)}</td>
                        <td className="text-center">
                          {emp.documents?.offerLetter ? (
                            <>
                              <FaCheck className="text-success me-2" />
                              <Button
                                size="sm"
                                variant="outline-primary"
                                href={emp.documents.offerLetter}
                                target="_blank"
                              >
                                <FaEye />
                              </Button>
                            </>
                          ) : (
                            <>
                              <FaTimes className="text-danger me-2" />
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleUploadClick(emp, 'offerLetter')}
                              >
                                Upload
                              </Button>
                            </>
                          )}
                        </td>
                        <td className="text-center">
                          {emp.documents?.agreement ? (
                            <>
                              <FaCheck className="text-success me-2" />
                              <Button
                                size="sm"
                                variant="outline-primary"
                                href={emp.documents.agreement}
                                target="_blank"
                              >
                                <FaEye />
                              </Button>
                            </>
                          ) : (
                            <>
                              <FaTimes className="text-danger me-2" />
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleUploadClick(emp, 'agreement')}
                              >
                                Upload
                              </Button>
                            </>
                          )}
                        </td>
                        <td className="text-center">
                          <Badge bg="info">
                            {emp.documents?.salarySlips?.length || 0} slips
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="ms-2"
                            onClick={() => handleUploadClick(emp, 'salarySlip')}
                          >
                            Add
                          </Button>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => window.location.href = `/users/${emp._id}`}
                          >
                            View Profile
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Tab>

          {/* Pending Approvals Tab */}
          <Tab
            eventKey="approvals"
            title={
              <>
                Pending Approvals
                {pendingApprovals.length > 0 && (
                  <Badge bg="danger" className="ms-2">{pendingApprovals.length}</Badge>
                )}
              </>
            }
          >
            {pendingApprovals.length === 0 ? (
              <Alert variant="info">
                <FaCheck className="me-2" />
                No pending document approvals
              </Alert>
            ) : (
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Document Type</th>
                    <th>Uploaded Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map(doc => (
                    <tr key={doc._id}>
                      <td>{doc.employee?.name}</td>
                      <td>{doc.documentType}</td>
                      <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="success"
                          className="me-2"
                          onClick={() => handleApproveDocument(doc._id, true)}
                        >
                          <FaCheck className="me-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setShowApprovalModal(true);
                          }}
                        >
                          <FaTimes className="me-1" />
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Tab>

          {/* Alerts Tab */}
          <Tab eventKey="alerts" title="Alerts">
            <Alert variant="warning">
              <FaExclamationTriangle className="me-2" />
              <strong>Missing Critical Documents</strong>
              <ul className="mt-2 mb-0">
                {employees.filter(e => !e.documents?.offerLetter).map(emp => (
                  <li key={emp._id}>
                    {emp.name} - Missing Offer Letter
                  </li>
                ))}
                {employees.filter(e => !e.documents?.agreement).map(emp => (
                  <li key={emp._id}>
                    {emp.name} - Missing Agreement
                  </li>
                ))}
              </ul>
            </Alert>
          </Tab>
        </Tabs>
      </Card.Body>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Upload {uploadType === 'offerLetter' ? 'Offer Letter' : uploadType === 'agreement' ? 'Agreement' : 'Salary Slip'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <strong>Employee:</strong> {selectedEmployee?.name} ({selectedEmployee?.employeeId})
          </Alert>

          {uploadType === 'salarySlip' && (
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Month</Form.Label>
                  <Form.Select
                    value={uploadMonth}
                    onChange={(e) => setUploadMonth(e.target.value)}
                  >
                    <option value="">Select Month</option>
                    {months.map((month, idx) => (
                      <option key={idx} value={month}>{month}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Year</Form.Label>
                  <Form.Control
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          <Form.Group>
            <Form.Label>Select File (PDF or Image, max 5MB)</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            {uploadFile && (
              <small className="text-success d-block mt-2">
                <FaCheck className="me-1" />
                {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
              </small>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUploadDocument}
            disabled={uploading || !uploadFile}
          >
            {uploading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              <>
                <FaFileUpload className="me-2" />
                Upload Document
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Approval Modal */}
      <Modal show={showApprovalModal} onHide={() => setShowApprovalModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Rejection Reason</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder="Please provide a reason for rejection..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => handleApproveDocument(selectedDocument?._id, false)}
            disabled={!approvalComments.trim()}
          >
            Confirm Rejection
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default DocumentManagement;
