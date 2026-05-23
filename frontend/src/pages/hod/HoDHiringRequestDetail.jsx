import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  Badge,
  Button,
  Table,
  Spinner,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
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

const STAGE_VARIANT = {
  sourced: "secondary",
  shortlisted: "info",
  selected: "success",
  rejected: "danger",
  withdrawn: "dark",
};

const HoDHiringRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hiringRequestApi.get(id);
      setRequest(res.data?.request || res.data);
      setApplications(res.data?.applications || []);
    } catch {
      toast.error("Failed to load hiring request");
      navigate("/hod/hiring/requests");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const stageCounts = useMemo(() => {
    const counts = {};
    applications.forEach((app) => {
      const stage = app.stage || "unknown";
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [applications]);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!request) return null;

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">{request.requestNumber}</h2>
          <p className="text-muted mb-0">
            {request.department?.name} — {request.designation}
          </p>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate("/hod/hiring/requests")}>
          Back
        </Button>
      </div>

      <Badge bg={STATUS_VARIANT[request.status] || "secondary"} className="mb-4">
        {request.status?.replace(/_/g, " ")}
      </Badge>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h6>Requirement</h6>
              <p className="mb-0">
                <strong>Employment:</strong> {request.employmentType}
                <br />
                <strong>Headcount:</strong> {request.filledCount || 0} / {request.headcount}
                <br />
                <strong>Urgency:</strong> {request.urgency}
                <br />
                <strong>Skills:</strong> {request.skills || "—"}
                <br />
                <strong>Experience:</strong> {request.experienceRange || "—"}
              </p>
              <p className="mt-3 mb-0">
                <strong>Justification:</strong>
                <br />
                {request.justification}
              </p>
              {request.jobDescription && (
                <p className="mt-3 mb-0">
                  <strong>Job description:</strong>
                  <br />
                  {request.jobDescription}
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <h6>HR review</h6>
              <p className="mb-0">
                {request.reviewedBy && (
                  <>
                    <strong>Reviewed by:</strong> {request.reviewedBy?.name}
                    <br />
                  </>
                )}
                {request.hrNotes ? (
                  <>
                    <strong>HR notes:</strong> {request.hrNotes}
                  </>
                ) : request.rejectionReason ? (
                  <>
                    <strong>Rejection reason:</strong> {request.rejectionReason}
                  </>
                ) : (
                  <span className="text-muted">No HR notes yet</span>
                )}
              </p>
            </Card.Body>
          </Card>
          <Card className="mt-3">
            <Card.Body>
              <h6>Pipeline summary</h6>
              {applications.length === 0 ? (
                <p className="text-muted mb-0">No candidates in pipeline yet</p>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {Object.entries(stageCounts).map(([stage, count]) => (
                    <Badge key={stage} bg={STAGE_VARIANT[stage] || "secondary"}>
                      {stage}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header>
          <h6 className="mb-0">Candidates ({applications.length})</h6>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Stage</th>
                <th>Offer</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No candidates yet
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id}>
                    <td>{app.applicant?.name || "—"}</td>
                    <td>{app.applicant?.email || "—"}</td>
                    <td>
                      <Badge bg={STAGE_VARIANT[app.stage] || "secondary"}>
                        {app.stage}
                      </Badge>
                    </td>
                    <td>
                      {app.offerId?.offerNumber || "—"}
                      {app.offerId?.status && (
                        <Badge bg="light" text="dark" className="ms-1">
                          {app.offerId.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HoDHiringRequestDetail;
