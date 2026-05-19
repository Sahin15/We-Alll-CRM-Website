/**
 * Convert S3 URL to proxy URL for serving through backend
 * This is useful when S3 bucket is not publicly accessible
 * 
 * @param {string} s3Url - Full S3 URL
 * @param {string} apiBaseUrl - Backend API base URL (default: /api)
 * @returns {string} - Proxy URL
 */
export const convertS3UrlToProxyUrl = (s3Url, apiBaseUrl = "/api") => {
  if (!s3Url) return null;
  
  // If it's already a proxy URL, return as is
  if (s3Url.includes("/api/upload/profile-picture/")) {
    return s3Url;
  }
  
  // Extract the file name from S3 URL
  // Format: https://bucket.s3.region.amazonaws.com/profile-pictures/filename
  const urlParts = s3Url.split(".amazonaws.com/");
  if (urlParts.length < 2) {
    return s3Url; // Return original if not a valid S3 URL
  }
  
  const fullPath = urlParts[1]; // e.g., "profile-pictures/1768313646964-8b5f35ca-d660-45ba-b0ec-3650f82b02f8.png"
  const pathParts = fullPath.split("/");
  
  if (pathParts[0] === "profile-pictures" && pathParts[1]) {
    const fileName = pathParts[1];
    return `${apiBaseUrl}/upload/profile-picture/${fileName}`;
  }
  
  return s3Url; // Return original if format doesn't match
};

/**
 * Check if a URL is an S3 URL
 * @param {string} url - URL to check
 * @returns {boolean} - True if it's an S3 URL
 */
export const isS3Url = (url) => {
  return url && url.includes(".amazonaws.com");
};

export default convertS3UrlToProxyUrl;
