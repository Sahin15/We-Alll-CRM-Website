import { convertS3UrlToProxyUrl } from "../utils/s3ProxyUrl.js";

/**
 * Middleware to convert S3 URLs to proxy URLs in API responses
 * This allows serving profile pictures through the backend when S3 bucket is not publicly accessible
 */
export const s3ProxyMiddleware = (req, res, next) => {
  // Store the original json method
  const originalJson = res.json;

  // Override the json method
  res.json = function (data) {
    // Convert S3 URLs to proxy URLs
    const convertedData = convertProfilePictureUrls(data);
    
    // Call the original json method with converted data
    return originalJson.call(this, convertedData);
  };

  next();
};

/**
 * Recursively convert S3 URLs to proxy URLs in an object
 * @param {any} data - Data to convert
 * @param {Set} visited - Set of visited objects to prevent circular references
 * @returns {any} - Converted data
 */
function convertProfilePictureUrls(data, visited = new Set()) {
  if (!data) return data;

  // Prevent circular references and infinite recursion
  if (typeof data === 'object') {
    if (visited.has(data)) {
      return data;
    }
    visited.add(data);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => convertProfilePictureUrls(item, visited));
  }

  // Handle plain objects only (not Mongoose documents, ObjectIds, Dates, etc.)
  if (typeof data === 'object' && data.constructor === Object) {
    const converted = {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];

        // Convert profilePicture fields
        if (key === 'profilePicture' && typeof value === 'string') {
          converted[key] = convertS3UrlToProxyUrl(value);
        }
        // Recursively convert nested objects and arrays
        else if (typeof value === 'object' && value !== null) {
          converted[key] = convertProfilePictureUrls(value, visited);
        }
        // Copy other values as is
        else {
          converted[key] = value;
        }
      }
    }
    
    return converted;
  }

  // Return primitive values and special objects (Mongoose docs, ObjectIds, Dates) as is
  return data;
}

export default s3ProxyMiddleware;
