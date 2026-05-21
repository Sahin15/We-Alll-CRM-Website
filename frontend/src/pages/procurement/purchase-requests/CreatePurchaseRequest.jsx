import { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Spinner,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaPaperPlane, FaSave } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { createPR, submitPR } from '../../../api/procurementApi';
import api from '../../../services/api';
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

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    requiredByDate: '',
    department: '',
    justification: '',
  });

  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [pendingPRId, setPendingPRId] = useState(null);
  const [validated, setValidated] = useState(false);

  // Load departments for dropdown
  useEffect(() => {
    api.get('/departments')
      .then((res) => {
        const raw = res.data;
        const depts = Array.isArray(raw) ? raw : raw?.data ?? raw?.departments ?? [];
        setDepartments(depts);
        // Auto-select user's department if available
        if (user?.department) {
          const match = depts.find(
            (d) => d._id === user.department || d._id === user.department?._id
          );
          if (match) setForm((prev) => ({ ...prev, department: match._id }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDepts(false));
  }, [user]);

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
  const buildPayload = () => ({
    title: form.title,
    description: form.description,
    priority: form.priority,
    requiredByDate: form.requiredByDate || undefined,
    department: form.department,
    justification: form.justification,
    items: lineItems.map((item) => ({
      itemName: item.description,
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      estimatedUnitPrice: parseFloat(item.unitPrice) || 0,
      unitOfMeasure: item.unitOfMeasure,
      category: item.category,
    })),
    estimatedTotalCost: lineItemsTotal,
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
    let createdPR = null;
    try {
      // Step 1: Always create as draft first
      const payload = buildPayload();
      const res = await createPR(payload);
      createdPR = res.data?.data || res.data?.pr || res.data;

      if (!createdPR?._id) {
        toast.error('Failed to create Purchase Request.');
        return;
      }

      if (asDraft) {
        toast.success('Purchase Request saved as draft.');
        navigate('/procurement/purchase-requests/my');
        return;
      }

      // Step 2: Submit for approval
      const submitRes = await submitPR(createdPR._id, { overrideAcknowledged });
      const submitData = submitRes.data;

      // Check if API returned a budget warning
      if (submitData?.budgetWarning) {
        setBudgetWarning({
          available: submitData.availableBudget,
          requested: submitData.estimatedCost,
          exceeded: true,
        });
        setPendingPRId(createdPR._id);
        setSubmitting(false);
        return;
      }

      toast.success('Purchase Request submitted for approval.');
      navigate('/procurement/purchase-requests/my');
    } catch (err) {
      if (createdPR?._id) {
        toast.warning('Request saved but submission failed. You can submit it from My Requests.');
        navigate('/procurement/purchase-requests/my');
      } else {
        const msg = err.response?.data?.message || 'Failed to create Purchase Request.';
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBudgetOverride = async () => {
    if (!pendingPRId) return;
    setBudgetWarning(null);
    setSubmitting(true);
    try {
      await submitPR(pendingPRId, { overrideAcknowledged: true });
      toast.success('Purchase Request submitted for approval.');
      navigate('/procurement/purchase-requests/my');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit PR.');
    } finally {
      setSubmitting(false);
      setPendingPRId(null);
    }
  };

  const handleBudgetCancel = () => {
    setBudgetWarning(null);
    if (pendingPRId) {
      toast.info('PR saved as draft. You can submit it later from My Requests.');
      navigate('/procurement/purchase-requests/my');
    }
    setPendingPRId(null);
  };

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'My Requests', href: '/procurement/purchase-requests/my' },
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
              {/* Title */}
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

              {/* Priority */}
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

              {/* Department */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Department <span className="text-danger">*</span></Form.Label>
                  {loadingDepts ? (
                    <div className="d-flex align-items-center gap-2">
                      <Spinner size="sm" animation="border" />
                      <span className="text-muted small">Loading departments…</span>
                    </div>
                  ) : departments.length > 0 ? (
                    <Form.Select
                      name="department"
                      value={form.department}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">— Select Department —</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Control
                      type="text"
                      name="department"
                      value={form.department}
                      onChange={handleFormChange}
                      placeholder="Department name or ID"
                      required
                    />
                  )}
                  <Form.Control.Feedback type="invalid">Department is required.</Form.Control.Feedback>
                </Form.Group>
              </Col>

              {/* Required By Date */}
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

              {/* Description */}
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Optional additional details"
                    maxLength={500}
                  />
                </Form.Group>
              </Col>

              {/* Justification */}
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
            <span>Line Items <span className="text-white-50 small">(at least one required)</span></span>
            <Button variant="light" size="sm" onClick={addLineItem}>
              <FaPlus className="me-1" /> Add Item
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table bordered hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 200 }}>Item Name / Description <span className="text-danger">*</span></th>
                    <th style={{ width: 90 }}>Qty <span className="text-danger">*</span></th>
                    <th style={{ width: 140 }}>Unit Price (₹) <span className="text-danger">*</span></th>
                    <th style={{ width: 110 }}>UoM</th>
                    <th style={{ width: 160 }}>Category</th>
                    <th style={{ width: 120 }}>Total</th>
                    <th style={{ width: 50 }}></th>
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
                          placeholder="e.g. Dell Laptop, Office Chair"
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
                          step="0.01"
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
                    <td colSpan={5} className="text-end fw-bold">Estimated Total</td>
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
              const formEl = e.currentTarget.closest('form');
              if (formEl) {
                const syntheticEvent = { preventDefault: () => {}, currentTarget: formEl };
                handleSubmit(syntheticEvent, true);
              }
            }}
          >
            <FaSave className="me-1" /> Save as Draft
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting
              ? <><Spinner size="sm" animation="border" className="me-1" /> Submitting…</>
              : <><FaPaperPlane className="me-1" /> Submit for Approval</>
            }
          </Button>
        </div>
      </Form>
    </Container>
  );
}
