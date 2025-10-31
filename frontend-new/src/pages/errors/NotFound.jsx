import { Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Container className="text-center" style={{ paddingTop: "100px" }}>
      <h1 style={{ fontSize: "120px", fontWeight: "bold" }}>404</h1>
      <h2 className="mb-4">Page Not Found</h2>
      <p className="text-muted mb-4">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button variant="primary" onClick={() => navigate("/dashboard")}>
        <FaHome className="me-2" />
        Go to Dashboard
      </Button>
    </Container>
  );
};

export default NotFound;
