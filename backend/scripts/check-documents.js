import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

// Import models
import Document from '../src/models/documentModel.js';
import User from '../src/models/userModel.js';

const checkDocuments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all documents
    const documents = await Document.find()
      .populate('userId', 'name email')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`\n📄 Total documents in database: ${documents.length}\n`);

    if (documents.length === 0) {
      console.log('No documents found in database.');
      process.exit(0);
    }

    // Check each document
    for (const doc of documents) {
      const fileExists = fs.existsSync(doc.path);
      const status = fileExists ? '✅ EXISTS' : '❌ MISSING';
      
      console.log(`${status} | ${doc.category} | ${doc.originalName}`);
      console.log(`   User: ${doc.userId?.name || 'Unknown'} (${doc.userId?.email || 'N/A'})`);
      console.log(`   Path: ${doc.path}`);
      console.log(`   ID: ${doc._id}`);
      console.log(`   Size: ${(doc.size / 1024).toFixed(2)} KB`);
      console.log(`   Uploaded: ${doc.createdAt}`);
      console.log(`   Official: ${doc.isOfficial ? 'Yes' : 'No'}`);
      console.log('');
    }

    // Summary
    const existingFiles = documents.filter(doc => fs.existsSync(doc.path)).length;
    const missingFiles = documents.length - existingFiles;

    console.log('\n📊 Summary:');
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Files exist: ${existingFiles}`);
    console.log(`   Files missing: ${missingFiles}`);

    if (missingFiles > 0) {
      console.log('\n⚠️  Some files are missing from the filesystem!');
      console.log('   This usually happens when:');
      console.log('   1. Files were uploaded on a different machine (e.g., Linux server)');
      console.log('   2. The uploads directory was not synced');
      console.log('   3. Files were manually deleted');
      console.log('\n   Solution: Upload new documents or sync the uploads directory.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

checkDocuments();
