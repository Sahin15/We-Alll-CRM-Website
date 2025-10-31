import { Card } from "react-bootstrap";
import { useParams } from "react-router-dom";

const ResetPassword = () => {
  const { token } = useParams();

  return (
    <Card style={{ width: "400px", maxWidth: "100%" }} className="shadow">
      <Card.Body className="p-5">
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">Reset Password</h2>
          <p className="text-muted">Enter your new password</p>
        </div>
        <p className="text-muted text-center">Token: {token}</p>
        <p className="text-muted text-center">
          Password reset form coming soon...
        </p>
      </Card.Body>
    </Card>
  );
};

export default ResetPassword;
