import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Badge, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaFileAlt, FaClipboardList } from "react-icons/fa";
import { hiringRequestApi } from "../../api/hiringRequestApi";

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
      <h2 className="mb-4">Hiring Management</h2>
      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <Card.Title>Hiring Requests</Card.Title>
                  <Card.Text className="text-muted">
                    Review department head requests and run the hiring pipeline.
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
                Manage applicant profiles and resumes for open positions.
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
                Generate offer letters and onboard selected candidates.
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
    </Container>
  );
};

export default HiringDashboard;
