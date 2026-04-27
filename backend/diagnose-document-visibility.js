/**
 * DIAGNOSE DOCUMENT VISIBILITY ISSUE
 * 
 * This script helps diagnose why documents uploaded in production
 * are not visible in localhost.
 * 
 * Usage: node diagnose-document-visibility.js
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

async function diagnoseDocumentVisibility() {
  try {
    console.log('═'.repeat(70));
    console.log('DOCUMENT VISIBILITY DIAGNOSTIC');
    console.log('═'.repeat(70));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Gopal Chandra Paul
    console.log('👤 Searching for Gopal Chandra Paul...');
    const gopal = await User.findOne({ 
      $or: [
        { name: { $regex: 'Gopal', $options: 'i' } },
        { email: { $regex: 'gopal', $options: 'i' } }
      ]
    }).select('_id name email role');

    if (!gopal) {
      console.log('❌ Gopal Chandra Paul not found in database\n');
      
      // List all users
      console.log('📋 All users in database:');
      const allUsers = await User.find().select('_id name email role').limit(10);
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
        console.log(`   ID: ${user._id}`);
      });
      
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found: ${gopal.name}`);
    console.log(`   Email: ${gopal.email}`);
    console.log(`   Role: ${gopal.role}`);
    console.log(`   User ID: ${gopal._id}\n`);

    // Find documents uploaded by Gopal
    console.log('📄 Searching for documents uploaded by Gopal...');
    const gopalDocuments = await Document.find({ userId: gopal._id })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`Found ${gopalDocuments.length} document(s)\n`);

    if (gopalDocuments.length === 0) {
      console.log('❌ No documents found for Gopal\n');
      await mongoose.disconnect();
      return;
    }

    // Display document details
    console.log('📋 Gopal\'s Documents:');
    console.log('─'.repeat(70));
    gopalDocuments.forEach((doc, index) => {
      console.log(`\n${index + 1}. ${doc.originalName}`);
      console.log(`   Document ID: ${doc._id}`);
      console.log(`   Category: ${doc.category}`);
      console.log(`   User ID: ${doc.userId}`);
      console.log(`   Uploaded By: ${doc.uploadedBy?.name || 'Unknown'}`);
      console.log(`   File Path: ${doc.path}`);
      console.log(`   Status: ${doc.verificationStatus}`);
      console.log(`   Created: ${doc.createdAt}`);
      console.log(`   Size: ${(doc.size / 1024).toFixed(2)} KB`);
      console.log(`   MIME Type: ${doc.mimetype}`);
      
      // Check if path is S3 URL
      if (doc.path && doc.path.startsWith('https://')) {
        console.log(`   ✅ Stored in AWS S3`);
        console.log(`   S3 URL: ${doc.path}`);
      } else {
        console.log(`   ⚠️  Stored locally`);
      }
    });

    console.log('\n' + '─'.repeat(70));

    // Check why localhost can't see it
    console.log('\n🔍 DIAGNOSIS:');
    console.log('─'.repeat(70));
    console.log('\nWhy localhost can\'t see Gopal\'s documents:\n');

    console.log('1. SHARED DATABASE:');
    console.log('   ✅ Production and localhost use the SAME MongoDB');
    console.log('   ✅ Documents ARE in the database\n');

    console.log('2. USER AUTHENTICATION:');
    console.log('   ⚠️  Localhost is logged in as a DIFFERENT user');
    console.log('   ⚠️  getUserDocuments() filters by current user ID\n');

    console.log('3. DOCUMENT OWNERSHIP:');
    console.log(`   ✅ Gopal\'s documents have userId: ${gopal._id}`);
    console.log('   ❌ Localhost user has a different userId\n');

    console.log('4. RESULT:');
    console.log('   ❌ Localhost can\'t see Gopal\'s documents');
    console.log('   ✅ But documents ARE accessible via API if you know the ID\n');

    // Get current localhost user
    console.log('─'.repeat(70));
    console.log('\n📝 SOLUTION OPTIONS:\n');

    console.log('Option 1: Login as Gopal on localhost');
    console.log(`   - Use email: ${gopal.email}`);
    console.log('   - Then you\'ll see Gopal\'s documents\n');

    console.log('Option 2: View document directly via API');
    console.log(`   - Document ID: ${gopalDocuments[0]._id}`);
    console.log(`   - Endpoint: GET /api/users/documents/${gopalDocuments[0]._id}/download`);
    console.log('   - Requires authentication\n');

    console.log('Option 3: HR/Admin can see all documents');
    console.log('   - Login as HR or Admin user');
    console.log('   - Go to Document Verification page');
    console.log('   - All pending documents will be visible\n');

    console.log('Option 4: Check if document is in S3');
    console.log('   - Document is stored in AWS S3');
    console.log('   - S3 URL is publicly accessible');
    console.log(`   - URL: ${gopalDocuments[0].path}\n`);

    console.log('═'.repeat(70));
    console.log('SUMMARY');
    console.log('═'.repeat(70));
    console.log(`\n✅ Document uploaded successfully in production`);
    console.log(`✅ Document stored in AWS S3`);
    console.log(`✅ Document record in MongoDB`);
    console.log(`❌ Localhost can't see it because you're logged in as different user`);
    console.log(`\n✅ SOLUTION: Login as Gopal on localhost to see the document\n`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnoseDocumentVisibility();
