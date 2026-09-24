import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import workItemApi from '../../api/workItemApi';
import creativeWorkflowApi from '../../api/creativeWorkflowApi';
import { useAuth } from '../../context/AuthContext';
import {
  assigneeQualifiesForCreativePosting,
  resolvePrimaryProjectCreativeDepartment,
} from '../../constants/departmentNames';
import {
  canSetPostingHandoff,
  isCreativeWorkflowItem,
  resolveEntityId,
} from '../../utils/creativeWorkflowAccess';
import { fetchPostingDepartmentUsers } from '../../utils/postingDepartmentUsers';
import { getCreativeStatusBadgeVariant } from '../../utils/workItemStatusUtils';

/** @param {string|{ _id?: string }} value */
const entityId = (value) => resolveEntityId(value);

/**
 * @param {object|null|undefined} item
 * @param {object|null|undefined} project
 * @returns {boolean}
 */
/**
 * @param {object|null|undefined} item
 * @param {object|null|undefined} projectProp
 * @returns {object|null}
 */
const resolveWorkItemProject = (item, projectProp) => {
  if (projectProp && typeof projectProp === 'object') return projectProp;
  if (item?.project && typeof item.project === 'object') return item.project;
  return null;
};

const workItemSupportsPostingHandoff = (item, projectProp) => {
  if (!item) return false;
  if (isCreativeWorkflowItem(item) || item.requiresPosting) return true;

  const project = resolveWorkItemProject(item, projectProp);
  if (resolvePrimaryProjectCreativeDepartment(project)) {
    return true;
  }

  const candidates = [];
  if (item.assignedTo) candidates.push(item.assignedTo);
  (item.assignedToMultiple || []).forEach((entry) => candidates.push(entry));

  return candidates.some((user) =>
    assigneeQualifiesForCreativePosting({
      user: typeof user === 'object' ? user : { _id: user },
      project,
    })
  );
};

const postingSnapshot = (item) => ({
  requiresPosting: Boolean(item?.requiresPosting),
  postingAssignedTo: entityId(item?.postingAssignedTo),
  postingDate: item?.postingDate
    ? new Date(item.postingDate).toISOString().slice(0, 10)
    : '',
});

/**
 * EditWorkItemModal — core fields + optional Posting department handoff (creative workflow).
 */
