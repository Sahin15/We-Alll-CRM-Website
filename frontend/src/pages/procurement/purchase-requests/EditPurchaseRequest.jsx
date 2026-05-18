import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, InputGroup,
  Spinner, Alert,
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSave, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { getPR, updatePR } from '../../../api/procurementApi';
import PRStatusBadge from '../../../components/procurement/PRStatusBadge';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const CATEGORIES = [
  'IT Hardware', 'IT Software', 'Office Supplies', 'Furniture',
  'Services', 'Marketing', 'Travel', 'Maintenance', 'Other',
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const UOM_OPTIONS = ['Nos', 'Pcs', 'Kg', 'Litre', 'Box', 'Set', 'Pair', 'Meter', 'Hour', 'Month'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

const emptyLineItem = () => ({
  itemName: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  unitOfMeasure: 'Nos',
  category: 'Other',
});

const toDateInputValue = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function EditPurchaseRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pr, setPr] = useState(null);
  const [loadingPR, setLoadingPR] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    category: 'IT Hardware',
    priority: 'medium',
    department: '',
    project: '',
    requiredByDate: '',
    estimatedAmount: '',
    justification: '',
  });

  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  // ── Computed total ──────────────────────────────────────────────────────────
  const lineItemsTotal = lineItems.reduce(
    (sum, item) =>
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    0,
  );

  // ── Load existing PR ────────────────────────────────────────────────────────
  const fetchPR = useCallback(async () => {
    setLoadingPR(true);
    setLoadError(null);
    try {
      const res = await getPR(id);
      const data = res.data?.data || res.data;
      setPr(data);

      // Pre-populate form
      setForm({
        title: data.title ?? '',
        category: data.category ?? 'IT Hardware',
        priority: data.priority ?? 'medium',
        department: data.department?._id ?? data.department ?? '',
        project: data.project?._id ?? data.project ?? '',
        requiredByDate: toDateInputValue(data.requiredByDate),
        estimatedAmount: data.estimatedTotalCost ?? data.estimatedAmount ?? '',
        justification: data.justification ?? '',
      });

      // Pre-populate line items
      if (data.items && data.items.length > 0) {
        setLineItems(
          data.items.map((item) => ({
            itemName: item.itemName ?? '',
            description: item.description ?? item.itemName ?? '',
            quantity: item.quantity ?? 1,
            unitPrice: item.estimatedUnitPrice ?? 0,
            unitOfMeasure: item.unitOfMeasure ?? 'Nos',
            category: item.category ?? 'Other',
          })),
        );
      }
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load purchase request.');
    } finally {
      setLoadingPR(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPR();
  }, [fetchPR]);

  // ── Form handlers ───────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLineItem = () => setLineItems((prev) => [...prev, emptyLineItem()]);

  const removeLineItem = (index) => {
    if (lineItems.length === 1) {
      toast.warning('At least one line item is required.');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Build payload ───────────────────────────────────────────────────────────
  const buildPayload = (asDraft = true) => ({
    title: form.title,
    category: form.category,
    priority: form.priority,
    department: form.department || undefined,
    project: form.project || undefined,
    requiredByDate: form.requiredByDate || undefined,
    estimatedAmount: lineItemsTotal || parseFloat(form.estimatedAmount) || 0,
    estimatedTotalCost: lineItemsTotal || parseFloat(form.estimatedAmount) || 0,
    justification: form.justification,
    status: asDraft ? 'draft' : 'pending_hod',
    items: lineItems.map((item) => ({
      itemName: item.itemName || item.description,
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      estimatedUnitPrice: parseFloat(item.unitPrice) || 0,
      unitOfMeasure: item.unitOfMeasure,
      category: item.category,
    })),
  });

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e, asDraft = true) => {
    e.preventDefault();
    const formEl = e.currentTarget.closest('form') || e.currentTarget;
    if (!formEl.checkValidity()) {
      setValidated(true);
      return;
    }
    setValidated(true);
    setSubmitting(true);
    try {
      await updatePR(id, buildPayload(asDraft));
      toast.success(asDraft ? 'Purchase Request saved.' : 'Purchase Request submitted for approval.');
      navigate(`/procurement/purchase-requests/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update Purchase Request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loadingPR) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading purchase request…</p>
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">{loadError}</Alert>
        <Button variant="outline-secondary" onClick={() => navigate(-1)}>
          Back
        </Button>
      </Container>
    );
  }

  // Only draft PRs can be edited
  if (pr && pr.status !== 'draft') {
    return (
      <Container fluid className="py-4">
        <ProcurementBreadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Procurement', href: '/procurement' },
            { label: 'Purchase Requests', href: '/procurement/purchase-requests/my' },
            { label: pr.prNumber ?? 'Edit' },
          ]}
        />
        <Alert variant="warning">
          This Purchase Request cannot be edited because its status is{' '}
          <strong>{pr.status}</strong>. Only <strong>draft</strong> PRs can be edited.
        </Alert>
        <Button
          variant="outline-secondary"
          onClick={() => navigate(`/procurement/purchase-requests/${id}`)}
        >
          View Details
        </Button>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests', href: '/procurement/purchase-requests/my' },
          { label: pr?.prNumber ?? 'Edit' },
          { label: 'Edit' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">Edit Purchase Request</h4>
          <small className="text-muted">{pr?.prNumber}</small>
        </div>
        <PRStatusBadge status="draft" />
      </div>

      <Form noValidate validated={validated} onSubmit={(e) => handleSubmit(e, true)}>
        {/* ── Basic Info ── */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-primary text-white fw-semibold">Basic Information</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={8}>
                <Form.Group>
                  <Form.Label>
                    Title <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="Brief title for this purchase request"
                    required
                    maxLength={200}
                  />
                  <Form.Control.Feedback type="invalid">Title is required.</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select name="priority" value={form.priority} onChange={handleFormChange}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category" value={form.category} onChange={handleFormChange}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Required By Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="requiredByDate"
                    value={form.requiredByDate}
                    onChange={handleFormChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Estimated Amount (INR)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₹</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="estimatedAmount"
                      value={lineItemsTotal > 0 ? lineItemsTotal : form.estimatedAmount}
                      onChange={handleFormChange}
                      placeholder="0"
                      min={0}
                      readOnly={lineItemsTotal > 0}
                    />
                  </InputGroup>
                  {lineItemsTotal > 0 && (
                    <Form.Text className="text-muted">Auto-calculated from line items.</Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Justification <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="justification"
                    value={form.justification}
                    onChange={handleFormChange}
                    placeholder="Business justification for this purchase"
                    required
                    maxLength={1000}
                  />
                  <Form.Control.Feedback type="invalid">
                    Justification is required.
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* ── Line Items ── */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-primary text-white fw-semibold d-flex justify-content-between align-items-center">
            <span>Line Items</span>
            <Button variant="light" size="sm" onClick={addLineItem}>
              <FaPlus className="me-1" /> Add Item
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table bordered hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 160 }}>Item Name *</th>
                    <th style={{ minWidth: 160 }}>Description</th>
                    <th style={{ width: 90 }}>Qty *</th>
                    <th style={{ width: 130 }}>Unit Price (₹) *</th>
                    <th style={{ width: 110 }}>UoM</th>
                    <th style={{ width: 150 }}>Category</th>
                    <th style={{ width: 120 }}>Total</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={item.itemName}
                          onChange={(e) => handleLineItemChange(idx, 'itemName', e.target.value)}
                          placeholder="Item name"
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'description', e.target.value)
                          }
                          placeholder="Description"
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                          min={1}
                          required
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                          min={0}
                          required
                        />
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={item.unitOfMeasure}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'unitOfMeasure', e.target.value)
                          }
                        >
                          {UOM_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={item.category}
                          onChange={(e) => handleLineItemChange(idx, 'category', e.target.value)}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      <td className="text-end fw-semibold">
                        {formatCurrency(
                          (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeLineItem(idx)}
                          title="Remove item"
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td colSpan={6} className="text-end fw-bold">
                      Grand Total
                    </td>
                    <td className="text-end fw-bold text-primary">
                      {formatCurrency(lineItemsTotal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {/* ── Actions ── */}
        <div className="d-flex gap-2 justify-content-end">
          <Button
            variant="outline-secondary"
            onClick={() => navigate(`/procurement/purchase-requests/${id}`)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button variant="outline-primary" type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" animation="border" className="me-1" />
            ) : (
              <FaSave className="me-1" />
            )}
            Save Draft
          </Button>
          <Button
            variant="primary"
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault();
              const formEl = e.currentTarget.closest('form');
              if (formEl) {
                const syntheticEvent = { preventDefault: () => {}, currentTarget: formEl };
                handleSubmit(syntheticEvent, false);
              }
            }}
          >
            <FaPaperPlane className="me-1" />
            {submitting ? 'Submitting…' : 'Submit for Approval'}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
