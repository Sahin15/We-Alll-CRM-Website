import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Card, Form, Button, Row, Col, Table, Spinner, Alert,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import { listPOs, getPO, createGR } from '../../../api/procurementApi';
import AssetCreationPrompt from '../../../components/procurement/AssetCreationPrompt';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const TRACKABLE_CATEGORIES = ['IT Hardware', 'Furniture'];

const today = () => new Date().toISOString().split('T')[0];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

export default function CreateGoodsReceipt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const preselectedPoId = searchParams.get('poId') || '';

  const [pos, setPos] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState(preselectedPoId);
  const [poDetail, setPoDetail] = useState(null);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [loadingPO, setLoadingPO] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [receivedDate, setReceivedDate] = useState(today());
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lineItems, setLineItems] = useState([]);

  // Asset creation modal
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [trackableItems, setTrackableItems] = useState([]);
  const [createdGrId, setCreatedGrId] = useState(null);

  // Load eligible POs (issued or partially_received)
  useEffect(() => {
    const fetchPOs = async () => {
      setLoadingPOs(true);
      try {
        const res = await listPOs({ status: 'issued,partially_received', limit: 200 });
        const data = res.data?.data || res.data?.purchaseOrders || res.data || [];
        setPos(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load purchase orders');
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, []);

  // Load PO detail when selection changes
  useEffect(() => {
    if (!selectedPoId) {
      setPoDetail(null);
      setLineItems([]);
      return;
    }
    const fetchPO = async () => {
      setLoadingPO(true);
      try {
        const res = await getPO(selectedPoId);
        const po = res.data?.data || res.data?.purchaseOrder || res.data;
        setPoDetail(po);
        // Build line items from PO
        const items = (po.lineItems || []).map((li) => ({
          poLineItemId: li._id,
          itemName: li.itemName,
          description: li.description || li.itemName,
          orderedQty: li.quantity,
          previouslyReceivedQty: li.receivedQuantity || 0,
          remainingQty: li.quantity - (li.receivedQuantity || 0),
          unitPrice: li.unitPrice,
          category: li.category,
          receivedQty: 0,
          condition: 'good',
          notes: '',
        }));
        setLineItems(items);
      } catch {
        toast.error('Failed to load PO details');
      } finally {
        setLoadingPO(false);
      }
    };
    fetchPO();
  }, [selectedPoId]);

  const updateLineItem = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'receivedQty') {
          const max = item.remainingQty;
          const num = Math.max(0, Math.min(Number(value), max));
          return { ...item, receivedQty: num };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPoId) {
      toast.error('Please select a Purchase Order');
      return;
    }
    const hasReceived = lineItems.some((li) => li.receivedQty > 0);
    if (!hasReceived) {
      toast.error('Please enter received quantity for at least one line item');
      return;
    }

    const payload = {
      purchaseOrder: selectedPoId,
      receivedDate,
      deliveryNoteNumber,
      notes: remarks,
      lineItems: lineItems
        .filter((li) => li.receivedQty > 0)
        .map((li) => ({
          poLineItemId: li.poLineItemId,
          itemName: li.itemName,
          orderedQuantity: li.orderedQty,
          receivedQuantity: li.receivedQty,
          unitPrice: li.unitPrice,
          category: li.category,
          notes: li.notes,
          condition: li.condition,
        })),
    };

    setSubmitting(true);
    try {
      const res = await createGR(payload);
      const gr = res.data?.data || res.data?.goodsReceipt || res.data;
      toast.success('Goods Receipt created successfully');
      setCreatedGrId(gr?._id);

      // Check for trackable items
      const trackable = lineItems.filter(
        (li) => li.receivedQty > 0 && TRACKABLE_CATEGORIES.includes(li.category)
      );
      if (trackable.length > 0) {
        setTrackableItems(
          trackable.map((li) => ({
            _id: li.poLineItemId,
            description: li.itemName,
            quantity: li.receivedQty,
            unitOfMeasure: 'unit',
            category: li.category,
          }))
        );
        setShowAssetModal(true);
      } else {
        navigate('/procurement/goods-receipts');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create Goods Receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssetCreate = (selectedAssets) => {
    setShowAssetModal(false);
    if (selectedAssets.length > 0) {
      toast.info(`${selectedAssets.length} asset(s) queued for registration`);
    }
    navigate('/procurement/goods-receipts');
  };

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Goods Receipts', href: '/procurement/goods-receipts' },
          { label: 'Record Receipt' },
        ]}
      />
      <div className="d-flex align-items-center mb-4 gap-2">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <h4 className="mb-0">Record Goods Receipt</h4>
      </div>

      <Form onSubmit={handleSubmit}>
        {/* Header Card */}
        <Card className="mb-4">
          <Card.Header><strong>Receipt Details</strong></Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Purchase Order <span className="text-danger">*</span></Form.Label>
                  {loadingPOs ? (
                    <div><Spinner size="sm" /> Loading POs…</div>
                  ) : (
                    <Form.Select
                      value={selectedPoId}
                      onChange={(e) => setSelectedPoId(e.target.value)}
                      required
                    >
                      <option value="">— Select PO —</option>
                      {pos.map((po) => (
                        <option key={po._id} value={po._id}>
                          {po.poNumber} — {po.vendor?.name || 'Unknown Vendor'} ({po.status})
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Received Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group>
                  <Form.Label>Received By</Form.Label>
                  <Form.Control
                    type="text"
                    value={user?.name || user?.email || ''}
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Delivery Note Number</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. DN-2024-001"
                    value={deliveryNoteNumber}
                    onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                  />
                </Form.Group>
              </Col>

              <Col md={8}>
                <Form.Group>
                  <Form.Label>Remarks</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Any additional remarks…"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* PO Summary */}
        {poDetail && (
          <Card className="mb-4 border-info">
            <Card.Header className="bg-info bg-opacity-10">
              <strong>PO Summary</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-2 small">
                <Col md={3}><span className="text-muted">PO Number:</span> <strong>{poDetail.poNumber}</strong></Col>
                <Col md={3}><span className="text-muted">Vendor:</span> <strong>{poDetail.vendor?.name}</strong></Col>
                <Col md={3}><span className="text-muted">Total Value:</span> <strong>{formatCurrency(poDetail.totalValue)}</strong></Col>
                <Col md={3}><span className="text-muted">Status:</span> <strong className="text-capitalize">{poDetail.status?.replace('_', ' ')}</strong></Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Line Items */}
        {loadingPO && (
          <div className="text-center py-4">
            <Spinner /> Loading PO line items…
          </div>
        )}

        {!loadingPO && lineItems.length > 0 && (
          <Card className="mb-4">
            <Card.Header><strong>Line Items</strong></Card.Header>
            <Card.Body className="p-0">
              <Table responsive bordered hover className="mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Item / Description</th>
                    <th className="text-center">Ordered Qty</th>
                    <th className="text-center">Prev. Received</th>
                    <th className="text-center">Remaining</th>
                    <th className="text-center" style={{ minWidth: 100 }}>Received Qty <span className="text-danger">*</span></th>
                    <th style={{ minWidth: 130 }}>Condition</th>
                    <th style={{ minWidth: 180 }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={item.poLineItemId} className={item.remainingQty === 0 ? 'table-secondary' : ''}>
                      <td>
                        <div className="fw-semibold">{item.itemName}</div>
                        {item.description && item.description !== item.itemName && (
                          <div className="text-muted">{item.description}</div>
                        )}
                        {item.category && (
                          <span className="badge bg-secondary bg-opacity-25 text-dark">{item.category}</span>
                        )}
                      </td>
                      <td className="text-center">{item.orderedQty}</td>
                      <td className="text-center">{item.previouslyReceivedQty}</td>
                      <td className="text-center">
                        <span className={item.remainingQty === 0 ? 'text-muted' : 'fw-semibold text-success'}>
                          {item.remainingQty}
                        </span>
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          size="sm"
                          min={0}
                          max={item.remainingQty}
                          value={item.receivedQty}
                          onChange={(e) => updateLineItem(idx, 'receivedQty', e.target.value)}
                          disabled={item.remainingQty === 0}
                        />
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={item.condition}
                          onChange={(e) => updateLineItem(idx, 'condition', e.target.value)}
                          disabled={item.remainingQty === 0}
                        >
                          <option value="good">Good</option>
                          <option value="damaged">Damaged</option>
                          <option value="partial">Partial</option>
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="Notes…"
                          value={item.notes}
                          onChange={(e) => updateLineItem(idx, 'notes', e.target.value)}
                          disabled={item.remainingQty === 0}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {!loadingPO && selectedPoId && lineItems.length === 0 && (
          <Alert variant="warning">No line items found for this PO.</Alert>
        )}

        <div className="d-flex gap-2 justify-content-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !selectedPoId}>
            {submitting ? <><Spinner size="sm" className="me-2" />Saving…</> : 'Record Receipt'}
          </Button>
        </div>
      </Form>

      {/* Asset Creation Modal */}
      <AssetCreationPrompt
        show={showAssetModal}
        onHide={() => { setShowAssetModal(false); navigate('/procurement/goods-receipts'); }}
        grLineItems={trackableItems}
        onCreateAsset={handleAssetCreate}
      />
    </Container>
  );
}
