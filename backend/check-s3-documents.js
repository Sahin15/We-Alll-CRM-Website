import AWS from 'aws-sdk';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import Document model
import Document from './src/models/documentModel.js';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function checkS3Documents() {
  try {
    console.log('\n========================================');
    console.log('S3 DOCUMENT VERIFICATION REPORT');
    console.log('========================================\n');

    // List all objects in S3 documents folder
    const params = {
      Bucket: S3_BUCKET,
      Prefix: 'documents/'
    };

    console.log(`Checking S3 bucket: ${S3_BUCKET}`);
    console.log(`Prefix: documents/\n`);

    const s3Objects = await s3.listObjectsV2(params).promise();
    const s3Files = s3Objects.Contents || [];

    console.log(`Found ${s3Files.length} file(s) in S3:\n`);

    s3Files.forEach((file, index) => {
      if (file.Key !== 'documents/') { // Skip the folder itself
        console.log(`  ${index}. ${file.Key}`);
        console.log(`     Size: ${(file.Size / 1024).toFixed(2)} KB`);
        console.log(`     Modified: ${file.LastModified.toLocaleString()}\n`);
      }
    });

    // Get all documents from database
    const dbDocuments = await Document.find({}).select('filename originalName path size');
    console.log(`\n========================================`);
    console.log(`Found ${dbDocuments.length} document(s) in database:\n`);

    // Check which documents are in S3
    let s3MatchCount = 0;
    let missingFromS3 = [];

    dbDocuments.forEach((doc, index) => {
      const s3Key = `documents/${doc.filename}`;
      const existsInS3 = s3Files.some(file => file.Key === s3Key);

      console.log(`${index + 1}. ${doc.originalName}`);
      console.log(`   Filename: ${doc.filename}`);
      console.log(`   Size: ${(doc.size / 1024).toFixed(2)} KB`);
      console.log(`   Stored Path: ${doc.path}`);

      if (existsInS3) {
        console.log(`   S3 Status: ✓ EXISTS`);
        s3MatchCount++;
      } else {
        console.log(`   S3 Status: ✗ NOT IN S3`);
        missingFromS3.push({
          filename: doc.filename,
          originalName: doc.originalName
        });
      }
      console.log();
    });

    // Summary
    console.log(`\n========================================`);
    console.log('SUMMARY REPORT');
    console.log('========================================\n');
    console.log(`Total files in S3: ${s3Files.length - 1}`); // -1 for the folder
    console.log(`Total documents in database: ${dbDocuments.length}`);
    console.log(`Documents in S3: ${s3MatchCount} ✓`);
    console.log(`Documents missing from S3: ${missingFromS3.length} ✗`);

    if (missingFromS3.length > 0) {
      console.log(`\n⚠ DOCUMENTS MISSING FROM S3:`);
      missingFromS3.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.originalName}`);
        console.log(`     Filename: ${doc.filename}`);
      });
    }

    console.log(`\n========================================\n`);

  } catch (error) {
    console.error('Error during S3 verification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
  }
}

// Run the check
connectDB().then(() => {
  checkS3Documents();
});
