/**
 * CHECK GOPAL'S DOCUMENT
 * 
 * This script finds Gopal Chandra Paul and shows his documents
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function checkGopalDocument() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find Gopal
    const gopal = await User.findOne({ 
      $or: [
        { name: { $regex: 'Gopal', $options: 'i' } },
        { email: { $regex: 'gopal', $options: 'i' } }
      ]
    }).select('_id name email');

    if (!gopal) {
      console.log('❌ Gopal not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found: ${gopal.name}`);
    console.log(`   Email: ${gopal.email}`);
    console.log(`   User ID: ${gopal._id}\n`);

    // Find his documents
    const docs = await Document.find({ userId: gopal._id });
    console.log(`📄 Documents: ${docs.length}\n`);

    docs.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.originalName}`);
      console.log(`   Category: ${doc.category}`);
      console.log(`   Status: ${doc.verificationStatus}`);
      console.log(`   Path: ${doc.path}\n`);
    });

    console.log(`✅ To view in HR panel:`);
    console.log(`   1. Go to Employee Profile Management`);
    console.log(`   2. Search for: ${gopal.name}`);
    console.log(`   3. Click on their profile`);
    console.log(`   4. Go to Documents tab`);
    console.log(`   5. Documents will appear there\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkGopalDocument();
