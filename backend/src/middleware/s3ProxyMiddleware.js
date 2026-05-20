/**
 * Profile pictures use public S3 URLs stored in the database.
 * Proxy conversion is handled on the frontend only as a fallback if direct S3 fails.
 */
export const s3ProxyMiddleware = (_req, _res, next) => {
  next();
};

export default s3ProxyMiddleware;
