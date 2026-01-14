import { useState, useEffect } from 'react';
import { 
  Card, 
  Badge, 
  Button, 
  Row, 
  Col, 
  Form,
  InputGroup,
  Spinner,
  Alert,
  Modal,
  Dropdown
} from 'react-bootstrap';
import { 
  FaThumbsUp, 
  FaEye, 
  FaUser, 
  FaCalendarAlt, 
  FaTag,
  FaSearch,
  FaFilter,
  FaSort,
  FaReply,
  FaTrash,
  FaEdit
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { feedbackApi } from '../../api/feedbackApi';
import { useAuth } from '../../context/AuthContext';
import FeedbackDetailModal from './FeedbackDetailModal';

const FeedbackList = ({ isAdminView = false, refreshTrigger }) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    priority: 'all'
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  const categories = feedbackApi.getFeedbackCategories();
  const priorities = feedbackApi.getPriorityLevels();
  const statuses = feedbackApi.getStatusOptions();

  useEffect(() => {
    loadFeedback();
  }, [filters, sortBy, sortOrder, pagination.current, refreshTrigger]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      
      const params = {
        page: pagination.current,
        limit: pagination.limit,
        sortBy,
        sortOrder
      };

      // Add filters
      if (filters.search) params.search = filters.search;
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.priority !== 'all') params.priority = filters.priority;

      // All users can now see all feedback (for transparency)
      // isAdminView only affects what actions they can take
      const response = await feedbackApi.getAllFeedback(params);

      setFeedback(response.data.feedback || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleUpvote = async (feedbackId, event) => {
    event.stopPropagation();
    
    try {
      await feedbackApi.toggleUpvote(feedbackId);
      loadFeedback(); // Refresh to show updated upvote count
    } catch (error) {
      console.error('Error toggling upvote:', error);
      toast.error('Failed to update upvote');
    }
  };

  const handleViewDetails = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowDetailModal(true);
  };

  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue) || 
           { icon: '📝', label: categoryValue, color: 'secondary' };
  };

  const getPriorityInfo = (priorityValue) => {
    return priorities.find(p => p.value === priorityValue) || 
           { label: priorityValue, color: 'secondary' };
  };

  const getStatusInfo = (statusValue) => {
    return statuses.find(s => s.value === statusValue) || 
           { label: statusValue, color: 'secondary' };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <div className="mt-2 text-muted">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="feedback-list">
      {/* Filters and Search */}
      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search feedback..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="all">All Priority</option>
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <FaSort className="me-1" />
                  Sort
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleSort('createdAt')}>
                    Date {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleSort('priority')}>
                    Priority {sortBy === 'priority' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleSort('upvoteCount')}>
                    Upvotes {sortBy === 'upvoteCount' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Results Info */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <small className="text-muted">
          Showing {feedback.length} of {pagination.total} feedback items
        </small>
        {pagination.pages > 1 && (
          <div className="d-flex gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === pagination.current ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, current: page }))}
              >
                {page}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Items */}
      {feedback.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>💭</div>
            <h5 className="text-muted">No feedback found</h5>
            <p className="text-muted">
              {isAdminView 
                ? "No feedback matches your current filters."
                : "You haven't submitted any feedback yet."
              }
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div className="feedback-items">
          {feedback.map((item) => {
            const categoryInfo = getCategoryInfo(item.category);
            const priorityInfo = getPriorityInfo(item.priority);
            const statusInfo = getStatusInfo(item.status);
            
            return (
              <Card 
                key={item._id} 
                className="mb-3 shadow-sm feedback-card"
                onClick={() => handleViewDetails(item)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      {/* Header */}
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span style={{ fontSize: '1.2rem' }}>{categoryInfo.icon}</span>
                        <h6 className="mb-0 fw-bold">{item.title}</h6>
                        <Badge bg={categoryInfo.color} className="ms-2">
                          {categoryInfo.label}
                        </Badge>
                        <Badge bg={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                        <Badge bg={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Description Preview */}
                      <p className="text-muted mb-2 feedback-description">
                        {item.description.length > 150 
                          ? `${item.description.substring(0, 150)}...` 
                          : item.description
                        }
                      </p>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="mb-2">
                          {item.tags.map((tag, index) => (
                            <Badge key={index} bg="light" text="dark" className="me-1">
                              <FaTag className="me-1" size={10} />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="d-flex gap-3 text-muted small">
                        <span>
                          <FaUser className="me-1" />
                          {item.isAnonymous ? 'Anonymous' : (item.employee?.name || 'Unknown')}
                        </span>
                        <span>
                          <FaCalendarAlt className="me-1" />
                          {formatDate(item.createdAt)}
                        </span>
                        {item.upvoteCount > 0 && (
                          <span>
                            <FaThumbsUp className="me-1" />
                            {item.upvoteCount} upvote{item.upvoteCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="text-end">
                      <div className="d-flex gap-1 mb-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(item);
                          }}
                        >
                          <FaEye className="me-1" />
                          View
                        </Button>
                        
                        {!item.isAnonymous && (
                          <Button
                            variant={item.hasUserUpvoted ? "primary" : "outline-primary"}
                            size="sm"
                            onClick={(e) => handleUpvote(item._id, e)}
                          >
                            <FaThumbsUp className="me-1" />
                            {item.upvoteCount || 0}
                          </Button>
                        )}
                      </div>
                      
                      {/* Admin Response Indicator */}
                      {item.adminResponse && (
                        <div className="text-success small">
                          <FaReply className="me-1" />
                          Responded
                        </div>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <FeedbackDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        feedback={selectedFeedback}
        isAdminView={isAdminView}
        onUpdate={loadFeedback}
      />

      {/* Custom Styles */}
      <style>{`
        .feedback-card {
          transition: all 0.2s ease;
          border-left: 4px solid #e9ecef;
        }
        
        .feedback-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        
        .feedback-description {
          line-height: 1.4;
        }
        
        .feedback-items .card {
          border-left-color: #007bff;
        }
        
        .feedback-items .card[data-priority="high"],
        .feedback-items .card[data-priority="urgent"] {
          border-left-color: #dc3545;
        }
        
        .feedback-items .card[data-status="resolved"] {
          border-left-color: #28a745;
        }
        
        .feedback-items .card[data-status="closed"] {
          border-left-color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default FeedbackList;