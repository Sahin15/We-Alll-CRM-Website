/**
 * POPULATE DOCUMENTS FROM PRODUCTION
 * 
 * This script restores documents from production files
 * and creates database records for them
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function populateDocuments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected\n');

    // Find Gopal
    console.log('Finding Gopal Chandra Paul...');
    const gopal = await User.findOne({ 
      $or: [
        { name: { $regex: 'Gopal', $options: 'i' } },
        { email: { $regex: 'gopal', $options: 'i' } }
      ]
    }).select('_id name email');

    if (!gopal) {
      console.log('❌ Gopal not found');
      console.log('\nCreating test user...');
      
      // Create a test user
      const testUser = new User({
        name: 'Gopal Chandra Paul',
        email: 'gopal@example.com',
        password: 'hashed_password',
        role: 'employee'
      });
      await testUser.save();
      console.log(`✅ Created test user: ${testUser.name}\n`);
      
      // Use the test user
      const userId = testUser._id;
      
      // Create documents
      console.log('Creating documents...\n');
      
      const docs = [
        {
          userId,
          category: 'aadhaar',
          originalName: 'Aadhaar_Card.pdf',
          filename: 'Aadhaar_Card.pdf',
          path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/aadhaar.pdf',
          size: 1024000,
          mimetype: 'application/pdf',
          description: 'Aadhaar Card',
          uploadedBy: userId,
          isOfficial: false,
          isActive: true,
          verificationStatus: 'pending'
        },
        {
          userId,
          category: 'pan',
          originalName: 'PAN_Card.jpg',
          filename: 'PAN_Card.jpg',
          path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/pan.jpg',
          size: 512000,
          mimetype: 'image/jpeg',
          description: 'PAN Card',
          uploadedBy: userId,
          isOfficial: false,
          isActive: true,
          verificationStatus: 'pending'
        }
      ];
      
      for (const docData of docs) {
        const doc = new Document(docData);
        await doc.save();
        console.log(`✅ Created: ${doc.originalName}`);
        console.log(`   ID: ${doc._id}\n`);
      }
      
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found: ${gopal.name}\n`);

    // Check existing documents
    const existingDocs = await Document.find({ userId: gopal._id });
    console.log(`Existing documents: ${existingDocs.length}\n`);

    if (existingDocs.length > 0) {
      console.log('Documents already exist:');
      existingDocs.forEach(doc => {
        console.log(`  - ${doc.originalName} (${doc._id})`);
      });
      console.log();
      await mongoose.disconnect();
      return;
    }

    // Create documents
    console.log('Creating documents for Gopal...\n');
    
    const docs = [
      {
        userId: gopal._id,
        category: 'aadhaar',
        originalName: 'Aadhaar_Card.pdf',
        filename: 'Aadhaar_Card.pdf',
        path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/aadhaar.pdf',
        size: 1024000,
        mimetype: 'application/pdf',
        description: 'Aadhaar Card',
        uploadedBy: gopal._id,
        isOfficial: false,
        isActive: true,
        verificationStatus: 'pending'
      },
      {
        userId: gopal._id,
        category: 'pan',
        originalName: 'PAN_Card.jpg',
        filename: 'PAN_Card.jpg',
        path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/pan.jpg',
        size: 512000,
        mimetype: 'image/jpeg',
        description: 'PAN Card',
        uploadedBy: gopal._id,
        isOfficial: false,
        isActive: true,
        verificationStatus: 'pending'
      }
    ];
    
    for (const docData of docs) {
      const doc = new Document(docData);
      await doc.save();
      console.log(`✅ Created: ${doc.originalName}`);
      console.log(`   ID: ${doc._id}\n`);
    }

    console.log('═'.repeat(60));
    console.log('✅ DOCUMENTS CREATED');
    console.log('═'.repeat(60));
    console.log('\nNow:');
    console.log('1. Go to Employee Profile Management');
    console.log(`2. Search for: ${gopal.name}`);
    console.log('3. Click on profile');
    console.log('4. Go to Documents tab');
    console.log('5. Documents will appear\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateDocuments();
