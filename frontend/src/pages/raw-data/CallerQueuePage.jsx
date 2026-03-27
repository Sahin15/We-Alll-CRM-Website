import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Spinner } from "react-bootstrap";
import { FaPhone, FaArrowRight, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { rawDataApi } from "../../api/rawDataApi";
import CallLogModal from "../../components/raw-data/CallLogModal";

const STATUS_COLORS = {
  "Pending Call": "warning",
  "No Response": "dark",
  "Follow-up Needed": "warning",
};

export default function CallerQueuePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [calledCount, setCalledCount] = useState(0);
  const [activeRecord, setActiveRecord] = useState(null);
  const [showCallLog, setShowCallLog] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await rawDataApi.getTodayQueue();
      setQueue(res.data.queue);
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleCallNext = async () => {
    const record = queue[currentIndex];
    if (!record) return;
    try {
      await rawDataApi.lock(record._id);
      setActiveRecord(record);
      setShowCallLog(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not lock record");
    }
  };

  const handleCallSaved = () => {
    setShowCallLog(false);
    setActiveRecord(null);
    setCalledCount(c => c + 1);
    setCurrentIndex(i => i + 1);
    fetchQueue();
  };

  const handleCallHide = () => {
    if (activeRecord) rawDataApi.unlock(activeRecord._id).catch(() => {});
    setShowCallLog(false);
    setActiveRecord(null);
  };

  const total = queue.length;
  const remaining = Math.max(0, total - currentIndex);
  const progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;
  const current = queue[currentIndex];

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-3" style={{ maxWidth: 720 }}>
      {/* Header */}
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">Today's Calling Queue</h4>
          <small className="text-muted">Hi {user?.name} — work through your assigned contacts</small>
        </Col>
      </Row>

      {/* Progress */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between mb-2">
            <span className="small text-muted">Progress</span>
            <span className="small fw-medium">{currentIndex} / {total} called</span>
          </div>
          <ProgressBar now={progress} variant="success" style={{ height: 8 }} />
          <div className="d-flex gap-4 mt-2">
            <span className="small text-success">✓ Called: <strong>{calledCount}</strong></span>
            <span className="small text-warning">⏳ Remaining: <strong>{remaining}</strong></span>
            <span className="small text-muted">Total: <strong>{total}</strong></span>
          </div>
        </Card.Body>
      </Card>

      {/* Current record */}
      {total === 0 ? (
        <Card className="border-0 shadow-sm text-center py-5">
          <Card.Body>
            <FaCheckCircle size={48} className="text-success mb-3" />
            <h5>Queue is empty</h5>
            <p className="text-muted small">No pending contacts assigned to you today.</p>
          </Card.Body>
        </Card>
      ) : currentIndex >= total ? (
        <Card className="border-0 shadow-sm text-center py-5">
          <Card.Body>
            <FaCheckCircle size={48} className="text-success mb-3" />
            <h5>All done for today!</h5>
            <p className="text-muted small">You've worked through all {total} contacts.</p>
            <Button variant="outline-primary" size="sm" onClick={() => { setCurrentIndex(0); setCalledCount(0); fetchQueue(); }}>
              Refresh Queue
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <span className="fw-medium">Contact #{currentIndex + 1}</span>
              <Badge bg={STATUS_COLORS[current?.status] || "secondary"}>{current?.status}</Badge>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <div className="small text-muted">Name</div>
                  <div className="fw-medium">{current?.name}</div>
                </Col>
                <Col md={6}>
                  <div className="small text-muted">Phone</div>
                  <div className="fw-medium">
                    <a href={`tel:${current?.phone}`}>{current?.phone}</a>
                  </div>
                </Col>
                {current?.whatsapp && (
                  <Col md={6}>
                    <div className="small text-muted">WhatsApp</div>
                    <div>{current.whatsapp}</div>
                  </Col>
                )}
                {current?.location && (
                  <Col md={6}>
                    <div className="small text-muted">Location</div>
                    <div>{current.location}</div>
                  </Col>
                )}
                {current?.category && (
                  <Col md={6}>
                    <div className="small text-muted">Category</div>
                    <div>{current.category}</div>
                  </Col>
                )}
                {current?.requirement && (
                  <Col md={12}>
                    <div className="small text-muted">Requirement</div>
                    <div>{current.requirement}</div>
                  </Col>
                )}
                {current?.remarks && (
                  <Col md={12}>
                    <div className="small text-muted">Last Remark</div>
                    <div className="text-muted small">{current.remarks}</div>
                  </Col>
                )}
                <Col md={6}>
                  <div className="small text-muted">Call Attempts</div>
                  <div>{current?.callAttemptCount || 0}</div>
                </Col>
                {current?.nextCallDate && (
                  <Col md={6}>
                    <div className="small text-muted">Scheduled For</div>
                    <div>{new Date(current.nextCallDate).toLocaleDateString()}</div>
                  </Col>
                )}
              </Row>
            </Card.Body>
            <Card.Footer className="bg-white d-flex gap-2 justify-content-end">
              <Button variant="outline-secondary" size="sm" onClick={() => setCurrentIndex(i => i + 1)}>
                Skip <FaArrowRight className="ms-1" />
              </Button>
              <Button variant="success" size="sm" onClick={handleCallNext}>
                <FaPhone className="me-1" /> Log Call
              </Button>
            </Card.Footer>
          </Card>

          {/* Upcoming */}
          {queue.slice(currentIndex + 1, currentIndex + 4).length > 0 && (
            <div>
              <p className="small text-muted mb-2">Up next:</p>
              {queue.slice(currentIndex + 1, currentIndex + 4).map((r, i) => (
                <div key={r._id} className="d-flex align-items-center gap-2 mb-1 p-2 rounded bg-light">
                  <span className="text-muted small">#{currentIndex + 2 + i}</span>
                  <span className="small fw-medium">{r.name}</span>
                  <span className="small text-muted">{r.phone}</span>
                  <Badge bg={STATUS_COLORS[r.status] || "secondary"} className="ms-auto small">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeRecord && showCallLog && (
        <CallLogModal
          show={showCallLog}
          record={activeRecord}
          onHide={handleCallHide}
          onSaved={handleCallSaved}
        />
      )}
    </Container>
  );
}