const EditWorkItemModal = ({ show, onHide, workItem, project, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [postingUsers, setPostingUsers] = useState([]);
  const [initialPosting, setInitialPosting] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedHours: '',
    editReason: '',
    requiresPosting: false,
    postingAssignedTo: '',
    postingDate: '',
  });
  const [editSummary, setEditSummary] = useState(null);

  const activeItem = detailItem || workItem;

  const resolvedProject = useMemo(
    () => resolveWorkItemProject(activeItem, project),
    [activeItem, project]
  );

  const showPostingSection = useMemo(
    () => workItemSupportsPostingHandoff(activeItem, resolvedProject),
    [activeItem, resolvedProject]
  );

  const canManagePosting = useMemo(
    () => canSetPostingHandoff(currentUser, activeItem, resolvedProject),
    [currentUser, activeItem, resolvedProject]
  );

  const postingLocked = useMemo(() => {
    const status = activeItem?.status;
    return (
      status === 'Posted' ||
      status === 'Closed' ||
      activeItem?.postingStatus === 'done' ||
      Boolean(activeItem?.postingSubmittedAt)
    );
  }, [activeItem]);

  useEffect(() => {
    if (!show || !workItem?._id) {
      setDetailItem(null);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);

    (async () => {
      try {
        const [itemRes, postingList] = await Promise.all([
          workItemApi.getWorkItemById(workItem._id),
          fetchPostingDepartmentUsers(),
        ]);
        if (cancelled) return;

        const full = itemRes.data || itemRes;
        setDetailItem(full);
        setPostingUsers(postingList);

        const posting = postingSnapshot(full);
        setInitialPosting(posting);
        setFormData({
          title: full.title || '',
          description: full.description || '',
          priority: full.priority?.toLowerCase() || 'medium',
          dueDate: full.dueDate
            ? new Date(full.dueDate).toISOString().split('T')[0]
            : '',
          estimatedHours: full.estimatedHours || '',
          editReason: '',
          requiresPosting: posting.requiresPosting,
          postingAssignedTo: posting.postingAssignedTo,
          postingDate: posting.postingDate,
        });
        setEditSummary(null);
      } catch (error) {
        console.error('Error loading work item for edit:', error);
        if (!cancelled) {
          toast.error('Failed to load work item details');
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [show, workItem?._id]);

  const postingHandoffChanged = () => {
    if (!initialPosting) return false;
    const next = {
      requiresPosting: formData.requiresPosting,
      postingAssignedTo: formData.requiresPosting ? formData.postingAssignedTo : '',
      postingDate: formData.requiresPosting ? formData.postingDate : '',
    };
    return (
      next.requiresPosting !== initialPosting.requiresPosting ||
      next.postingAssignedTo !== initialPosting.postingAssignedTo ||
      next.postingDate !== initialPosting.postingDate
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.dueDate) {
      toast.error('Please fill in title and due date');
      return;
    }

    if (
      showPostingSection &&
      canManagePosting &&
      !postingLocked &&
      formData.requiresPosting
    ) {
      if (!formData.postingAssignedTo || !formData.postingDate) {
        toast.error('Select a Posting team member and posting date');
        return;
      }
    }

    const handoffChanged = showPostingSection && canManagePosting && postingHandoffChanged();

    try {
      setLoading(true);

      const response = await workItemApi.editWorkItem(workItem._id, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate,
        estimatedHours: formData.estimatedHours
          ? parseInt(formData.estimatedHours, 10)
          : undefined,
        editReason: formData.editReason || undefined,
      });

      if (handoffChanged) {
        await creativeWorkflowApi.setPostingHandoff(workItem._id, {
          requiresPosting: formData.requiresPosting,
          postingAssignedTo: formData.requiresPosting
            ? formData.postingAssignedTo
            : null,
          postingDate: formData.requiresPosting ? formData.postingDate : null,
        });
      }

      const fieldChangeCount = response?.editSummary?.changeCount || 0;
      const hadFieldChanges = fieldChangeCount > 0;

      if (!hadFieldChanges && !handoffChanged) {
        toast.info('No changes to save');
        setLoading(false);
        return;
      }

      if (response?.editSummary) {
        setEditSummary(response.editSummary);
      }

      if (hadFieldChanges && handoffChanged) {
        toast.success(
          `Updated ${fieldChangeCount} field(s). Posting assignee will see this in My Work.`
        );
      } else if (handoffChanged) {
        toast.success('Posting handoff saved. The posting assignee will see this in My Work.');
      } else {
        toast.success(
          response?.editSummary
            ? `Work item updated (${fieldChangeCount} field(s) changed).`
            : 'Work item updated successfully!'
        );
      }

      setTimeout(() => {
        onHide();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (error) {
      console.error('Error updating work item:', error);
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.error ||
          'Failed to update work item'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header
        closeButton
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
        }}
      >
        <Modal.Title>✏️ Edit Work Item</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '1.5rem' }}>
        {loadingDetail && (
          <div className="text-center py-3 text-muted small">Loading work item…</div>
        )}

        {editSummary && (
          <Alert variant="success" className="mb-3">
            <strong>✓ Changes tracked</strong>
            <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
              Fields changed: {editSummary.fieldsChanged.join(', ')}
            </div>
          </Alert>
        )}

        {activeItem && isCreativeWorkflowItem(activeItem) && (
          <Alert variant="light" className="border mb-3 py-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-muted">Creative workflow:</span>
              <Badge bg={getCreativeStatusBadgeVariant(activeItem.status)}>
                {activeItem.status}
              </Badge>
              <span className="small text-muted">
                Use work item details for revisions, QA, and live post submission.
              </span>
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label><strong>Title *</strong></Form.Label>
            <Form.Control
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={loading || loadingDetail}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Description</strong></Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading || loadingDetail}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><strong>Priority *</strong></Form.Label>
                <Form.Select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  required
                  disabled={loading || loadingDetail}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><strong>Due Date *</strong></Form.Label>
                <Form.Control
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  required
                  disabled={loading || loadingDetail}
                />
                {showPostingSection && (
                  <Form.Text className="text-muted">
                    Creative due date — separate from posting go-live date below.
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label><strong>Estimated Hours</strong></Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) =>
                setFormData({ ...formData, estimatedHours: e.target.value })
              }
              disabled={loading || loadingDetail}
            />
          </Form.Group>

          {showPostingSection && (
            <div className="border rounded p-3 mb-3 bg-light">
              <div className="fw-semibold mb-2">Posting Department (optional)</div>
              {!canManagePosting && (
                <Alert variant="warning" className="py-2 small mb-2">
                  You can view posting handoff here; only the assigner, project head, or
                  department HoD can change it.
                </Alert>
              )}
              {postingLocked ? (
                <Alert variant="secondary" className="py-2 small mb-0">
                  Posting is complete for this task. Live links are on the work item
                  details view.
                </Alert>
              ) : (
                <>
                  <Form.Check
                    type="checkbox"
                    id="edit-requires-posting"
                    className="mb-2"
                    label="Assign to Posting department (We Alll will post this content)"
                    checked={formData.requiresPosting}
                    disabled={loading || loadingDetail || !canManagePosting || postingLocked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData({
                        ...formData,
                        requiresPosting: checked,
                        postingAssignedTo: checked ? formData.postingAssignedTo : '',
                        postingDate: checked ? formData.postingDate : '',
                      });
                    }}
                  />
                  {!formData.requiresPosting ? (
                    <Alert variant="secondary" className="py-2 small mb-0">
                      Not selected — client posts directly. You can enable posting later.
                    </Alert>
                  ) : (
                    <Row>
                      <Col md={6} className="mb-2">
                        <Form.Label className="fw-semibold small">
                          Posting team member *
                        </Form.Label>
                        <Form.Select
                          value={formData.postingAssignedTo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              postingAssignedTo: e.target.value,
                            })
                          }
                          disabled={
                            loading || loadingDetail || !canManagePosting || postingLocked
                          }
                        >
                          <option value="">Select Posting member…</option>
                          {postingUsers.map((u) => (
                            <option key={entityId(u._id)} value={entityId(u._id)}>
                              {u.name}
                            </option>
                          ))}
                        </Form.Select>
                        {postingUsers.length === 0 && (
                          <Form.Text className="text-warning">
                            No Posting department users found (HR → Departments).
                          </Form.Text>
                        )}
                      </Col>
                      <Col md={6} className="mb-2">
                        <Form.Label className="fw-semibold small">
                          Posting date *
                        </Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.postingDate}
                          onChange={(e) =>
                            setFormData({ ...formData, postingDate: e.target.value })
                          }
                          disabled={
                            loading || loadingDetail || !canManagePosting || postingLocked
                          }
                        />
                      </Col>
                    </Row>
                  )}
                  {canManagePosting && !postingLocked && (
                    <Form.Text className="text-muted d-block mt-2">
                      When you save, the selected posting member will see this task in My
                      Work.
                    </Form.Text>
                  )}
                </>
              )}
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>
              <strong>Why are you editing this?</strong>{' '}
              <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>(Optional)</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.editReason}
              onChange={(e) =>
                setFormData({ ...formData, editReason: e.target.value })
              }
              disabled={loading || loadingDetail}
            />
            <Form.Text className="text-muted">
              Visible in edit history for the team.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer style={{ background: '#f8f9fa', borderTop: '2px solid #e9ecef' }}>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || loadingDetail}
        >
          {loading ? 'Saving…' : '✓ Save Changes'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditWorkItemModal;
