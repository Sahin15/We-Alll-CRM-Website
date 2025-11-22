import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login({ email, password });
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: "400px", maxWidth: "100%" }} className="shadow">
      <Card.Body className="p-5">
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">CRM System</h2>
          <p className="text-muted">Sign in to your account</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <Form.Check type="checkbox" label="Remember me" />
            <Link to="/forgot-password" className="text-decoration-none">
              Forgot password?
            </Link>
          </div>

          <Button
            variant="primary"
            type="submit"
            className="w-100 mb-3"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          {/* Registration disabled - Only admins can add users */}
          {/* <div className="text-center">
            <span className="text-muted">Don't have an account? </span>
            <Link to="/register" className="text-decoration-none">
              Sign up
            </Link>
          </div> */}
        </Form>
      </Card.Body>
    </Card>
  );
};

export default Login;
