import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Alert } from 'react-bootstrap';
import { FaHome, FaPlus, FaCalendar, FaClock, FaCheckCircle, FaTimesCircle, FaHourglass } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getMyWFHRequests, cancelWFHRequest } from '../../api/wfhApi';
import ApplyWFHModal from '../../components/wfh/ApplyWFHModal';

const MyWFHRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getMyWFHRequests();
      const data = response.data || [];
      setRequests(data);

      // Calculate stats
      setStats({
        total: data.length,
        pending: data.filter(r => r.status === 'pending').length,
        approved: data.filter(r => r.status === 'approved').length,
        rejected: data.filter(r => r.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error fetching WFH requests:', error);
      toast.error('Failed to load WFH requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this WFH request?')) {
      return;
    }

    try {
      await cancelWFHRequest(id);
      toast.success('WFH request cancelled successfully');
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling WFH request:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel WFH request');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return <Badge bg={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isToday = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFuture = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <FaHome className="me-2" />
                My Work From Home Requests
              </h2>
              <p className="text-muted mb-0">
                Apply for WFH and track your requests
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowApplyModal(true)}
            >
              <FaPlus className="me-2" />
              Apply for WFH
            </Button>
          </div>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaCalendar size={30} className="text-primary mb-2" />
              <h3 className="mb-0">{stats.total}</h3>
              <small className="text-muted">Total Requests</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaHourglass size={30} className="text-warning mb-2" />
              <h3 className="mb-0">{stats.pending}</h3>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaCheckCircle size={30} className="text-success mb-2" />
              <h3 className="mb-0">{stats.approved}</h3>
              <small className="text-muted">Approved</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaTimesCircle size={30} className="text-danger mb-2" />
              <h3 className="mb-0">{stats.rejected}</h3>
              <small className="text-muted">Rejected</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Info Alert */}
      <Alert variant="info" className="mb-4">
        <strong>Remember:</strong> When working from home, you must clock in at 10:00 AM and clock out at 7:00 PM (same as office hours).
      </Alert>

      {/* Requests Table */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">WFH Request History</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-5">
              <FaHome size={50} className="text-muted mb-3" />
              <p className="text-muted">No WFH requests yet</p>
              <Button
                variant="primary"
                onClick={() => setShowApplyModal(true)}
              >
                <FaPlus className="me-2" />
                Apply for Your First WFH
              </Button>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Approved/Rejected By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request._id}>
                    <td>
                      <strong>{formatDate(request.date)}</strong>
                      {isToday(request.date) && (
                        <Badge bg="info" className="ms-2">TODAY</Badge>
                      )}
                    </td>
                    <td>
                      <div style={{ maxWidth: '300px' }}>
                        {request.reason}
                      </div>
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      <small className="text-muted">
                        <FaClock className="me-1" />
                        {formatDate(request.createdAt)}
                      </small>
                    </td>
                    <td>
                      {request.status === 'approved' && request.approvedBy && (
                        <div>
                          <small className="text-success">
                            <FaCheckCircle className="me-1" />
                            {request.approvedBy.name}
                          </small>
                          <br />
                          <small className="text-muted">
                            {formatDate(request.approvedAt)}
                          </small>
                        </div>
                      )}
                      {request.status === 'rejected' && request.rejectedBy && (
                        <div>
                          <small className="text-danger">
                            <FaTimesCircle className="me-1" />
                            {request.rejectedBy.name}
                          </small>
                          <br />
                          <small className="text-muted">
                            {formatDate(request.rejectedAt)}
                          </small>
                          {request.rejectionReason && (
                            <div className="mt-1">
                              <small className="text-muted">
                                Reason: {request.rejectionReason}
                              </small>
                            </div>
                          )}
                        </div>
                      )}
                      {request.status === 'pending' && (
                        <small className="text-muted">-</small>
                      )}
                    </td>
                    <td>
                      {request.status === 'pending' && isFuture(request.date) && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleCancelRequest(request._id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Apply WFH Modal */}
      <ApplyWFHModal
        show={showApplyModal}
        onHide={() => setShowApplyModal(false)}
        onSuccess={fetchRequests}
      />
    </Container>
  );
};

export default MyWFHRequests;
