/**
 * CREATE GOPAL'S DOCUMENTS
 * 
 * This script creates test documents for Gopal Chandra Paul
 * so they can be viewed in the HR panel
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function createGopalDocuments() {
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
      console.log('❌ Gopal not found in database');
      console.log('\nAvailable users:');
      const users = await User.find().select('_id name email').limit(5);
      users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found: ${gopal.name}\n`);

    // Create Aadhaar document
    console.log('Creating Aadhaar document...');
    const aadhaarDoc = new Document({
      userId: gopal._id,
      category: 'aadhaar',
      originalName: 'Aadhaar_Card.pdf',
      filename: 'Aadhaar_Card.pdf',
      path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/aadhaar-sample.pdf',
      size: 1024000,
      mimetype: 'application/pdf',
      description: 'Aadhaar Card',
      uploadedBy: gopal._id,
      isOfficial: false,
      isActive: true,
      verificationStatus: 'pending'
    });
    await aadhaarDoc.save();
    console.log(`✅ Created: ${aadhaarDoc.originalName}`);
    console.log(`   ID: ${aadhaarDoc._id}\n`);

    // Create PAN document
    console.log('Creating PAN document...');
    const panDoc = new Document({
      userId: gopal._id,
      category: 'pan',
      originalName: 'PAN_Card.jpg',
      filename: 'PAN_Card.jpg',
      path: 'https://wealll-crm-aws.s3.eu-north-1.amazonaws.com/documents/pan-sample.jpg',
      size: 512000,
      mimetype: 'image/jpeg',
      description: 'PAN Card',
      uploadedBy: gopal._id,
      isOfficial: false,
      isActive: true,
      verificationStatus: 'pending'
    });
    await panDoc.save();
    console.log(`✅ Created: ${panDoc.originalName}`);
    console.log(`   ID: ${panDoc._id}\n`);

    console.log('═'.repeat(60));
    console.log('✅ DOCUMENTS CREATED SUCCESSFULLY');
    console.log('═'.repeat(60));
    console.log('\nNow you can:');
    console.log('1. Go to Employee Profile Management');
    console.log(`2. Search for: ${gopal.name}`);
    console.log('3. Click on his profile');
    console.log('4. Go to Documents tab');
    console.log('5. You will see the Aadhaar and PAN documents\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createGopalDocuments();
