import fs from "fs";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { AWS_CONFIG } from "../../config/awsConfig.js";
import { v4 as uuidv4 } from "uuid";

/**
 * @typedef {Object} StoredDocumentResult
 * @property {string} url - Public or app-relative URL for the document
 * @property {'s3'|'local'} provider
 * @property {string} key - S3 object key or local relative path (posix-style)
 * @property {string} localPath - Absolute path on disk (always present after store)
 * @property {string} localRelativePath - Path like /uploads/...
 * @property {Date} generatedAt
 * @property {string|null} generatedBy
 * @property {number} version
 * @property {boolean} fallbackUsed - true when S3 was skipped or failed
 * @property {string|null} uploadError - diagnostic message when S3 failed
 */

/**
 * Whether AWS credentials and bucket appear configured for uploads.
 * @returns {boolean}
 */
export function isS3Configured() {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET_NAME || AWS_CONFIG.bucketName;
  return Boolean(accessKey && secretKey && bucket);
}

/**
 * Write a buffer to a local uploads path.
 * @param {Buffer} buffer
 * @param {string} absolutePath
 */
function writeLocalFile(buffer, absolutePath) {
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(absolutePath, buffer);
}

/**
 * Attempt S3 PutObject. Throws on failure.
 * @param {Buffer} buffer
 * @param {string} key
 * @param {string} mimeType
 * @param {string} originalName
 * @returns {Promise<string>} S3 HTTPS URL
 */
async function uploadBufferToS3(buffer, key, mimeType, originalName) {
  const command = new PutObjectCommand({
    Bucket: AWS_CONFIG.bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: {
      originalName: String(originalName || "").substring(0, 100),
      uploadedAt: new Date().toISOString(),
    },
  });
  await s3Client.send(command);
  return `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
}

/**
 * Store a generated document: prefer S3 when configured, always keep a local copy,
 * and fall back to local URL if S3 is unavailable or upload fails.
 * Never throws solely because of a remote upload failure when local write succeeds.
 *
 * @param {Object} params
 * @param {Buffer} params.buffer
 * @param {string} params.fileName - basename e.g. report.pdf
 * @param {string} [params.mimeType='application/pdf']
 * @param {string} [params.folder='documents'] - S3 folder prefix
 * @param {string} [params.localSubdir='uploads/documents'] - under process.cwd()
 * @param {string|null} [params.generatedBy=null] - user id string
 * @param {number} [params.version=1]
 * @param {string} [params.stableLocalName] - if set, use this exact local filename (no uuid)
 * @returns {Promise<StoredDocumentResult>}
 */
export async function storeGeneratedDocument({
  buffer,
  fileName,
  mimeType = "application/pdf",
  folder = "documents",
  localSubdir = "uploads/documents",
  generatedBy = null,
  version = 1,
  stableLocalName = null,
}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("storeGeneratedDocument requires a non-empty Buffer");
  }

  const generatedAt = new Date();
  const safeBase =
    stableLocalName ||
    fileName.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 80) ||
    `document-${Date.now()}.bin`;

  const localFileName = stableLocalName || safeBase;
  const absoluteLocalPath = path.join(process.cwd(), localSubdir, localFileName);
  writeLocalFile(buffer, absoluteLocalPath);

  const localRelativePath = `/${localSubdir.replace(/\\/g, "/")}/${localFileName}`.replace(
    /\/+/g,
    "/"
  );
  // Normalize to /uploads/...
  const normalizedLocalUrl = localRelativePath.startsWith("/")
    ? localRelativePath
    : `/${localRelativePath}`;

  /** @type {StoredDocumentResult} */
  const localResult = {
    url: normalizedLocalUrl,
    provider: "local",
    key: normalizedLocalUrl.replace(/^\//, ""),
    localPath: absoluteLocalPath,
    localRelativePath: normalizedLocalUrl,
    generatedAt,
    generatedBy: generatedBy || null,
    version: Number(version) || 1,
    fallbackUsed: true,
    uploadError: null,
  };

  if (!isS3Configured()) {
    console.warn(
      "[documentStorage] S3 not configured — using local storage",
      { fileName: localFileName, folder, localPath: absoluteLocalPath }
    );
    return localResult;
  }

  const s3Key = `${folder}/${Date.now()}-${uuidv4()}-${safeBase}`;

  try {
    const s3Url = await uploadBufferToS3(buffer, s3Key, mimeType, fileName);
    return {
      url: s3Url,
      provider: "s3",
      key: s3Key,
      localPath: absoluteLocalPath,
      localRelativePath: normalizedLocalUrl,
      generatedAt,
      generatedBy: generatedBy || null,
      version: Number(version) || 1,
      fallbackUsed: false,
      uploadError: null,
    };
  } catch (error) {
    const message = error?.message || String(error);
    console.error("[documentStorage] S3 upload failed — falling back to local", {
      fileName: localFileName,
      folder,
      s3Key,
      bucket: AWS_CONFIG.bucketName,
      region: AWS_CONFIG.region,
      error: message,
      stack: error?.stack,
    });
    return {
      ...localResult,
      fallbackUsed: true,
      uploadError: message,
    };
  }
}

/**
 * Map a store result onto a common pdfStorage metadata shape.
 * @param {StoredDocumentResult} stored
 * @returns {{ provider: string, key: string, path: string, generatedAt: Date, generatedBy: string|null, version: number }}
 */
export function toStorageMetadata(stored) {
  return {
    provider: stored.provider,
    key: stored.key,
    path: stored.localRelativePath,
    generatedAt: stored.generatedAt,
    generatedBy: stored.generatedBy,
    version: stored.version,
  };
}

export default {
  isS3Configured,
  storeGeneratedDocument,
  toStorageMetadata,
};
