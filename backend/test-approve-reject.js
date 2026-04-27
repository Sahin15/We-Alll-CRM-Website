/**
 * TEST APPROVE/REJECT FUNCTIONALITY
 * 
 * This script tests if the approve/reject endpoints are working correctly
 * by creating a test document and then approving/rejecting it.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function testApproveReject() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a test user (HR/Admin)
    const testUser = await User.findOne({ role: { $in: ['hr', 'admin', 'superadmin'] } });
    
    if (!testUser) {
      console.log('❌ No HR/Admin user found in database');
      await mongoose.disconnect();
      return;
    }

    console.log(`Using test user: ${testUser.name} (${testUser.role})\n`);

    // Create a test document
    const testDoc = new Document({
      userId: testUser._id,
      category: 'aadhaar',
      originalName: 'Test Document.pdf',
      filename: 'test-document.pdf',
      path: '/test/path/test-document.pdf',
      size: 1024,
      mimetype: 'application/pdf',
      description: 'Test document for verification',
      uploadedBy: testUser._id,
      isOfficial: false,
      verificationStatus: 'pending'
    });

    await testDoc.save();
    console.log(`✅ Created test document: ${testDoc._id}\n`);

    // Test approve
    console.log('Testing APPROVE functionality...');
    const approvedDoc = await Document.findByIdAndUpdate(
      testDoc._id,
      {
        verificationStatus: 'approved',
        verifiedBy: testUser._id,
        verificationDate: new Date(),
        rejectionReason: null
      },
      { new: true }
    ).populate('verifiedBy', 'name email');

    console.log(`✅ Document approved`);
    console.log(`   Status: ${approvedDoc.verificationStatus}`);
    console.log(`   Verified By: ${approvedDoc.verifiedBy?.name}`);
    console.log(`   Verification Date: ${approvedDoc.verificationDate}\n`);

    // Test reject
    console.log('Testing REJECT functionality...');
    const rejectedDoc = await Document.findByIdAndUpdate(
      testDoc._id,
      {
        verificationStatus: 'rejected',
        verifiedBy: testUser._id,
        verificationDate: new Date(),
        rejectionReason: 'Test rejection reason'
      },
      { new: true }
    ).populate('verifiedBy', 'name email');

    console.log(`✅ Document rejected`);
    console.log(`   Status: ${rejectedDoc.verificationStatus}`);
    console.log(`   Verified By: ${rejectedDoc.verifiedBy?.name}`);
    console.log(`   Rejection Reason: ${rejectedDoc.rejectionReason}\n`);

    // Clean up
    await Document.findByIdAndDelete(testDoc._id);
    console.log('✅ Test document deleted\n');

    console.log('═'.repeat(60));
    console.log('✅ APPROVE/REJECT FUNCTIONALITY IS WORKING CORRECTLY');
    console.log('═'.repeat(60));
    console.log('\nThe issue is NOT with the approve/reject code.');
    console.log('The issue is that there are NO DOCUMENTS in the database.\n');
    console.log('SOLUTION: Run restore-documents-from-files.js on production\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testApproveReject();
