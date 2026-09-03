/**
 * Extract S3 object key from a virtual-hosted-style S3 URL.
 * @param {string} url
 * @returns {string|null}
 */
export const extractS3KeyFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  const urlParts = url.split(".amazonaws.com/");
  if (urlParts.length < 2) return null;

  return decodeURIComponent(urlParts[1].split("?")[0]);
};

export default extractS3KeyFromUrl;
