import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Card,
  Table,
  Button,
  Badge,
  Form,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaEye } from "react-icons/fa";
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

const HiringRequestsManagement = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await hiringRequestApi.list(params);
      setRequests(res.data || []);
    } catch {
      toast.error("Failed to load hiring requests");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Hiring Requests</h2>
        <Button variant="outline-secondary" onClick={() => navigate("/hr/hiring")}>
          Back to Hiring
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <div className="d-flex flex-wrap gap-3 mb-3">
            <InputGroup style={{ maxWidth: 280 }}>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <Form.Select
              style={{ maxWidth: 200 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In progress</option>
              <option value="on_hold">On hold</option>
              <option value="filled">Filled</option>
              <option value="hr_rejected">Rejected</option>
            </Form.Select>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Headcount</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Raised by</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      No hiring requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r._id}>
                      <td>{r.requestNumber}</td>
                      <td>{r.department?.name || "—"}</td>
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
                      <td>{r.raisedBy?.name || "—"}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => navigate(`/hr/hiring/requests/${r._id}`)}
                        >
                          <FaEye />
                        </Button>
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

export default HiringRequestsManagement;
