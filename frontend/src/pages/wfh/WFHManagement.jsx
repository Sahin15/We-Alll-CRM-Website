import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Nav, Table, Form, InputGroup, Alert } from 'react-bootstrap';
import {
  FaPlus,
  FaHome,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglass,
  FaCalendar,
  FaClock,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { PAGE_ACCESS, checkPageAccess } from '../../constants/pageAccess';
import { toast } from 'react-toastify';
import wfhApi from '../../api/wfhApi';
import ApplyWFHModal from '../../components/wfh/ApplyWFHModal';
import WFHApprovalModal from '../../components/wfh/WFHApprovalModal';

const WFHManagement = () => {
  const { user, canAccess } = useAuth();
  const isAdmin = checkPageAccess(canAccess, PAGE_ACCESS.wfhManage);

  const [requests, setRequests] = useState([]);
  const [displayedRequests, setDisplayedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all-wfh' : 'my-wfh');
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalProcessing, setApprovalProcessing] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(9);

  useEffect(() => {
    loadRequests();
  }, [activeTab, filters]);

  useEffect(() => {
    updateDisplayedRequests();
  }, [requests, itemsToShow, filters, activeTab, isAdmin]);

  const updateDisplayedRequests = () => {
    let filtered = [...requests];

    if (filters.status !== 'all') {
      filtered = filtered.filter((req) => req.status === filters.status);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.employee?.name?.toLowerCase().includes(searchTerm) ||
          req.employee?.email?.toLowerCase().includes(searchTerm) ||
          req.reason?.toLowerCase().includes(searchTerm)
      );
    }

    const sortedRequests = filtered.sort((a, b) => {
      if (isAdmin && activeTab === 'all-wfh') {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
      }
      return new Date(b.date) - new Date(a.date);
    });

    setDisplayedRequests(sortedRequests.slice(0, itemsToShow));
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setItemsToShow(9);

      const params = {};
      if (filters.status !== 'all') params.status = filters.status;

      const response =
        activeTab === 'my-wfh'
          ? await wfhApi.getMyWFHRequests(params)
          : await wfhApi.getAllWFHRequests(params);

      setRequests(response.data || []);
    } catch (error) {
      console.error('Error loading WFH requests:', error);
      toast.error('Failed to load WFH requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const handleApprovalAction = async (action, data = {}) => {
    if (!selectedRequest) return;

    try {
      setApprovalProcessing(true);
      if (action === 'approve') {
        await wfhApi.approveWFHRequest(selectedRequest._id);
        toast.success(`WFH request approved for ${selectedRequest.employee?.name || 'employee'}`);
      } else {
        if (!data.rejectionReason?.trim()) {
          toast.error('Please provide a reason for rejection');
          return;
        }
        await wfhApi.rejectWFHRequest(selectedRequest._id, data.rejectionReason);
        toast.success(`WFH request rejected for ${selectedRequest.employee?.name || 'employee'}`);
      }

      setShowApprovalModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error processing WFH request:', error);
      toast.error(error.response?.data?.message || 'Failed to process WFH request');
    } finally {
      setApprovalProcessing(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this WFH request?')) {
      return;
    }

    try {
      await wfhApi.cancelWFHRequest(requestId);
      toast.success('WFH request cancelled successfully');
      loadRequests();
    } catch (error) {
      console.error('Error cancelling WFH request:', error);
      toast.error('Failed to cancel WFH request');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
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

  const filteredRequests = requests.filter((req) => {
    let matches = true;

    if (filters.status !== 'all') {
      matches = matches && req.status === filters.status;
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      matches =
        matches &&
        (req.employee?.name?.toLowerCase().includes(searchTerm) ||
          req.employee?.email?.toLowerCase().includes(searchTerm) ||
          req.reason?.toLowerCase().includes(searchTerm));
    }

    return matches;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const showEmployeeColumn = isAdmin && activeTab === 'all-wfh';

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h2>
                <FaHome className="me-2" />
                Work From Home Management
              </h2>
              <p className="text-muted mb-0">
                Manage WFH requests and approvals
                {filteredRequests.length > 9 && displayedRequests.length < filteredRequests.length && (
                  <span className="ms-2">
                    <Badge bg="info" className="small">
                      Showing {displayedRequests.length} of {filteredRequests.length}
                    </Badge>
                  </span>
                )}
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={() => setShowApplyModal(true)}>
              <FaPlus className="me-2" />
              Apply for WFH
            </Button>
          </div>
        </Col>
      </Row>

      {isAdmin && (
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link active={activeTab === 'my-wfh'} onClick={() => setActiveTab('my-wfh')}>
              My WFH
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link active={activeTab === 'all-wfh'} onClick={() => setActiveTab('all-wfh')}>
              All WFH Requests
            </Nav.Link>
          </Nav.Item>
        </Nav>
      )}

      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <FaCalendar size={28} className="text-primary mb-2" />
              <h3 className="mb-0">{stats.total}</h3>
              <small className="text-muted">Total</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <FaHourglass size={28} className="text-warning mb-2" />
              <h3 className="mb-0 text-warning">{stats.pending}</h3>
              <small className="text-muted">Pending</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <FaCheckCircle size={28} className="text-success mb-2" />
              <h3 className="mb-0 text-success">{stats.approved}</h3>
              <small className="text-muted">Approved</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0 shadow-sm">
            <Card.Body>
              <FaTimesCircle size={28} className="text-danger mb-2" />
              <h3 className="mb-0 text-danger">{stats.rejected}</h3>
              <small className="text-muted">Rejected</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-3">
              <Row className="g-2">
                <Col md={4}>
                  <Form.Select
                    size="sm"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
                      placeholder={showEmployeeColumn ? 'Search employees...' : 'Search requests...'}
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </InputGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                  <p className="text-muted">No requests match your current filters.</p>
                  <Button variant="primary" onClick={() => setShowApplyModal(true)}>
                    <FaPlus className="me-2" />
                    Apply for WFH
                  </Button>
                </div>
              ) : (
                <>
                  <Alert variant="info" className="mb-3">
                    <small>
                      <strong>Note:</strong> WFH employees must clock in at 10:00 AM and clock out at
                      7:00 PM (same as office hours).
                    </small>
                  </Alert>
                  <Table responsive hover>
                    <thead>
                      <tr>
                        {showEmployeeColumn && <th>Employee</th>}
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
                          {showEmployeeColumn && (
                            <td>
                              <strong>{request.employee?.name}</strong>
                              <br />
                              <small className="text-muted">{request.employee?.email}</small>
                            </td>
                          )}
                          <td>
                            <FaCalendar className="me-1" />
                            <strong>{formatDate(request.date)}</strong>
                            {isToday(request.date) && (
                              <Badge bg="danger" className="ms-2">
                                TODAY
                              </Badge>
                            )}
                          </td>
                          <td>
                            <div style={{ maxWidth: '300px' }}>{request.reason}</div>
                          </td>
                          <td>
                            <small className="text-muted">
                              <FaClock className="me-1" />
                              {formatDate(request.createdAt)}
                            </small>
                          </td>
                          <td>
                            <Badge
                              bg={
                                request.status === 'pending'
                                  ? 'warning'
                                  : request.status === 'approved'
                                    ? 'success'
                                    : 'danger'
                              }
                            >
                              {request.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            {showEmployeeColumn && request.status === 'pending' && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleApproveReject(request)}
                              >
                                Review
                              </Button>
                            )}
                            {!showEmployeeColumn &&
                              request.status === 'pending' &&
                              isFuture(request.date) && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleCancelRequest(request._id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            {request.status === 'rejected' && request.rejectionReason && (
                              <small className="text-muted d-block">
                                {request.rejectionReason}
                              </small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {filteredRequests.length > 9 && (
                    <div className="text-center mt-3">
                      {displayedRequests.length < filteredRequests.length ? (
                        <Button variant="outline-primary" onClick={() => setItemsToShow((prev) => prev + 9)}>
                          Show More ({filteredRequests.length - displayedRequests.length} remaining)
                        </Button>
                      ) : (
                        <Button variant="outline-secondary" onClick={() => setItemsToShow(9)}>
                          Show Less
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <ApplyWFHModal
        show={showApplyModal}
        onHide={() => setShowApplyModal(false)}
        onSuccess={() => {
          setShowApplyModal(false);
          loadRequests();
          toast.success('WFH request submitted successfully');
        }}
      />

      <WFHApprovalModal
        show={showApprovalModal}
        onHide={() => {
          if (!approvalProcessing) {
            setShowApprovalModal(false);
            setSelectedRequest(null);
          }
        }}
        request={selectedRequest}
        onAction={handleApprovalAction}
        processing={approvalProcessing}
      />
    </Container>
  );
};

export default WFHManagement;
