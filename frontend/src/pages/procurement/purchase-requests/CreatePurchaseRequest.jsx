import { useState } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, InputGroup,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaPaperPlane, FaSave } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { createPR } from '../../../api/procurementApi';
import PRStatusBadge from '../../../components/procurement/PRStatusBadge';
import BudgetWarningBanner from '../../../components/procurement/BudgetWarningBanner';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const CATEGORIES = [
  'IT Hardware', 'IT Software', 'Office Supplies', 'Furniture',
  'Services', 'Marketing', 'Travel', 'Maintenance', 'Other',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const UOM_OPTIONS = ['Nos', 'Pcs', 'Kg', 'Litre', 'Box', 'Set', 'Pair', 'Meter', 'Hour', 'Month'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount ?? 0);

const emptyLineItem = () => ({
  description: '',
  quantity: 1,
  unitPrice: 0,
  unitOfMeasure: 'Nos',
  category: 'Other',
});

export default function CreatePurchaseRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'IT Hardware',
    priority: 'medium',
    requiredByDate: '',
    estimatedAmount: '',
    department: user?.department || '',
    justification: '',
  });

  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [validated, setValidated] = useState(false);

  // ── Computed total from line items ──────────────────────────────────────────
  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    0,
  );

  // ── Form field handlers ─────────────────────────────────────────────────────
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
  const buildPayload = (asDraft = false) => ({
    title: form.title,
    description: form.description,
    category: form.category,
    priority: form.priority,
    requiredByDate: form.requiredByDate || undefined,
    estimatedAmount: lineItemsTotal || parseFloat(form.estimatedAmount) || 0,
    department: form.department,
    justification: form.justification,
    status: asDraft ? 'draft' : 'pending_hod',
    items: lineItems.map((item) => ({
      itemName: item.description,
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      estimatedUnitPrice: parseFloat(item.unitPrice) || 0,
      unitOfMeasure: item.unitOfMeasure,
      category: item.category,
    })),
    estimatedTotalCost: lineItemsTotal || parseFloat(form.estimatedAmount) || 0,
  });

  // ── Submit handlers ─────────────────────────────────────────────────────────
  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault();
    const formEl = e.currentTarget.closest('form') || e.currentTarget;
    if (!formEl.checkValidity()) {
      setValidated(true);
      return;
    }
    setValidated(true);
    await doSubmit(asDraft);
  };

  const doSubmit = async (asDraft = false, overrideAcknowledged = false) => {
    setSubmitting(true);
    try {
      const payload = { ...buildPayload(asDraft), overrideAcknowledged };
      const res = await createPR(payload);
      const data = res.data;

      // Check if API returned a budget warning
      if (data?.budgetWarning?.exceeded && !overrideAcknowledged) {
        setBudgetWarning({
          available: data.budgetWarning.availableBudget,
          requested: data.budgetWarning.estimatedCost,
          exceeded: true,
        });
        setPendingSubmit(!asDraft);
        setSubmitting(false);
        return;
      }

      toast.success(asDraft ? 'Purchase Request saved as draft.' : 'Purchase Request submitted for approval.');
      navigate('/procurement/purchase-requests/my');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create Purchase Request.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBudgetOverride = () => {
    setBudgetWarning(null);
    doSubmit(!pendingSubmit, true);
  };

  const handleBudgetCancel = () => {
    setBudgetWarning(null);
    setPendingSubmit(false);
  };

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests', href: '/procurement/purchase-requests/my' },
          { label: 'Create New PR' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0 fw-bold">Create Purchase Request</h4>
        <PRStatusBadge status="draft" />
      </div>

      {budgetWarning && (
        <BudgetWarningBanner
          budgetInfo={budgetWarning}
          onConfirmOverride={handleBudgetOverride}
          onCancel={handleBudgetCancel}
        />
      )}

      <Form noValidate validated={validated} onSubmit={(e) => handleSubmit(e, false)}>
        {/* ── Basic Info ── */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-primary text-white fw-semibold">Basic Information</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={8}>
                <Form.Group>
                  <Form.Label>Title <span className="text-danger">*</span></Form.Label>
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
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select name="category" value={form.category} onChange={handleFormChange}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Department</Form.Label>
                  <Form.Control
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    placeholder="Department name"
                  />
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
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Optional description"
                    maxLength={500}
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Justification <span className="text-danger">*</span></Form.Label>
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
                  <Form.Control.Feedback type="invalid">Justification is required.</Form.Control.Feedback>
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
                    <th style={{ minWidth: 200 }}>Description *</th>
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
                          value={item.description}
                          onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                          placeholder="Item description"
                          required
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
                          onChange={(e) => handleLineItemChange(idx, 'unitOfMeasure', e.target.value)}
                        >
                          {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={item.category}
                          onChange={(e) => handleLineItemChange(idx, 'category', e.target.value)}
                        >
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </Form.Select>
                      </td>
                      <td className="text-end fw-semibold">
                        {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
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
                    <td colSpan={5} className="text-end fw-bold">Grand Total</td>
                    <td className="text-end fw-bold text-primary">{formatCurrency(lineItemsTotal)}</td>
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
            onClick={() => navigate('/procurement/purchase-requests/my')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="outline-primary"
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('form');
              if (form) {
                const syntheticEvent = { preventDefault: () => {}, currentTarget: form };
                handleSubmit(syntheticEvent, true);
              }
            }}
          >
            <FaSave className="me-1" /> Save as Draft
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            <FaPaperPlane className="me-1" />
            {submitting ? 'Submitting…' : 'Submit for Approval'}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
