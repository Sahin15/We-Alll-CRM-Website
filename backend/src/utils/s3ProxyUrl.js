/**
 * Extract profile-pictures/{fileName} key from S3 or proxy URL
 */
export const extractProfilePictureKey = (url) => {
  if (!url || typeof url !== "string") return null;

  if (url.includes("/upload/profile-picture/")) {
    const segment = url.split("/upload/profile-picture/")[1]?.split("?")[0];
    if (!segment || segment.includes("..")) return null;
    const decoded = decodeURIComponent(segment);
    return decoded.startsWith("profile-pictures/")
      ? decoded
      : `profile-pictures/${decoded}`;
  }

  if (url.startsWith("profile-pictures/")) {
    return url.split("?")[0];
  }

  const urlParts = url.split(".amazonaws.com/");
  if (urlParts.length < 2) return null;

  const fullPath = decodeURIComponent(urlParts[1].split("?")[0]);
  if (fullPath.startsWith("profile-pictures/")) {
    return fullPath;
  }

  const idx = fullPath.indexOf("profile-pictures/");
  if (idx !== -1) {
    return fullPath.slice(idx);
  }

  return null;
};

/**
 * Convert S3 URL to proxy URL for serving through backend
 * @param {string} s3Url - Full S3 URL or existing proxy URL
 * @param {string} apiBaseUrl - Backend API base URL (e.g. /api or http://host/api)
 */
export const convertS3UrlToProxyUrl = (s3Url, apiBaseUrl = "/api") => {
  if (!s3Url) return null;

  const base = apiBaseUrl.replace(/\/$/, "");

  if (s3Url.includes("/upload/profile-picture/")) {
    if (s3Url.startsWith("http://") || s3Url.startsWith("https://")) {
      return s3Url;
    }
    const fileName = s3Url.split("/upload/profile-picture/")[1]?.split("?")[0];
    return fileName ? `${base}/upload/profile-picture/${fileName}` : s3Url;
  }

  const key = extractProfilePictureKey(s3Url);
  if (key) {
    const fileName = key.replace("profile-pictures/", "");
    return `${base}/upload/profile-picture/${fileName}`;
  }

  return s3Url;
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
