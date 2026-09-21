import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Modal,
  Form,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";
import { FaPlus, FaCalendarAlt, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import projectMonthApi from "../../../api/projectMonthApi";

/**
 * @param {string} monthKey - YYYY-MM
 * @returns {string}
 */
const getNextMonthKey = (monthKey) => {
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * @param {string} monthKey - YYYY-MM
 * @returns {string}
 */
const formatMonthKey = (monthKey) => {
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

const MODAL_COPY = {
  current: {
    title: (monthKey) => `Add Goal for ${formatMonthKey(monthKey)}`,
    label: "Goal *",
    placeholder: "e.g., Increase social media engagement rate by 25%",
    submit: "Add Goal",
    submitting: "Adding goal...",
    success: "Goal added successfully",
    requiredError: "Goal title is required",
    failure: "Failed to add goal",
  },
  next: {
    title: (monthKey) => `Add Objective for ${formatMonthKey(getNextMonthKey(monthKey))}`,
    label: "Objective *",
    placeholder: "e.g., Launch paid ads campaign for the new service line",
    submit: "Add Objective",
    submitting: "Adding objective...",
    success: "Objective added successfully",
    requiredError: "Objective title is required",
    failure: "Failed to add objective",
  },
};

const MonthlyGoalsSection = ({ project, canEdit }) => {
  const projectId = project?._id || project?.id;
  const now = new Date();
  const defaultMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultMonthKey);
  const [projectMonth, setProjectMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalType, setGoalType] = useState("current"); // "current" | "next"
  const [goalTitle, setGoalTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const modalCopy = MODAL_COPY[goalType] || MODAL_COPY.current;
  const nextMonthKey = getNextMonthKey(selectedMonthKey);

  const openEntryModal = (type) => {
    setGoalType(type);
    setGoalTitle("");
    setShowGoalModal(true);
  };

  const closeEntryModal = () => {
    setShowGoalModal(false);
    setGoalTitle("");
    setGoalType("current");
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectMonth();
    }
  }, [projectId, selectedMonthKey]);

  const fetchProjectMonth = async () => {
    try {
      setLoading(true);
      const res = await projectMonthApi.getOrCreateProjectMonth(
        projectId,
        selectedMonthKey
      );
      if (res.data && res.data.data) {
        setProjectMonth(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch project month:", error);
      toast.error("Failed to load monthly goals");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!projectMonth) return;
    try {
      const res = await projectMonthApi.updateProjectMonthGoals(projectMonth._id, {
        status: newStatus,
      });
      setProjectMonth(res.data.data);
      toast.success(`Month status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update month status");
    }
  };

  const handleSubmitReport = async () => {
    if (!projectMonth) return;
    if (!window.confirm("Submit monthly report? This will freeze execution metrics snapshot for the month.")) return;
    try {
      const res = await projectMonthApi.submitProjectMonthReport(projectMonth._id);
      setProjectMonth(res.data.data);
      toast.success("Monthly report submitted and snapshot frozen!");
    } catch (error) {
      toast.error("Failed to submit monthly report");
    }
  };

  const handleReviewReport = async () => {
    const comment = window.prompt("Enter management review comment (optional):");
    if (comment === null) return;
    try {
      const res = await projectMonthApi.reviewProjectMonthReport(projectMonth._id, { comment });
      setProjectMonth(res.data.data);
      toast.success("Management review recorded!");
    } catch (error) {
      toast.error("Failed to record review");
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      toast.error(modalCopy.requiredError);
      return;
    }
    if (!projectMonth?._id) {
      toast.error("Monthly record not loaded. Refresh and try again.");
      return;
    }

    setSaving(true);
    try {
      const newEntry =
        goalType === "current"
          ? { title: goalTitle.trim(), status: "open" }
          : { title: goalTitle.trim() };

      const updatedData =
        goalType === "current"
          ? { goals: [...(projectMonth.goals || []), newEntry] }
          : { nextMonthGoals: [...(projectMonth.nextMonthGoals || []), newEntry] };

      const res = await projectMonthApi.updateProjectMonthGoals(
        projectMonth._id,
        updatedData
      );
      setProjectMonth(res.data.data);
      toast.success(modalCopy.success);
      closeEntryModal();
    } catch (error) {
      console.error("Failed to add monthly entry:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          modalCopy.failure
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGoalStatusChange = async (index, newStatus, isNext = false) => {
    try {
      let updatedGoals = isNext
        ? [...(projectMonth.nextMonthGoals || [])]
        : [...(projectMonth.goals || [])];

      updatedGoals[index].status = newStatus;

      const payload = isNext
        ? { nextMonthGoals: updatedGoals }
        : { goals: updatedGoals };

      const res = await projectMonthApi.updateProjectMonthGoals(
        projectMonth._id,
        payload
      );
      setProjectMonth(res.data.data);
      toast.success("Goal status updated");
    } catch (error) {
      toast.error("Failed to update goal status");
    }
  };

  const handleRemoveGoal = async (index, isNext = false) => {
    try {
      let updatedGoals = isNext
        ? [...(projectMonth.nextMonthGoals || [])]
        : [...(projectMonth.goals || [])];

      updatedGoals.splice(index, 1);

      const payload = isNext
        ? { nextMonthGoals: updatedGoals }
        : { goals: updatedGoals };

      const res = await projectMonthApi.updateProjectMonthGoals(
        projectMonth._id,
        payload
      );
      setProjectMonth(res.data.data);
      toast.success("Goal removed");
    } catch (error) {
      toast.error("Failed to remove goal");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" variant="primary" />
        <span className="ms-2 text-muted">Loading monthly goals...</span>
      </div>
    );
  }

  const currentGoals = projectMonth?.goals || [];
  const nextGoals = projectMonth?.nextMonthGoals || [];

  return (
    <Card className="shadow-sm border-0 mb-4">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-3">
          <FaCalendarAlt className="text-primary" size={20} />
          <h5 className="mb-0 fw-bold">Monthly Strategy & Goals</h5>
          <Form.Control
            type="month"
            size="sm"
            style={{ width: "160px" }}
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
          />
        </div>
        {canEdit && (
          <div className="d-flex align-items-center gap-2">
            <Form.Select
              size="sm"
              value={projectMonth?.status || "draft"}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ width: "130px" }}
            >
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
            </Form.Select>
            {projectMonth?.status !== "submitted" && projectMonth?.status !== "reviewed" && (
              <Button variant="outline-success" size="sm" onClick={handleSubmitReport}>
                Submit Report
              </Button>
            )}
            {projectMonth?.status === "submitted" && (
              <Button variant="success" size="sm" onClick={handleReviewReport}>
                Review Report
              </Button>
            )}
          </div>
        )}
      </Card.Header>
      <Card.Body>
        <Row className="g-4">
          {/* Current Month Goals */}
          <Col md={6}>
            <div className="border rounded-3 p-3 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">
                  Goals for {formatMonthKey(selectedMonthKey)} ({currentGoals.length})
                </h6>
                {canEdit && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openEntryModal("current")}
                  >
                    <FaPlus className="me-1" /> Add Goal
                  </Button>
                )}
              </div>
              {currentGoals.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {currentGoals.map((g, idx) => (
                    <div
                      key={idx}
                      className="d-flex justify-content-between align-items-center bg-white p-2.5 rounded border"
                    >
                      <span className="fw-medium">{g.title}</span>
                      <div className="d-flex align-items-center gap-2">
                        <Form.Select
                          size="sm"
                          value={g.status || "open"}
                          onChange={(e) =>
                            handleGoalStatusChange(idx, e.target.value, false)
                          }
                          style={{ width: "120px", fontSize: "0.8rem" }}
                          disabled={!canEdit}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="achieved">Achieved</option>
                          <option value="partially_achieved">Partially</option>
                          <option value="missed">Missed</option>
                        </Form.Select>
                        {canEdit && (
                          <Button
                            variant="link"
                            className="text-danger p-0"
                            onClick={() => handleRemoveGoal(idx, false)}
                          >
                            <FaTrash size={12} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <small className="text-muted d-block py-3 text-center">
                  No monthly goals set for {formatMonthKey(selectedMonthKey)}.
                </small>
              )}
            </div>
          </Col>

          {/* Next Month Objectives */}
          <Col md={6}>
            <div className="border rounded-3 p-3 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">
                  Objectives for {formatMonthKey(nextMonthKey)} ({nextGoals.length})
                </h6>
                {canEdit && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openEntryModal("next")}
                  >
                    <FaPlus className="me-1" /> Add Objective
                  </Button>
                )}
              </div>
              {nextGoals.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {nextGoals.map((g, idx) => (
                    <div
                      key={idx}
                      className="d-flex justify-content-between align-items-center bg-white p-2.5 rounded border"
                    >
                      <span className="fw-medium">{g.title}</span>
                      {canEdit && (
                        <Button
                          variant="link"
                          className="text-danger p-0 ms-2"
                          onClick={() => handleRemoveGoal(idx, true)}
                        >
                          <FaTrash size={12} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <small className="text-muted d-block py-3 text-center">
                  No objectives planned yet for {formatMonthKey(nextMonthKey)}.
                </small>
              )}
            </div>
          </Col>
        </Row>
      </Card.Body>

      {/* Goal / Objective Modal */}
      <Modal
        key={`monthly-entry-${goalType}`}
        show={showGoalModal}
        onHide={closeEntryModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>{modalCopy.title(selectedMonthKey)}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddGoal}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{modalCopy.label}</Form.Label>
              <Form.Control
                type="text"
                required
                autoFocus
                placeholder={modalCopy.placeholder}
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
              {goalType === "next" && (
                <Form.Text className="text-muted">
                  This objective applies to {formatMonthKey(nextMonthKey)}, the month after{" "}
                  {formatMonthKey(selectedMonthKey)}.
                </Form.Text>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeEntryModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? modalCopy.submitting : modalCopy.submit}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default MonthlyGoalsSection;
