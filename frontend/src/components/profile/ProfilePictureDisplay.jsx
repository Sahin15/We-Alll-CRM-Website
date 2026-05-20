import { useState, useMemo, useEffect } from "react";
import { Image, Modal, Button } from "react-bootstrap";
import { FaUser, FaEye } from "react-icons/fa";
import {
  resolveProfilePictureUrl,
  getProfilePictureProxyUrl,
} from "../../utils/profilePictureUrl";
import "./ProfilePictureUpload.css";

const ProfilePictureDisplay = ({ 
  profilePicture, 
  userName = "User", 
  size = 120, 
  showViewButton = true,
  className = "",
  style = {}
}) => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [useProxyFallback, setUseProxyFallback] = useState(false);

  const imageSrc = useMemo(() => {
    if (!profilePicture || profilePicture === "null") return null;
    if (useProxyFallback) {
      return getProfilePictureProxyUrl(profilePicture) || resolveProfilePictureUrl(profilePicture);
    }
    return resolveProfilePictureUrl(profilePicture);
  }, [profilePicture, useProxyFallback]);

  useEffect(() => {
    setImageError(false);
    setUseProxyFallback(false);
  }, [profilePicture]);

  const handleImageError = () => {
    if (!useProxyFallback && getProfilePictureProxyUrl(profilePicture)) {
      setUseProxyFallback(true);
      setImageError(false);
      return;
    }
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const handleViewPicture = () => {
    if (imageSrc && !imageError) {
      setShowViewModal(true);
    }
  };

  return (
    <>
      <div className={`profile-picture-display ${className}`} style={style}>
        <div className="profile-picture-container">
          <div 
            className="profile-picture-wrapper-dynamic"
            style={{ 
              width: size, 
              height: size,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {imageSrc && !imageError ? (
              <Image
                src={imageSrc}
                alt={`${userName}'s profile`}
                roundedCircle
                className="profile-picture-dynamic"
                style={{ 
                  width: size, 
                  height: size, 
                  cursor: showViewButton ? 'pointer' : 'default',
                  objectFit: 'cover',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onClick={showViewButton ? handleViewPicture : undefined}
                onError={handleImageError}
                onLoad={handleImageLoad}
                title={showViewButton ? "Click to view profile picture" : undefined}
              />
            ) : (
              <div 
                className="profile-picture-placeholder-dynamic"
                style={{ 
                  width: size, 
                  height: size,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8f9fa',
                  border: '2px solid #dee2e6',
                  borderRadius: '50%',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                }}
              >
                {userName ? (
                  <span 
                    style={{ 
                      fontSize: size * 0.4, 
                      fontWeight: 'bold',
                      color: '#6c757d'
                    }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <FaUser size={size * 0.4} className="text-muted" />
                )}
              </div>
            )}
          </div>

          {showViewButton && imageSrc && !imageError && (
            <div className="profile-picture-actions mt-2">
              <Button
                size="sm"
                variant="outline-info"
                onClick={handleViewPicture}
                title="View Profile Picture"
              >
                <FaEye className="me-1" />
                View
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* View Profile Picture Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)} 
        size="lg" 
        centered
        className="profile-view-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaEye className="me-2" />
            {userName}'s Profile Picture
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          {imageSrc && !imageError ? (
            <div className="profile-view-container">
              <Image
                src={imageSrc}
                alt={`${userName}'s Profile Picture`}
                className="profile-view-image"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '15px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                }}
                onError={handleImageError}
              />
              <div className="mt-3">
                <small className="text-muted">
                  {userName}'s profile picture
                </small>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <FaUser size={48} className="text-muted mb-3" />
              <p className="text-muted">No profile picture available</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProfilePictureDisplay;