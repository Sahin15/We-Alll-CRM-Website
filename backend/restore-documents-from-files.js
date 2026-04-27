/**
 * RESTORE DOCUMENTS FROM FILES
 * 
 * This script scans the backend/uploads/documents/ directory and recreates
 * database records for all files found. This is useful when database records
 * are lost but the files still exist.
 * 
 * Usage: node restore-documents-from-files.js
 * 
 * This script will:
 * 1. Scan backend/uploads/documents/ for all files
 * 2. Extract metadata from filenames
 * 3. Create database records for each file
 * 4. Preserve original filenames and timestamps
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const documentSchema = new mongoose.Schema({}, { strict: false });
const Document = mongoose.model('Document', documentSchema, 'documents');

const DOCUMENTS_DIR = path.join(__dirname, 'uploads', 'documents');

// MIME type mapping
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

// Guess category from filename
function guessCategory(filename) {
  const lower = filename.toLowerCase();
  
  if (lower.includes('aadhaar') || lower.includes('aadhar')) return 'aadhaar';
  if (lower.includes('pan')) return 'pan';
  if (lower.includes('bank') || lower.includes('passbook') || lower.includes('account')) return 'bank';
  if (lower.includes('passport')) return 'passport';
  if (lower.includes('driving') || lower.includes('license')) return 'driving_license';
  if (lower.includes('education') || lower.includes('certificate') || lower.includes('degree') || lower.includes('result')) return 'education';
  if (lower.includes('salary')) return 'salary_slip';
  if (lower.includes('joining')) return 'joining_letter';
  if (lower.includes('offer')) return 'offer_letter';
  if (lower.includes('experience')) return 'experience_letter';
  if (lower.includes('relieving')) return 'relieving_letter';
  
  return 'other';
}

// Get MIME type from file extension
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

async function restoreDocumentsFromFiles() {
  try {
    // Check if documents directory exists
    if (!fs.existsSync(DOCUMENTS_DIR)) {
      console.error(`❌ Documents directory not found: ${DOCUMENTS_DIR}`);
      process.exit(1);
    }

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all files in documents directory
    const files = fs.readdirSync(DOCUMENTS_DIR);
    console.log(`📦 Found ${files.length} file(s) in ${DOCUMENTS_DIR}\n`);

    if (files.length === 0) {
      console.log('No files to restore.');
      await mongoose.disconnect();
      return;
    }

    // Check current document count
    const currentCount = await Document.countDocuments();
    console.log(`Current documents in database: ${currentCount}`);

    if (currentCount > 0) {
      console.log('⚠️  Database already has documents.');
      console.log('Skipping restore to avoid duplicates.\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`\nRestoring ${files.length} documents...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const filePath = path.join(DOCUMENTS_DIR, filename);
      
      try {
        const stats = fs.statSync(filePath);
        
        // Create document record
        const doc = new Document({
          userId: new mongoose.Types.ObjectId(), // Placeholder - will need to be updated
          category: guessCategory(filename),
          originalName: filename,
          filename: filename,
          path: filePath,
          size: stats.size,
          mimetype: getMimeType(filename),
          description: '',
          uploadedBy: new mongoose.Types.ObjectId(), // Placeholder
          isOfficial: false,
          isActive: true,
          verificationStatus: 'pending',
          createdAt: stats.birthtime || new Date(),
          updatedAt: stats.mtime || new Date()
        });

        await doc.save();
        successCount++;
        
        console.log(`✅ [${i + 1}/${files.length}] ${filename}`);
        console.log(`   Category: ${doc.category}`);
        console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);

      } catch (error) {
        errorCount++;
        console.error(`❌ [${i + 1}/${files.length}] Error restoring ${filename}`);
        console.error(`   ${error.message}\n`);
      }
    }

    console.log('═'.repeat(60));
    console.log('RESTORATION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`✅ Successfully restored: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\nTotal documents in database: ${await Document.countDocuments()}\n`);

    console.log('⚠️  IMPORTANT NOTES:');
    console.log('1. User IDs are placeholders - documents may not show for specific users');
    console.log('2. You may need to manually update userId and uploadedBy fields');
    console.log('3. All documents are marked as "pending" verification');
    console.log('4. Consider running a script to assign documents to correct users\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

restoreDocumentsFromFiles();
