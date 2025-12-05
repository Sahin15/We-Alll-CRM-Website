import { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, Alert, Table } from "react-bootstrap";
import { FaSearch, FaEye, FaFilter, FaClock, FaCalendar, FaExclamationTriangle, FaClipboardList } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import SlotDetails from "../../components/projects/SlotDetails";
import SlotCalendar from "../../components/calendar/SlotCalendar";
import { statusColors } from "../../data/mockSlots";
import slotApi from "../../api/slotApi";

const MySlots = () => {
  const { user } = useAuth();
  const [mySlots, setMySlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [sortBy, setSortBy] = useState("postingDate");
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'calendar'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMySlots();
  }, [user]);

  const loadMySlots = async () => {
    try {
      setLoading(true);
      const response = await slotApi.getMySlots();
      setMySlots(response.data || []);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast.error("Failed to load your slots");
      setMySlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    return [...new Set(mySlots.map((slot) => slot.status || slot.designStatus).filter(Boolean))];
  }, [mySlots]);

  const uniqueProjects = useMemo(() => {
    return [...new Set(mySlots.map((slot) => slot.project?.name).filter(Boolean))];
  }, [mySlots]);

  // Filter and search logic
  const filteredSlots = useMemo(() => {
    let filtered = [...mySlots];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (slot) =>
          slot.brief?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.occasion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((slot) => (slot.status || slot.designStatus) === filterStatus);
    }

    // Project filter
    if (filterProject !== "all") {
      filtered = filtered.filter((slot) => slot.project?.name === filterProject);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "dueDate":
          aValue = new Date(a.dueDate || a.designDeadline || a.postingDate);
          bValue = new Date(b.dueDate || b.designDeadline || b.postingDate);
          break;
        case "priority":
          const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Normal': 2, 'Low': 3 };
          aValue = priorityOrder[a.priority] ?? 2;
          bValue = priorityOrder[b.priority] ?? 2;
          break;
        case "status":
          aValue = a.designStatus;
          bValue = b.designStatus;
          break;
        default:
          return 0;
      }

      return aValue > bValue ? 1 : -1;
    });

    return filtered;
  }, [mySlots, searchTerm, filterStatus, filterProject, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = mySlots.filter((slot) => {
      const dueDate = new Date(slot.dueDate || slot.designDeadline || slot.postingDate);
      const isComplete = slot.status === 'Approved' || slot.status === 'Completed' || 
                        slot.designStatus === 'Approved' || slot.postingStatus === 'Posted';
      return dueDate < today && !isComplete;
    });

    const dueToday = mySlots.filter((slot) => {
      const dueDate = new Date(slot.dueDate || slot.designDeadline || slot.postingDate);
      const isComplete = slot.status === 'Approved' || slot.status === 'Completed' || 
                        slot.designStatus === 'Approved' || slot.postingStatus === 'Posted';
      return dueDate.toDateString() === today.toDateString() && !isComplete;
    });

    const dueThisWeek = mySlots.filter((slot) => {
      const dueDate = new Date(slot.dueDate || slot.designDeadline || slot.postingDate);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const isComplete = slot.status === 'Approved' || slot.status === 'Completed' || 
                        slot.designStatus === 'Approved' || slot.postingStatus === 'Posted';
      return dueDate >= today && dueDate <= weekFromNow && !isComplete;
    });

    return {
      total: mySlots.length,
      inProgress: mySlots.filter((s) => s.designStatus === "In Design").length,
      readyForReview: mySlots.filter((s) => s.designStatus === "Ready for Review").length,
      needsRevision: mySlots.filter((s) => s.designStatus === "Revision Needed").length,
      completed: mySlots.filter((s) => s.postingStatus === "Posted").length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueThisWeek: dueThisWeek.length,
    };
  }, [mySlots]);

  // Check if slot is overdue
  const isOverdue = (slot) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const designDeadline = new Date(slot.designDeadline);
    const postingDate = new Date(slot.postingDate);

    const designOverdue =
      designDeadline < today && slot.designStatus !== "Approved" && slot.postingStatus !== "Posted";
    const postingOverdue = postingDate < today && slot.postingStatus !== "Posted";

    return designOverdue || postingOverdue;
  };

  // Check if due today
  const isDueToday = (slot) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const designDeadline = new Date(slot.designDeadline);
    return (
      designDeadline.toDateString() === today.toDateString() &&
      slot.designStatus !== "Approved" &&
      slot.postingStatus !== "Posted"
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Handle view slot
  const handleViewSlot = (slot) => {
    setSelectedSlot(slot);
    setShowSlotModal(true);
  };

  // Handle update slot
  const handleUpdateSlot = async (updatedSlot) => {
    try {
      await slotApi.updateSlot(updatedSlot._id, updatedSlot);
      toast.success("Slot updated successfully!");
      loadMySlots();
    } catch (error) {
      console.error("Error updating slot:", error);
      toast.error("Failed to update slot");
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterProject("all");
  };

  const activeFiltersCount = [filterStatus, filterProject].filter((f) => f !== "all").length;

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your slots...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>My Slots</h2>
          <p className="text-muted">View and manage your assigned content slots</p>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="text-center h-100">
            <Card.Body>
              <h3 className="mb-0">{stats.total}</h3>
              <small className="text-muted">Total Assigned</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-warning">
            <Card.Body>
              <h3 className="mb-0 text-warning">{stats.dueToday}</h3>
              <small className="text-muted">
                <FaClock className="me-1" />
                Due Today
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-info">
            <Card.Body>
              <h3 className="mb-0 text-info">{stats.dueThisWeek}</h3>
              <small className="text-muted">
                <FaCalendar className="me-1" />
                Due This Week
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 border-danger">
            <Card.Body>
              <h3 className="mb-0 text-danger">{stats.overdue}</h3>
              <small className="text-muted">
                <FaExclamationTriangle className="me-1" />
                Overdue
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Status Overview */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="mb-0">{stats.inProgress}</h4>
              <small className="text-muted">In Design</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="mb-0">{stats.readyForReview}</h4>
              <small className="text-muted">Ready for Review</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="mb-0">{stats.needsRevision}</h4>
              <small className="text-muted">Needs Revision</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="mb-0 text-success">{stats.completed}</h4>
              <small className="text-muted">Completed</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {stats.overdue > 0 && (
        <Alert variant="danger" className="mb-3">
          <FaExclamationTriangle className="me-2" />
          <strong>Attention!</strong> You have {stats.overdue} overdue slot{stats.overdue > 1 ? "s" : ""}. Please
          prioritize these tasks.
        </Alert>
      )}

      {stats.dueToday > 0 && (
        <Alert variant="warning" className="mb-3">
          <FaClock className="me-2" />
          <strong>Reminder:</strong> You have {stats.dueToday} slot{stats.dueToday > 1 ? "s" : ""} due today!
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3">
            {/* Search */}
            <Col md={12}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by project, client, brief, or occasion..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>

            {/* Filters */}
            <Col md={4}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="sm">
                <option value="all">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={4}>
              <Form.Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} size="sm">
                <option value="all">All Projects</option>
                {uniqueProjects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={4}>
              <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} size="sm">
                <option value="dueDate">Sort by Due Date</option>
                <option value="status">Sort by Status</option>
                <option value="priority">Sort by Priority</option>
              </Form.Select>
            </Col>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Col md={12}>
                <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                  <FaFilter className="me-2" />
                  Clear Filters ({activeFiltersCount})
                </Button>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Results Count */}
      {viewMode === "list" && (
        <div className="mb-2 text-muted">
          Showing {filteredSlots.length} of {mySlots.length} slots
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <div className="table-responsive">
            <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Project / Client</th>
                <th>Work Type</th>
                <th>Details</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    {mySlots.length === 0
                      ? "No work assignments yet."
                      : "No work matches your search criteria."}
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => (
                  <tr
                    key={slot._id}
                    className={isOverdue(slot) ? "table-danger" : isDueToday(slot) ? "table-warning" : ""}
                  >
                    <td>
                      <div>
                        <strong>{slot.project?.name || 'No Project'}</strong>
                        <div className="text-muted small">{slot.client?.name || 'No Client'}</div>
                      </div>
                    </td>
                    <td>
                      <Badge bg="secondary">{slot.workType || slot.postType || 'Work'}</Badge>
                      {slot.platforms && slot.platforms.length > 0 && (
                        <div className="mt-1">
                          {slot.platforms.map((platform) => (
                            <Badge key={platform} bg="info" size="sm" className="me-1">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: "250px" }} title={slot.title || slot.brief || slot.description}>
                        {slot.title || slot.brief || slot.description || "-"}
                      </div>
                      {slot.occasion && <small className="text-muted d-block">{slot.occasion}</small>}
                    </td>
                    <td>
                      <Badge bg={
                        (slot.priority || '').toLowerCase().includes('urgent') ? 'danger' :
                        (slot.priority || '').toLowerCase().includes('high') ? 'warning' :
                        (slot.priority || '').toLowerCase().includes('low') ? 'secondary' : 'info'
                      }>
                        {slot.priority || slot.contentBucket || 'Normal'}
                      </Badge>
                    </td>
                    <td>
                      <div className={isDueToday(slot) ? "fw-bold text-warning" : ""}>
                        {formatDate(slot.dueDate || slot.designDeadline)}
                      </div>
                      {isDueToday(slot) && (
                        <Badge bg="warning" className="mt-1">
                          Due Today!
                        </Badge>
                      )}
                    </td>
                    <td>
                      <small>{formatDate(slot.postingDate) || '-'}</small>
                    </td>
                    <td>
                      <Badge bg="light" text="dark" style={{ backgroundColor: statusColors[slot.status || slot.designStatus] }}>
                        {slot.status || slot.designStatus}
                      </Badge>
                      {isOverdue(slot) && (
                        <Badge bg="danger" className="mt-1 d-block">
                          Overdue
                        </Badge>
                      )}
                    </td>
                    <td>
                      <Button variant="outline-primary" size="sm" onClick={() => handleViewSlot(slot)} title="View & Work">
                        <FaEye />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <SlotCalendar
          slots={filteredSlots}
          onSlotClick={handleViewSlot}
          canCreateSlot={false}
        />
      )}

      {/* View Toggle */}
      <div className="d-flex justify-content-center mb-3">
        <div className="btn-group" role="group">
          <Button
            variant={viewMode === "list" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <FaClipboardList className="me-2" />
            List View
          </Button>
          <Button
            variant={viewMode === "calendar" ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <FaCalendar className="me-2" />
            Calendar View
          </Button>
        </div>
      </div>

      {/* Slot Details Modal */}
      {selectedSlot && (
        <SlotDetails
          show={showSlotModal}
          onHide={() => {
            setShowSlotModal(false);
            setSelectedSlot(null);
          }}
          slot={selectedSlot}
          onUpdate={handleUpdateSlot}
          isProjectHead={false}
          currentUser={user}
        />
      )}

      <style>{`
        .table-responsive {
          overflow-x: auto;
        }

        .table td {
          vertical-align: middle;
        }

        .table-danger {
          background-color: rgba(220, 53, 69, 0.1) !important;
        }

        .table-warning {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }

        .text-truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .table {
            font-size: 0.85rem;
          }

          .table td,
          .table th {
            padding: 0.5rem;
          }
        }
      `}</style>
    </Container>
  );
};

export default MySlots;
