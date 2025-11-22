import { Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaExclamationTriangle } from "react-icons/fa";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Container className="text-center" style={{ paddingTop: "100px" }}>
      <FaExclamationTriangle size={100} className="text-warning mb-4" />
      <h1>403 - Unauthorized Access</h1>
      <p className="text-muted mb-4">
        You don't have permission to access this page.
      </p>
      <Button variant="primary" onClick={() => navigate("/dashboard")}>
        Go to Dashboard
      </Button>
    </Container>
  );
};

export default Unauthorized;
