import { useState, useMemo } from "react";
import { Table, Button, Badge, Form, InputGroup, Row, Col, Card } from "react-bootstrap";
import { FaPlus, FaSearch, FaEye, FaEdit, FaTrash, FaFilter } from "react-icons/fa";
import { statusColors } from "../../data/mockSlots";

const SlotList = ({ slots = [], onCreateSlot, onViewSlot, onEditSlot, onDeleteSlot, isProjectHead = false, project = null }) => {
  
  // Determine department type
  const departmentName = project?.department?.name?.toLowerCase() || '';
  const isDigitalMarketing = departmentName.includes('marketing');
  const isDevelopment = departmentName.includes('development');
  const isDesign = departmentName.includes('design');
  const isVideo = departmentName.includes('video');
  
  // Styles to prevent flickering
  const tableRowStyle = {
    transition: 'background-color 0.15s ease',
  };
  
  const tableRowHoverStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    cursor: 'pointer',
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [sortBy, setSortBy] = useState("postingDate");
  const [sortOrder, setSortOrder] = useState("asc");
  const [hoveredRow, setHoveredRow] = useState(null);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    return [...new Set(slots.map((slot) => slot.designStatus || slot.status).filter(Boolean))];
  }, [slots]);

  const uniquePlatforms = useMemo(() => {
    const allPlatforms = slots.flatMap((slot) => slot.platforms || []);
    return [...new Set(allPlatforms.filter(Boolean))];
  }, [slots]);

  const uniqueEmployees = useMemo(() => {
    return [...new Set(slots.map((slot) => slot.assignedTo?.name).filter(Boolean))];
  }, [slots]);

  // Filter and search logic
  const filteredSlots = useMemo(() => {
    let filtered = [...slots];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (slot) =>
          slot.brief.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.occasion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.hashtags.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((slot) => slot.designStatus === filterStatus);
    }

    // Platform filter
    if (filterPlatform !== "all") {
      filtered = filtered.filter((slot) => slot.platforms.includes(filterPlatform));
    }

    // Employee filter
    if (filterEmployee !== "all") {
      filtered = filtered.filter((slot) => slot.assignedTo.name === filterEmployee);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "postingDate":
          aValue = new Date(a.postingDate);
          bValue = new Date(b.postingDate);
          break;
        case "designDeadline":
          aValue = new Date(a.designDeadline);
          bValue = new Date(b.designDeadline);
          break;
        case "status":
          aValue = a.designStatus;
          bValue = b.designStatus;
          break;
        case "postType":
          aValue = a.postType;
          bValue = b.postType;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [slots, searchTerm, filterStatus, filterPlatform, filterEmployee, sortBy, sortOrder]);

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

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterPlatform("all");
    setFilterEmployee("all");
  };

  const activeFiltersCount = [filterStatus, filterPlatform, filterEmployee].filter((f) => f !== "all").length;

  return (
    <div className="slot-list-container">
      {/* Header with Create Button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Content Slots</h5>
        {isProjectHead && (
          <Button variant="primary" size="sm" onClick={onCreateSlot}>
            <FaPlus className="me-2" />
            Create Slot
          </Button>
        )}
      </div>

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
                  placeholder="Search by brief, caption, occasion, or hashtags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>

            {/* Filters Row */}
            <Col md={3}>
              <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="sm">
                <option value="all">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Form.Select>
            </Col>

            {/* Platform Filter - Only for Digital Marketing */}
            {isDigitalMarketing && (
              <Col md={3}>
                <Form.Select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} size="sm">
                  <option value="all">All Platforms</option>
                  {uniquePlatforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}

            <Col md={3}>
              <Form.Select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} size="sm">
                <option value="all">All Employees</option>
                {uniqueEmployees.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} size="sm">
                <option value="postingDate">Sort by Posting Date</option>
                <option value="designDeadline">Sort by Design Deadline</option>
                <option value="status">Sort by Status</option>
                <option value="postType">Sort by Post Type</option>
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
      <div className="mb-2 text-muted">
        Showing {filteredSlots.length} of {slots.length} slots
      </div>

      {/* Slots Table */}
      <Card>
        <div className="table-responsive">
          <Table className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Title</th>
                <th>Work Type</th>
                {isDigitalMarketing && <th>Platforms</th>}
                {isDevelopment && <th>Tech Stack</th>}
                {isDesign && <th>Design Type</th>}
                {isVideo && <th>Video Type</th>}
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={isDigitalMarketing ? "10" : "9"} className="text-center py-4 text-muted">
                    No work assignments found. {isProjectHead && "Click 'Create Work Assignment' to add your first task!"}
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => (
                  <tr 
                    key={slot._id} 
                    className={isOverdue(slot) ? "table-danger" : ""}
                    style={{
                      ...tableRowStyle,
                      ...(hoveredRow === slot._id ? tableRowHoverStyle : {})
                    }}
                    onMouseEnter={() => setHoveredRow(slot._id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Title */}
                    <td>
                      <div className="fw-semibold text-truncate" style={{ maxWidth: "200px" }} title={slot.title}>
                        {slot.title}
                      </div>
                      {isOverdue(slot) && (
                        <Badge bg="danger" className="mt-1">
                          Overdue
                        </Badge>
                      )}
                    </td>
                    
                    {/* Work Type */}
                    <td>
                      <Badge bg="secondary">{slot.workType}</Badge>
                    </td>
                    
                    {/* Digital Marketing - Platforms */}
                    {isDigitalMarketing && (
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {slot.platforms?.map((platform) => (
                            <Badge key={platform} bg="info" className="text-white">
                              {platform}
                            </Badge>
                          )) || '-'}
                        </div>
                      </td>
                    )}
                    
                    {/* Development - Tech Stack */}
                    {isDevelopment && (
                      <td>
                        <small className="text-muted">
                          {slot.metadata?.techStack || '-'}
                        </small>
                      </td>
                    )}
                    
                    {/* Design - Design Type */}
                    {isDesign && (
                      <td>
                        <Badge bg="info">
                          {slot.metadata?.designType || '-'}
                        </Badge>
                      </td>
                    )}
                    
                    {/* Video - Video Type */}
                    {isVideo && (
                      <td>
                        <Badge bg="info">
                          {slot.metadata?.videoType || '-'}
                        </Badge>
                      </td>
                    )}
                    
                    {/* Assigned To */}
                    <td>{slot.assignedTo?.name || 'Unassigned'}</td>
                    
                    {/* Due Date */}
                    <td>
                      <small>{formatDate(slot.dueDate)}</small>
                    </td>
                    
                    {/* Priority */}
                    <td>
                      <Badge bg={
                        slot.priority === 'Urgent' ? 'danger' :
                        slot.priority === 'High' ? 'warning' :
                        slot.priority === 'Medium' ? 'info' : 'secondary'
                      }>
                        {slot.priority}
                      </Badge>
                    </td>
                    
                    {/* Status */}
                    <td>
                      <Badge bg="light" text="dark" style={{ backgroundColor: statusColors[slot.status || slot.designStatus] }}>
                        {slot.status || slot.designStatus}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => onViewSlot(slot)}
                          title="View Details"
                        >
                          <FaEye />
                        </Button>
                        {isProjectHead && (
                          <>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => onEditSlot(slot)}
                              title="Edit Slot"
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => onDeleteSlot(slot)}
                              title="Delete Slot"
                            >
                              <FaTrash />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      <style>{`
        .slot-list-container {
          padding: 0;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .table td {
          vertical-align: middle;
        }

        .table-danger {
          background-color: rgba(220, 53, 69, 0.1) !important;
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

          .d-flex.gap-2 {
            flex-direction: column;
            gap: 0.25rem !important;
          }

          .d-flex.gap-2 button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SlotList;
