import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Badge, Spinner, Alert, ListGroup,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  FaEdit, FaBan, FaCheckCircle, FaStar, FaRegStar, FaArrowLeft,
  FaFileDownload, FaMapMarkerAlt, FaPhone, FaEnvelope, FaUser,
  FaUniversity, FaFileInvoiceDollar,
} from 'react-icons/fa';
import { getVendor, deactivateVendor, updateVendor } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const StarRating = ({ rating }) => {
  if (!rating) return <span className="text-muted">Not rated</span>;
  return (
    <span className="d-inline-flex align-items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) =>
        s <= rating
          ? <FaStar key={s} style={{ color: '#ffc107' }} />
          : <FaRegStar key={s} style={{ color: '#dee2e6' }} />
      )}
      <span className="ms-1 text-muted">({rating}/5)</span>
    </span>
  );
};

const VendorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await getVendor(id);
        const data = res.data?.vendor || res.data?.data || res.data;
        setVendor(data);
      } catch {
        setError('Failed to load vendor details.');
        toast.error('Failed to load vendor details.');
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [id]);

  const handleToggleActive = async () => {
    const action = vendor.isActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} "${vendor.name}"?`)) return;
    setActionLoading(true);
    try {
      if (vendor.isActive) {
        await deactivateVendor(id);
        toast.success(`Vendor "${vendor.name}" deactivated.`);
      } else {
        await updateVendor(id, { isActive: true });
        toast.success(`Vendor "${vendor.name}" reactivated.`);
      }
      // Refresh
      const res = await getVendor(id);
      setVendor(res.data?.vendor || res.data?.data || res.data);
    } catch {
      toast.error(`Failed to ${action} vendor.`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading vendor details...</p>
      </Container>
    );
  }

  if (error || !vendor) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error || 'Vendor not found.'}</Alert>
        <Button variant="outline-secondary" onClick={() => navigate('/procurement/vendors')}>
          <FaArrowLeft className="me-2" />
          Back to Vendors
        </Button>
      </Container>
    );
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Procurement', href: '/procurement' },
    { label: 'Vendors', href: '/procurement/vendors' },
    { label: vendor.name },
  ];

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb items={breadcrumbs} />

      {/* Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-1 fw-bold">{vendor.name}</h4>
          <div className="d-flex align-items-center gap-2">
            <Badge bg={vendor.isActive ? 'success' : 'secondary'}>
              {vendor.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {(vendor.categories || []).map((cat) => (
              <Badge key={cat} bg="info" className="fw-normal">
                {cat}
              </Badge>
            ))}
          </div>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/procurement/vendors')}
            >
              <FaArrowLeft className="me-2" />
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/procurement/vendors/${id}/edit`)}
            >
              <FaEdit className="me-2" />
              Edit
            </Button>
            <Button
              variant={vendor.isActive ? 'outline-danger' : 'outline-success'}
              disabled={actionLoading}
              onClick={handleToggleActive}
            >
              {actionLoading ? (
                <Spinner size="sm" animation="border" />
              ) : vendor.isActive ? (
                <>
                  <FaBan className="me-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" />
                  Reactivate
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>

      {/* Total Spend & Rating */}
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="shadow-sm h-100 border-0">
            <Card.Body className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 56, height: 56, background: '#7209b720' }}
              >
                <FaFileInvoiceDollar size={24} style={{ color: '#7209b7' }} />
              </div>
              <div>
                <div className="text-muted small mb-1">Total Spend</div>
                <div className="fw-bold fs-4">{formatCurrency(vendor.totalSpend)}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm h-100 border-0">
            <Card.Body className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 56, height: 56, background: '#ffc10720' }}
              >
                <FaStar size={24} style={{ color: '#ffc107' }} />
              </div>
              <div>
                <div className="text-muted small mb-1">Vendor Rating</div>
                <div className="fw-bold fs-5">
                  <StarRating rating={vendor.rating} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        {/* Left Column */}
        <Col lg={6}>
          {/* Basic Info */}
          <Card className="shadow-sm mb-3">
            <Card.Header className="fw-semibold bg-white">
              <FaUser className="me-2" />
              Basic Information
            </Card.Header>
            <Card.Body>
              <Row className="g-2">
                <Col xs={4} className="text-muted">
                  Name:
                </Col>
                <Col xs={8} className="fw-semibold">
                  {vendor.name}
                </Col>

                <Col xs={4} className="text-muted">
                  Categories:
                </Col>
                <Col xs={8}>
                  {(vendor.categories || []).length > 0 ? (
                    <div className="d-flex flex-wrap gap-1">
                      {vendor.categories.map((cat) => (
                        <Badge key={cat} bg="secondary" className="fw-normal">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Col>

                <Col xs={4} className="text-muted">
                  GST Number:
                </Col>
                <Col xs={8}>{vendor.gstNumber || <span className="text-muted">—</span>}</Col>

                <Col xs={4} className="text-muted">
                  PAN Number:
                </Col>
                <Col xs={8}>{vendor.panNumber || <span className="text-muted">—</span>}</Col>

                {vendor.notes && (
                  <>
                    <Col xs={4} className="text-muted">
                      Notes:
                    </Col>
                    <Col xs={8}>
                      <div className="text-muted small">{vendor.notes}</div>
                    </Col>
                  </>
                )}
              </Row>
            </Card.Body>
          </Card>

          {/* Contact Details */}
          <Card className="shadow-sm mb-3">
            <Card.Header className="fw-semibold bg-white">
              <FaPhone className="me-2" />
              Contact Details
            </Card.Header>
            <Card.Body>
              <h6 className="text-muted small mb-2">Primary Contact</h6>
              <div className="mb-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <FaUser className="text-muted" />
                  <span className="fw-semibold">{vendor.primaryContact?.name}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <FaEnvelope className="text-muted" />
                  <a href={`mailto:${vendor.primaryContact?.email}`} className="text-decoration-none">
                    {vendor.primaryContact?.email}
                  </a>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <FaPhone className="text-muted" />
                  <a href={`tel:${vendor.primaryContact?.phone}`} className="text-decoration-none">
                    {vendor.primaryContact?.phone}
                  </a>
                </div>
              </div>

              {(vendor.additionalContacts || []).length > 0 && (
                <>
                  <h6 className="text-muted small mb-2 mt-3">Additional Contacts</h6>
                  {vendor.additionalContacts.map((contact, idx) => (
                    <div key={idx} className="mb-2 pb-2 border-bottom">
                      <div className="fw-semibold">{contact.name}</div>
                      {contact.role && (
                        <div className="text-muted small">{contact.role}</div>
                      )}
                      {contact.email && (
                        <div className="small">
                          <FaEnvelope className="me-1 text-muted" />
                          <a href={`mailto:${contact.email}`} className="text-decoration-none">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="small">
                          <FaPhone className="me-1 text-muted" />
                          <a href={`tel:${contact.phone}`} className="text-decoration-none">
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </Card.Body>
          </Card>

          {/* Address */}
          <Card className="shadow-sm mb-3">
            <Card.Header className="fw-semibold bg-white">
              <FaMapMarkerAlt className="me-2" />
              Address
            </Card.Header>
            <Card.Body>
              {vendor.address?.street ||
              vendor.address?.city ||
              vendor.address?.state ||
              vendor.address?.pincode ||
              vendor.address?.country ? (
                <address className="mb-0">
                  {vendor.address.street && <div>{vendor.address.street}</div>}
                  <div>
                    {[
                      vendor.address.city,
                      vendor.address.state,
                      vendor.address.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {vendor.address.country && <div>{vendor.address.country}</div>}
                </address>
              ) : (
                <span className="text-muted">No address provided</span>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column */}
        <Col lg={6}>
          {/* Bank Details */}
          <Card className="shadow-sm mb-3 border-warning">
            <Card.Header className="fw-semibold bg-warning bg-opacity-10">
              <FaUniversity className="me-2" />
              Bank Details
              <Badge bg="warning" text="dark" className="ms-2">
                Sensitive
              </Badge>
            </Card.Header>
            <Card.Body>
              {vendor.bankDetails?.accountNumber ||
              vendor.bankDetails?.ifscCode ||
              vendor.bankDetails?.bankName ? (
                <Row className="g-2">
                  {vendor.bankDetails.accountHolderName && (
                    <>
                      <Col xs={5} className="text-muted">
                        Account Holder:
                      </Col>
                      <Col xs={7} className="fw-semibold">
                        {vendor.bankDetails.accountHolderName}
                      </Col>
                    </>
                  )}
                  {vendor.bankDetails.accountNumber && (
                    <>
                      <Col xs={5} className="text-muted">
                        Account Number:
                      </Col>
                      <Col xs={7} className="fw-semibold">
                        {vendor.bankDetails.accountNumber}
                      </Col>
                    </>
                  )}
                  {vendor.bankDetails.ifscCode && (
                    <>
                      <Col xs={5} className="text-muted">
                        IFSC Code:
                      </Col>
                      <Col xs={7}>{vendor.bankDetails.ifscCode}</Col>
                    </>
                  )}
                  {vendor.bankDetails.bankName && (
                    <>
                      <Col xs={5} className="text-muted">
                        Bank Name:
                      </Col>
                      <Col xs={7}>{vendor.bankDetails.bankName}</Col>
                    </>
                  )}
                  {vendor.bankDetails.branchName && (
                    <>
                      <Col xs={5} className="text-muted">
                        Branch:
                      </Col>
                      <Col xs={7}>{vendor.bankDetails.branchName}</Col>
                    </>
                  )}
                </Row>
              ) : (
                <span className="text-muted">No bank details provided</span>
              )}
            </Card.Body>
          </Card>

          {/* Documents */}
          <Card className="shadow-sm mb-3">
            <Card.Header className="fw-semibold bg-white">
              <FaFileDownload className="me-2" />
              Documents
              {(vendor.documents || []).length > 0 && (
                <Badge bg="secondary" className="ms-2">
                  {vendor.documents.length}
                </Badge>
              )}
            </Card.Header>
            <Card.Body>
              {(vendor.documents || []).length > 0 ? (
                <ListGroup variant="flush">
                  {vendor.documents.map((doc, idx) => (
                    <ListGroup.Item
                      key={idx}
                      className="d-flex justify-content-between align-items-center px-0"
                    >
                      <div>
                        <div className="fw-semibold">
                          {doc.label || doc.fileName || `Document ${idx + 1}`}
                        </div>
                        {doc.label && doc.fileName && (
                          <small className="text-muted">{doc.fileName}</small>
                        )}
                        {doc.fileSize && (
                          <small className="text-muted ms-2">
                            ({(doc.fileSize / 1024).toFixed(1)} KB)
                          </small>
                        )}
                      </div>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          <FaFileDownload className="me-1" />
                          Download
                        </a>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <span className="text-muted">No documents uploaded</span>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VendorDetails;
