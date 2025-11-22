import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaFileUpload, FaDownload, FaTrash, FaEye, FaCheck, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';

const DocumentUploadSection = ({ employeeId }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchEmployeeDocuments();
  }, [employeeId]);

  const fetchEmployeeDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${employeeId}`);
      setEmployee(response.data);
    } catch (error) {
      console.error('Error fetching employee documents:', error);
      toast.error('Failed to fetch employee documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (type) => {
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
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
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

      await api.post(`/users/${employeeId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      fetchEmployeeDocuments(); // Refresh data
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentType, month = null, year = null) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      let url = `/users/${employeeId}/documents/${documentType}`;
      if (month && year) {
        url += `?month=${month}&year=${year}`;
      }

      await api.delete(url);
      toast.success('Document deleted successfully');
      fetchEmployeeDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
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
        <p className="mt-3">Loading documents...</p>
      </div>
    );
  }

  const documents = employee?.documents || {};

  return (
    <>
      <Alert variant="info" className="mb-4">
        <strong>Document Management:</strong> Upload and manage employee documents including offer letter, agreement, and salary slips.
      </Alert>

      {/* HR-Uploaded Documents */}
      <h6 className="mb-3">Company Documents</h6>
      <Row className="mb-4">
        <Col md={6}>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Offer Letter</h6>
                {documents.offerLetter ? (
                  <Badge bg="success">
                    <FaCheck className="me-1" />
                    Uploaded
                  </Badge>
                ) : (
                  <Badge bg="danger">
                    <FaTimes className="me-1" />
                    Missing
                  </Badge>
                )}
              </div>
              {documents.offerLetter ? (
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    href={documents.offerLetter}
                    target="_blank"
                  >
                    <FaEye className="me-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDeleteDocument('offerLetter')}
                  >
                    <FaTrash className="me-1" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => handleUploadClick('offerLetter')}
                  >
                    Replace
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleUploadClick('offerLetter')}
                >
                  <FaFileUpload className="me-1" />
                  Upload Offer Letter
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Employment Agreement</h6>
                {documents.agreement ? (
                  <Badge bg="success">
                    <FaCheck className="me-1" />
                    Uploaded
                  </Badge>
                ) : (
                  <Badge bg="danger">
                    <FaTimes className="me-1" />
                    Missing
                  </Badge>
                )}
              </div>
              {documents.agreement ? (
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    href={documents.agreement}
                    target="_blank"
                  >
                    <FaEye className="me-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDeleteDocument('agreement')}
                  >
                    <FaTrash className="me-1" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => handleUploadClick('agreement')}
                  >
                    Replace
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleUploadClick('agreement')}
                >
                  <FaFileUpload className="me-1" />
                  Upload Agreement
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Salary Slips */}
      <h6 className="mb-3">Salary Slips</h6>
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Total Salary Slips:</strong>{' '}
              <Badge bg="info">{documents.salarySlips?.length || 0}</Badge>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleUploadClick('salarySlip')}
            >
              <FaFileUpload className="me-1" />
              Upload Salary Slip
            </Button>
          </div>

          {documents.salarySlips && documents.salarySlips.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Year</th>
                    <th>Uploaded Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.salarySlips.map((slip, index) => (
                    <tr key={index}>
                      <td>{slip.month}</td>
                      <td>{slip.year}</td>
                      <td>{new Date(slip.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            href={slip.url}
                            target="_blank"
                          >
                            <FaDownload />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDeleteDocument('salarySlip', slip.month, slip.year)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert variant="secondary" className="mb-0">
              No salary slips uploaded yet. Click "Upload Salary Slip" to add one.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Upload {uploadType === 'offerLetter' ? 'Offer Letter' : uploadType === 'agreement' ? 'Agreement' : 'Salary Slip'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <strong>Employee:</strong> {employee?.name} ({employee?.employeeId})
          </Alert>

          {uploadType === 'salarySlip' && (
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Month *</Form.Label>
                  <Form.Select
                    value={uploadMonth}
                    onChange={(e) => setUploadMonth(e.target.value)}
                  >
                    <option value="">Select Month</option>
                    {months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Year *</Form.Label>
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
            <Form.Label>Select File (PDF or Image, max 10MB) *</Form.Label>
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
    </>
  );
};

export default DocumentUploadSection;
