/**
 * Resolve profile picture URL for <img src>.
 * Prefer direct S3 URLs when the bucket allows public read (current production setup).
 * Fall back to the API proxy when direct load fails or the URL is not S3.
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
    const segment = url.split("/upload/profile-picture/")[1]?.split("?")[0];
    if (!segment) return null;
    const decoded = decodeURIComponent(segment);
    if (!decoded.includes("/") && !decoded.includes("..")) {
      return decoded;
    }
  }

  if (url.startsWith("profile-pictures/")) {
    return url.replace("profile-pictures/", "");
  }

  const s3Parts = url.split(".amazonaws.com/");
  if (s3Parts.length >= 2) {
    const path = decodeURIComponent(s3Parts[1].split("?")[0]);
    if (path.startsWith("profile-pictures/")) {
      return path.replace("profile-pictures/", "");
    }
    const idx = path.indexOf("profile-pictures/");
    if (idx !== -1) {
      return path.slice(idx + "profile-pictures/".length);
    }
  }

  return null;
};

/** Build backend proxy URL (fallback when direct S3 is blocked or fails) */
export const getProfilePictureProxyUrl = (url) => {
  const fileName = extractFileName(url);
  if (!fileName) return null;
  const base = getApiBaseUrl();
  return `${base}/upload/profile-picture/${encodeURIComponent(fileName)}`;
};

/**
 * Primary display URL — direct S3 first (public objects), proxy as fallback.
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
      return `${getApiBaseUrl()}/upload/profile-picture/${encodeURIComponent(fileName)}`;
    }
  }

  if (url.startsWith("profile-pictures/")) {
    return getProfilePictureProxyUrl(url);
  }

  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    return url.startsWith("/") ? url : `/${url}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }

  return null;
};

export default resolveProfilePictureUrl;
