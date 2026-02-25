import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { FaHome, FaCheckCircle, FaTimesCircle, FaHourglass, FaCalendar, FaFilter, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getAllWFHRequests, approveWFHRequest, rejectWFHRequest } from '../../api/wfhApi';

const WFHManagementPanel = () => {
  const [requests, setRequests] = useState([]);
  const [displayedRequests, setDisplayedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(9);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  useEffect(() => {
    fetchAllRequests();
  }, [filters]);

  useEffect(() => {
    updateDisplayedRequests();
  }, [requests, itemsToShow]);

  const updateDisplayedRequests = () => {
    let filtered = [...requests];

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(req => 
        req.employee?.name?.toLowerCase().includes(searchTerm) ||
        req.employee?.email?.toLowerCase().includes(searchTerm) ||
        req.reason?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by priority: pending first, then by date (newest first)
    const sortedRequests = filtered.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return new Date(b.date) - new Date(a.date);
    });
    
    setDisplayedRequests(sortedRequests.slice(0, itemsToShow));
  };

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      setItemsToShow(9);
      const response = await getAllWFHRequests();
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching WFH requests:', error);
      toast.error('Failed to load WFH requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this WFH request?')) {
      return;
    }

    try {
      setProcessing(true);
      await approveWFHRequest(id);
      toast.success('WFH request approved successfully!');
      fetchAllRequests();
    } catch (error) {
      console.error('Error approving WFH request:', error);
      toast.error(error.response?.data?.message || 'Failed to approve WFH request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      await rejectWFHRequest(selectedRequest._id, rejectionReason.trim());
      toast.success('WFH request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchAllRequests();
    } catch (error) {
      console.error('Error rejecting WFH request:', error);
      toast.error(error.response?.data?.message || 'Failed to reject WFH request');
    } finally {
      setProcessing(false);
    }
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

  const isTomorrow = (dateString) => {
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  };

  const stats = getStats();
  const filteredRequests = requests.filter(req => {
    let matches = true;
    
    if (filters.status !== 'all') {
      matches = matches && req.status === filters.status;
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      matches = matches && (
        req.employee?.name?.toLowerCase().includes(searchTerm) ||
        req.employee?.email?.toLowerCase().includes(searchTerm) ||
        req.reason?.toLowerCase().includes(searchTerm)
      );
    }
    
    return matches;
  });

  return (
    <>
      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Total Requests</h6>
                  <h3 className="mb-0">{stats.total}</h3>
                </div>
                <div className="stats-icon bg-primary">
                  <FaHome />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Pending</h6>
                  <h3 className="mb-0 text-warning">{stats.pending}</h3>
                </div>
                <div className="stats-icon bg-warning">
                  <FaHourglass />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Approved</h6>
                  <h3 className="mb-0 text-success">{stats.approved}</h3>
                </div>
                <div className="stats-icon bg-success">
                  <FaCheckCircle />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1">Rejected</h6>
                  <h3 className="mb-0 text-danger">{stats.rejected}</h3>
                </div>
                <div className="stats-icon bg-danger">
                  <FaTimesCircle />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-3">
              <Row className="g-2">
                <Col md={4}>
                  <Form.Select
                    size="sm"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </Form.Select>
                </Col>
                <Col md={8}>
                  <InputGroup size="sm">
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search employees..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </InputGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* WFH Requests Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading WFH requests...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-5">
                  <FaHome size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">No WFH requests found</h5>
                  <p className="text-muted">No WFH requests match your current filter.</p>
                </div>
              ) : (
                <>
                  <Alert variant="info" className="mb-3">
                    <small>
                      <strong>Note:</strong> WFH employees must clock in at 10:00 AM and clock out at 7:00 PM (same as office hours).
                    </small>
                  </Alert>
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Reason</th>
                        <th>Applied On</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRequests.map((request) => (
                        <tr key={request._id}>
                          <td>
                            <div>
                              <strong>{request.employee?.name}</strong>
                              <br />
                              <small className="text-muted">
                                {request.employee?.email}
                              </small>
                              {request.employee?.employeeId && (
                                <>
                                  <br />
                                  <small className="text-muted">
                                    ID: {request.employee.employeeId}
                                  </small>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>
                              <FaCalendar className="me-1" />
                              <strong>{formatDate(request.date)}</strong>
                              {isToday(request.date) && (
                                <Badge bg="danger" className="ms-2">TODAY</Badge>
                              )}
                              {isTomorrow(request.date) && (
                                <Badge bg="warning" className="ms-2">TOMORROW</Badge>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ maxWidth: '300px' }}>
                              {request.reason}
                            </div>
                          </td>
                          <td>
                            <small className="text-muted">
                              {formatDate(request.createdAt)}
                            </small>
                          </td>
                          <td>
                            <Badge bg={
                              request.status === 'pending' ? 'warning' :
                              request.status === 'approved' ? 'success' : 'danger'
                            }>
                              {request.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            {request.status === 'pending' && (
                              <div className="d-flex gap-1">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleApprove(request._id)}
                                  disabled={processing}
                                >
                                  <FaCheckCircle />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRejectClick(request)}
                                  disabled={processing}
                                >
                                  <FaTimesCircle />
                                </Button>
                              </div>
                            )}
                            {request.status === 'approved' && request.approvedBy && (
                              <small className="text-muted">
                                By: {request.approvedBy.name}
                              </small>
                            )}
                            {request.status === 'rejected' && request.rejectedBy && (
                              <small className="text-muted">
                                By: {request.rejectedBy.name}
                              </small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Show More/Less */}
                  {filteredRequests.length > 9 && (
                    <div className="text-center mt-3">
                      {displayedRequests.length < filteredRequests.length ? (
                        <Button 
                          variant="outline-primary" 
                          onClick={() => setItemsToShow(prev => prev + 9)}
                        >
                          Show More ({filteredRequests.length - displayedRequests.length} remaining)
                        </Button>
                      ) : (
                        <Button 
                          variant="outline-secondary" 
                          onClick={() => setItemsToShow(9)}
                        >
                          Show Less
                        </Button>
                      )}
                      <div className="text-muted small mt-2">
                        Showing {displayedRequests.length} of {filteredRequests.length} requests
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => !processing && setShowRejectModal(false)} centered>
        <Modal.Header closeButton={!processing}>
          <Modal.Title>Reject WFH Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div className="mb-3">
              <p>
                <strong>Employee:</strong> {selectedRequest.employee?.name}
              </p>
              <p>
                <strong>Date:</strong> {formatDate(selectedRequest.date)}
              </p>
              <p>
                <strong>Reason:</strong> {selectedRequest.reason}
              </p>
            </div>
          )}
          <Form.Group>
            <Form.Label>
              Reason for Rejection <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter reason for rejecting this WFH request"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={processing}
            />
            <Form.Text className="text-muted">
              This will be visible to the employee
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRejectModal(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleRejectSubmit}
            disabled={processing || !rejectionReason.trim()}
          >
            {processing ? 'Rejecting...' : 'Reject Request'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default WFHManagementPanel;
