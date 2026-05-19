import { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Table, Spinner, Alert, InputGroup,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaSave } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { createPO, listPRs, listVendors } from '../../../api/procurementApi';
import api from '../../../services/api';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const CATEGORIES = [
  'IT Hardware', 'IT Software', 'Office Supplies', 'Furniture',
  'Services', 'Marketing', 'Travel', 'Maintenance', 'Other',
];

const UOM_OPTIONS = ['Nos', 'Pcs', 'Kg', 'Litre', 'Box', 'Set', 'Pair', 'Meter', 'Hour', 'Month'];

const PAYMENT_TERMS = ['Immediate', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount ?? 0);

const emptyLineItem = () => ({
  itemName: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  unitOfMeasure: 'Nos',
  category: 'Other',
});

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Data for dropdowns ──────────────────────────────────────────────────────
  const [approvedPRs, setApprovedPRs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedPRIds, setSelectedPRIds] = useState([]);
  const [form, setForm] = useState({
    vendor: '',
    deliveryAddress: '',
    expectedDeliveryDate: '',
    paymentTerms: 'Net 30',
    department: user?.department || '',
    project: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState([emptyLineItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [validated, setValidated] = useState(false);

  // ── Load dropdown data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [prsRes, vendorsRes, deptsRes] = await Promise.allSettled([
        listPRs({ status: 'approved' }),
        listVendors({ isActive: true }),
        api.get('/departments'),
      ]);

      if (prsRes.status === 'fulfilled') {
        const raw = prsRes.value.data;
        setApprovedPRs(Array.isArray(raw) ? raw : raw?.data ?? raw?.purchaseRequests ?? []);
      }
      if (vendorsRes.status === 'fulfilled') {
        const raw = vendorsRes.value.data;
        setVendors(Array.isArray(raw) ? raw : raw?.data ?? raw?.vendors ?? []);
      }
      if (deptsRes.status === 'fulfilled') {
        const raw = deptsRes.value.data;
        setDepartments(Array.isArray(raw) ? raw : raw?.data ?? raw?.departments ?? []);
      }
    } catch (err) {
      setDataError('Failed to load form data. Please refresh.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Auto-populate line items from selected PRs ──────────────────────────────
  const handlePRSelection = (prId, checked) => {
    let newSelectedIds;
    if (checked) {
      newSelectedIds = [...selectedPRIds, prId];
    } else {
      newSelectedIds = selectedPRIds.filter((id) => id !== prId);
    }
    setSelectedPRIds(newSelectedIds);

    // Rebuild line items from selected PRs
    const selectedPRs = approvedPRs.filter((pr) => newSelectedIds.includes(pr._id));
    const prLineItems = selectedPRs.flatMap((pr) =>
      (pr.items || []).map((item) => ({
        itemName: item.itemName || item.description || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.estimatedUnitPrice || item.unitPrice || 0,
        unitOfMeasure: item.unitOfMeasure || 'Nos',
        category: item.category || 'Other',
        linkedPRItem: item._id,
      }))
    );

    setLineItems(prLineItems.length > 0 ? prLineItems : [emptyLineItem()]);
  };

  // ── Line item handlers ──────────────────────────────────────────────────────
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

  // ── Running total ───────────────────────────────────────────────────────────
  const runningTotal = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    0,
  );

  // ── Form field handler ──────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      setValidated(true);
      return;
    }
    setValidated(true);

    if (lineItems.length === 0 || lineItems.every((li) => !li.itemName.trim())) {
      toast.error('Please add at least one line item with a name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        linkedPRs: selectedPRIds,
        vendor: form.vendor,
        lineItems: lineItems.map((li) => ({
          itemName: li.itemName,
          description: li.description,
          quantity: parseFloat(li.quantity) || 1,
          unitPrice: parseFloat(li.unitPrice) || 0,
          unitOfMeasure: li.unitOfMeasure,
          category: li.category,
          ...(li.linkedPRItem ? { linkedPRItem: li.linkedPRItem } : {}),
        })),
        totalValue: runningTotal,
        deliveryAddress: form.deliveryAddress,
        expectedDeliveryDate: form.expectedDeliveryDate,
        paymentTerms: form.paymentTerms,
        department: form.department,
        ...(form.project ? { project: form.project } : {}),
        notes: form.notes,
      };

      await createPO(payload);
      toast.success('Purchase Order created successfully.');
      navigate('/procurement/purchase-orders');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create Purchase Order.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading form data…</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Orders', href: '/procurement/purchase-orders' },
          { label: 'Create PO' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0 fw-bold">Create Purchase Order</h4>
      </div>

      {dataError && <Alert variant="warning">{dataError}</Alert>}

      <Form noValidate validated={validated} onSubmit={handleSubmit}>

        {/* ── Linked PRs ── */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-primary text-white fw-semibold">
            Linked Purchase Requests (Approved)
          </Card.Header>
          <Card.Body>
            {approvedPRs.length === 0 ? (
              <p className="text-muted mb-0">No approved Purchase Requests available.</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {approvedPRs.map((pr) => (
                  <Form.Check
                    key={pr._id}
                    type="checkbox"
                    id={`pr-${pr._id}`}
                    label={
                      <span>
                        <strong>{pr.prNumber}</strong>
                        {pr.title ? ` — ${pr.title}` : ''}
                        {pr.estimatedTotalCost != null
                          ? ` (${formatCurrency(pr.estimatedTotalCost)})`
                          : ''}
                      </span>
                    }
                    checked={selectedPRIds.includes(pr._id)}
                    onChange={(e) => handlePRSelection(pr._id, e.target.checked)}
                    className="mb-1"
                  />
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* ── Vendor & Basic Info ── */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-primary text-white fw-semibold">Order Details</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Vendor <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="vendor"
                    value={form.vendor}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">— Select Vendor —</option>
                    {vendors.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.vendorName || v.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">Vendor is required.</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Payment Terms <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleFormChange}
                    required
                  >
                    {PAYMENT_TERMS.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">Payment terms are required.</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Department <span className="text-danger">*</span></Form.Label>
                  {departments.length > 0 ? (
                    <Form.Select
                      name="department"
                      value={form.department}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">— Select Department —</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </Form.Select>
                  ) : (
                    <Form.Control
                      type="text"
                      name="department"
                      value={form.department}
                      onChange={handleFormChange}
                      placeholder="Department"
                      required
                    />
                  )}
                  <Form.Control.Feedback type="invalid">Department is required.</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Expected Delivery Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="expectedDeliveryDate"
                    value={form.expectedDeliveryDate}
                    onChange={handleFormChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <Form.Control.Feedback type="invalid">Expected delivery date is required.</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Delivery Address <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="deliveryAddress"
                    value={form.deliveryAddress}
                    onChange={handleFormChange}
                    placeholder="Full delivery address"
                    required
                    maxLength={500}
                  />
                  <Form.Control.Feedback type="invalid">Delivery address is required.</Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Project (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    name="project"
                    value={form.project}
                    onChange={handleFormChange}
                    placeholder="Project ID or name (optional)"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Additional notes or instructions"
                    maxLength={1000}
                  />
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
                    <th style={{ width: 80 }}>Qty *</th>
                    <th style={{ width: 130 }}>Unit Price (₹) *</th>
                    <th style={{ width: 100 }}>UoM</th>
                    <th style={{ width: 150 }}>Category</th>
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
                          onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
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
                        <InputGroup size="sm">
                          <InputGroup.Text>₹</InputGroup.Text>
                          <Form.Control
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                            min={0}
                            step="0.01"
                            required
                          />
                        </InputGroup>
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
                    <td colSpan={6} className="text-end fw-bold">Grand Total</td>
                    <td className="text-end fw-bold text-primary fs-6">{formatCurrency(runningTotal)}</td>
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
            onClick={() => navigate('/procurement/purchase-orders')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            <FaSave className="me-1" />
            {submitting ? 'Creating…' : 'Create Purchase Order'}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
