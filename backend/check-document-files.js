import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Document model
import Document from './src/models/documentModel.js';

const DOCUMENTS_DIR = path.join(__dirname, 'uploads', 'documents');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function checkDocumentFiles() {
  try {
    console.log('\n========================================');
    console.log('DOCUMENT FILE VERIFICATION REPORT');
    console.log('========================================\n');

    // Check if documents directory exists
    if (!fs.existsSync(DOCUMENTS_DIR)) {
      console.log(`✗ Documents directory does not exist: ${DOCUMENTS_DIR}`);
      return;
    }

    console.log(`✓ Documents directory found: ${DOCUMENTS_DIR}\n`);

    // Get all files in the documents directory
    const filesInDirectory = fs.readdirSync(DOCUMENTS_DIR);
    console.log(`Found ${filesInDirectory.length} file(s) in directory:\n`);
    
    filesInDirectory.forEach((file, index) => {
      const filePath = path.join(DOCUMENTS_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${index + 1}. ${file}`);
      console.log(`     Path: ${filePath}`);
      console.log(`     Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`     Modified: ${stats.mtime.toLocaleString()}\n`);
    });

    // Get all documents from database
    const dbDocuments = await Document.find({}).select('filename path originalName size createdAt');
    console.log(`\n========================================`);
    console.log(`Found ${dbDocuments.length} document(s) in database:\n`);

    // Create a map of files in directory for quick lookup
    const filesInDirSet = new Set(filesInDirectory);
    const filesInDirMap = new Map();
    filesInDirectory.forEach(file => {
      filesInDirMap.set(file, true);
    });

    // Check each database document
    let matchedCount = 0;
    let missingCount = 0;
    const missingFiles = [];
    const matchedFiles = [];

    dbDocuments.forEach((doc, index) => {
      const filename = doc.filename;
      const exists = filesInDirMap.has(filename);

      console.log(`${index + 1}. Database Entry:`);
      console.log(`   Original Name: ${doc.originalName}`);
      console.log(`   Filename: ${filename}`);
      console.log(`   Stored Path: ${doc.path}`);
      console.log(`   Size: ${(doc.size / 1024).toFixed(2)} KB`);
      console.log(`   Uploaded: ${new Date(doc.createdAt).toLocaleString()}`);

      if (exists) {
        console.log(`   Status: ✓ FILE EXISTS`);
        matchedCount++;
        matchedFiles.push({
          filename,
          originalName: doc.originalName,
          size: doc.size
        });
      } else {
        console.log(`   Status: ✗ FILE MISSING`);
        missingCount++;
        missingFiles.push({
          filename,
          originalName: doc.originalName,
          storedPath: doc.path
        });
      }
      console.log();
    });

    // Check for orphaned files (files in directory but not in database)
    console.log(`\n========================================`);
    console.log('ORPHANED FILES (in directory but not in database):\n');
    
    const orphanedFiles = [];
    const dbFilenamesSet = new Set(dbDocuments.map(doc => doc.filename));
    
    filesInDirectory.forEach(file => {
      if (!dbFilenamesSet.has(file)) {
        orphanedFiles.push(file);
        const filePath = path.join(DOCUMENTS_DIR, file);
        const stats = fs.statSync(filePath);
        console.log(`  • ${file}`);
        console.log(`    Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`    Path: ${filePath}\n`);
      }
    });

    if (orphanedFiles.length === 0) {
      console.log('  ✓ No orphaned files found\n');
    }

    // Summary Report
    console.log(`\n========================================`);
    console.log('SUMMARY REPORT');
    console.log('========================================\n');
    console.log(`Total files in directory: ${filesInDirectory.length}`);
    console.log(`Total documents in database: ${dbDocuments.length}`);
    console.log(`Matched files: ${matchedCount} ✓`);
    console.log(`Missing files: ${missingCount} ✗`);
    console.log(`Orphaned files: ${orphanedFiles.length}`);

    // Detailed summary
    if (missingCount > 0) {
      console.log(`\n⚠ MISSING FILES DETAILS:`);
      missingFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.originalName}`);
        console.log(`     Filename: ${file.filename}`);
        console.log(`     Stored Path: ${file.storedPath}`);
      });
    }

    if (orphanedFiles.length > 0) {
      console.log(`\n⚠ ORPHANED FILES DETAILS:`);
      orphanedFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
    }

    console.log(`\n========================================\n`);

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
  }
}

// Run the check
connectDB().then(() => {
  checkDocumentFiles();
});
