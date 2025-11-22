import { Container, Card, Row, Col } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import ProfilePictureUpload from "../../components/profile/ProfilePictureUpload";
import ProfilePictureDebug from "../../components/debug/ProfilePictureDebug";

const MyProfile = () => {
  const { user, refreshUser } = useAuth();

  const handleProfilePictureUpdate = async (imageUrl) => {
    console.log("🔄 Profile picture updated, refreshing user data...");
    // Refresh user data from server
    await refreshUser();
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">My Profile</h2>
      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Body className="text-center">
              <ProfilePictureUpload
                currentImage={user?.profilePicture}
                onUploadSuccess={handleProfilePictureUpdate}
              />
              <h5 className="mt-3 mb-1">{user?.name}</h5>
              <p className="text-muted mb-0">{user?.email}</p>
              <span className="badge bg-primary text-capitalize mt-2">
                {user?.role}
              </span>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Profile Information</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={6}>
                  <p className="mb-1">
                    <strong>Name:</strong>
                  </p>
                  <p className="text-muted">{user?.name || "N/A"}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1">
                    <strong>Email:</strong>
                  </p>
                  <p className="text-muted">{user?.email || "N/A"}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <p className="mb-1">
                    <strong>Role:</strong>
                  </p>
                  <p className="text-muted text-capitalize">{user?.role || "N/A"}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1">
                    <strong>Department:</strong>
                  </p>
                  <p className="text-muted">{user?.department?.name || "N/A"}</p>
                </Col>
              </Row>
              {user?.phone && (
                <Row className="mb-3">
                  <Col md={6}>
                    <p className="mb-1">
                      <strong>Phone:</strong>
                    </p>
                    <p className="text-muted">{user.phone}</p>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
          
          {/* Debug Component - Remove in production */}
          <ProfilePictureDebug />
        </Col>
      </Row>
    </Container>
  );
};

export default MyProfile;
