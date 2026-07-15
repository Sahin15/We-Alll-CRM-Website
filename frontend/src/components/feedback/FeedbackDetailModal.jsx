import { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Badge, 
  Form, 
  Row, 
  Col,
  Alert,
  Card,
  Spinner
} from 'react-bootstrap';
import { 
  FaUser, 
  FaCalendarAlt, 
  FaTag,
  FaThumbsUp,
  FaReply,
  FaSave,
  FaTimes,
  FaDownload,
  FaTrash,
  FaEdit,
  FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { feedbackApi } from '../../api/feedbackApi';
import { useAuth } from '../../context/AuthContext';
import { checkPageAccess, PAGE_ACCESS } from '../../constants/pageAccess';

const FeedbackDetailModal = ({ show, onHide, feedback, isAdminView, onUpdate }) => {
  const { user, canAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [responseData, setResponseData] = useState({
    status: '',
    adminResponse: '',
    priority: '',
    resolution: '',
    estimatedResolutionDate: ''
  });

  const categories = feedbackApi.getFeedbackCategories();
  const priorities = feedbackApi.getPriorityLevels();
  const statuses = feedbackApi.getStatusOptions();

  useEffect(() => {
    if (feedback) {
      setResponseData({
        status: feedback.status || '',
        adminResponse: feedback.adminResponse || '',
        priority: feedback.priority || '',
        resolution: feedback.resolution || '',
        estimatedResolutionDate: feedback.estimatedResolutionDate 
          ? new Date(feedback.estimatedResolutionDate).toISOString().split('T')[0] 
          : ''
      });
    }
  }, [feedback]);

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

  const handleUpvote = async () => {
    if (!feedback) return;
    
    try {
      const response = await feedbackApi.toggleUpvote(feedback._id);
      
      // Update the feedback object with new upvote data
      const updatedFeedback = {
        ...feedback,
        upvoteCount: response.data.upvoteCount,
        hasUserUpvoted: response.data.hasUpvoted
      };
      
      // Update parent component
      if (onUpdate) onUpdate();
      
      toast.success(response.data.message || 'Upvote updated');
    } catch (error) {
      console.error('Error toggling upvote:', error);
      toast.error('Failed to update upvote');
    }
  };

  const handleSaveResponse = async () => {
    if (!feedback) return;
    
    setLoading(true);
    try {
      await feedbackApi.updateFeedback(feedback._id, responseData);
      toast.success('Feedback updated successfully');
      setEditMode(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to update feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!feedback) return;
    
    setShowDeleteConfirm(false);
    setLoading(true);
    
    try {
      await feedbackApi.deleteFeedback(feedback._id);
      toast.success('Feedback deleted successfully');
      onHide();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete feedback';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!feedback) return null;

  const categoryInfo = getCategoryInfo(feedback.category);
  const priorityInfo = getPriorityInfo(feedback.priority);
  const statusInfo = getStatusInfo(feedback.status);
  const isOwner = feedback.employee?._id === user?.id;
  const canEdit = isAdminView && checkPageAccess(canAccess, PAGE_ACCESS.feedbackAdmin);
  const canDelete = (isOwner && !feedback.adminResponse) || checkPageAccess(canAccess, PAGE_ACCESS.platformAdmin);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <span style={{ fontSize: '1.2rem' }}>{categoryInfo.icon}</span>
          {feedback.title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Header Info */}
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Badge bg={categoryInfo.color}>{categoryInfo.label}</Badge>
            <Badge bg={priorityInfo.color}>{priorityInfo.label}</Badge>
            <Badge bg={statusInfo.color}>{statusInfo.label}</Badge>
            {feedback.isAnonymous && (
              <Badge bg="secondary">Anonymous</Badge>
            )}
          </div>

          <div className="d-flex gap-4 text-muted small mb-3">
            <span>
              <FaUser className="me-1" />
              <strong>Submitted by:</strong> {feedback.isAnonymous ? 'Anonymous User' : (feedback.employee?.name || 'Unknown')}
            </span>
            <span>
              <FaCalendarAlt className="me-1" />
              <strong>Date:</strong> {formatDate(feedback.createdAt)}
            </span>
            {feedback.upvoteCount > 0 && (
              <span>
                <FaThumbsUp className="me-1" />
                <strong>Upvotes:</strong> {feedback.upvoteCount}
              </span>
            )}
          </div>

          {/* Tags */}
          {feedback.tags && feedback.tags.length > 0 && (
            <div className="mb-3">
              <strong className="small text-muted">Tags:</strong>
              <div className="mt-1">
                {feedback.tags.map((tag, index) => (
                  <Badge key={index} bg="light" text="dark" className="me-1">
                    <FaTag className="me-1" size={10} />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <Card className="mb-4">
          <Card.Header>
            <strong>Description</strong>
          </Card.Header>
          <Card.Body>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {feedback.description}
            </div>
          </Card.Body>
        </Card>

        {/* Attachments */}
        {feedback.attachments && feedback.attachments.length > 0 && (
          <Card className="mb-4">
            <Card.Header>
              <strong>Attachments</strong>
            </Card.Header>
            <Card.Body>
              {feedback.attachments.map((attachment, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center p-2 bg-light rounded mb-2">
                  <span>{attachment.filename}</span>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => window.open(attachment.url, '_blank')}
                  >
                    <FaDownload className="me-1" />
                    Download
                  </Button>
                </div>
              ))}
            </Card.Body>
          </Card>
        )}

        {/* Admin Response Section */}
        {(canEdit || feedback.adminResponse) && (
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>Admin Response</strong>
              {canEdit && !editMode && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <FaEdit className="me-1" />
                  {feedback.adminResponse ? 'Edit Response' : 'Add Response'}
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {editMode && canEdit ? (
                <Form>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Status</Form.Label>
                        <Form.Select
                          value={responseData.status}
                          onChange={(e) => setResponseData(prev => ({ ...prev, status: e.target.value }))}
                        >
                          {statuses.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Priority</Form.Label>
                        <Form.Select
                          value={responseData.priority}
                          onChange={(e) => setResponseData(prev => ({ ...prev, priority: e.target.value }))}
                        >
                          {priorities.map(priority => (
                            <option key={priority.value} value={priority.value}>
                              {priority.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Admin Response</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Provide a response to the user..."
                      value={responseData.adminResponse}
                      onChange={(e) => setResponseData(prev => ({ ...prev, adminResponse: e.target.value }))}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Resolution Details</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Describe how this issue was resolved..."
                      value={responseData.resolution}
                      onChange={(e) => setResponseData(prev => ({ ...prev, resolution: e.target.value }))}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Estimated Resolution Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={responseData.estimatedResolutionDate}
                      onChange={(e) => setResponseData(prev => ({ ...prev, estimatedResolutionDate: e.target.value }))}
                    />
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleSaveResponse}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-1" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-1" />
                          Save Response
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setEditMode(false)}
                      disabled={loading}
                    >
                      <FaTimes className="me-1" />
                      Cancel
                    </Button>
                  </div>
                </Form>
              ) : feedback.adminResponse ? (
                <div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }} className="mb-3">
                    {feedback.adminResponse}
                  </div>
                  {feedback.respondedBy && (
                    <div className="text-muted small">
                      <FaReply className="me-1" />
                      Responded by {feedback.respondedBy.name} on {formatDate(feedback.responseDate)}
                    </div>
                  )}
                  {feedback.resolution && (
                    <Alert variant="success" className="mt-3">
                      <strong>Resolution:</strong>
                      <div className="mt-1">{feedback.resolution}</div>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-muted text-center py-3">
                  No admin response yet
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Timeline */}
        {feedback.estimatedResolutionDate && (
          <Alert variant="info">
            <strong>Estimated Resolution:</strong> {formatDate(feedback.estimatedResolutionDate)}
          </Alert>
        )}

        {feedback.actualResolutionDate && (
          <Alert variant="success">
            <strong>Resolved on:</strong> {formatDate(feedback.actualResolutionDate)}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 bg-light">
        <div className="d-flex justify-content-between w-100">
          <div>
            {!feedback.isAnonymous && (
              <Button
                variant={feedback.hasUserUpvoted ? "primary" : "outline-primary"}
                onClick={handleUpvote}
                className="me-2"
              >
                <FaThumbsUp className="me-1" />
                {feedback.hasUserUpvoted ? 'Upvoted' : 'Upvote'} ({feedback.upvoteCount || 0})
              </Button>
            )}
            
            {canDelete && (
              <Button
                variant="outline-danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
              >
                <FaTrash className="me-1" />
                Delete
              </Button>
            )}
          </div>
          
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Close
          </Button>
        </div>
      </Modal.Footer>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteConfirm} 
        onHide={() => setShowDeleteConfirm(false)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-danger">
            <FaTrash className="me-2" />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <Alert variant="warning" className="mb-3">
            <FaExclamationTriangle className="me-2" />
            This action cannot be undone!
          </Alert>
          <p className="mb-2">Are you sure you want to delete this feedback?</p>
          <div className="bg-light p-3 rounded">
            <strong className="d-block mb-1">{feedback?.title}</strong>
            <small className="text-muted">
              {feedback?.description?.substring(0, 100)}
              {feedback?.description?.length > 100 ? '...' : ''}
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteConfirm(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-1" />
                Deleting...
              </>
            ) : (
              <>
                <FaTrash className="me-1" />
                Yes, Delete
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default FeedbackDetailModal;