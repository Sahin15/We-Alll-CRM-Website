import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Document from '../src/models/documentModel.js';
import User from '../src/models/userModel.js';

// Load environment variables
dotenv.config();

const checkDocuments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find().select('_id name email role');
    console.log(`📊 Found ${users.length} users`);

    // Get all documents
    const documents = await Document.find().populate('userId', 'name email role');
    console.log(`📄 Found ${documents.length} documents`);

    // Group documents by user
    const documentsByUser = {};
    documents.forEach(doc => {
      const userId = doc.userId._id.toString();
      if (!documentsByUser[userId]) {
        documentsByUser[userId] = [];
      }
      documentsByUser[userId].push(doc);
    });

    // Display results
    console.log('\n📋 Document Summary:');
    users.forEach(user => {
      const userDocs = documentsByUser[user._id.toString()] || [];
      console.log(`\n👤 ${user.name} (${user.email}) - Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Documents: ${userDocs.length}`);
      
      userDocs.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.originalName} (${doc.category}) - ID: ${doc._id}`);
        console.log(`      Official: ${doc.isOfficial}, Created: ${doc.createdAt}`);
      });
    });

    // Check for the specific document ID from the error
    const problemDocId = '693d4eab698bce91fe93f895';
    const problemDoc = await Document.findById(problemDocId);
    
    console.log(`\n🔍 Checking problem document ID: ${problemDocId}`);
    if (problemDoc) {
      console.log('✅ Document found:');
      console.log(`   Owner ID: ${problemDoc.userId}`);
      console.log(`   Category: ${problemDoc.category}`);
      console.log(`   Original Name: ${problemDoc.originalName}`);
      console.log(`   Is Official: ${problemDoc.isOfficial}`);
      console.log(`   Created: ${problemDoc.createdAt}`);
      
      const owner = await User.findById(problemDoc.userId);
      if (owner) {
        console.log(`   Owner: ${owner.name} (${owner.email}) - Role: ${owner.role}`);
      }
    } else {
      console.log('❌ Document not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkDocuments();