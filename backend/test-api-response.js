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

async function testApiResponse() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find Gopal
    const gopal = await User.findOne({ 
      $or: [
        { name: { $regex: 'Gopal', $options: 'i' } },
        { email: { $regex: 'gopal', $options: 'i' } }
      ]
    });

    if (!gopal) {
      console.log('Gopal not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found: ${gopal.name}\n`);

    // Simulate what the API route does
    const documents = await Document.find({ userId: gopal._id })
      .populate('uploadedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`Documents: ${documents.length}\n`);

    // Transform like the API does
    const transformedDocuments = documents.map(doc => ({
      ...doc.toObject(),
      uploadedAt: doc.createdAt,
      fileUrl: `/api/users/documents/${doc._id}/download`,
      fileSize: doc.size
    }));

    console.log('Transformed documents (what API returns):');
    console.log(JSON.stringify(transformedDocuments, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testApiResponse();
