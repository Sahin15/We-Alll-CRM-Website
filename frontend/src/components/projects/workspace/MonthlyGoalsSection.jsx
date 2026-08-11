import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Badge,
  Modal,
  Form,
  Table,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";
import { FaPlus, FaCalendarAlt, FaEdit, FaCheckCircle, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import projectMonthApi from "../../../api/projectMonthApi";

const MonthlyGoalsSection = ({ project, canEdit }) => {
  const projectId = project?._id || project?.id;
  const now = new Date();
  const defaultMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultMonthKey);
  const [projectMonth, setProjectMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalType, setGoalType] = useState("current"); // "current" or "next"
  const [goalTitle, setGoalTitle] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      toast.error("Goal title is required");
      return;
    }

    setSaving(true);
    try {
      const newGoal = {
        title: goalTitle.trim(),
        status: "open",
      };

      let updatedData = {};
      if (goalType === "current") {
        updatedData.goals = [...(projectMonth.goals || []), newGoal];
      } else {
        updatedData.nextMonthGoals = [
          ...(projectMonth.nextMonthGoals || []),
          newGoal,
        ];
      }

      const res = await projectMonthApi.updateProjectMonthGoals(
        projectMonth._id,
        updatedData
      );
      setProjectMonth(res.data.data);
      toast.success("Goal added successfully");
      setShowGoalModal(false);
      setGoalTitle("");
    } catch (error) {
      toast.error("Failed to add goal");
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
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </Form.Select>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setGoalType("current");
                setShowGoalModal(true);
              }}
            >
              <FaPlus className="me-1" /> Add Goal
            </Button>
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
                  Goals for {selectedMonthKey} ({currentGoals.length})
                </h6>
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
                  No monthly goals set for {selectedMonthKey}.
                </small>
              )}
            </div>
          </Col>

          {/* Next Month Objectives */}
          <Col md={6}>
            <div className="border rounded-3 p-3 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-dark">
                  Next Month Objectives ({nextGoals.length})
                </h6>
                {canEdit && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      setGoalType("next");
                      setShowGoalModal(true);
                    }}
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
                  No next month objectives planned yet.
                </small>
              )}
            </div>
          </Col>
        </Row>
      </Card.Body>

      {/* Goal Modal */}
      <Modal show={showGoalModal} onHide={() => setShowGoalModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {goalType === "current"
              ? `Add Goal for ${selectedMonthKey}`
              : "Add Next Month Objective"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddGoal}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Goal / Objective *</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g., Increase social media engagement rate by 25%"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowGoalModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Goal"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default MonthlyGoalsSection;
