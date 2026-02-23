import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const testDocumentUpload = async () => {
  try {
    console.log('========================================');
    console.log('DOCUMENT UPLOAD DIAGNOSTIC TEST');
    console.log('========================================\n');

    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('   ✓ Connected to MongoDB\n');

    // Import models
    const { default: Document } = await import('../src/models/documentModel.js');
    const { default: User } = await import('../src/models/userModel.js');

    // Get all users
    console.log('2. Fetching users...');
    const users = await User.find().select('_id name email role');
    console.log(`   ✓ Found ${users.length} users\n`);

    // Get all documents
    console.log('3. Fetching all documents...');
    const allDocuments = await Document.find();
    console.log(`   ✓ Found ${allDocuments.length} total documents in database\n`);

    if (allDocuments.length > 0) {
      console.log('4. Document Details:');
      console.log('   ----------------------------------------');
      
      for (const doc of allDocuments) {
        const user = users.find(u => u._id.toString() === doc.userId.toString());
        console.log(`   Document ID: ${doc._id}`);
        console.log(`   User: ${user ? user.name : 'Unknown'} (${user ? user.email : 'N/A'})`);
        console.log(`   Category: ${doc.category}`);
        console.log(`   File: ${doc.originalName}`);
        console.log(`   Size: ${(doc.size / 1024).toFixed(2)} KB`);
        console.log(`   Uploaded: ${doc.createdAt.toLocaleString()}`);
        console.log(`   Official: ${doc.isOfficial ? 'Yes' : 'No'}`);
        console.log(`   Path: ${doc.path}`);
        console.log('   ----------------------------------------');
      }
    } else {
      console.log('4. No documents found in database');
      console.log('   This could mean:');
      console.log('   • No documents have been uploaded yet');
      console.log('   • Documents were deleted');
      console.log('   • There is an issue with document upload\n');
    }

    // Check documents by user
    console.log('\n5. Documents by User:');
    console.log('   ----------------------------------------');
    for (const user of users) {
      const userDocs = allDocuments.filter(doc => doc.userId.toString() === user._id.toString());
      if (userDocs.length > 0) {
        console.log(`   ${user.name} (${user.role}): ${userDocs.length} document(s)`);
        userDocs.forEach(doc => {
          console.log(`     - ${doc.category}: ${doc.originalName}`);
        });
      }
    }
    console.log('   ----------------------------------------\n');

    // Check uploads directory
    console.log('6. Checking uploads directory...');
    const fs = await import('fs');
    const uploadsPath = path.join(__dirname, '../uploads/documents');
    
    if (fs.existsSync(uploadsPath)) {
      console.log(`   ✓ Directory exists: ${uploadsPath}`);
      const files = fs.readdirSync(uploadsPath);
      console.log(`   ✓ Files in directory: ${files.length}`);
      
      if (files.length > 0) {
        console.log('\n   Files:');
        files.forEach(file => {
          const filePath = path.join(uploadsPath, file);
          const stats = fs.statSync(filePath);
          console.log(`     - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      }
    } else {
      console.log(`   ✗ Directory does not exist: ${uploadsPath}`);
      console.log('   Creating directory...');
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('   ✓ Directory created');
    }

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

testDocumentUpload();
