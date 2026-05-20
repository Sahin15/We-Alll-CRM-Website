import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaEdit, FaPaperPlane } from "react-icons/fa";
import { toast } from "react-toastify";
import { hiringRequestApi } from "../../api/hiringRequestApi";

const STATUS_VARIANT = {
  draft: "secondary",
  submitted: "warning",
  hr_approved: "info",
  hr_rejected: "danger",
  on_hold: "secondary",
  in_progress: "primary",
  filled: "success",
  cancelled: "dark",
};

const HoDHiringRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hiringRequestApi.list();
      setRequests(res.data || []);
    } catch {
      toast.error("Failed to load hiring requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (id) => {
    try {
      setSubmittingId(id);
      await hiringRequestApi.submit(id);
      toast.success("Request submitted to HR");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Hiring Requests</h2>
        <Button variant="primary" onClick={() => navigate("/hod/hiring/requests/new")}>
          <FaPlus className="me-2" />
          New request
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Role</th>
                  <th>Headcount</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>HR notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No hiring requests yet
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r._id}>
                      <td>{r.requestNumber}</td>
                      <td>{r.designation}</td>
                      <td>
                        {r.filledCount || 0} / {r.headcount}
                      </td>
                      <td>
                        <Badge
                          bg={
                            r.urgency === "high"
                              ? "danger"
                              : r.urgency === "medium"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {r.urgency}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={STATUS_VARIANT[r.status] || "secondary"}>
                          {r.status?.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td>{r.hrNotes || r.rejectionReason || "—"}</td>
                      <td>
                        {r.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-1"
                              onClick={() =>
                                navigate(`/hod/hiring/requests/new?edit=${r._id}`)
                              }
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              disabled={submittingId === r._id}
                              onClick={() => handleSubmit(r._id)}
                            >
                              <FaPaperPlane />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HoDHiringRequests;
