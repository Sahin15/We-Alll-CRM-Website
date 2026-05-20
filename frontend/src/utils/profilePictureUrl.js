/**
 * Resolve profile picture URL for <img src>.
 * Prefer direct S3 URLs (bucket is public-read). Use API proxy only when needed.
 */

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  if (import.meta.env.PROD) {
    return "/api";
  }
  return "http://localhost:5000/api";
};

const extractFileName = (url) => {
  if (!url) return null;

  if (url.includes("/upload/profile-picture/")) {
    const fileName = url.split("/upload/profile-picture/")[1]?.split("?")[0];
    if (fileName && !fileName.includes("/") && !fileName.includes("..")) {
      return fileName;
    }
  }

  const s3Parts = url.split(".amazonaws.com/");
  if (s3Parts.length >= 2) {
    const path = decodeURIComponent(s3Parts[1].split("?")[0]);
    if (path.startsWith("profile-pictures/")) {
      return path.replace("profile-pictures/", "");
    }
  }

  return null;
};

/** Build backend proxy URL (fallback when S3 direct load fails) */
export const getProfilePictureProxyUrl = (url) => {
  const fileName = extractFileName(url);
  if (!fileName) return null;
  const base = getApiBaseUrl();
  return `${base}/upload/profile-picture/${fileName}`;
};

/**
 * Primary display URL — use S3 directly since objects are public-read.
 */
export const resolveProfilePictureUrl = (url) => {
  if (!url || url === "null") return null;

  if (url.includes(".amazonaws.com")) {
    return url;
  }

  if (url.includes("/upload/profile-picture/")) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const fileName = extractFileName(url);
    if (fileName) {
      return `${getApiBaseUrl()}/upload/profile-picture/${fileName}`;
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }

  return null;
};

export default resolveProfilePictureUrl;
