import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import fs from "fs";
import path from "path";
import os from "os";

const mockSend = jest.fn();

jest.unstable_mockModule("../src/config/awsConfig.js", () => ({
  default: { send: mockSend },
  AWS_CONFIG: {
    bucketName: "test-bucket",
    region: "us-east-1",
    maxFileSize: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  },
}));

const { isS3Configured, storeGeneratedDocument, toStorageMetadata } =
  await import("../src/services/storage/documentStorageService.js");

describe("documentStorageService", () => {
  let tmpDir;
  let prevCwd;
  let envBackup;

  beforeEach(() => {
    mockSend.mockReset();
    envBackup = {
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    };
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "doc-storage-"));
    prevCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env.AWS_ACCESS_KEY_ID = envBackup.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = envBackup.AWS_SECRET_ACCESS_KEY;
    process.env.AWS_S3_BUCKET_NAME = envBackup.AWS_S3_BUCKET_NAME;
  });

  it("reports S3 configured only when credentials exist", () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    expect(isS3Configured()).toBe(false);

    process.env.AWS_ACCESS_KEY_ID = "AKIATEST";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_S3_BUCKET_NAME = "test-bucket";
    expect(isS3Configured()).toBe(true);
  });

  it("falls back to local when S3 is not configured", async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    const buffer = Buffer.from("%PDF-1.4 test");
    const result = await storeGeneratedDocument({
      buffer,
      fileName: "slip.pdf",
      folder: "salary-slips",
      localSubdir: "uploads/salary-slips",
      stableLocalName: "slip.pdf",
      generatedBy: "user-1",
      version: 2,
    });

    expect(result.provider).toBe("local");
    expect(result.fallbackUsed).toBe(true);
    expect(result.url).toBe("/uploads/salary-slips/slip.pdf");
    expect(fs.existsSync(result.localPath)).toBe(true);
    expect(toStorageMetadata(result)).toMatchObject({
      provider: "local",
      version: 2,
      generatedBy: "user-1",
    });
  });

  it("uses S3 URL when upload succeeds", async () => {
    process.env.AWS_ACCESS_KEY_ID = "AKIATEST";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_S3_BUCKET_NAME = "test-bucket";
    mockSend.mockResolvedValue({});

    const buffer = Buffer.from("%PDF-1.4 s3");
    const result = await storeGeneratedDocument({
      buffer,
      fileName: "slip.pdf",
      folder: "salary-slips",
      localSubdir: "uploads/salary-slips",
      stableLocalName: "slip.pdf",
    });

    expect(mockSend).toHaveBeenCalled();
    expect(result.provider).toBe("s3");
    expect(result.fallbackUsed).toBe(false);
    expect(result.url).toContain("test-bucket.s3.us-east-1.amazonaws.com");
    expect(fs.existsSync(result.localPath)).toBe(true);
  });

  it("falls back to local when S3 upload throws", async () => {
    process.env.AWS_ACCESS_KEY_ID = "AKIATEST";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_S3_BUCKET_NAME = "test-bucket";
    mockSend.mockRejectedValue(new Error("AccessDenied"));

    const buffer = Buffer.from("%PDF-1.4 fail");
    const result = await storeGeneratedDocument({
      buffer,
      fileName: "slip.pdf",
      folder: "salary-slips",
      localSubdir: "uploads/salary-slips",
      stableLocalName: "slip-fail.pdf",
    });

    expect(result.provider).toBe("local");
    expect(result.fallbackUsed).toBe(true);
    expect(result.uploadError).toMatch(/AccessDenied/);
    expect(result.url).toBe("/uploads/salary-slips/slip-fail.pdf");
    expect(fs.existsSync(result.localPath)).toBe(true);
  });
});
