import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Alert,
  Spinner, Badge, ListGroup,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  FaStar, FaRegStar, FaPlus, FaTrash, FaUpload, FaArrowLeft,
} from 'react-icons/fa';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const CATEGORIES = [
  'IT Hardware', 'IT Software', 'Office Supplies', 'Furniture',
  'Services', 'Marketing', 'Travel', 'Maintenance', 'Other',
];

const MAX_DOCUMENTS = 10;

// ── Star picker ───────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }) => (
  <div className="d-flex gap-1 align-items-center">
    {[1, 2, 3, 4, 5].map((s) => (
      <span
        key={s}
        role="button"
        style={{ fontSize: '1.5rem', cursor: 'pointer' }}
        onClick={() => onChange(s === value ? null : s)}
        title={`${s} star${s > 1 ? 's' : ''}`}
      >
        {s <= (value || 0)
          ? <FaStar style={{ color: '#ffc107' }} />
          : <FaRegStar style={{ color: '#dee2e6' }} />}
      </span>
    ))}
    {value && (
      <Button
        variant="link"
        size="sm"
        className="p-0 ms-1 text-muted"
        onClick={() => onChange(null)}
      >
        Clear
      </Button>
    )}
  </div>
);

const emptyContact = () => ({ name: '', email: '', phone: '', role: '' });

const defaultForm = {
  name: '',
  categories: [],
  primaryContact: { name: '', email: '', phone: '' },
  additionalContacts: [],
  address: { street: '', city: '', state: '', pincode: '', country: 'India' },
  gstNumber: '',
  panNumber: '',
  rating: null,
  notes: '',
  bankDetails: {
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    accountHolderName: '',
  },
};

/**
 * Shared form component used by CreateVendor and EditVendor.
 *
 * Props:
 *   initialData   – pre-populated values (edit mode)
 *   onSubmit      – async fn(formData, files) called on save
 *   submitLabel   – button label
 *   title         – page heading
 *   breadcrumbs   – array of breadcrumb items
 */
