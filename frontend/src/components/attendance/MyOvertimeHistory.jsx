import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Badge,
  Spinner,
  Alert,
  Button,
  Form,
  Row,
  Col,
} from 'react-bootstrap';
import { FaClock, FaFilter } from 'react-icons/fa';
import toast from '../../utils/toast';
import { getMyOvertimeEntries } from '../../api/overtimeApi';

const MyOvertimeHistory = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchMyOvertimeEntries();
  }, [statusFilter]);

  const fetchMyOvertimeEntries = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await getMyOvertimeEntries(params);
      setEntries(response.entries || []);
      setSummary(response.summary || null);
    } catch (error) {
      console.error('Error fetching overtime entries:', error);
      toast.error('Failed to load overtime history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status, isActive) => {
    if (isActive) {
      return (
        <Badge bg="info" className="text-capitalize">
          <span className="spinner-grow spinner-grow-sm me-1" role="status" aria-hidden="true"></span>
          Running
        </Badge>
      );
    }
    
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return (
      <Badge bg={variants[status] || 'secondary'} className="text-capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading overtime history...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaClock className="me-2 text-primary" />
            My Overtime History
          </h5>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Summary Stats */}
        {summary && (
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-0 bg-light">
                <Card.Body className="text-center">
                  <h3 className="mb-0">{summary.total}</h3>
                  <small className="text-muted">Total Entries</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-warning bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-warning">{summary.pending}</h3>
                  <small className="text-muted">Pending</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-success bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-success">{summary.approved}</h3>
                  <small className="text-muted">Approved</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 bg-primary bg-opacity-10">
                <Card.Body className="text-center">
                  <h3 className="mb-0 text-primary">{summary.totalHours}</h3>
                  <small className="text-muted">Total Hours</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Filter */}
        <div className="mb-3">
          <Form.Group as={Row} className="align-items-center">
            <Form.Label column sm={2}>
              <FaFilter className="me-2" />
              Filter by Status:
            </Form.Label>
            <Col sm={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Col>
          </Form.Group>
        </div>

        {/* Entries Table */}
        {entries.length === 0 ? (
          <Alert variant="info" className="mb-0">
            No overtime entries found
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Period</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Task Reference</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>{formatDate(entry.date)}</td>
                    <td>
                      <small>
                        {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                      </small>
                    </td>
                    <td>
                      <Badge bg="info">{entry.duration || 'Running...'} hrs</Badge>
                    </td>
                    <td>
                      <div style={{ maxWidth: '250px' }}>
                        <small>{entry.reason}</small>
                      </div>
                    </td>
                    <td>
                      <small className="text-muted">
                        {entry.taskReference || '-'}
                      </small>
                    </td>
                    <td>{getStatusBadge(entry.status, entry.isActive)}</td>
                    <td>
                      <small className="text-muted">
                        {formatDate(entry.createdAt)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Rejection Reason Display */}
        {entries.some((e) => e.status === 'rejected' && e.rejectionReason) && (
          <div className="mt-3">
            <h6>Rejection Details:</h6>
            {entries
              .filter((e) => e.status === 'rejected' && e.rejectionReason)
              .map((entry) => (
                <Alert key={entry._id} variant="danger" className="mb-2">
                  <strong>{formatDate(entry.date)}:</strong> {entry.rejectionReason}
                </Alert>
              ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default MyOvertimeHistory;
