import { Container, Card } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";

const MyProfile = () => {
  const { user } = useAuth();

  return (
    <Container fluid>
      <h2 className="mb-4">My Profile</h2>
      <Card>
        <Card.Body>
          <p>
            <strong>Name:</strong> {user?.name}
          </p>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>Role:</strong> {user?.role}
          </p>
          <p className="text-muted mt-4">Profile editing coming soon...</p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MyProfile;
