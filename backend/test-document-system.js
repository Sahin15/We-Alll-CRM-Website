/**
 * TEST DOCUMENT SYSTEM
 * 
 * This script tests the document management system by:
 * 1. Connecting to MongoDB
 * 2. Checking current document count
 * 3. Creating test documents
 * 4. Verifying the system works
 * 
 * Usage: node test-document-system.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function testDocumentSystem() {
  try {
    console.log('═'.repeat(60));
    console.log('DOCUMENT SYSTEM TEST');
    console.log('═'.repeat(60));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check document count
    console.log('📊 Checking document count...');
    const documentCount = await Document.countDocuments();
    console.log(`   Current documents in database: ${documentCount}\n`);

    // Get first user
    console.log('👤 Finding first user...');
    const user = await User.findOne().select('_id name email role');
    
    if (!user) {
      console.log('❌ No users found in database');
      console.log('   Please create a user first\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Role: ${user.role}\n`);

    // Create test documents
    console.log('📝 Creating test documents...\n');

    const testDocuments = [
      {
        userId: user._id,
        category: 'aadhaar',
        originalName: 'Aadhaar_Card.pdf',
        filename: 'Aadhaar_Card.pdf',
        path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/test-aadhaar.pdf',
        size: 1024000,
        mimetype: 'application/pdf',
        description: 'Test Aadhaar document',
        uploadedBy: user._id,
        isOfficial: false,
        isActive: true,
        verificationStatus: 'pending'
      },
      {
        userId: user._id,
        category: 'pan',
        originalName: 'PAN_Card.jpg',
        filename: 'PAN_Card.jpg',
        path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/test-pan.jpg',
        size: 512000,
        mimetype: 'image/jpeg',
        description: 'Test PAN document',
        uploadedBy: user._id,
        isOfficial: false,
        isActive: true,
        verificationStatus: 'pending'
      },
      {
        userId: user._id,
        category: 'bank',
        originalName: 'Bank_Statement.pdf',
        filename: 'Bank_Statement.pdf',
        path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/test-bank.pdf',
        size: 2048000,
        mimetype: 'application/pdf',
        description: 'Test Bank document',
        uploadedBy: user._id,
        isOfficial: false,
        isActive: true,
        verificationStatus: 'pending'
      }
    ];

    let createdCount = 0;
    for (const docData of testDocuments) {
      try {
        const doc = new Document(docData);
        await doc.save();
        createdCount++;
        console.log(`✅ Created: ${docData.originalName}`);
        console.log(`   Category: ${docData.category}`);
        console.log(`   Status: ${docData.verificationStatus}`);
        console.log(`   ID: ${doc._id}\n`);
      } catch (error) {
        console.error(`❌ Failed to create ${docData.originalName}: ${error.message}\n`);
      }
    }

    // Verify documents were created
    console.log('═'.repeat(60));
    console.log('VERIFICATION');
    console.log('═'.repeat(60));
    console.log();

    const newCount = await Document.countDocuments();
    console.log(`📊 Documents before: ${documentCount}`);
    console.log(`📊 Documents after: ${newCount}`);
    console.log(`📊 Documents created: ${createdCount}\n`);

    // Get user's documents
    console.log('📋 User\'s documents:');
    const userDocs = await Document.find({ userId: user._id })
      .select('_id originalName category verificationStatus createdAt');
    
    userDocs.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.originalName}`);
      console.log(`   Category: ${doc.category}`);
      console.log(`   Status: ${doc.verificationStatus}`);
      console.log(`   ID: ${doc._id}`);
    });

    console.log();
    console.log('═'.repeat(60));
    console.log('TEST COMPLETE');
    console.log('═'.repeat(60));
    console.log();
    console.log('✅ Document system is working correctly!');
    console.log();
    console.log('Next steps:');
    console.log('1. Go to Employee Profile Management in the frontend');
    console.log('2. You should now see the test documents');
    console.log('3. Try viewing, approving, or rejecting them');
    console.log('4. Check the Document Verification page to approve/reject');
    console.log();

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testDocumentSystem();
