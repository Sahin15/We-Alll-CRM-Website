import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Button, 
  Alert,
  ListGroup,
  Badge
} from 'react-bootstrap';
import { FaComment, FaUser, FaClock, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';
import workItemApi from '../../api/workItemApi';

/**
 * Work Item Comment Modal
 * Simple comment system for work items
 */
const WorkItemCommentModal = ({ show, onHide, workItem, onCommentAdded }) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Quick comment templates
  const quickComments = [
    'Work started',
    'Waiting for client feedback',
    'Ready for review',
    'Completed successfully',
    'Need more information',
    'Blocked by dependencies'
  ];

  useEffect(() => {
    if (show && workItem) {
      loadComments();
    }
  }, [show, workItem]);

  const loadComments = async () => {
    if (!workItem?._id) return;
    
    setLoadingComments(true);
    try {
      // For now, use mock comments since the API might not have comments endpoint
      const mockComments = [
        {
          _id: '1',
          text: 'Work started on this item',
          user: { name: 'John Doe', email: 'john@example.com' },
          createdAt: moment().subtract(2, 'hours').toISOString()
        },
        {
          _id: '2', 
          text: 'Making good progress, should be done by tomorrow',
          user: { name: 'Jane Smith', email: 'jane@example.com' },
          createdAt: moment().subtract(1, 'hour').toISOString()
        }
      ];
      
      setComments(mockComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setLoading(true);
    try {
      // For now, simulate adding comment since API might not be ready
      const newComment = {
        _id: Date.now().toString(),
        text: comment.trim(),
        user: { name: user?.name || 'Current User', email: user?.email || 'user@example.com' },
        createdAt: new Date().toISOString()
      };

      // Add to local state
      setComments(prev => [newComment, ...prev]);
      setComment('');
      
      toast.success('Comment added successfully!');
      
      if (onCommentAdded) {
        onCommentAdded(newComment);
      }

      // TODO: Uncomment when API is ready
      // const response = await workItemApi.addComment(workItem._id, { text: comment.trim() });
      // if (response.success) {
      //   setComments(prev => [response.data, ...prev]);
      //   setComment('');
      //   toast.success('Comment added successfully!');
      //   if (onCommentAdded) {
      //     onCommentAdded(response.data);
      //   }
      // }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickComment = (quickComment) => {
    setComment(quickComment);
  };

  const handleClose = () => {
    setComment('');
    setComments([]);
    onHide();
  };

  if (!workItem) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="d-flex align-items-center gap-2">
          <FaComment className="text-primary" />
          Comments - {workItem.title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Work Item Info */}
        <Alert variant="info" className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>{workItem.title}</strong>
              <br />
              <small className="text-muted">
                Project: {workItem.project?.name} • 
                Status: <Badge bg="primary">{workItem.status}</Badge> • 
                Priority: <Badge bg="warning">{workItem.priority}</Badge>
              </small>
            </div>
          </div>
        </Alert>

        {/* Add Comment Form */}
        <Form onSubmit={handleSubmit} className="mb-4">
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Add Comment</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter your comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={loading}
            />
          </Form.Group>

          {/* Quick Comment Buttons */}
          <div className="mb-3">
            <small className="text-muted fw-bold">Quick Comments:</small>
            <div className="d-flex flex-wrap gap-1 mt-1">
              {quickComments.map((quickComment, index) => (
                <Button
                  key={index}
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleQuickComment(quickComment)}
                  disabled={loading}
                >
                  {quickComment}
                </Button>
              ))}
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <FaUser className="me-1" />
              Commenting as: {user?.name || 'Current User'}
            </small>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading || !comment.trim()}
              className="d-flex align-items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner-border spinner-border-sm" />
                  Adding...
                </>
              ) : (
                <>
                  <FaPaperPlane />
                  Add Comment
                </>
              )}
            </Button>
          </div>
        </Form>

        {/* Comments List */}
        <div>
          <h6 className="mb-3">
            Comments ({comments.length})
          </h6>
          
          {loadingComments ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm me-2" />
              Loading comments...
            </div>
          ) : comments.length > 0 ? (
            <ListGroup variant="flush">
              {comments.map((comment) => (
                <ListGroup.Item key={comment._id} className="px-0">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <FaUser className="text-muted" size={12} />
                        <strong className="small">{comment.user?.name}</strong>
                        <FaClock className="text-muted" size={10} />
                        <small className="text-muted">
                          {moment(comment.createdAt).fromNow()}
                        </small>
                      </div>
                      <p className="mb-0">{comment.text}</p>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <Alert variant="light" className="text-center">
              <FaComment className="text-muted mb-2" size={24} />
              <p className="mb-0">No comments yet. Be the first to comment!</p>
            </Alert>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WorkItemCommentModal;