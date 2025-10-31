import { Container, Card } from "react-bootstrap";
import { useParams } from "react-router-dom";

const UserDetails = () => {
  const { id } = useParams();

  return (
    <Container fluid>
      <h2 className="mb-4">User Details</h2>
      <Card>
        <Card.Body>
          <p>User ID: {id}</p>
          <p className="text-muted">User details page coming soon...</p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UserDetails;
