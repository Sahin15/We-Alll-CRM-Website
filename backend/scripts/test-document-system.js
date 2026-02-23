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

const testDocumentSystem = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🧪 Testing Document System\n');
    console.log('=' .repeat(60));

    // Test 1: Check uploads directory
    console.log('\n📁 Test 1: Uploads Directory');
    const backendRoot = path.resolve(__dirname, '..');
    const uploadsDir = path.join(backendRoot, 'uploads', 'documents');
    
    if (fs.existsSync(uploadsDir)) {
      console.log('✅ Uploads directory exists:', uploadsDir);
      const files = fs.readdirSync(uploadsDir);
      console.log(`   Files in directory: ${files.length}`);
    } else {
      console.log('❌ Uploads directory does not exist:', uploadsDir);
      console.log('   Creating directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Directory created');
    }

    // Test 2: Check database connection
    console.log('\n💾 Test 2: Database Connection');
    const docCount = await Document.countDocuments();
    const userCount = await User.countDocuments();
    console.log(`✅ Documents in database: ${docCount}`);
    console.log(`✅ Users in database: ${userCount}`);

    // Test 3: Check for orphaned documents
    console.log('\n🔍 Test 3: Orphaned Documents Check');
    const documents = await Document.find();
    let existingCount = 0;
    let missingCount = 0;

    for (const doc of documents) {
      if (fs.existsSync(doc.path)) {
        existingCount++;
      } else {
        missingCount++;
      }
    }

    console.log(`✅ Documents with existing files: ${existingCount}`);
    if (missingCount > 0) {
      console.log(`⚠️  Documents with missing files: ${missingCount}`);
      console.log('   Run cleanup-orphaned-documents.js to fix this');
    } else {
      console.log('✅ No orphaned documents found');
    }

    // Test 4: Check document categories
    console.log('\n📋 Test 4: Document Categories');
    const categories = await Document.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    if (categories.length > 0) {
      console.log('Document distribution by category:');
      categories.forEach(cat => {
        console.log(`   ${cat._id}: ${cat.count} documents`);
      });
    } else {
      console.log('   No documents in database');
    }

    // Test 5: Check users with documents
    console.log('\n👥 Test 5: Users with Documents');
    const usersWithDocs = await Document.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$userId',
          name: { $first: '$user.name' },
          email: { $first: '$user.email' },
          docCount: { $sum: 1 }
        }
      },
      { $sort: { docCount: -1 } }
    ]);

    if (usersWithDocs.length > 0) {
      console.log(`${usersWithDocs.length} users have uploaded documents:`);
      usersWithDocs.slice(0, 10).forEach(user => {
        console.log(`   ${user.name} (${user.email}): ${user.docCount} documents`);
      });
      if (usersWithDocs.length > 10) {
        console.log(`   ... and ${usersWithDocs.length - 10} more users`);
      }
    } else {
      console.log('   No users have documents yet');
    }

    // Test 6: Check file permissions
    console.log('\n🔐 Test 6: File Permissions');
    try {
      const testFile = path.join(uploadsDir, 'test-write.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Uploads directory is writable');
    } catch (error) {
      console.log('❌ Uploads directory is not writable:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`Total documents: ${docCount}`);
    console.log(`Files exist: ${existingCount}`);
    console.log(`Files missing: ${missingCount}`);
    console.log(`Users with documents: ${usersWithDocs.length}`);
    
    if (missingCount === 0 && existingCount > 0) {
      console.log('\n✅ Document system is healthy!');
    } else if (missingCount > 0) {
      console.log('\n⚠️  Action required: Run cleanup-orphaned-documents.js');
    } else if (docCount === 0) {
      console.log('\n📝 System ready for first document upload');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

testDocumentSystem();