const VendorForm = ({
  initialData,
  onSubmit,
  submitLabel = 'Save',
  title = 'Vendor',
  breadcrumbs = [],
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(() => ({
    ...defaultForm,
    ...initialData,
    primaryContact: { ...defaultForm.primaryContact, ...(initialData?.primaryContact || {}) },
    address: { ...defaultForm.address, ...(initialData?.address || {}) },
    bankDetails: { ...defaultForm.bankDetails, ...(initialData?.bankDetails || {}) },
    additionalContacts: initialData?.additionalContacts || [],
    categories: initialData?.categories || [],
  }));

  // New document files to upload (not yet saved)
  const [newDocFiles, setNewDocFiles] = useState([]); // [{ file: File, label: string }]
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────────

  const set = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const toggleCategory = (cat) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const addContact = () =>
    setForm((prev) => ({
      ...prev,
      additionalContacts: [...prev.additionalContacts, emptyContact()],
    }));

  const removeContact = (idx) =>
    setForm((prev) => ({
      ...prev,
      additionalContacts: prev.additionalContacts.filter((_, i) => i !== idx),
    }));

  const setContact = (idx, field, value) =>
    setForm((prev) => {
      const contacts = [...prev.additionalContacts];
      contacts[idx] = { ...contacts[idx], [field]: value };
      return { ...prev, additionalContacts: contacts };
    });

  // ── document helpers ─────────────────────────────────────────────────────────

  const totalDocCount = (form.documents?.length || 0) + newDocFiles.length;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_DOCUMENTS - totalDocCount;
    if (remaining <= 0) {
      toast.warning(`Maximum ${MAX_DOCUMENTS} documents allowed.`);
      return;
    }

    const toAdd = files.slice(0, remaining).map((file) => ({ file, label: '' }));
    setNewDocFiles((prev) => [...prev, ...toAdd]);

    if (files.length > remaining) {
      toast.warning(`Only ${remaining} more document(s) can be added (max ${MAX_DOCUMENTS}).`);
    }
    // reset input
    e.target.value = '';
  };

  const updateDocLabel = (idx, label) => {
    setNewDocFiles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], label };
      return next;
    });
  };

  const removeNewDoc = (idx) => {
    setNewDocFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── validation ───────────────────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Vendor name is required.';
    if (!form.primaryContact.name.trim()) e['primaryContact.name'] = 'Contact name is required.';
    if (!form.primaryContact.email.trim()) e['primaryContact.email'] = 'Contact email is required.';
    if (!form.primaryContact.phone.trim()) e['primaryContact.phone'] = 'Contact phone is required.';
    return e;
  };

  // ── submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the highlighted errors.');
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Build FormData if there are files, otherwise send JSON
      if (newDocFiles.length > 0) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(form));
        newDocFiles.forEach(({ file, label }, i) => {
          fd.append('documents', file);
          fd.append(`documentLabels[${i}]`, label);
        });
        await onSubmit(fd, true);
      } else {
        await onSubmit(form, false);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save vendor.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const defaultBreadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Procurement', href: '/procurement' },
    { label: 'Vendors', href: '/procurement/vendors' },
    { label: title },
  ];

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb items={breadcrumbs.length ? breadcrumbs : defaultBreadcrumbs} />

      <Row className="mb-4 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">{title}</h4>
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/procurement/vendors')}
          >
            <FaArrowLeft className="me-2" />
            Back to Vendors
          </Button>
        </Col>
      </Row>

      <Form onSubmit={handleSubmit} noValidate>
        {/* ── Basic Info ── */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="fw-semibold">Basic Information</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Vendor Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    isInvalid={!!errors.name}
                    placeholder="Enter vendor name"
                  />
                  <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Rating</Form.Label>
                  <div>
                    <StarPicker value={form.rating} onChange={(v) => set('rating', v)} />
                  </div>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Label>Categories</Form.Label>
                <div className="d-flex flex-wrap gap-3">
                  {CATEGORIES.map((cat) => (
                    <Form.Check
                      key={cat}
                      type="checkbox"
                      id={`cat-${cat}`}
                      label={cat}
                      checked={form.categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                  ))}
                </div>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Additional notes about this vendor..."
                    maxLength={1000}
                  />
                  <Form.Text className="text-muted">
                    {form.notes.length}/1000 characters
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── Primary Contact ── */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="fw-semibold">
            Primary Contact <span className="text-danger">*</span>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={form.primaryContact.name}
                    onChange={(e) => set('primaryContact.name', e.target.value)}
                    isInvalid={!!errors['primaryContact.name']}
                    placeholder="Contact name"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['primaryContact.name']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Email <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={form.primaryContact.email}
                    onChange={(e) => set('primaryContact.email', e.target.value)}
                    isInvalid={!!errors['primaryContact.email']}
                    placeholder="contact@vendor.com"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['primaryContact.email']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>
                    Phone <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={form.primaryContact.phone}
                    onChange={(e) => set('primaryContact.phone', e.target.value)}
                    isInvalid={!!errors['primaryContact.phone']}
                    placeholder="+91 XXXXX XXXXX"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['primaryContact.phone']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── Additional Contacts ── */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Additional Contacts</span>
            <Button size="sm" variant="outline-primary" onClick={addContact}>
              <FaPlus className="me-1" />
              Add Contact
            </Button>
          </Card.Header>
          <Card.Body>
            {form.additionalContacts.length === 0 ? (
              <p className="text-muted mb-0">No additional contacts added.</p>
            ) : (
              form.additionalContacts.map((contact, idx) => (
                <Row key={idx} className="g-2 mb-3 align-items-end">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        value={contact.name}
                        onChange={(e) => setContact(idx, 'name', e.target.value)}
                        placeholder="Name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={contact.email}
                        onChange={(e) => setContact(idx, 'email', e.target.value)}
                        placeholder="Email"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        value={contact.phone}
                        onChange={(e) => setContact(idx, 'phone', e.target.value)}
                        placeholder="Phone"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Role</Form.Label>
                      <Form.Control
                        value={contact.role}
                        onChange={(e) => setContact(idx, 'role', e.target.value)}
                        placeholder="e.g. Sales"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeContact(idx)}
                    >
                      <FaTrash className="me-1" />
                      Remove
                    </Button>
                  </Col>
                </Row>
              ))
            )}
          </Card.Body>
        </Card>

        {/* ── Address ── */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="fw-semibold">Address</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Street</Form.Label>
                  <Form.Control
                    value={form.address.street}
                    onChange={(e) => set('address.street', e.target.value)}
                    placeholder="Street address"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>City</Form.Label>
                  <Form.Control
                    value={form.address.city}
                    onChange={(e) => set('address.city', e.target.value)}
                    placeholder="City"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>State</Form.Label>
                  <Form.Control
                    value={form.address.state}
                    onChange={(e) => set('address.state', e.target.value)}
                    placeholder="State"
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Pincode</Form.Label>
                  <Form.Control
                    value={form.address.pincode}
                    onChange={(e) => set('address.pincode', e.target.value)}
                    placeholder="Pincode"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Country</Form.Label>
                  <Form.Control
                    value={form.address.country}
                    onChange={(e) => set('address.country', e.target.value)}
                    placeholder="Country"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── Tax Info ── */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="fw-semibold">Tax Information</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>GST Number</Form.Label>
                  <Form.Control
                    value={form.gstNumber}
                    onChange={(e) => set('gstNumber', e.target.value)}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>PAN Number</Form.Label>
                  <Form.Control
                    value={form.panNumber}
                    onChange={(e) => set('panNumber', e.target.value)}
                    placeholder="e.g. AAAAA0000A"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── Bank Details ── */}
        <Card className="shadow-sm mb-4 border-warning">
          <Card.Header className="fw-semibold bg-warning bg-opacity-10">
            Bank Details
            <Badge bg="warning" text="dark" className="ms-2">
              Sensitive
            </Badge>
          </Card.Header>
          <Card.Body>
            <Alert variant="warning" className="py-2">
              ⚠️ Bank details are sensitive. Ensure this information is handled securely and
              shared only with authorised personnel.
            </Alert>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Account Holder Name</Form.Label>
                  <Form.Control
                    value={form.bankDetails.accountHolderName}
                    onChange={(e) => set('bankDetails.accountHolderName', e.target.value)}
                    placeholder="Account holder name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Account Number</Form.Label>
                  <Form.Control
                    value={form.bankDetails.accountNumber}
                    onChange={(e) => set('bankDetails.accountNumber', e.target.value)}
                    placeholder="Bank account number"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>IFSC Code</Form.Label>
                  <Form.Control
                    value={form.bankDetails.ifscCode}
                    onChange={(e) => set('bankDetails.ifscCode', e.target.value)}
                    placeholder="e.g. SBIN0001234"
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group>
                  <Form.Label>Bank Name</Form.Label>
                  <Form.Control
                    value={form.bankDetails.bankName}
                    onChange={(e) => set('bankDetails.bankName', e.target.value)}
                    placeholder="Bank name"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Branch Name</Form.Label>
                  <Form.Control
                    value={form.bankDetails.branchName}
                    onChange={(e) => set('bankDetails.branchName', e.target.value)}
                    placeholder="Branch name"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── Documents ── */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">
              Documents
              <Badge bg="secondary" className="ms-2">
                {totalDocCount}/{MAX_DOCUMENTS}
              </Badge>
            </span>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={totalDocCount >= MAX_DOCUMENTS}
            >
              <FaUpload className="me-1" />
              Upload Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="d-none"
              onChange={handleFileSelect}
              accept="*/*"
            />
          </Card.Header>
          <Card.Body>
            {/* Existing documents (edit mode) */}
            {(form.documents || []).length > 0 && (
              <>
                <p className="text-muted small mb-2">Existing documents:</p>
                <ListGroup variant="flush" className="mb-3">
                  {(form.documents || []).map((doc, idx) => (
                    <ListGroup.Item
                      key={idx}
                      className="d-flex justify-content-between align-items-center px-0"
                    >
                      <div>
                        <span className="fw-semibold">{doc.label || doc.fileName}</span>
                        {doc.label && doc.fileName && (
                          <small className="text-muted ms-2">({doc.fileName})</small>
                        )}
                      </div>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                        >
                          View
                        </a>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </>
            )}

            {/* New documents to upload */}
            {newDocFiles.length > 0 && (
              <>
                <p className="text-muted small mb-2">New files to upload:</p>
                {newDocFiles.map(({ file, label }, idx) => (
                  <Row key={idx} className="g-2 mb-2 align-items-center">
                    <Col md={5}>
                      <Form.Control
                        size="sm"
                        value={label}
                        onChange={(e) => updateDocLabel(idx, e.target.value)}
                        placeholder={`Label for "${file.name}"`}
                      />
                    </Col>
                    <Col md={5}>
                      <span className="text-muted small">{file.name}</span>
                      <small className="text-muted ms-2">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </small>
                    </Col>
                    <Col md={2}>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => removeNewDoc(idx)}
                      >
                        <FaTrash />
                      </Button>
                    </Col>
                  </Row>
                ))}
              </>
            )}

            {totalDocCount === 0 && (
              <p className="text-muted mb-0">
                No documents uploaded. Click "Upload Files" to add up to {MAX_DOCUMENTS} documents.
              </p>
            )}
          </Card.Body>
        </Card>

        {/* ── Actions ── */}
        <div className="d-flex gap-2 justify-content-end mb-4">
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/procurement/vendors')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default VendorForm;
