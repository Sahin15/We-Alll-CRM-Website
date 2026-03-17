import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { FaCalendar, FaTasks, FaUser, FaClock, FaComment, FaPaperPlane, FaTrash } from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import { toast } from '../../utils/toast';
import workItemApi from '../../api/workItemApi';
import userApi from '../../api/userApi';
import CommentInputWithMentions from './CommentInputWithMentions';
import './WorkItemDetailsModal.css';

const WorkItemDetailsModal = ({ show, onHide, workItem, onUpdate, onRefresh, currentUser, onAddComment }) => {
  const [status, setStatus] = useState(workItem?.status || 'To Do');
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState(workItem?.comments || []);
  const [showCompletionDatePicker, setShowCompletionDatePicker] = useState(false);
  const [completionDate, setCompletionDate] = useState('');
  const [activating, setActivating] = useState(false);
  const [allTeamMembers, setAllTeamMembers] = useState([]);

  // Helper function to render mentions in text
  const renderMentions = (text) => {
    if (!text) return null;
    
    // Decode HTML entities first
    const decodedText = decodeHtmlEntities(text);
    
    // Pattern to match @name(userId)
    const mentionPattern = /@([^(]+)\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionPattern.exec(decodedText)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(decodedText.substring(lastIndex, match.index));
      }

      // Add mention as a tag
      const mentionName = match[1];
      const mentionId = match[2];
      parts.push(
        <span
          key={`mention-${mentionId}`}
          className="mention-tag"
          title={`Mentioned: ${mentionName}`}
          style={{
            backgroundColor: '#e7f1ff',
            color: '#0066cc',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: '500',
            display: 'inline-block',
            marginRight: '2px'
          }}
        >
          @{mentionName}
        </span>
      );

      lastIndex = mentionPattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < decodedText.length) {
      parts.push(decodedText.substring(lastIndex));
    }

    return parts.length > 0 ? parts : linkifyText(decodedText);
  };

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Helper function to convert URLs in text to clickable links
  const linkifyText = (text) => {
    if (!text) return null;
    
    // First decode HTML entities
    const decodedText = decodeHtmlEntities(text);
    
    // Regular expression to match URLs (including those with special chars)
    const urlRegex = /(https?:\/\/[^\s,]+)/g;
    
    // Split text by URLs
    const parts = decodedText.split(urlRegex);
    
    return parts.map((part, index) => {
      // Check if this part is a URL
      if (part.match(urlRegex)) {
        // Clean up any trailing punctuation that's not part of the URL
        const cleanUrl = part.replace(/[,;.!?]+$/, '');
        return (
          <a 
            key={index} 
            href={cleanUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#667eea', 
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {cleanUrl}
          </a>
        );
      }
      return part;
    });
  };

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

  // Fetch all team members for mentions (project members + HR/Manager/Admin/SuperAdmin)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        // Get all users with specific roles
        const response = await userApi.getAllUsers({ 
          limit: 1000 // Get all users
        });
        
        const allUsers = response.data || [];
        
        // Combine:
        // 1. Project assigned users
        // 2. Work item assigned members
        // 3. All HR, Manager, Admin, SuperAdmin users
        const projectUsers = workItem.project?.assignedUsers || [];
        const assignedUsers = workItem.assignedToMultiple || [];
        const singleAssigned = workItem.assignedTo ? [workItem.assignedTo] : [];
        
        // Get HR, Manager, Admin, SuperAdmin users
        const specialRoleUsers = allUsers.filter(user => 
          ['hr', 'manager', 'admin', 'superadmin'].includes(user.role)
        );
        
        // Combine all and remove duplicates
        const combined = [
          ...projectUsers,
          ...assignedUsers,
          ...singleAssigned,
          ...specialRoleUsers
        ].filter((member, index, self) => 
          member && member._id && index === self.findIndex(m => m?._id === member._id)
        );
        
        console.log('Fetched team members for mentions:', {
          projectUsers: projectUsers.length,
          assignedUsers: assignedUsers.length,
          specialRoleUsers: specialRoleUsers.length,
          total: combined.length
        });
        
        setAllTeamMembers(combined);
      } catch (error) {
        console.error('Error fetching team members for mentions:', error);
        // Fallback to just project and assigned users
        const fallbackMembers = [
          ...(workItem.project?.assignedUsers || []),
          ...(workItem.assignedToMultiple || []),
          ...(workItem.assignedTo ? [workItem.assignedTo] : [])
        ].filter((member, index, self) => 
          member && member._id && index === self.findIndex(m => m?._id === member._id)
        );
        setAllTeamMembers(fallbackMembers);
      }
    };

    if (show && workItem?.project?._id) {
      fetchTeamMembers();
    }
  }, [show, workItem?.project?._id, workItem?.assignedToMultiple, workItem?.assignedTo]);

  if (!workItem) return null;

  // Helper function to check if current user can edit (supports multiple assignees)
  const canEdit = () => {
    // Admin roles can always edit
    if (['admin', 'superadmin', 'hr', 'manager', 'hod'].includes(currentUser?.role)) {
      return true;
    }
    
    // Check if current user is assigned (single or multiple)
    if (workItem.assignedTo?._id === currentUser?._id) {
      return true;
    }
    
    if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
      return workItem.assignedToMultiple.some(assignee => assignee._id === currentUser?._id);
    }
    
    return false;
  };

  // Helper function to display assignees (supports both single and multiple assignees)
  const getAssigneeDisplay = (workItem) => {
    if (workItem.assignedToMultiple && workItem.assignedToMultiple.length > 0) {
      // Multiple assignees - show all names
      const names = workItem.assignedToMultiple.map(assignee => assignee.name).filter(Boolean);
      if (names.length === 0) return 'Unassigned';
      return (
        <div>
          {names.map((name, index) => (
            <div key={index} className="d-flex align-items-center mb-1">
              <span className="badge bg-primary me-2" style={{ fontSize: '0.75em' }}>
                {index + 1}
              </span>
              {name}
            </div>
          ))}
        </div>
      );
    } else if (workItem.assignedTo?.name) {
      // Single assignee
      return workItem.assignedTo.name;
    }
    return 'Unassigned';
  };

  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'primary',
      'Review': 'warning',
      'Done': 'success',
    };
    return colors[status] || 'secondary';
  };

  const handleStatusUpdate = async (newStatus = status, backDate = null) => {
    if (newStatus === workItem.status) {
      return;
    }

    setLoading(true);
    setStatus(newStatus); // Update local state immediately for better UX
    
    try {
      await onUpdate(workItem._id, newStatus, workItem.type, backDate);
      if (onRefresh) {
        onRefresh();
      }
      // Reset completion date picker
      setShowCompletionDatePicker(false);
      setCompletionDate('');
    } catch (error) {
      console.error('Error updating status:', error);
      setStatus(workItem.status); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  const handleDoneWithDate = () => {
    if (!completionDate) {
      toast.error('Please select a completion date');
      return;
    }
    handleStatusUpdate('Done', completionDate);
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

  const handleActivateWorkItem = async () => {
    setActivating(true);
    try {
      await workItemApi.activateWorkItem(workItem._id, 'active');
      toast.success('Work item activated successfully');
      if (onRefresh) {
        onRefresh();
      }
      onHide();
    } catch (error) {
      console.error('Error activating work item:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to activate work item');
    } finally {
      setActivating(false);
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
          <Tab eventKey="activity" title={
            <span>
              <FaClock className="me-2" />
              Activity Timeline
            </span>
          }>
            <div style={{ padding: '1.5rem' }}>
              {/* Activity Timeline - Shows status changes and comments chronologically */}
              <div className="activity-timeline">
                {(() => {
                  // Combine status history and comments into a single timeline
                  const activities = [];
                  
                  // Add status changes from history
                  if (workItem.statusHistory && workItem.statusHistory.length > 0) {
                    workItem.statusHistory.forEach(history => {
                      activities.push({
                        type: 'status',
                        timestamp: history.changedAt,
                        user: history.changedBy,
                        fromStatus: history.fromStatus,
                        toStatus: history.toStatus,
                        comment: history.comment
                      });
                    });
                  }
                  
                  // Add comments
                  if (comments && comments.length > 0) {
                    comments.forEach(comment => {
                      activities.push({
                        type: 'comment',
                        timestamp: comment.createdAt,
                        user: comment.user,
                        text: comment.text,
                        _id: comment._id
                      });
                    });
                  }
                  
                  // Add creation event
                  activities.push({
                    type: 'created',
                    timestamp: workItem.createdAt,
                    user: workItem.createdBy
                  });
                  
                  // Sort by timestamp (newest first)
                  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                  
                  if (activities.length === 0) {
                    return (
                      <div className="text-center py-5">
                        <FaClock style={{ fontSize: '3rem', opacity: 0.3, color: '#6c757d' }} />
                        <h6 className="text-muted mt-3">No activity yet</h6>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="timeline-container">
                      {activities.map((activity, index) => (
                        <div key={index} className="timeline-item">
                          <div className="timeline-marker">
                            {activity.type === 'status' ? (
                              <div className="marker-icon status-change">🔄</div>
                            ) : activity.type === 'comment' ? (
                              <div className="marker-icon comment">💬</div>
                            ) : (
                              <div className="marker-icon created">✨</div>
                            )}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <div className="d-flex align-items-center gap-2">
                                <div 
                                  className="user-avatar-small"
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  {(activity.user?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ fontSize: '0.9rem' }}>
                                    {activity.user?.name || 'Unknown User'}
                                  </strong>
                                  <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                    {formatDate(activity.timestamp)}
                                  </div>
                                </div>
                              </div>
                              {activity.type === 'comment' && 
                               (activity.user?._id === currentUser?._id || 
                                ['admin', 'superadmin', 'hr', 'manager'].includes(currentUser?.role)) && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="text-muted p-1"
                                  onClick={() => handleDeleteComment(activity._id)}
                                  title="Delete comment"
                                >
                                  <FaTrash />
                                </Button>
                              )}
                            </div>
                            <div className="timeline-body">
                              {activity.type === 'status' && (
                                <div className="status-change-info">
                                  <div className="d-flex align-items-center gap-2 mb-2">
                                    <span className="text-muted">Changed status from</span>
                                    <Badge bg={getStatusColor(activity.fromStatus)}>
                                      {activity.fromStatus}
                                    </Badge>
                                    <span className="text-muted">to</span>
                                    <Badge bg={getStatusColor(activity.toStatus)}>
                                      {activity.toStatus}
                                    </Badge>
                                  </div>
                                  {activity.comment && (
                                    <div className="mt-2 p-2" style={{
                                      background: '#f8f9fa',
                                      borderRadius: '6px',
                                      fontSize: '0.9rem',
                                      borderLeft: '3px solid #667eea'
                                    }}>
                                      {activity.comment}
                                    </div>
                                  )}
                                </div>
                              )}
                              {activity.type === 'comment' && (
                                <div className="comment-text" style={{
                                  fontSize: '0.9rem',
                                  lineHeight: '1.6',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {activity.text}
                                </div>
                              )}
                              {activity.type === 'created' && (
                                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                  Created this work item
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </Tab>
          
          <Tab eventKey="details" title="Details" style={{ padding: '1.5rem' }}>
            <div style={{ padding: '1.5rem' }}>
              {/* Status Section - Simple and Practical */}
              <div className="mb-4 p-3" style={{ background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <strong style={{ fontSize: '0.95rem', color: '#495057' }}>Current Status</strong>
                  <div className="d-flex align-items-center gap-2">
                    {workItem.visibility && workItem.visibility !== 'active' && (
                      <Badge 
                        bg={workItem.visibility === 'draft' ? 'secondary' : 'warning'}
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {workItem.visibility === 'draft' ? '📝 Draft' : '⏰ Scheduled'}
                      </Badge>
                    )}
                    <Badge 
                      bg={getStatusColor(workItem.status)} 
                      style={{ 
                        fontSize: '0.9rem', 
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontWeight: '600'
                      }}
                    >
                      {workItem.status}
                    </Badge>
                  </div>
                </div>
                
                {/* Activate Button for Draft/Scheduled Items */}
                {(workItem.visibility === 'draft' || workItem.visibility === 'scheduled') && canEdit() && (
                  <div className="mb-3 p-3" style={{ background: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#1976d2' }}>
                          {workItem.visibility === 'draft' ? '📝 Draft Work Item' : '⏰ Scheduled Work Item'}
                        </strong>
                        <p className="mb-0 mt-1" style={{ fontSize: '0.85rem', color: '#1565c0' }}>
                          {workItem.visibility === 'draft' 
                            ? 'This work item is not yet visible to assigned team members. Activate it to make it visible.'
                            : `This work item will become visible on ${formatDate(workItem.scheduledActivationDate)}. Activate it now to make it visible immediately.`
                          }
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleActivateWorkItem}
                        disabled={activating || loading}
                        style={{
                          borderRadius: '20px',
                          padding: '8px 16px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          marginLeft: '12px'
                        }}
                      >
                        {activating ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" style={{ width: '12px', height: '12px' }} />
                            Activating...
                          </>
                        ) : (
                          '✓ Activate Now'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                {canEdit() && (
                  <>
                    <div className="mb-2">
                      <small className="text-muted">Change status to:</small>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      {['To Do', 'In Progress', 'Review', 'Done'].map((statusOption) => {
                        const isActive = workItem.status === statusOption;
                        if (isActive) return null;
                        
                        // Special handling for "Done" status - show date picker option
                        if (statusOption === 'Done') {
                          return (
                            <div key={statusOption} className="d-flex gap-2 align-items-center">
                              <Button
                                variant={getStatusColor(statusOption)}
                                size="sm"
                                onClick={() => {
                                  if (!loading) {
                                    handleStatusUpdate(statusOption);
                                  }
                                }}
                                disabled={loading}
                                style={{
                                  borderRadius: '20px',
                                  padding: '6px 16px',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  minWidth: '100px',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {loading && status === statusOption ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" style={{ width: '12px', height: '12px' }} />
                                    Updating...
                                  </>
                                ) : (
                                  statusOption
                                )}
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => setShowCompletionDatePicker(!showCompletionDatePicker)}
                                disabled={loading}
                                style={{
                                  borderRadius: '20px',
                                  padding: '6px 12px',
                                  fontSize: '0.85rem',
                                  fontWeight: '500'
                                }}
                                title="Mark as done with back date"
                              >
                                <FaCalendar />
                              </Button>
                            </div>
                          );
                        }
                        
                        return (
                          <Button
                            key={statusOption}
                            variant={getStatusColor(statusOption)}
                            size="sm"
                            onClick={() => {
                              if (!loading) {
                                handleStatusUpdate(statusOption);
                              }
                            }}
                            disabled={loading}
                            style={{
                              borderRadius: '20px',
                              padding: '6px 16px',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              minWidth: '100px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {loading && status === statusOption ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" style={{ width: '12px', height: '12px' }} />
                                Updating...
                              </>
                            ) : (
                              statusOption
                            )}
                          </Button>
                        );
                      })}
                    </div>
                    
                    {/* Back Date Completion Picker */}
                    {showCompletionDatePicker && (
                      <div className="mt-3 p-3" style={{ background: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
                        <div className="mb-2">
                          <small className="text-success fw-bold">
                            <FaCalendar className="me-1" />
                            Mark as completed with back date
                          </small>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          <Form.Control
                            type="date"
                            size="sm"
                            value={completionDate}
                            onChange={(e) => setCompletionDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            style={{ maxWidth: '200px' }}
                          />
                          <Button
                            variant="success"
                            size="sm"
                            onClick={handleDoneWithDate}
                            disabled={!completionDate || loading}
                            style={{ borderRadius: '20px', padding: '6px 16px' }}
                          >
                            {loading ? 'Updating...' : 'Confirm'}
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              setShowCompletionDatePicker(false);
                              setCompletionDate('');
                            }}
                            style={{ borderRadius: '20px', padding: '6px 16px' }}
                          >
                            Cancel
                          </Button>
                        </div>
                        <small className="text-muted d-block mt-2">
                          💡 Use this to record work that was completed on a previous date
                        </small>
                      </div>
                    )}
                  </>
                )}
                
                {!canEdit() && (
                  <small className="text-muted d-block mt-2">
                    You don't have permission to change the status
                  </small>
                )}
              </div>

              {/* Description */}
              {workItem.description && (
                <div className="mb-4">
                  <strong className="d-block mb-2" style={{ fontSize: '0.95rem', color: '#495057' }}>Description</strong>
                  <p className="text-muted mb-0" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {linkifyText(workItem.description)}
                  </p>
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
                    <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                      {getAssigneeDisplay(workItem)}
                    </div>
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
              {/* Add Comment Section with Mentions */}
              <CommentInputWithMentions
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onSubmit={handleAddComment}
                loading={commentLoading}
                currentUser={currentUser}
                teamMembers={allTeamMembers}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddComment();
                  }
                }}
              />

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
                              {(comment.user?._id === currentUser?._id || ['admin', 'superadmin', 'hr', 'manager'].includes(currentUser?.role)) && (
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
                                {renderMentions(comment.text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))}
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
