/**
 * Client Work Overview Component
 * Comprehensive view of all work done for a specific client
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Form,
  Alert,
  Spinner,
  Tabs,
  Tab,
  ProgressBar,
  Modal
} from 'react-bootstrap';
import {
  FaProject,
  FaTasks,
  FaLayerGroup,
  FaChartLine,
  FaCalendarAlt,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaDownload,
  FaFilter
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import clientWorkApi from '../../api/clientWorkApi';
import './ClientWorkOverview.css';

const ClientWorkOverview = ({ clientId, clientName }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    status: 'all',
    projectId: 'all'
  });
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (clientId) {
      loadClientWorkData();
    }
  }, [clientId, filters]);

  const loadClientWorkData = async () => {
    try {
      setLoading(true);
      const response = await clientWorkApi.getClientWorkOverview(clientId, filters);
      setData(response.data);
    } catch (error) {
      console.error('Error loading client work data:', error);
      toast.error('Failed to load client work data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status) => {
    const variants = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getSlotStatusBadge = (slot) => {
    if (slot.assignmentStatus === 'completed') {
      return <Badge bg="success">Completed</Badge>;
    } else if (slot.assignmentStatus === 'assigned') {
      return <Badge bg="primary">In Progress</Badge>;
    } else {
      return <Badge bg="secondary">Available</Badge>;
    }
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setShowSlotModal(true);
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-2">Loading client work data...</p>
        </div>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          No work data found for this client.
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="client-work-overview py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Work Overview</h2>
              <p className="text-muted mb-0">
                Client: <strong>{clientName || data.client.name}</strong>
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" size="sm">
                <FaDownload className="me-1" /> Export Report
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Project</Form.Label>
                <Form.Select
                  value={filters.projectId}
                  onChange={(e) => handleFilterChange('projectId', e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {data.projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaProject size={24} className="text-primary mb-2" />
              <h4 className="mb-1">{data.summary.totalProjects}</h4>
              <small className="text-muted">Total Projects</small>
              <div className="mt-2">
                <small className="text-success">
                  {data.summary.completedProjects} Completed
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaTasks size={24} className="text-info mb-2" />
              <h4 className="mb-1">{data.summary.totalWorkItems}</h4>
              <small className="text-muted">Work Items</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaLayerGroup size={24} className="text-warning mb-2" />
              <h4 className="mb-1">{data.summary.totalSlots}</h4>
              <small className="text-muted">Total Slots</small>
              <div className="mt-2">
                <small className="text-success">
                  {data.summary.completedSlots} Completed
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <FaChartLine size={24} className="text-success mb-2" />
              <h4 className="mb-1">{data.summary.completionRate}%</h4>
              <small className="text-muted">Completion Rate</small>
              <ProgressBar 
                now={data.summary.completionRate} 
                size="sm" 
                className="mt-2"
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="overview" title="Project Overview">
          <Row>
            {data.projects.map(project => (
              <Col md={6} lg={4} key={project._id} className="mb-4">
                <Card className="h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{project.name}</h6>
                    <Badge bg={project.status === 'Completed' ? 'success' : 'primary'}>
                      {project.status}
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <small className="text-muted">Progress</small>
                      <ProgressBar 
                        now={project.statistics.slotCompletionRate} 
                        label={`${project.statistics.slotCompletionRate}%`}
                        size="sm"
                      />
                    </div>
                    <Row className="text-center">
                      <Col>
                        <div className="border-end">
                          <h6 className="mb-0">{project.statistics.totalWorkItems}</h6>
                          <small className="text-muted">Work Items</small>
                        </div>
                      </Col>
                      <Col>
                        <h6 className="mb-0">{project.statistics.totalSlots}</h6>
                        <small className="text-muted">Slots</small>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="workItems" title="Work Items">
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Slot</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workItems.map(item => (
                    <tr key={item._id}>
                      <td>
                        <div>
                          <strong>{item.title}</strong>
                          {item.type === 'content' && (
                            <Badge bg="info" size="sm" className="ms-2">
                              {item.platform}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>{item.project.name}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser size={12} className="me-1" />
                          {item.assignedTo.name}
                        </div>
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        <small>
                          {moment(item.dueDate).format('MMM DD, YYYY')}
                        </small>
                      </td>
                      <td>
                        {item.slotAssignment?.slotNumber ? (
                          <Badge bg="secondary">
                            Slot {item.slotAssignment.slotNumber}
                          </Badge>
                        ) : (
                          <span className="text-muted">No slot</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="slots" title="Slots">
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Slot #</th>
                    <th>Project</th>
                    <th>Title</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Work Item</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slots.map(slot => (
                    <tr key={slot._id}>
                      <td>
                        <Badge bg="secondary">
                          {slot.slotNumber}
                        </Badge>
                      </td>
                      <td>{slot.project.name}</td>
                      <td>{slot.title}</td>
                      <td>
                        {slot.assignedTo ? (
                          <div className="d-flex align-items-center">
                            <FaUser size={12} className="me-1" />
                            {slot.assignedTo.name}
                          </div>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td>{getSlotStatusBadge(slot)}</td>
                      <td>
                        {slot.assignedWorkItem ? (
                          <span>{slot.assignedWorkItem.title}</span>
                        ) : (
                          <span className="text-muted">No work item</span>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleSlotClick(slot)}
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Slot Details Modal */}
      <Modal show={showSlotModal} onHide={() => setShowSlotModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Slot {selectedSlot?.slotNumber} Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSlot && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Project:</strong> {selectedSlot.project.name}
                </Col>
                <Col md={6}>
                  <strong>Status:</strong> {getSlotStatusBadge(selectedSlot)}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Title:</strong> {selectedSlot.title}
                </Col>
                <Col md={6}>
                  <strong>Created:</strong> {moment(selectedSlot.createdAt).format('MMM DD, YYYY')}
                </Col>
              </Row>
              {selectedSlot.assignedTo && (
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Assigned To:</strong> {selectedSlot.assignedTo.name}
                  </Col>
                  <Col md={6}>
                    <strong>Email:</strong> {selectedSlot.assignedTo.email}
                  </Col>
                </Row>
              )}
              {selectedSlot.completionStatus?.isCompleted && (
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Completed By:</strong> {selectedSlot.completionStatus.completedBy?.name}
                  </Col>
                  <Col md={6}>
                    <strong>Completed At:</strong> {moment(selectedSlot.completionStatus.completedAt).format('MMM DD, YYYY HH:mm')}
                  </Col>
                </Row>
              )}
              {selectedSlot.assignedWorkItem && (
                <div className="mt-3">
                  <strong>Associated Work Item:</strong>
                  <div className="border rounded p-2 mt-1">
                    <div><strong>{selectedSlot.assignedWorkItem.title}</strong></div>
                    <div>Status: {getStatusBadge(selectedSlot.assignedWorkItem.status)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSlotModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ClientWorkOverview;