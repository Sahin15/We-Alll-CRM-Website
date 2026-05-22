import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const awsRegion = process.env.AWS_REGION || "us-east-1";
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsBucketName = process.env.AWS_S3_BUCKET_NAME || "crm-payment-proofs";

if (!awsAccessKeyId || !awsSecretAccessKey) {
  console.warn(
    "[AWS S3] Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY — uploads will fail until configured."
  );
}

// AWS S3 Configuration (no ACL — buckets with Object Ownership enforced reject ACLs)
const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

export const AWS_CONFIG = {
  bucketName: awsBucketName,
  region: awsRegion,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"],
};

export default s3Client;
