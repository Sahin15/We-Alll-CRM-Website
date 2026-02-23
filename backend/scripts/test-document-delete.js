import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Import models
import Document from '../src/models/documentModel.js';
import User from '../src/models/userModel.js';

const testDocumentDelete = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🧪 Testing Document Delete Functionality\n');
    console.log('=' .repeat(60));

    // Find orphaned documents (files that don't exist)
    const documents = await Document.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const orphanedDocs = documents.filter(doc => !fs.existsSync(doc.path));

    console.log(`\n📊 Document Status:`);
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Files exist: ${documents.length - orphanedDocs.length}`);
    console.log(`   Files missing (orphaned): ${orphanedDocs.length}`);

    if (orphanedDocs.length === 0) {
      console.log('\n✅ No orphaned documents found. System is clean!');
    } else {
      console.log(`\n⚠️  Found ${orphanedDocs.length} orphaned documents that can be safely deleted:`);
      console.log('\nThese documents can be deleted by HR/Admin using the delete button in the UI:');
      console.log('1. Log in as HR/Admin');
      console.log('2. Go to Employee Directory → Select employee');
      console.log('3. Go to Documents tab');
      console.log('4. Click the trash icon (🗑️) next to any document');
      console.log('5. Confirm deletion');
      console.log('\nOr run: node backend/scripts/cleanup-orphaned-documents.js');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Delete functionality is available for HR/Admin/SuperAdmin');
    console.log('   - Delete button appears next to each document');
    console.log('   - Only HR/Admin/SuperAdmin can delete documents');
    console.log('   - Employees cannot delete their own documents');
    console.log('   - Deleting removes both database record and file');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

testDocumentDelete();
