import { useState, useRef } from "react";
import { Button, Spinner, Image } from "react-bootstrap";
import { FaCamera, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import "./ProfilePictureUpload.css";

const ProfilePictureUpload = ({ currentImage, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB. Please upload a smaller image.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
    await uploadProfilePicture(file);
  };

  const uploadProfilePicture = async (file) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("token");
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

      toast.success("Profile picture updated successfully!");
      if (onUploadSuccess) {
        onUploadSuccess(response.data.imageUrl);
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error(error.response?.data?.message || "Failed to upload profile picture");
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

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onUploadSuccess) {
      onUploadSuccess(null);
    }
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
            <Button
              size="sm"
              variant="outline-danger"
              onClick={handleRemove}
              disabled={uploading}
            >
              <FaTrash />
            </Button>
          )}
        </div>
      </div>

      <small className="text-muted d-block mt-2 text-center">
        JPG, PNG or WebP. Max 5MB.
      </small>
    </div>
  );
};

export default ProfilePictureUpload;
