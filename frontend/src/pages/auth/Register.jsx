import { Link } from "react-router-dom";
import { Card, Alert } from "react-bootstrap";

const Register = () => {
  return (
    <Card style={{ width: "500px", maxWidth: "100%" }} className="shadow">
      <Card.Body className="p-5">
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">We Alll Office</h2>
          <p className="text-muted">Registration Disabled</p>
        </div>

        <Alert variant="info">
          <Alert.Heading>Registration Not Available</Alert.Heading>
          <p className="mb-0">
            Public registration is disabled. New accounts can only be created by administrators or HR personnel.
          </p>
          <hr />
          <p className="mb-0">
            If you need an account, please contact your administrator or HR department.
          </p>
        </Alert>

        <div className="text-center mt-4">
          <span className="text-muted">Already have an account? </span>
          <Link to="/login" className="text-decoration-none">
            Sign in
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
};

export default Register;
