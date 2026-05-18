import { useState, useRef, useEffect } from "react";
import { Button, Spinner, Image, Modal } from "react-bootstrap";
import { FaCamera, FaTrash, FaCrop, FaSave, FaTimes, FaEye } from "react-icons/fa";
import toast from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "./ProfilePictureUpload.css";

const ProfilePictureUpload = ({ currentImage, onUploadSuccess }) => {
  const { refreshUser, user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const cropImageRef = useRef(null);
  const cropContainerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Update preview when user profile picture changes
  useEffect(() => {
    if (user?.profilePicture) {
      // Use the original URL first, only add cache-busting if needed
      const imageUrl = user.profilePicture;
      
      // Verify image accessibility before setting preview
      const img = document.createElement('img');
      img.onload = () => {
        console.log("Profile picture loaded successfully:", imageUrl);
        setPreview(imageUrl);
      };
      img.onerror = () => {
        console.warn("Profile picture failed to load, trying with cache-busting");
        
        // Try with cache-busting parameter
        const cacheBustedUrl = imageUrl.includes('?') 
          ? `${imageUrl}&t=${Date.now()}`
          : `${imageUrl}?t=${Date.now()}`;
        
        const retryImg = document.createElement('img');
        retryImg.onload = () => {
          console.log("Profile picture loaded with cache-busting:", cacheBustedUrl);
          setPreview(cacheBustedUrl);
        };
        retryImg.onerror = () => {
          console.error("Profile picture completely failed to load, clearing preview");
          setPreview(null);
          // Only clear broken image after multiple failures
          setTimeout(() => {
            if (user.profilePicture === imageUrl) {
              handleRemoveBrokenImage();
            }
          }, 5000); // Wait 5 seconds before clearing
        };
        retryImg.src = cacheBustedUrl;
      };
      img.src = imageUrl;
    } else {
      setPreview(null);
    }
  }, [user?.profilePicture]);

  // Set initial crop when image loads
  useEffect(() => {
    if (imageLoaded && cropImageRef.current && cropContainerRef.current) {
      const img = cropImageRef.current;
      const wrapper = img.parentElement;
      
      // Wait for next frame to ensure dimensions are available
      requestAnimationFrame(() => {
        if (img.offsetWidth > 0 && img.offsetHeight > 0) {
          // Calculate crop size as 60% of the smaller image dimension
          const imgWidth = img.offsetWidth;
          const imgHeight = img.offsetHeight;
          const size = Math.min(imgWidth, imgHeight) * 0.6;
          
          // Calculate the image's position within the wrapper (it's centered)
          const imgLeft = (wrapper.offsetWidth - imgWidth) / 2;
          const imgTop = (wrapper.offsetHeight - imgHeight) / 2;
          
          // Center the crop area on the image
          const x = imgLeft + (imgWidth - size) / 2;
          const y = imgTop + (imgHeight - size) / 2;
          
          setCrop({ x, y, width: size, height: size });
        }
        setImageLoaded(false); // Reset to prevent re-running
      });
    }
  }, [imageLoaded]);

  const handleFileSelect = (file) => {
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("❌ Invalid file type. Please upload JPG, PNG, or WebP image.", {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: 'white',
        },
      });
      return;
    }

    if (file.size > maxSize) {
      toast.error("❌ File too large. Please upload an image smaller than 10MB.", {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: 'white',
        },
      });
      return;
    }

    try {
      // Store file and show crop modal
      setSelectedFile(file);
      setImageLoaded(false); // Reset image loaded state
      const reader = new FileReader();
      
      reader.onload = () => {
        console.log("File read successfully");
        setImageSrc(reader.result);
        setShowCropModal(true);
      };
      
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast.error("Failed to read the selected file");
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error handling file selection:", error);
      toast.error("Failed to process the selected file");
    }
  };

  const createCroppedImage = () => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('Canvas ref not available');
        resolve(null);
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Canvas context not available');
        resolve(null);
        return;
      }
      
      const image = document.createElement('img');
      
      image.onload = () => {
        // Set canvas size to desired output size
        const outputSize = 400;
        canvas.width = outputSize;
        canvas.height = outputSize;
        
        // Get the displayed image dimensions from the crop modal
        const displayedImg = cropImageRef.current;
        if (!displayedImg) {
          resolve(null);
          return;
        }
        
        // Get the wrapper element
        const wrapper = displayedImg.parentElement;
        
        // Get the base image dimensions (without zoom)
        const baseImgWidth = displayedImg.offsetWidth;
        const baseImgHeight = displayedImg.offsetHeight;
        
        // The image is displayed at baseImgWidth x baseImgHeight but visually appears larger due to CSS zoom
        // Calculate the visual (zoomed) dimensions
        const visualImgWidth = baseImgWidth * zoom;
        const visualImgHeight = baseImgHeight * zoom;
        
        console.log('🖼️ Crop Debug Info:', {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          baseImgWidth: baseImgWidth,
          baseImgHeight: baseImgHeight,
          visualImgWidth: visualImgWidth,
          visualImgHeight: visualImgHeight,
          wrapperWidth: wrapper.offsetWidth,
          wrapperHeight: wrapper.offsetHeight,
          cropArea: crop,
          zoom: zoom
        });
        
        // Calculate the image's visual position within the wrapper (centered)
        const visualImgLeft = (wrapper.offsetWidth - visualImgWidth) / 2;
        const visualImgTop = (wrapper.offsetHeight - visualImgHeight) / 2;
        
        // Calculate crop coordinates relative to the visual (zoomed) image
        const cropRelativeX = Math.max(0, crop.x - visualImgLeft);
        const cropRelativeY = Math.max(0, crop.y - visualImgTop);
        
        // Ensure crop area doesn't exceed visual image bounds
        const maxCropWidth = Math.min(crop.width, visualImgWidth - cropRelativeX);
        const maxCropHeight = Math.min(crop.height, visualImgHeight - cropRelativeY);
        
        // Convert crop coordinates from visual display to natural image coordinates
        // Scale factor: natural image size / visual image size
        const scaleX = image.naturalWidth / visualImgWidth;
        const scaleY = image.naturalHeight / visualImgHeight;
        
        // Calculate final crop coordinates in natural image space
        const cropX = cropRelativeX * scaleX;
        const cropY = cropRelativeY * scaleY;
        const cropWidth = maxCropWidth * scaleX;
        const cropHeight = maxCropHeight * scaleY;
        
        console.log('🎯 Final Crop Coordinates:', {
          visualImgLeft,
          visualImgTop,
          visualImgWidth,
          visualImgHeight,
          cropRelativeX,
          cropRelativeY,
          maxCropWidth,
          maxCropHeight,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          scaleX,
          scaleY
        });
        
        // Clear canvas and draw cropped image
        ctx.clearRect(0, 0, outputSize, outputSize);
        
        console.log("🎨 Drawing on canvas with coordinates:", {
          sourceX: cropX,
          sourceY: cropY,
          sourceWidth: cropWidth,
          sourceHeight: cropHeight,
          destX: 0,
          destY: 0,
          destWidth: outputSize,
          destHeight: outputSize
        });
        
        // Draw the cropped portion of the image
        ctx.drawImage(
          image,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputSize,
          outputSize
        );
        
        // Convert to blob with high quality
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.98);
      };
      
      image.onerror = () => {
        console.error('Failed to load image for cropping');
        resolve(null);
      };
      
      image.src = imageSrc;
    });
  };

  const handleCropSave = async () => {
    if (!selectedFile) {
      toast.error('❌ No file selected for cropping', {
        duration: 3000,
        style: {
          background: '#EF4444',
          color: 'white',
        },
      });
      return;
    }

    try {
      console.log("Starting crop save process...");
      const croppedBlob = await createCroppedImage();
      
      if (!croppedBlob) {
        toast.error('Failed to crop image');
        return;
      }
      
      console.log("Image cropped successfully, creating file...");
      console.log("Cropped blob size:", croppedBlob.size);
      
      const croppedFile = new File([croppedBlob], selectedFile.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      
      console.log("Cropped file created:", {
        name: croppedFile.name,
        size: croppedFile.size,
        type: croppedFile.type
      });
      
      // Create preview to verify the crop worked correctly
      const reader = new FileReader();
      reader.onload = () => {
        // Temporarily set preview to show what we actually cropped
        setPreview(reader.result);
        
        // Create a temporary image to verify dimensions
        const tempImg = document.createElement('img');
        tempImg.onload = () => {
        };
        tempImg.src = reader.result;
      };
      reader.onerror = (error) => {
        console.error("Error creating preview:", error);
      };
      reader.readAsDataURL(croppedFile);
      
      // Upload cropped image
      console.log("Uploading cropped image...");
      await uploadProfilePicture(croppedFile);
      setShowCropModal(false);
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error(`❌ Failed to crop image: ${error.message}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: 'white',
        },
      });
    }
  };

  const uploadProfilePicture = async (file) => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found. Please login again.");
        return;
      }
      
      console.log("Uploading profile picture...", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const response = await axios.post(
        `${API_BASE_URL}/upload/profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Show success message with custom styling
      toast.success("✅ Profile picture updated successfully!", {
        duration: 3000,
        style: {
          background: '#10B981',
          color: 'white',
        },
      });
      
      // Update preview immediately with the uploaded image URL
      if (response.data.imageUrl) {
        setPreview(response.data.imageUrl);
      }
      
      // Refresh user data from server with a delay to ensure DB is updated
      setTimeout(async () => {
        try {
          await refreshUser();
          
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        } catch (refreshError) {
          console.error("Error refreshing user data:", refreshError);
          // Still call onUploadSuccess even if refresh fails
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        }
      }, 2000); // 2 second delay to ensure S3 and DB propagation
      
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      
      let errorMessage = "Failed to upload profile picture";
      if (error.response?.status === 413) {
        errorMessage = "File too large. Please choose an image smaller than 10MB.";
      } else if (error.response?.status === 415) {
        errorMessage = "Invalid file type. Please use JPG, PNG, or WebP.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(`❌ ${errorMessage}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: 'white',
        },
      });
      
      setPreview(currentImage); // Revert to original
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = async () => {
    if (!window.confirm('🗑️ Remove Profile Picture\n\nAre you sure you want to permanently remove your profile picture? This action cannot be undone.')) {
      return;
    }

    try {
      setUploading(true);
      
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await axios.delete(
        `${API_BASE_URL}/upload/profile-picture`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Show success message with icon
      toast.success("✅ Profile picture removed successfully!", {
        duration: 3000,
        style: {
          background: '#10B981',
          color: 'white',
        },
      });
      
      // Clear preview and file input immediately
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Refresh user data from server
      setTimeout(async () => {
        try {
          await refreshUser();
          if (onUploadSuccess) {
            onUploadSuccess();
          }
        } catch (refreshError) {
          console.error("Error refreshing user data:", refreshError);
        }
      }, 500);
      
    } catch (error) {
      console.error("Error removing profile picture:", error);
      
      let errorMessage = "Failed to remove profile picture";
      if (error.response?.status === 404) {
        errorMessage = "Profile picture not found";
      } else if (error.response?.status === 403) {
        errorMessage = "Permission denied. Please try logging in again.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(`❌ ${errorMessage}`, {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: 'white',
        },
      });
    } finally {
      setUploading(false);
    }
  };

  const handleViewPicture = () => {
    setShowViewModal(true);
  };

  const handleRemoveBrokenImage = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Call backend to clear broken profile picture URL
      await axios.patch(
        `${API_BASE_URL}/users/clear-broken-profile-picture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      console.log("Broken profile picture URL cleared from database");
      await refreshUser();
    } catch (error) {
      console.error("Error clearing broken profile picture:", error);
    }
  };

  const handleDragStart = (clientX, clientY) => {
    setIsDragging(true);
    
    // Get the wrapper element that contains the image
    const wrapperElement = cropImageRef.current.parentElement;
    const wrapperRect = wrapperElement.getBoundingClientRect();
    
    // Calculate the offset from the mouse position to the crop area's top-left corner
    const offsetX = clientX - wrapperRect.left - crop.x;
    const offsetY = clientY - wrapperRect.top - crop.y;
    
    const handleMouseMove = (moveEvent) => {
      if (!cropImageRef.current) return;
      
      const currentWrapperRect = wrapperElement.getBoundingClientRect();
      const img = cropImageRef.current;
      
      // Calculate new position relative to the wrapper
      let newX = moveEvent.clientX - currentWrapperRect.left - offsetX;
      let newY = moveEvent.clientY - currentWrapperRect.top - offsetY;
      
      // Get the base image dimensions (without zoom effect)
      const baseImgWidth = img.offsetWidth;
      const baseImgHeight = img.offsetHeight;
      
      // Calculate the visual (zoomed) dimensions
      const visualImgWidth = baseImgWidth * zoom;
      const visualImgHeight = baseImgHeight * zoom;
      
      // Calculate the visual image's position within the wrapper (it's centered)
      const visualImgLeft = (wrapperElement.offsetWidth - visualImgWidth) / 2;
      const visualImgTop = (wrapperElement.offsetHeight - visualImgHeight) / 2;
      
      // Constrain the crop area to stay within the visual image bounds
      newX = Math.max(visualImgLeft, Math.min(newX, visualImgLeft + visualImgWidth - crop.width));
      newY = Math.max(visualImgTop, Math.min(newY, visualImgTop + visualImgHeight - crop.height));
      
      setCrop(prev => ({ ...prev, x: newX, y: newY }));
    };
    
    const handleTouchMove = (touchEvent) => {
      if (touchEvent.touches.length === 1) {
        const touch = touchEvent.touches[0];
        handleMouseMove({
          clientX: touch.clientX,
          clientY: touch.clientY
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleMouseUp);
  };

  return (
    <div className="profile-picture-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div className="profile-picture-container">
        <div className="profile-picture-wrapper">
          {preview ? (
            <Image
              src={preview}
              alt="Profile"
              roundedCircle
              className="profile-picture"
              style={{ cursor: 'pointer' }}
              onClick={handleViewPicture}
              title="Click to view profile picture"
            />
          ) : (
            <div className="profile-picture-placeholder">
              <FaCamera size={40} className="text-muted" />
            </div>
          )}

          {uploading && (
            <div className="profile-picture-overlay">
              <Spinner animation="border" variant="light" size="sm" />
            </div>
          )}
        </div>

        <div className="profile-picture-actions">
          <Button
            size="sm"
            variant="primary"
            onClick={handleClick}
            disabled={uploading}
          >
            <FaCamera className="me-2" />
            {preview ? "Change" : "Upload"}
          </Button>
          {preview && (
            <>
              <Button
                size="sm"
                variant="outline-info"
                onClick={handleViewPicture}
                disabled={uploading}
                title="View Profile Picture"
              >
                <FaEye />
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                onClick={handleRemove}
                disabled={uploading}
                title="Remove Profile Picture"
              >
                <FaTrash />
              </Button>
            </>
          )}
        </div>
      </div>

      <small className="text-muted d-block mt-2 text-center">
        JPG, PNG or WebP. Max 10MB.
      </small>

      {/* Image Crop Modal */}
      <Modal show={showCropModal} onHide={() => setShowCropModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCrop className="me-2" />
            Crop Profile Picture
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-3">
            <small className="text-muted">
              Drag the square to reposition and use the slider to zoom. The cropped area will be your profile picture.
            </small>
          </div>
          
          {imageSrc && (
            <div className="crop-container" ref={cropContainerRef}>
              <div className="image-crop-wrapper">
                <img loading="lazy" ref={cropImageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  className="crop-image"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    display: 'block',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    userSelect: 'none'
                  }}
                  onLoad={() => {
                    setTimeout(() => setImageLoaded(true), 100);
                  }}
                  draggable={false}
                />
                <div
                  className={`crop-overlay ${isDragging ? 'dragging' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${crop.x}px`,
                    top: `${crop.y}px`,
                    width: `${crop.width}px`,
                    height: `${crop.height}px`,
                    border: '3px solid #007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    borderRadius: '8px'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleDragStart(e.clientX, e.clientY);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    if (e.touches.length === 1) {
                      const touch = e.touches[0];
                      handleDragStart(touch.clientX, touch.clientY);
                    }
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#007bff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    pointerEvents: 'none'
                  }}>
                    Drag to move
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <label className="form-label small">Zoom: {zoom.toFixed(1)}x</label>
                <input
                  type="range"
                  className="form-range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
              </div>
              
              <div className="mt-2">
                <small className="text-muted">
                  • Drag the square to reposition the crop area<br/>
                  • Use the zoom slider to adjust the image size<br/>
                  • The cropped area will be your profile picture
                </small>
              </div>
            </div>
          )}
          
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCropModal(false)}>
            <FaTimes className="me-2" />
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCropSave} disabled={uploading}>
            {uploading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Save & Upload
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

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
            Profile Picture
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          {preview ? (
            <div className="profile-view-container">
              <Image
                src={preview}
                alt="Profile Picture"
                className="profile-view-image"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '15px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                }}
              />
              <div className="mt-3">
                <small className="text-muted">
                  Your current profile picture
                </small>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <FaCamera size={48} className="text-muted mb-3" />
              <p className="text-muted">No profile picture available</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => {
            setShowViewModal(false);
            handleClick();
          }}>
            <FaCamera className="me-2" />
            Change Picture
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProfilePictureUpload;
