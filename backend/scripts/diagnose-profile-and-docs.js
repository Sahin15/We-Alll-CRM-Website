/**
 * Diagnose profile picture accessibility and document upload paths
 * Usage: node backend/scripts/diagnose-profile-and-docs.js
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import s3Client, { AWS_CONFIG } from "../src/config/awsConfig.js";
import { extractProfilePictureKey } from "../src/utils/s3ProxyUrl.js";
import { extractS3KeyFromUrl } from "../src/utils/s3KeyUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
const User = (await import("../src/models/userModel.js")).default;
const Document = (await import("../src/models/documentModel.js")).default;

console.log("\n=== AWS config ===");
console.log("Bucket:", AWS_CONFIG.bucketName);
console.log("Region:", AWS_CONFIG.region);

const withPic = await User.find({
  profilePicture: { $exists: true, $ne: null, $ne: "" },
}).select("name email profilePicture isActive role");

const activeUsers = await User.find({ isActive: { $ne: false } }).select(
  "name email profilePicture role"
);

const activeMissing = activeUsers.filter((u) => !u.profilePicture);

console.log("\n=== Profile pictures ===");
console.log("Users with profilePicture URL in DB:", withPic.length);
console.log("Active users without any profilePicture:", activeMissing.length);

const headResults = [];
const sdkResults = [];

for (const u of withPic) {
  let headStatus = "?";
  try {
    const res = await fetch(u.profilePicture, {
      method: "HEAD",
      signal: AbortSignal.timeout(12000),
    });
    headStatus = res.ok ? "OK" : `HTTP ${res.status}`;
  } catch (e) {
    headStatus = `ERR ${e.message}`;
  }

  const key = extractProfilePictureKey(u.profilePicture);
  let sdkStatus = "no-key";
  if (key) {
    try {
      await s3Client.send(
        new GetObjectCommand({ Bucket: AWS_CONFIG.bucketName, Key: key })
      );
      sdkStatus = "OK";
    } catch (e) {
      sdkStatus = e.name || e.message;
    }
  }

  headResults.push({ name: u.name, headStatus, url: u.profilePicture });
  sdkResults.push({ name: u.name, sdkStatus, key });
}

const headFail = headResults.filter((r) => !r.headStatus.startsWith("OK"));
const sdkFail = sdkResults.filter((r) => r.sdkStatus !== "OK");

console.log("\nDirect S3 URL (public HEAD):");
console.log("  OK:", headResults.length - headFail.length);
console.log("  Fail:", headFail.length);
if (headFail.length) {
  headFail.forEach((r) => {
    console.log(`    - ${r.name}: ${r.headStatus}`);
    console.log(`      ${r.url}`);
  });
}

console.log("\nBackend SDK GetObject (proxy path):");
console.log("  OK:", sdkResults.filter((r) => r.sdkStatus === "OK").length);
console.log("  Fail:", sdkFail.length);
if (sdkFail.length) {
  sdkFail.slice(0, 10).forEach((r) => {
    console.log(`    - ${r.name}: ${r.sdkStatus} key=${r.key || "n/a"}`);
  });
}

if (activeMissing.length) {
  console.log("\nActive users with NO profile picture in DB (never uploaded or cleared):");
  activeMissing.forEach((u) => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));
}

console.log("\n=== Documents (My Profile uploads) ===");
const docs = await Document.find({ isOfficial: false })
  .sort({ createdAt: -1 })
  .limit(30)
  .populate("userId", "name email")
  .lean();

console.log("Recent personal documents:", docs.length);

let docHeadOk = 0;
let docHeadFail = 0;
let docPutTest = null;

for (const doc of docs.slice(0, 10)) {
  if (!doc.path?.startsWith("https://")) {
    console.log(`  - ${doc.userId?.name}: LOCAL PATH (legacy) ${doc.path}`);
    continue;
  }
  try {
    const res = await fetch(doc.path, { method: "HEAD", signal: AbortSignal.timeout(10000) });
    if (res.ok) docHeadOk++;
    else {
      docHeadFail++;
      console.log(`  - ${doc.userId?.name} ${doc.category}: S3 HEAD ${res.status}`);
    }
  } catch (e) {
    docHeadFail++;
    console.log(`  - ${doc.userId?.name} ${doc.category}: HEAD error ${e.message}`);
  }
}

console.log(`S3 document HEAD sample: OK=${docHeadOk} Fail=${docHeadFail}`);

try {
  const testKey = `documents/diagnostic-${Date.now()}.txt`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: testKey,
      Body: Buffer.from("diagnostic"),
      ContentType: "text/plain",
    })
  );
  docPutTest = "PutObject OK";
} catch (e) {
  docPutTest = `PutObject FAIL: ${e.name} - ${e.message}`;
}
console.log("S3 upload permission test:", docPutTest);

const pdfDocs = await Document.countDocuments({
  mimetype: "application/pdf",
  isOfficial: false,
});
console.log("Total PDF personal documents in DB:", pdfDocs);

await mongoose.disconnect();
console.log("\nDone.\n");
