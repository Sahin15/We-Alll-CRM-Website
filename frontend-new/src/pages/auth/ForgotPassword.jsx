import { Card } from "react-bootstrap";

const ForgotPassword = () => {
  return (
    <Card style={{ width: "400px", maxWidth: "100%" }} className="shadow">
      <Card.Body className="p-5">
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">Forgot Password</h2>
          <p className="text-muted">Reset your password</p>
        </div>
        <p className="text-muted text-center">
          Password reset form coming soon...
        </p>
      </Card.Body>
    </Card>
  );
};

export default ForgotPassword;
