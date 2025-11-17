import { useState, useRef } from "react";
import { Form, Button, Image, Spinner, Alert } from "react-bootstrap";
import { FaCloudUploadAlt, FaTrash, FaCheckCircle } from "react-icons/fa";
import axios from "axios";
import "./ImageUpload.css";

const ImageUpload = ({ onUploadSuccess, onUploadError, existingImage = null }) => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(existingImage);
  const [preview, setPreview] = useState(existingImage);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Validate file
  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Please upload JPG, PNG, or WebP image.";
    }

    if (file.size > maxSize) {
      return "File size exceeds 5MB. Please upload a smaller image.";
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onUploadError) onUploadError(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to S3
    await uploadToS3(file);
  };

  // Upload to S3
  const uploadToS3 = async (file) => {
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/upload/payment-proof`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setImageUrl(response.data.imageUrl);
      if (onUploadSuccess) {
        onUploadSuccess(response.data.imageUrl);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to upload image";
      setError(errorMessage);
      setPreview(null);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle remove image
  const handleRemove = () => {
    setImageUrl(null);
    setPreview(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onUploadSuccess) {
      onUploadSuccess(null);
    }
  };

  // Handle click on upload area
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="image-upload-container">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {!preview ? (
        <div
          className={`upload-area ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {uploading ? (
            <div className="upload-loading">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Uploading image...</p>
            </div>
          ) : (
            <div className="upload-prompt">
              <FaCloudUploadAlt size={48} className="text-primary mb-3" />
              <h5>Upload Payment Proof</h5>
              <p className="text-muted">
                Drag and drop your image here, or click to browse
              </p>
              <p className="text-muted small">
                Supported: JPG, PNG, WebP (Max 5MB)
              </p>
              <Button variant="primary" size="sm" className="mt-2">
                Choose File
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="preview-container">
          <div className="preview-image-wrapper">
            <Image src={preview} alt="Payment Proof" thumbnail className="preview-image" />
            {imageUrl && (
              <div className="upload-success-badge">
                <FaCheckCircle className="text-success" /> Uploaded
              </div>
            )}
          </div>
          <div className="preview-actions">
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <FaTrash className="me-2" />
              Remove
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleClick}
              disabled={uploading}
            >
              Change Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
