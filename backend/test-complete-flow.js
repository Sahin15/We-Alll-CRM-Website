import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Import the actual models
const Document = (await import('./src/models/documentModel.js')).default;
const User = (await import('./src/models/userModel.js')).default;

async function testCompleteFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find an approved document
    const approvedDoc = await Document.findOne({ verificationStatus: 'approved' });
    
    if (!approvedDoc) {
      console.log('No approved documents found');
      await mongoose.disconnect();
      return;
    }

    console.log('Testing complete flow:\n');
    console.log(`Document: ${approvedDoc.originalName}`);
    console.log(`Status: ${approvedDoc.verificationStatus}`);
    console.log(`VerifiedBy (raw): ${approvedDoc.verifiedBy}`);
    console.log(`VerificationDate: ${approvedDoc.verificationDate}\n`);

    // Test 1: Fetch without populate
    console.log('Test 1: Fetch without populate');
    const docWithoutPopulate = await Document.findById(approvedDoc._id);
    console.log(`  verifiedBy: ${docWithoutPopulate.verifiedBy}`);
    console.log(`  verifiedBy.name: ${docWithoutPopulate.verifiedBy?.name}\n`);

    // Test 2: Fetch with populate
    console.log('Test 2: Fetch with populate');
    const docWithPopulate = await Document.findById(approvedDoc._id).populate('verifiedBy', 'name email');
    console.log(`  verifiedBy: ${JSON.stringify(docWithPopulate.verifiedBy)}`);
    console.log(`  verifiedBy.name: ${docWithPopulate.verifiedBy?.name}\n`);

    // Test 3: Fetch with toObject
    console.log('Test 3: Fetch with populate and toObject');
    const docToObject = await Document.findById(approvedDoc._id).populate('verifiedBy', 'name email');
    const obj = docToObject.toObject();
    console.log(`  verifiedBy: ${JSON.stringify(obj.verifiedBy)}`);
    console.log(`  verifiedBy.name: ${obj.verifiedBy?.name}\n`);

    // Test 4: Simulate API response
    console.log('Test 4: Simulate API response (like the route does)');
    const documents = await Document.find({ _id: approvedDoc._id })
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    const transformed = documents.map(doc => ({
      ...doc.toObject(),
      uploadedAt: doc.createdAt,
      fileUrl: `/api/users/documents/${doc._id}/download`,
      fileSize: doc.size
    }));

    console.log(`  verifiedBy: ${JSON.stringify(transformed[0].verifiedBy)}`);
    console.log(`  verifiedBy.name: ${transformed[0].verifiedBy?.name}\n`);

    console.log('✅ All tests completed');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testCompleteFlow();
