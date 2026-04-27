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

async function debugVerifiedBy() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find all documents
    const docs = await Document.find();
    console.log(`Total documents: ${docs.length}\n`);

    // Check each document
    for (const doc of docs) {
      console.log(`Document: ${doc.originalName}`);
      console.log(`  ID: ${doc._id}`);
      console.log(`  Status: ${doc.verificationStatus}`);
      console.log(`  VerifiedBy (raw): ${doc.verifiedBy}`);
      console.log(`  VerifiedBy type: ${typeof doc.verifiedBy}`);
      console.log(`  VerificationDate: ${doc.verificationDate}`);
      
      // Try to populate verifiedBy
      const populated = await Document.findById(doc._id).populate('verifiedBy', 'name email');
      console.log(`  VerifiedBy (populated): ${JSON.stringify(populated.verifiedBy)}`);
      console.log();
    }

    // Find a user to test with
    const user = await User.findOne().select('_id name email');
    if (user) {
      console.log(`\nTest User: ${user.name}`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Email: ${user.email}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugVerifiedBy();
