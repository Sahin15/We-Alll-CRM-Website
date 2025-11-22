import { useAuth } from "../../context/AuthContext";
import { Card, Button } from "react-bootstrap";

const ProfilePictureDebug = () => {
  const { user, refreshUser } = useAuth();

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    await refreshUser();
  };

  const checkLocalStorage = () => {
    const storedUser = localStorage.getItem("user");
    console.log("📦 LocalStorage user:", storedUser);
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      console.log("📦 Parsed user:", parsed);
      console.log("📦 Profile picture in localStorage:", parsed.profilePicture);
    }
  };

  return (
    <Card className="mt-3">
      <Card.Header>
        <strong>🐛 Profile Picture Debug Info</strong>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <strong>User Context Data:</strong>
          <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify({
              name: user?.name,
              email: user?.email,
              profilePicture: user?.profilePicture,
              hasProfilePicture: !!user?.profilePicture,
            }, null, 2)}
          </pre>
        </div>

        <div className="mb-3">
          <strong>Profile Picture URL:</strong>
          <div style={{ wordBreak: 'break-all', fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {user?.profilePicture || "No profile picture"}
          </div>
        </div>

        {user?.profilePicture && (
          <div className="mb-3">
            <strong>Image Preview:</strong>
            <div>
              <img 
                src={user.profilePicture} 
                alt="Profile" 
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
                onError={(e) => {
                  console.error("❌ Image failed to load:", user.profilePicture);
                  e.target.style.border = '2px solid red';
                }}
                onLoad={() => {
                  console.log("✅ Image loaded successfully");
                }}
              />
            </div>
          </div>
        )}

        <div className="d-flex gap-2">
          <Button size="sm" variant="primary" onClick={handleRefresh}>
            🔄 Refresh User Data
          </Button>
          <Button size="sm" variant="secondary" onClick={checkLocalStorage}>
            📦 Check LocalStorage
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProfilePictureDebug;
