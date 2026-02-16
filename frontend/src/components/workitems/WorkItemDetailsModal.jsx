import React, { useState } from 'react';
import { Modal, Button, Form, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { FaCalendar, FaTasks, FaUser, FaClock, FaComment, FaPaperPlane, FaTrash } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import { toast } from '../../utils/toast';
import workItemApi from '../../api/workItemApi';
import './WorkItemDetailsModal.css';

const WorkItemDetailsModal = ({ show, onHide, workItem, onUpdate, onRefresh, currentUser, onAddComment }) => {
  const [status, setStatus] = useState(workItem?.status || 'To Do');
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState(workItem?.comments || []);

  // Reset comments when modal opens/closes
  React.useEffect(() => {
    if (show && workItem?.comments) {
      console.log('Modal opened, setting initial comments:', workItem.comments.length);
      setComments(workItem.comments);
    }
  }, [show, workItem?._id]);

  // Update comments when workItem changes, but be smart about it
  React.useEffect(() => {
    if (workItem?.comments && show) {
      console.log('WorkItem comments changed:', {
        newCount: workItem.comments.length,
        currentCount: comments.length,
        workItemId: workItem._id
      });
      
      // Always update when modal first opens (comments is empty)
      // Or when we have more comments (new comment added)
      // But don't update when we have fewer comments (likely due to local deletion)
      if (comments.length === 0 || workItem.comments.length > comments.length) {
        console.log('Updating comments from workItem');
        setComments(workItem.comments);
      } else {
        console.log('Skipping comments update to preserve local changes');
      }
    }
  }, [workItem?.comments, workItem?._id, show]);

  if (!workItem) return null;

  const canEdit = workItem.assignedTo?._id === currentUser?._id || 
                  ['admin', 'superadmin', 'hod'].includes(currentUser?.role);

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
    };
    return colors[status] || 'secondary';
  };

  const handleStatusUpdate = async (newStatus = status) => {
    if (newStatus === workItem.status) {
      return;
    }

    setLoading(true);
    setStatus(newStatus); // Update local state immediately for better UX
    
    try {
      await onUpdate(workItem._id, newStatus, workItem.type);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setStatus(workItem.status); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      // Call the API to add comment
      if (onAddComment) {
        await onAddComment(workItem._id, newComment.trim());
        setNewComment('');
        toast.success('Comment added successfully');
        
        // Refresh the work item data to get updated comments
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId) {
      console.error('No comment ID provided');
      toast.error('Invalid comment ID');
      return;
    }

    // Check if comment exists in current state
    const commentExists = comments.find(comment => comment._id === commentId);
    if (!commentExists) {
      console.error('Comment not found in current state:', commentId);
      toast.error('Comment not found');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    console.log('Attempting to delete comment:', {
      workItemId: workItem._id,
      commentId: commentId,
      totalComments: comments.length
    });

    try {
      // Call the API to delete the comment
      await workItemApi.deleteComment(workItem._id, commentId);
      
      // Update local state immediately
      setComments(prevComments => {
        const updatedComments = prevComments.filter(comment => comment._id !== commentId);
        console.log('Local state updated, remaining comments:', updatedComments.length);
        return updatedComments;
      });
      
      toast.success('Comment deleted successfully');
      
      // IMPORTANT: Don't call onRefresh here as it causes race conditions
      // The local state update provides immediate feedback
      // The server state is already updated, so we're in sync
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete comment');
      
      // Only refresh on error to get the correct state
      if (onRefresh) {
        onRefresh();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddComment();
    }
  };

  const isOverdue = workItem.dueDate && 
    new Date(workItem.dueDate) < new Date() && 
    workItem.status !== 'Done';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
        <Modal.Title className="d-flex align-items-center w-100">
          <div className="d-flex align-items-center flex-grow-1">
            <Badge 
              bg="light" 
              text="dark" 
              className="me-3"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              {workItem.type === 'content' ? <FaCalendar className="me-1" /> : <FaTasks className="me-1" />}
              {workItem.type === 'content' ? 'Content' : 'Task'}
            </Badge>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{workItem.title}</span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: 0 }}>
        {isOverdue && (
          <Alert variant="danger" className="m-3 mb-0" style={{ borderRadius: '8px' }}>
            <FaClock className="me-2" />
            <strong>Overdue!</strong> This work item is past its due date.
          </Alert>
        )}

        <Tabs defaultActiveKey="details" className="mb-0" style={{ borderBottom: '2px solid #e9ecef' }}>
          <Tab eventKey="details" title="Details" style={{ padding: '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              {/* Status Section - Modern Interactive Status Changer */}
              <div className="mb-4 p-3" style={{ background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                <div className="mb-3">
                  <strong style={{ fontSize: '0.95rem', color: '#495057' }}>Status</strong>
                  {canEdit && (
                    <small className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                      Click any status to change instantly
                    </small>
                  )}
                </div>
                
                {/* Interactive Status Flow */}
                <div className="status-flow-container">
                  {['To Do', 'In Progress', 'Review', 'Done'].map((statusOption, index) => {
                    const isActive = workItem.status === statusOption;
                    const isCompleted = ['To Do', 'In Progress', 'Review', 'Done'].indexOf(workItem.status) > index;
                    const isClickable = canEdit && statusOption !== workItem.status;
                    
                    return (
                      <div key={statusOption} className="status-step-container">
                        <div
                          className={`status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''} ${loading ? 'loading' : ''}`}
                          onClick={() => {
                            if (isClickable && !loading) {
                              handleStatusUpdate(statusOption);
                            }
                          }}
                          style={{
                            cursor: isClickable ? 'pointer' : 'default',
                            transition: 'all 0.3s ease',
                            position: 'relative'
                          }}
                        >
                          <div className="status-step-circle">
                            {isCompleted && !isActive ? (
                              <span className="status-check">✓</span>
                            ) : isActive ? (
                              <span className="status-current">●</span>
                            ) : (
                              <span className="status-pending">○</span>
                            )}
                          </div>
                          <div className="status-step-label">
                            {statusOption}
                          </div>
                          {loading && status === statusOption && (
                            <div className="status-loading-spinner"></div>
                          )}
                        </div>
                        {index < 3 && (
                          <div className={`status-connector ${isCompleted ? 'completed' : ''}`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Alternative: Quick Status Badges for faster switching */}
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #dee2e6' }}>
                  <small className="text-muted d-block mb-2">Quick Actions:</small>
                  <div className="d-flex gap-2 flex-wrap">
                    {['To Do', 'In Progress', 'Review', 'Done'].map((statusOption) => {
                      const isActive = workItem.status === statusOption;
                      if (isActive) return null; // Don't show current status as button
                      
                      return (
                        <button
                          key={statusOption}
                          className={`status-quick-btn ${getStatusColor(statusOption)}`}
                          onClick={() => {
                            if (canEdit && !loading) {
                              handleStatusUpdate(statusOption);
                            }
                          }}
                          disabled={!canEdit || loading}
                          style={{
                            border: 'none',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: canEdit ? 'pointer' : 'not-allowed',
                            opacity: canEdit ? 1 : 0.6,
                            transition: 'all 0.2s ease',
                            background: getStatusColor(statusOption) === 'secondary' ? '#6c757d' :
                                       getStatusColor(statusOption) === 'primary' ? '#0d6efd' :
                                       getStatusColor(statusOption) === 'warning' ? '#ffc107' :
                                       getStatusColor(statusOption) === 'success' ? '#198754' : '#6c757d',
                            color: getStatusColor(statusOption) === 'warning' ? '#000' : '#fff'
                          }}
                          onMouseEnter={(e) => {
                            if (canEdit) {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          {statusOption}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Description */}
              {workItem.description && (
                <div className="mb-4">
                  <strong className="d-block mb-2" style={{ fontSize: '0.95rem', color: '#495057' }}>Description</strong>
                  <p className="text-muted mb-0" style={{ lineHeight: '1.6' }}>{workItem.description}</p>
                </div>
              )}

              {/* Key Information Grid */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <FaUser className="me-2 text-primary" />
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>ASSIGNED TO</strong>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>{workItem.assignedTo?.name || 'Unassigned'}</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <FaClock className="me-2 text-warning" />
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>DUE DATE</strong>
                    </div>
                    <div className={`${isOverdue ? 'text-danger fw-bold' : ''}`} style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                      {formatDate(workItem.dueDate)}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <FaTasks className="me-2 text-info" />
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>PROJECT</strong>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>{workItem.project?.name || 'N/A'}</div>
                    {workItem.project?.client && (
                      <small className="text-muted">Client: {workItem.project.client.name}</small>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-2">
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>PRIORITY</strong>
                    </div>
                    <Badge 
                      bg={
                        workItem.priority === 'urgent' ? 'danger' :
                        workItem.priority === 'high' ? 'warning' :
                        workItem.priority === 'medium' ? 'info' : 'secondary'
                      }
                      className="text-capitalize"
                      style={{ fontSize: '0.9rem', padding: '6px 12px' }}
                    >
                      {workItem.priority}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content-Specific Fields */}
              {workItem.type === 'content' && (
                <div className="mb-4">
                  <strong className="d-block mb-3" style={{ fontSize: '0.95rem', color: '#495057' }}>Content Details</strong>
                  <div className="row g-2">
                    {workItem.platform && (
                      <div className="col-auto">
                        <Badge bg="info" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>{workItem.platform}</Badge>
                      </div>
                    )}
                    {workItem.postType && (
                      <div className="col-auto">
                        <Badge bg="secondary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>{workItem.postType}</Badge>
                      </div>
                    )}
                  </div>
                  {workItem.contentBucket && (
                    <div className="mt-3">
                      <small className="text-muted d-block mb-1">Content Bucket</small>
                      <div>{workItem.contentBucket}</div>
                    </div>
                  )}
                  {workItem.caption && (
                    <div className="mt-3">
                      <small className="text-muted d-block mb-1">Caption</small>
                      <div className="text-muted" style={{ fontStyle: 'italic' }}>{workItem.caption}</div>
                    </div>
                  )}
                  {workItem.hashtags && (
                    <div className="mt-3">
                      <small className="text-muted d-block mb-1">Hashtags</small>
                      <div className="text-primary">{workItem.hashtags}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {workItem.tags && workItem.tags.length > 0 && (
                <div className="mb-4">
                  <strong className="d-block mb-2" style={{ fontSize: '0.95rem', color: '#495057' }}>Tags</strong>
                  <div className="d-flex flex-wrap gap-2">
                    {workItem.tags.map((tag, index) => (
                      <Badge key={index} bg="light" text="dark" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Created Info */}
              <div className="mt-4 pt-3" style={{ borderTop: '2px solid #e9ecef' }}>
                <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.85rem' }}>
                  <span>Created by <strong>{workItem.createdBy?.name}</strong> on {formatDate(workItem.createdAt)}</span>
                  {workItem.completedAt && (
                    <span className="text-success">✓ Completed on {formatDate(workItem.completedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          </Tab>

          <Tab eventKey="comments" title={`Comments (${comments?.length || 0})`}>
            <div style={{ padding: '1.5rem' }}>
              {/* Add Comment Section */}
              <div className="mb-4 p-3" style={{ background: '#f8f9fc', borderRadius: '12px', border: '1px solid #e3e6f0' }}>
                <div className="d-flex align-items-center mb-3">
                  <FaComment className="me-2 text-primary" />
                  <strong style={{ fontSize: '0.95rem', color: '#495057' }}>Add Comment</strong>
                </div>
                
                <Form.Group className="mb-3">
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Share updates, ask questions, or provide feedback about this task..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={commentLoading}
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e3e6f0',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                  />
                  <Form.Text className="text-muted">
                    💡 Tip: Press Ctrl+Enter to post quickly
                  </Form.Text>
                </Form.Group>
                
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Posting as <strong>{currentUser?.name}</strong>
                  </small>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentLoading}
                    style={{
                      borderRadius: '20px',
                      padding: '6px 16px',
                      fontWeight: '600'
                    }}
                  >
                    {commentLoading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" style={{ width: '12px', height: '12px' }} />
                        Posting...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="me-2" />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              <div className="comments-list" style={{
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {comments && comments.length > 0 ? (
                  <>
                    <div className="d-flex align-items-center mb-3">
                      <div style={{ flex: 1, height: '1px', background: '#e3e6f0' }}></div>
                      <span className="px-3 text-muted" style={{ fontSize: '0.85rem' }}>
                        {comments.length} comment{comments.length !== 1 ? 's' : ''}
                      </span>
                      <div style={{ flex: 1, height: '1px', background: '#e3e6f0' }}></div>
                    </div>
                    
                    <div className="comments-container" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {comments.map((comment, index) => (
                        <div key={comment._id || index} className="comment-item">
                          <div className="comment-card p-3" style={{ 
                            background: '#ffffff', 
                            borderRadius: '12px', 
                            border: '1px solid #e3e6f0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}>
                            {/* Comment Header */}
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="d-flex align-items-center">
                                <div 
                                  className="user-avatar me-2"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  {(comment.user?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ color: '#495057', fontSize: '0.9rem' }}>
                                    {comment.user?.name || 'Unknown User'}
                                  </strong>
                                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                    {formatDate(comment.createdAt)}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Comment Actions (for comment owner or admin) */}
                              {(comment.user?._id === currentUser?._id || ['admin', 'superadmin'].includes(currentUser?.role)) && (
                                <div className="comment-actions">
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="text-muted p-1"
                                    style={{ 
                                      fontSize: '0.75rem',
                                      transition: 'color 0.2s ease'
                                    }}
                                    title="Delete comment"
                                    onClick={() => handleDeleteComment(comment._id)}
                                    onMouseEnter={(e) => {
                                      e.target.style.color = '#dc3545';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.color = '#6c757d';
                                    }}
                                  >
                                    <FaTrash />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {/* Comment Content */}
                            <div className="comment-content">
                              <p className="mb-0" style={{ 
                                lineHeight: '1.6', 
                                fontSize: '0.9rem',
                                color: '#495057',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {comment.text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}
                              </p>
                            </div>
                            
                            {/* Comment Status Context (if comment was added during status change) */}
                            {comment.statusContext && (
                              <div className="mt-2 p-2" style={{
                                background: '#e8f4fd',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                color: '#0066cc'
                              }}>
                                <FaClock className="me-1" />
                                Status changed to <strong>{comment.statusContext}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <div className="text-muted mb-3" style={{ fontSize: '3rem', opacity: 0.3 }}>💬</div>
                    <h6 className="text-muted mb-2">No comments yet</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                      Be the first to add a comment about this task!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Tab>

          {workItem.attachments && workItem.attachments.length > 0 && (
            <Tab eventKey="attachments" title={`Attachments (${workItem.attachments.length})`}>
              <div style={{ padding: '1.5rem' }}>
                {workItem.attachments.map((attachment, index) => (
                  <div key={index} className="mb-3 p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <a 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-decoration-none d-flex align-items-center"
                      style={{ fontSize: '0.95rem', fontWeight: '500' }}
                    >
                      📎 {attachment.name}
                    </a>
                    <small className="text-muted d-block mt-2">
                      {attachment.type} • Uploaded {formatDate(attachment.uploadedAt)}
                    </small>
                  </div>
                ))}
              </div>
            </Tab>
          )}
        </Tabs>
      </Modal.Body>

      <Modal.Footer style={{ background: '#f8f9fa', borderTop: '2px solid #e9ecef' }}>
        <Button variant="secondary" onClick={onHide} style={{ borderRadius: '6px', padding: '8px 20px' }}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WorkItemDetailsModal;
