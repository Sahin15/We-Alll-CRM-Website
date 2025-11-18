import dotenv from "dotenv";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

dotenv.config();

console.log("🔍 Testing AWS S3 Connection...\n");

// Display configuration (without showing full secret key)
console.log("Configuration:");
console.log("- Access Key ID:", process.env.AWS_ACCESS_KEY_ID);
console.log("- Secret Key:", process.env.AWS_SECRET_ACCESS_KEY ? "***" + process.env.AWS_SECRET_ACCESS_KEY.slice(-4) : "NOT SET");
console.log("- Region:", process.env.AWS_REGION);
console.log("- Bucket Name:", process.env.AWS_S3_BUCKET_NAME);
console.log("");

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Test connection
const testConnection = async () => {
  try {
    console.log("📡 Connecting to AWS S3...");
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log("✅ Connection successful!\n");
    console.log("Your S3 Buckets:");
    response.Buckets.forEach((bucket, index) => {
      console.log(`${index + 1}. ${bucket.Name}`);
      if (bucket.Name === process.env.AWS_S3_BUCKET_NAME) {
        console.log("   ⭐ This is your configured bucket!");
      }
    });
    
    console.log("\n🎉 AWS S3 is configured correctly!");
    console.log("✅ You can now upload images to S3");
    
  } catch (error) {
    console.log("❌ Connection failed!\n");
    console.log("Error:", error.message);
    console.log("\nPossible issues:");
    console.log("1. Check your AWS credentials are correct");
    console.log("2. Verify IAM user has S3 permissions");
    console.log("3. Check region is correct");
    console.log("4. Make sure no extra spaces in .env file");
  }
};

testConnection();
