import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaFileAlt, FaClipboardList, FaRoute } from "react-icons/fa";
import { hiringRequestApi } from "../../api/hiringRequestApi";
import HiringPipelineFlow from "../../components/hr/HiringPipelineFlow";

const HiringDashboard = () => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hiringRequestApi
      .pendingCount()
      .then((r) => setPendingCount(r.data?.count || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container fluid className="py-4">
      <h2 className="mb-2">Hiring Management</h2>
      <p className="text-muted mb-4">
        Run hiring requests from department heads through CV bank, interviews, offers, and onboarding.
      </p>

      <Card className="mb-4 border-primary">
        <Card.Body>
          <div className="d-flex align-items-center gap-2 mb-2">
            <FaRoute className="text-primary" />
            <Card.Title className="mb-0 h5">Interview pipeline</Card.Title>
          </div>
          <Card.Text className="text-muted mb-3">
            Each candidate moves through these stages. Open a request, go to the{" "}
            <strong>Interview Pipeline</strong> tab, then click <strong>Track</strong> to schedule
            interviews and record remarks.
          </Card.Text>
          <HiringPipelineFlow />
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <Card.Title>Hiring Requests</Card.Title>
                  <Card.Text className="text-muted">
                    Review HoD requests, approve, and manage the interview pipeline per role.
                  </Card.Text>
                </div>
                {!loading && pendingCount > 0 && (
                  <Badge bg="warning" text="dark">
                    {pendingCount} pending
                  </Badge>
                )}
              </div>
              <Button
                variant="primary"
                className="mt-3"
                onClick={() => navigate("/hr/hiring/requests")}
              >
                <FaClipboardList className="me-2" />
                View requests
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>CV Bank</Card.Title>
              <Card.Text className="text-muted">
                Add applicants with CV details, then link them to an open hiring request pipeline.
              </Card.Text>
              <Button
                variant="outline-primary"
                className="mt-3"
                onClick={() => navigate("/hr/hiring/applicants")}
              >
                <FaFileAlt className="me-2" />
                Open CV bank
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Offer Letters</Card.Title>
              <Card.Text className="text-muted">
                After a candidate is selected in the pipeline, generate an offer and convert to employee.
              </Card.Text>
              <Button
                variant="outline-secondary"
                className="mt-3"
                onClick={() => navigate("/hr/offers")}
              >
                <FaUserPlus className="me-2" />
                Offer letters
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {loading && (
        <div className="text-center mt-4">
          <Spinner animation="border" size="sm" />
        </div>
      )}

      {!loading && pendingCount === 0 && (
        <Alert variant="info" className="mt-4 mb-0">
          No pending HoD requests right now. To test the interview pipeline: ask a HoD to submit a
          request, approve it here, add an applicant from the CV bank, then use{" "}
          <strong>Interview Pipeline → Track</strong> on the request detail page.
        </Alert>
      )}
    </Container>
  );
};

export default HiringDashboard;
