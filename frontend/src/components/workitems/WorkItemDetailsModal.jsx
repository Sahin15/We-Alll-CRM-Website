import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import {
  FaCalendar,
  FaTasks,
  FaUser,
  FaClock,
  FaComment,
  FaPaperPlane,
  FaTrash,
  FaSync,
  FaCheckCircle,
  FaPen,
  FaPlusCircle,
  FaEdit,
} from 'react-icons/fa';
import { formatDate } from '../../utils/helpers';
import { toast } from '../../utils/toast';
import workItemApi from '../../api/workItemApi';
import userApi from '../../api/userApi';
import CommentInputWithMentions from './CommentInputWithMentions';
import {
  getEffectiveStatusForUser,
  isWorkItemOverdue,
} from '../../utils/workItemUtils';
import CreativeWorkflowPanel from '../creative/CreativeWorkflowPanel';
import creativeWorkflowApi from '../../api/creativeWorkflowApi';
import { isCreativeWorkflowItem } from '../../utils/creativeWorkflowAccess';
import { getCreativeStatusBadgeVariant } from '../../utils/workItemStatusUtils';
import './WorkItemDetailsModal.css';

const WorkItemDetailsModal = ({
  show,
  onHide,
  workItem: workItemProp,
  onUpdate,
  onRefresh,
  onWorkItemSync,
  currentUser,
  onAddComment,
}) => {
  const getUserStatus = (item) =>
    getEffectiveStatusForUser(item, currentUser?._id);

  /** Full document (includes statusHistory) — list endpoints omit it */
  const [fullWorkItem, setFullWorkItem] = useState(null);
  const workItem = fullWorkItem || workItemProp;

  const [status, setStatus] = useState(getUserStatus(workItemProp) || 'To Do');
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState(workItemProp?.comments || []);
  const [showCompletionDatePicker, setShowCompletionDatePicker] = useState(false);
  const [completionDate, setCompletionDate] = useState('');
  const [activating, setActivating] = useState(false);
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [creativeRevisions, setCreativeRevisions] = useState([]);

  const loadFullWorkItem = async () => {
    if (!workItemProp?._id) return null;
    try {
      const response = await workItemApi.getWorkItemById(workItemProp._id);
      const full = response.data || response;
      setFullWorkItem(full);
      if (full?.comments) {
        setComments(full.comments);
      }
      setStatus(getUserStatus(full) || 'To Do');
      return full;
    } catch (error) {
      console.error('Error loading work item details:', error);
      return null;
    }
  };

  // Helper function to render mentions in text
  const renderMentions = (text) => {
    if (!text) return null;
    
    // Decode HTML entities first
    const decodedText = decodeHtmlEntities(text);
    
    // Pattern to match @name (just the name, no ID)
    // Matches: @[word characters and spaces] followed by space or end of string
    const mentionPattern = /@([^\s@]+(?:\s+[^\s@]+)*)\s/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let foundMentions = false;

    while ((match = mentionPattern.exec(decodedText)) !== null) {
      foundMentions = true;
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(decodedText.substring(lastIndex, match.index));
      }

      // Add mention as a tag
      const mentionName = match[1].trim();
      parts.push(
        <span
          key={`mention-${mentionName}-${Math.random()}`}
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

      lastIndex = match.index + match[0].length - 1; // -1 to keep the space
    }

    // Add remaining text
    if (lastIndex < decodedText.length) {
      parts.push(decodedText.substring(lastIndex));
    }

    return foundMentions && parts.length > 0 ? parts : linkifyText(decodedText);
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

  // Set comments only when modal first opens for a work item
  React.useEffect(() => {
    if (show && workItemProp?.comments) {
      setComments(workItemProp.comments);
    }
  }, [show, workItemProp?._id]); // ONLY reset on open or different work item — never on comment changes

  // Always fetch full work item so Activity Timeline gets statusHistory (list APIs strip it)
  React.useEffect(() => {
    if (!show || !workItemProp?._id) {
      setFullWorkItem(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const full = await loadFullWorkItem();
      if (cancelled && !full) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open / id only
  }, [show, workItemProp?._id]);

  // Load creative revisions for activity timeline (who requested changes, when)
  React.useEffect(() => {
    const source = fullWorkItem || workItemProp;
    const isCreative =
      source?.workflowMode === 'creative' ||
      source?.workflowType === 'design' ||
      source?.workflowType === 'video-production';
    if (!show || !source?._id || !isCreative) {
      setCreativeRevisions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await creativeWorkflowApi.listRevisions(source._id);
        if (!cancelled) setCreativeRevisions(res.data || []);
      } catch (error) {
        if (!cancelled) setCreativeRevisions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, workItemProp?._id, fullWorkItem?.workflowMode, fullWorkItem?.workflowType]);

  /** Refresh timeline revisions without remounting the modal or reloading the page. */
  const refreshCreativeTimeline = async (workItemId) => {
    if (!workItemId) return;
    try {
      const res = await creativeWorkflowApi.listRevisions(workItemId);
      setCreativeRevisions(res.data || []);
    } catch {
      setCreativeRevisions([]);
    }
  };

  /**
   * After creative workflow actions: update modal state only — never trigger parent page loading.
   * @param {{ workItem?: object }} [payload]
   */
  const handleCreativeWorkflowUpdated = async (payload = {}) => {
    const partial = payload.workItem;
    if (partial?._id) {
      setFullWorkItem((prev) => {
        const base = prev || workItemProp;
        return { ...base, ...partial };
      });
      if (partial.status) {
        setStatus(getUserStatus({ ...(fullWorkItem || workItemProp), ...partial }) || partial.status);
      }
    }

    const full = await loadFullWorkItem();
    await refreshCreativeTimeline(workItemProp?._id);

    const synced = full || (partial?._id ? { ...(fullWorkItem || workItemProp), ...partial } : null);
    if (synced && typeof onWorkItemSync === 'function') {
      onWorkItemSync(synced);
    }
  };

  // Fetch all team members for mentions (project members + HR/Manager/Admin/SuperAdmin)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        // Get all users with specific roles
        const response = await userApi.getAllUsers({
          excludePast: true,
          limit: 1000,
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

  const isCreativeItem = isCreativeWorkflowItem(workItem);
  const defaultTabKey = isCreativeItem ? 'activity' : 'details';

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
    if (isCreativeWorkflowItem(workItem)) {
      return getCreativeStatusBadgeVariant(status);
    }
    const colors = {
      'To Do': 'secondary',
      'Backlog': 'secondary',
      'Assigned': 'secondary',
      'In Progress': 'primary',
      'Rework In Progress': 'primary',
      'Review': 'warning',
      'Submitted for Review': 'warning',
      'QA Review': 'warning',
      'Changes Requested': 'warning',
      'Approved': 'info',
      'Done': 'success',
      'Delivered': 'success',
      'Posted': 'success',
      'Closed': 'success',
      'Awaiting Posting': 'info',
      'Cancelled': 'danger'
    };
    return colors[status] || 'secondary';
  };

  const handleStatusUpdate = async (newStatus = status, backDate = null, reason = null) => {
    const currentUserStatus = getUserStatus(workItem);
    if (newStatus === currentUserStatus && !reason) {
      return;
    }

    setLoading(true);
    setStatus(newStatus); // Update local state immediately for better UX
    
    try {
      await onUpdate(workItem._id, newStatus, backDate, reason);
      await loadFullWorkItem();
      if (onRefresh) {
        onRefresh();
      }
      // Reset state
      setShowCompletionDatePicker(false);
      setCompletionDate('');
      setShowCancelModal(false);
      setCancellationReason('');
    } catch (error) {
      console.error('Error updating status:', error);
      setStatus(getUserStatus(workItem) || workItem.status); // Revert on error
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
    const commentText = newComment.trim();
    try {
      await workItemApi.addComment(workItem._id, commentText);
      setNewComment('');

      // Fetch fresh work item and update comments directly
      const updated = await workItemApi.getWorkItemById(workItem._id);
      const updatedItem = updated?.data || updated;
      if (updatedItem?.comments) {
        setComments(updatedItem.comments);
      } else {
        // Fallback optimistic
        setComments(prev => [...prev, {
          _id: `temp-${Date.now()}`,
          user: { _id: currentUser?._id, name: currentUser?.name },
          text: commentText,
          createdAt: new Date().toISOString(),
          isSystemComment: false
        }]);
      }

      toast.success('Comment added successfully');
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

  const itemStatus = getUserStatus(workItem);
  const isOverdue = isWorkItemOverdue(workItem, currentUser?._id);

  return (
    <>
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: workItem.status === 'Cancelled' ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
        <Modal.Title className="d-flex align-items-center w-100">
          <div className="d-flex align-items-center flex-grow-1">
            <Badge 
              bg="light" 
              text="dark" 
              className="me-3"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              {workItem.type === 'content' ? <FaCalendar className="me-1" /> : <FaTasks className="me-1" />}
              {workItem.type === 'content' ? 'Content' : 'Work Item'}
            </Badge>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{workItem.title}</span>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: 0 }}>
        {workItem.status === 'Cancelled' && (
          <div style={{
            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
            color: 'white',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            borderBottom: '3px solid #a71d2a'
          }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🚫</span>
            <div>
              <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '4px' }}>
                This work item has been CANCELLED
              </strong>
              {workItem.cancellationReason && (
                <span style={{ fontSize: '0.9rem', opacity: 0.92 }}>
                  <strong>Reason:</strong> {workItem.cancellationReason}
                </span>
              )}
            </div>
          </div>
        )}

        {isOverdue && (
          <Alert variant="danger" className="m-3 mb-0" style={{ borderRadius: '8px' }}>
            <FaClock className="me-2" />
            <strong>Overdue!</strong> This work item is past its due date.
          </Alert>
        )}

        {isCreativeItem && (
          <div className="m-3">
            <CreativeWorkflowPanel
              workItem={workItem}
              project={workItem.project}
              currentUser={currentUser}
              onUpdated={handleCreativeWorkflowUpdated}
            />
          </div>
        )}

        <Tabs
          key={`${workItem._id}-${defaultTabKey}`}
          defaultActiveKey={defaultTabKey}
          className="mb-0"
          style={{ borderBottom: '2px solid #e9ecef' }}
        >
          <Tab eventKey="activity" title={
            <span>
              <FaClock className="me-2" />
              Activity Timeline
            </span>
          }>
            <div style={{ padding: '1rem' }}>
              {/* Activity Timeline - Shows status changes and comments chronologically */}
              <div className="activity-timeline">
                {(() => {
                  // Combine status history, creative events, edits, and comments — deduped
                  const activities = [];
                  const dayKey = (ts) => {
                    const d = ts ? new Date(ts) : null;
                    if (!d || Number.isNaN(d.getTime())) return '';
                    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  };

                  // 1) Status history (dedupe identical toStatus on same day)
                  const seenStatusKeys = new Set();
                  if (workItem.statusHistory && workItem.statusHistory.length > 0) {
                    workItem.statusHistory.forEach((history) => {
                      const toStatus = history.toStatus || history.status;
                      if (!toStatus) return;
                      const key = `status|${toStatus}|${dayKey(history.changedAt)}`;
                      if (seenStatusKeys.has(key)) return;
                      seenStatusKeys.add(key);
                      activities.push({
                        type: 'status',
                        timestamp: history.changedAt,
                        user: history.changedBy,
                        fromStatus: history.fromStatus || null,
                        toStatus,
                        comment: history.comment || history.note || null,
                      });
                    });
                  }

                  // 2) Creative revision reviews / submits (structured — preferred over system comments)
                  if (creativeRevisions.length > 0) {
                    creativeRevisions.forEach((rev) => {
                      if (rev.reviewedAt && rev.lastDecision && rev.lastDecision !== 'none') {
                        const isChange =
                          ['minor', 'major', 'reject', 'send_back'].includes(rev.lastDecision) ||
                          ['changes_requested', 'rejected'].includes(rev.status);
                        activities.push({
                          type: 'creative_review',
                          timestamp: rev.reviewedAt,
                          user: rev.reviewedBy,
                          revisionNumber: rev.revisionNumber,
                          decision: rev.lastDecision,
                          severity: rev.decisionSeverity,
                          notes: rev.reviewNotes || rev.feedback || '',
                          isChangeRequest: isChange,
                          assigneeName:
                            rev.assignedTo?.name ||
                            workItem.assignedTo?.name ||
                            'Assignee',
                        });
                      }
                      if (rev.submittedAt) {
                        activities.push({
                          type: 'creative_submit',
                          timestamp: rev.submittedAt,
                          user: rev.submittedBy || rev.createdBy || rev.assignedTo,
                          revisionNumber: rev.revisionNumber,
                        });
                      }
                    });
                  }

                  // 3) Edit history
                  if (workItem.editHistory && workItem.editHistory.length > 0) {
                    workItem.editHistory.forEach((edit) => {
                      if (edit.fieldsChanged && edit.fieldsChanged.length > 0) {
                        const userName = edit.editorName || edit.editorEmail || 'Unknown User';
                        activities.push({
                          type: 'edit',
                          timestamp: edit.editedAt,
                          user: {
                            name: userName,
                            email: edit.editorEmail,
                            _id: edit.editedBy?._id || edit.editedBy
                          },
                          fieldsChanged: edit.fieldsChanged,
                          changes: edit.changes,
                          reason: edit.reason
                        });
                      }
                    });
                  }

                  // 4) Comments — skip system chatter already covered by status/creative events
                  const CREATIVE_SYSTEM_COMMENT =
                    /^(Work started|Revision \d+ submitted for review|Requested changes|Approved Revision|Revision \d+ created|Marked Delivered|Awaiting Posting|Task closed|QA (passed|failed))/i;
                  const statusChangePattern = /^Status changed from "([^"]+)" to "([^"]+)"$/i;
                  const seenCommentTexts = new Set();

                  if (comments && comments.length > 0) {
                    comments.forEach((comment) => {
                      const text = (comment.text || '').trim();
                      if (!text) return;
                      if (/^Reminder:/i.test(text)) return;

                      const statusMatch = statusChangePattern.exec(text);
                      if (statusMatch) {
                        // Covered by statusHistory when present
                        const covered = activities.some(
                          (a) =>
                            a.type === 'status' &&
                            a.toStatus === statusMatch[2] &&
                            dayKey(a.timestamp) === dayKey(comment.createdAt)
                        );
                        if (covered) return;
                        const key = `status|${statusMatch[2]}|${dayKey(comment.createdAt)}`;
                        if (seenStatusKeys.has(key)) return;
                        seenStatusKeys.add(key);
                        activities.push({
                          type: 'status',
                          timestamp: comment.createdAt,
                          user: comment.user,
                          fromStatus: statusMatch[1],
                          toStatus: statusMatch[2],
                          comment: null,
                        });
                        return;
                      }

                      // Creative system comments duplicate creative_submit / creative_review / status
                      if (CREATIVE_SYSTEM_COMMENT.test(text)) {
                        const dedupeKey = text.toLowerCase();
                        if (seenCommentTexts.has(dedupeKey)) return;
                        seenCommentTexts.add(dedupeKey);

                        // Prefer structured creative events when they exist
                        if (/submitted for review/i.test(text) && activities.some((a) => a.type === 'creative_submit')) {
                          return;
                        }
                        if (/Requested changes|Approved Revision/i.test(text) && activities.some((a) => a.type === 'creative_review')) {
                          return;
                        }
                        if (/^Work started/i.test(text) && activities.some((a) => a.type === 'status' && a.toStatus === 'In Progress')) {
                          return;
                        }
                        // Keep a single "Revision N created" note (no structured rework event yet)
                        activities.push({
                          type: 'comment',
                          timestamp: comment.createdAt,
                          user: comment.user,
                          text: comment.text,
                          _id: comment._id,
                        });
                        return;
                      }

                      if (comment.isSystemComment) {
                        const dedupeKey = text.toLowerCase();
                        if (seenCommentTexts.has(dedupeKey)) return;
                        seenCommentTexts.add(dedupeKey);
                      }

                      activities.push({
                        type: 'comment',
                        timestamp: comment.createdAt,
                        user: comment.user,
                        text: comment.text,
                        _id: comment._id,
                      });
                    });
                  }

                  // 5) Creation event
                  activities.push({
                    type: 'created',
                    timestamp: workItem.createdAt,
                    user: workItem.createdBy
                  });

                  // Drop status rows that duplicate structured creative events the same day
                  const hasCreativeSubmitDay = new Set(
                    activities
                      .filter((a) => a.type === 'creative_submit')
                      .map((a) => dayKey(a.timestamp))
                  );
                  const hasCreativeChangeDay = new Set(
                    activities
                      .filter((a) => a.type === 'creative_review' && a.isChangeRequest)
                      .map((a) => dayKey(a.timestamp))
                  );
                  const hasCreativeApproveDay = new Set(
                    activities
                      .filter((a) => a.type === 'creative_review' && !a.isChangeRequest)
                      .map((a) => dayKey(a.timestamp))
                  );

                  const dedupedActivities = activities.filter((a) => {
                    if (a.type !== 'status') return true;
                    const day = dayKey(a.timestamp);
                    if (a.toStatus === 'Submitted for Review' && hasCreativeSubmitDay.has(day)) return false;
                    if (a.toStatus === 'Changes Requested' && hasCreativeChangeDay.has(day)) return false;
                    if (a.toStatus === 'Approved' && hasCreativeApproveDay.has(day)) return false;
                    if (a.toStatus === 'Rework In Progress') {
                      const hasRevCreatedComment = activities.some(
                        (other) =>
                          other.type === 'comment' &&
                          dayKey(other.timestamp) === day &&
                          /^Revision \d+ created/i.test((other.text || '').trim())
                      );
                      if (hasRevCreatedComment) return false;
                    }
                    return true;
                  });

                  const finalActivities = dedupedActivities.filter((a) => {
                    if (a.type !== 'comment') return true;
                    const text = (a.text || '').trim();
                    const revCreatedMatch = /^Revision (\d+) created/i.exec(text);
                    if (!revCreatedMatch) return true;
                    const revNum = revCreatedMatch[1];
                    const day = dayKey(a.timestamp);
                    const hasSubmit = dedupedActivities.some(
                      (other) =>
                        other.type === 'creative_submit' &&
                        String(other.revisionNumber) === revNum &&
                        dayKey(other.timestamp) === day
                    );
                    const hasReworkStatus = dedupedActivities.some(
                      (other) =>
                        other.type === 'status' &&
                        other.toStatus === 'Rework In Progress' &&
                        dayKey(other.timestamp) === day
                    );
                    return !hasSubmit && !hasReworkStatus;
                  });

                  // Sort by timestamp (newest first)
                  finalActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                  if (finalActivities.length === 0) {
                    return (
                      <div className="activity-empty-state">
                        <FaClock className="activity-empty-icon" />
                        <h6 className="text-muted mt-3 mb-0">No activity yet</h6>
                      </div>
                    );
                  }

                  const getActivityEventMeta = (activity) => {
                    switch (activity.type) {
                      case 'creative_submit':
                        return { label: 'Submitted', Icon: FaPaperPlane, tone: 'submit' };
                      case 'creative_review':
                        return activity.isChangeRequest
                          ? { label: 'Change request', Icon: FaPen, tone: 'review-change' }
                          : { label: 'Approved', Icon: FaCheckCircle, tone: 'review-approve' };
                      case 'status':
                        return { label: 'Status', Icon: FaSync, tone: 'status' };
                      case 'edit':
                        return { label: 'Edited', Icon: FaEdit, tone: 'edit' };
                      case 'comment':
                        return { label: 'Comment', Icon: FaComment, tone: 'comment' };
                      case 'created':
                        return { label: 'Created', Icon: FaPlusCircle, tone: 'created' };
                      default:
                        return { label: 'Activity', Icon: FaClock, tone: 'default' };
                    }
                  };

                  const formatTimelineDate = (ts) => {
                    const d = new Date(ts);
                    if (Number.isNaN(d.getTime())) return '';
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const day = new Date(d);
                    day.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((today - day) / (1000 * 60 * 60 * 24));
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (diffDays === 0) return `Today · ${timeStr}`;
                    if (diffDays === 1) return `Yesterday · ${timeStr}`;
                    return `${formatDate(ts)} · ${timeStr}`;
                  };

                  const groupedByDate = finalActivities.reduce((acc, activity) => {
                    const key = dayKey(activity.timestamp) || 'unknown';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(activity);
                    return acc;
                  }, {});

                  const parseDayKey = (key) => {
                    if (!key || key === 'unknown') return new Date(0);
                    const [y, m, d] = key.split('-').map(Number);
                    return new Date(y, m, d);
                  };

                  const dateGroupOrder = Object.keys(groupedByDate).sort(
                    (a, b) => parseDayKey(b) - parseDayKey(a)
                  );

                  const formatDateGroupLabel = (key) => {
                    if (!key || key === 'unknown') return 'Activity';
                    const [y, m, d] = key.split('-').map(Number);
                    const date = new Date(y, m, d);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const day = new Date(date);
                    day.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((today - day) / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) return 'Today';
                    if (diffDays === 1) return 'Yesterday';
                    return date.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  };

                  return (
                    <div className="timeline-container">
                      {dateGroupOrder.map((dateKey) => (
                        <div key={dateKey} className="timeline-date-group">
                          <div className="timeline-date-label">{formatDateGroupLabel(dateKey)}</div>
                          {groupedByDate[dateKey].map((activity, index) => {
                            const { label, Icon, tone } = getActivityEventMeta(activity);
                            const userName = activity.user?.name || activity.user?.email || 'System';
                            return (
                        <div
                          key={`${activity.type}-${activity._id || activity.revisionNumber || activity.toStatus || ''}-${index}`}
                          className={`timeline-item timeline-item--${tone}`}
                        >
                          <div className="timeline-rail">
                            <span className="timeline-dot">
                              <Icon aria-hidden="true" />
                            </span>
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-card-top">
                              <span className={`timeline-event-badge timeline-event-badge--${tone}`}>
                                {label}
                              </span>
                              <span className="timeline-time">{formatTimelineDate(activity.timestamp)}</span>
                              {activity.type === 'comment' &&
                               (activity.user?._id === currentUser?._id ||
                                ['admin', 'superadmin', 'hr', 'manager'].includes(currentUser?.role)) && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="timeline-delete-btn p-0 ms-auto"
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
                                  <div className="timeline-status-flow">
                                    {activity.fromStatus ? (
                                      <>
                                        <Badge bg={getStatusColor(activity.fromStatus)} className="timeline-status-badge">
                                          {activity.fromStatus}
                                        </Badge>
                                        <span className="timeline-status-arrow">→</span>
                                      </>
                                    ) : null}
                                    <Badge bg={getStatusColor(activity.toStatus)} className="timeline-status-badge">
                                      {activity.toStatus}
                                    </Badge>
                                  </div>
                                  {activity.comment && (
                                    <div className="timeline-note-block timeline-note-block--info">
                                      {activity.comment}
                                    </div>
                                  )}
                                </div>
                              )}
                              {activity.type === 'creative_review' && (
                                <div className="status-change-info">
                                  <p className="timeline-summary mb-0">
                                    {activity.isChangeRequest ? (
                                      <>
                                        <Badge bg="warning" text="dark" className="me-1">
                                          {activity.severity && activity.severity !== 'none'
                                            ? activity.severity
                                            : activity.decision}
                                        </Badge>
                                        changes requested on{' '}
                                        <strong>Revision {activity.revisionNumber}</strong>
                                      </>
                                    ) : (
                                      <>
                                        <strong>Revision {activity.revisionNumber}</strong> approved for QA
                                      </>
                                    )}
                                  </p>
                                  {activity.notes && (
                                    <div className="timeline-note-block timeline-note-block--warning">
                                      {activity.notes}
                                    </div>
                                  )}
                                </div>
                              )}
                              {activity.type === 'creative_submit' && (
                                <p className="timeline-summary mb-0">
                                  <strong>Revision {activity.revisionNumber}</strong> submitted for review
                                </p>
                              )}
                              {activity.type === 'edit' && (
                                <div className="edit-info">
                                  <div className="mb-2">
                                    <strong style={{ fontSize: '0.9rem', color: '#d97706' }}>
                                      Edited {activity.fieldsChanged?.length || 0} field(s)
                                    </strong>
                                  </div>
                                  {activity.fieldsChanged && activity.fieldsChanged.length > 0 && (
                                    <div className="mb-2">
                                      <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '8px' }}>
                                        <strong>Changes:</strong>
                                      </div>
                                      {activity.fieldsChanged.map((field, idx) => {
                                        const change = activity.changes?.[field];
                                        
                                        // Helper function to format field values for display
                                        const formatFieldValue = (value, fieldName) => {
                                          if (!value) return '-';
                                          
                                          // Format dates
                                          if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('at')) {
                                            try {
                                              const date = new Date(value);
                                              if (!isNaN(date.getTime())) {
                                                return date.toLocaleDateString('en-US', { 
                                                  year: 'numeric', 
                                                  month: 'short', 
                                                  day: 'numeric'
                                                });
                                              }
                                            } catch (e) {
                                              // Fall through to default
                                            }
                                          }
                                          
                                          // Truncate long strings
                                          const str = String(value);
                                          return str.length > 50 ? str.substring(0, 50) + '...' : str;
                                        };
                                        
                                        // Skip if old and new values are the same
                                        const oldFormatted = formatFieldValue(change?.oldValue, field);
                                        const newFormatted = formatFieldValue(change?.newValue, field);
                                        
                                        if (oldFormatted === newFormatted) {
                                          return null;
                                        }
                                        
                                        return (
                                          <div key={idx} style={{
                                            fontSize: '0.85rem',
                                            padding: '8px',
                                            background: '#fef3c7',
                                            borderRadius: '4px',
                                            marginBottom: '6px',
                                            borderLeft: '3px solid #d97706'
                                          }}>
                                            <div style={{ fontWeight: '600', color: '#92400e' }}>
                                              {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                                            </div>
                                            {change && (
                                              <div style={{ color: '#78350f', marginTop: '4px' }}>
                                                <div>
                                                  <span style={{ color: '#991b1b' }}>From:</span> {oldFormatted}
                                                </div>
                                                <div>
                                                  <span style={{ color: '#15803d' }}>To:</span> {newFormatted}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }).filter(Boolean)}
                                    </div>
                                  )}
                                  {activity.reason && (
                                    <div className="mt-2 p-2" style={{
                                      background: '#f0fdf4',
                                      borderRadius: '6px',
                                      fontSize: '0.9rem',
                                      borderLeft: '3px solid #22c55e',
                                      color: '#166534'
                                    }}>
                                      <strong>Reason:</strong> {activity.reason}
                                    </div>
                                  )}
                                </div>
                              )}
                              {activity.type === 'comment' && (
                                <div className="timeline-comment-text">
                                  {renderMentions(activity.text)}
                                </div>
                              )}
                              {activity.type === 'created' && (
                                <p className="timeline-summary mb-0">Work item created</p>
                              )}
                            </div>
                            <div className="timeline-card-meta">{userName}</div>
                          </div>
                        </div>
                            );
                          })}
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

                {workItem.status === 'Cancelled' && workItem.cancellationReason && (
                  <Alert variant="danger" className="mt-2" style={{ borderRadius: '8px', fontSize: '0.9rem' }}>
                    <strong>Cancellation Reason:</strong> {workItem.cancellationReason}
                  </Alert>
                )}
                
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
                
                {isCreativeItem && workItem.status !== 'Cancelled' && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">Creative workflow status:</small>
                    <Badge bg={getCreativeStatusBadgeVariant(workItem.status)} className="px-3 py-2">
                      {workItem.status}
                    </Badge>
                    <small className="text-muted d-block mt-2">
                      Use the Creative Workflow panel above for all status changes (except Cancel via admin paths).
                    </small>
                  </div>
                )}

                {!isCreativeItem && canEdit() && workItem.status !== 'Cancelled' && (
                  <>
                    <div className="mb-2">
                      <small className="text-muted">Change status to:</small>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      {['To Do', 'In Progress', 'Done', 'Cancelled'].map((statusOption) => {
                        const userStatus = getUserStatus(workItem);
                        const isActive = userStatus === statusOption;
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
                                if (statusOption === 'Cancelled') {
                                  setShowCancelModal(true);
                                } else {
                                  handleStatusUpdate(statusOption);
                                }
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
                
                {!canEdit() && workItem.status !== 'Cancelled' && (
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
              </div>

              {/* Individual Assignee Statuses (for multiple assignees) */}
              {workItem.assignedToMultiple && workItem.assignedToMultiple.length > 1 && (
                <div className="mb-4">
                  <div className="p-3" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <div className="d-flex align-items-center mb-3">
                      <FaTasks className="me-2 text-info" />
                      <strong style={{ fontSize: '0.85rem', color: '#6c757d' }}>INDIVIDUAL STATUS</strong>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      {workItem.assignedToMultiple.map((assignee) => {
                        const assigneeStatus = workItem.assigneeStatuses?.find(
                          as => as.assigneeId?._id === assignee._id || as.assigneeId === assignee._id
                        );
                        const currentStatus = assigneeStatus?.status || workItem.status;
                        
                        return (
                          <div key={assignee._id} className="d-flex justify-content-between align-items-center">
                            <span style={{ fontSize: '0.9rem' }}>{assignee.name}</span>
                            <Badge bg={getStatusColor(currentStatus)}>
                              {currentStatus}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Key Information Grid */}
              <div className="row g-3 mb-4">
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

          <Tab eventKey="comments" title={`Comments (${comments?.filter(c => !c.isSystemComment && !c.text?.startsWith('Status changed'))?.length || 0})`}>
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
                {(() => {
                  // Filter out system comments (status changes)
                  // Check both isSystemComment flag and text pattern for backward compatibility
                  const userComments = comments.filter(comment => 
                    !comment.isSystemComment && !comment.text?.startsWith('Status changed')
                  );
                  
                  return userComments && userComments.length > 0 ? (
                    <>
                      <div className="d-flex align-items-center mb-3">
                        <div style={{ flex: 1, height: '1px', background: '#e3e6f0' }}></div>
                        <span className="px-3 text-muted" style={{ fontSize: '0.85rem' }}>
                          {userComments.length} comment{userComments.length !== 1 ? 's' : ''}
                        </span>
                        <div style={{ flex: 1, height: '1px', background: '#e3e6f0' }}></div>
                      </div>
                      
                      <div className="comments-container" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {userComments.map((comment, index) => (
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
                        Be the first to add a comment about this work item!
                      </p>
                    </div>
                  );
                })()}
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

      <Modal.Footer className="border-0 pb-4 pt-0">
        <Button variant="secondary" onClick={onHide} style={{ borderRadius: '20px', padding: '8px 24px' }}>
          Close
        </Button>
      </Modal.Footer>

    </Modal>

    {/* Cancellation Confirmation Modal */}
    <Modal
      show={showCancelModal}
      onHide={() => setShowCancelModal(false)}
      centered
      backdrop="static"
      size="md"
    >
      <Modal.Header closeButton style={{ background: '#dc3545', color: 'white' }}>
        <Modal.Title style={{ fontSize: '1.1rem' }}>Confirm Work Cancellation</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <p className="text-muted mb-4">
          Are you sure you want to cancel <strong>{workItem.title}</strong>?
          This action will be logged and requires a valid reason.
        </p>

        <Form.Group className="mb-3">
          <Form.Label className="fw-bold small text-uppercase text-muted">Cancellation Reason (Min 25 chars)</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="Explain why this work is being cancelled..."
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            style={{ borderRadius: '8px', resize: 'none' }}
            isInvalid={cancellationReason.trim().length > 0 && cancellationReason.trim().length < 25}
          />
          <Form.Control.Feedback type="invalid">
            Please provide at least 25 characters. Currently: {cancellationReason.trim().length} characters.
          </Form.Control.Feedback>
          <div className="text-end mt-1">
            <small className={cancellationReason.trim().length < 25 ? "text-danger" : "text-success"}>
              {cancellationReason.trim().length}/25 characters
            </small>
          </div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className="border-0 p-4 pt-0">
        <Button
          variant="outline-secondary"
          onClick={() => setShowCancelModal(false)}
          style={{ borderRadius: '20px', padding: '8px 20px' }}
        >
          Go Back
        </Button>
        <Button
          variant="danger"
          disabled={loading || cancellationReason.trim().length < 25}
          onClick={() => handleStatusUpdate('Cancelled', null, cancellationReason.trim())}
          style={{ borderRadius: '20px', padding: '8px 24px', fontWeight: '600' }}
        >
          {loading ? 'Processing...' : 'Confirm Cancellation'}
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
};

export default WorkItemDetailsModal;
