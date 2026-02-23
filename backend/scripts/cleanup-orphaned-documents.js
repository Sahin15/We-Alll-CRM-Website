import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Import models
import Document from '../src/models/documentModel.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const cleanupOrphanedDocuments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all documents
    const documents = await Document.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    console.log(`📄 Total documents in database: ${documents.length}\n`);

    if (documents.length === 0) {
      console.log('No documents found in database.');
      rl.close();
      process.exit(0);
    }

    // Find orphaned documents (files that don't exist on filesystem)
    const orphanedDocs = documents.filter(doc => !fs.existsSync(doc.path));

    if (orphanedDocs.length === 0) {
      console.log('✅ No orphaned documents found. All documents have their files.');
      rl.close();
      process.exit(0);
    }

    console.log(`⚠️  Found ${orphanedDocs.length} orphaned documents (database records without files):\n`);

    // Group by user
    const byUser = {};
    orphanedDocs.forEach(doc => {
      const userName = doc.userId?.name || 'Unknown';
      const userEmail = doc.userId?.email || 'N/A';
      const key = `${userName} (${userEmail})`;
      if (!byUser[key]) {
        byUser[key] = [];
      }
      byUser[key].push(doc);
    });

    // Display summary
    Object.entries(byUser).forEach(([user, docs]) => {
      console.log(`👤 ${user}: ${docs.length} orphaned documents`);
      docs.forEach(doc => {
        console.log(`   - ${doc.category}: ${doc.originalName}`);
      });
      console.log('');
    });

    console.log('These documents exist in the database but their files are missing from the filesystem.');
    console.log('This typically happens when files were uploaded on a different machine (e.g., production server).\n');

    const answer = await question('Do you want to DELETE these orphaned database records? (yes/no): ');

    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('\n🗑️  Deleting orphaned documents...\n');

      let deletedCount = 0;
      for (const doc of orphanedDocs) {
        await Document.findByIdAndDelete(doc._id);
        deletedCount++;
        console.log(`✅ Deleted: ${doc.category} - ${doc.originalName} (${doc.userId?.name || 'Unknown'})`);
      }

      console.log(`\n✅ Successfully deleted ${deletedCount} orphaned document records.`);
      console.log('Users will need to re-upload these documents.');
    } else {
      console.log('\n❌ Cleanup cancelled. No documents were deleted.');
      console.log('To fix this issue, you can:');
      console.log('1. Sync the uploads directory from the production server');
      console.log('2. Run this script again to delete orphaned records');
      console.log('3. Have users re-upload their documents');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

cleanupOrphanedDocuments();
