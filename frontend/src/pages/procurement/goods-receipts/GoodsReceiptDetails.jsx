import { useState, useEffect } from 'react';
import {
  Container, Card, Row, Col, Badge, Spinner, Alert, Table, Button,
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { getGR } from '../../../api/procurementApi';
import ProcurementBreadcrumb from '../../../components/procurement/ProcurementBreadcrumb';

const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount ?? 0);

export default function GoodsReceiptDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gr, setGr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGR = async () => {
      try {
        const res = await getGR(id);
        setGr(res.data?.goodsReceipt ?? res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load goods receipt.');
      } finally {
        setLoading(false);
      }
    };
    fetchGR();
  }, [id]);

  if (loading) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <ProcurementBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Procurement', href: '/procurement' },
          { label: 'Goods Receipts', href: '/procurement/goods-receipts' },
          { label: gr?.grNumber || 'Details' },
        ]}
      />

      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0 fw-bold">{gr?.grNumber}</h4>
          <small className="text-muted">Goods Receipt Details</small>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/procurement/goods-receipts')}>
          <FaArrowLeft className="me-1" /> Back
        </Button>
      </div>

      <Row className="g-3">
        <Col md={8}>
          <Card className="shadow-sm mb-3">
            <Card.Header className="fw-semibold">Receipt Information</Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col sm={6}>
                  <div className="text-muted small">GR Number</div>
                  <div className="fw-semibold">{gr?.grNumber}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Purchase Order</div>
                  <div>{gr?.purchaseOrder?.poNumber || '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Vendor</div>
                  <div className="fw-semibold">{gr?.vendor?.vendorName || gr?.vendor?.name || '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Receipt Date</div>
                  <div>{formatDate(gr?.receiptDate)}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Received By</div>
                  <div>{gr?.receivedBy?.name || '—'}</div>
                </Col>
                <Col sm={6}>
                  <div className="text-muted small">Delivery Note</div>
                  <div>{gr?.deliveryNoteNumber || '—'}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {gr?.items?.length > 0 && (
            <Card className="shadow-sm">
              <Card.Header className="fw-semibold">Received Items</Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Description</th>
                        <th className="text-end">Ordered Qty</th>
                        <th className="text-end">Received Qty</th>
                        <th>Condition</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gr.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.description || item.itemName}</td>
                          <td className="text-end">{item.orderedQuantity ?? '—'}</td>
                          <td className="text-end fw-semibold">{item.receivedQuantity}</td>
                          <td>
                            <Badge bg={item.condition === 'good' ? 'success' : item.condition === 'damaged' ? 'danger' : 'warning'} text={item.condition !== 'good' && item.condition !== 'damaged' ? 'dark' : undefined}>
                              {item.condition || 'good'}
                            </Badge>
                          </td>
                          <td className="text-muted small">{item.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col md={4}>
          {gr?.notes && (
            <Card className="shadow-sm">
              <Card.Header className="fw-semibold">Notes</Card.Header>
              <Card.Body>
                <p className="mb-0 small">{gr.notes}</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}
