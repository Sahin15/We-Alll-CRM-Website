import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Slot from '../src/models/slotModel.js';

dotenv.config();

const migrateSlots = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all slots that don't have the new fields
    const slots = await Slot.find({
      $or: [
        { title: { $exists: false } },
        { description: { $exists: false } },
        { workType: { $exists: false } },
        { status: { $exists: false } },
        { dueDate: { $exists: false } }
      ]
    });

    console.log(`Found ${slots.length} slots to migrate`);

    for (const slot of slots) {
      // Set title from brief or generate one
      if (!slot.title) {
        slot.title = slot.brief 
          ? slot.brief.substring(0, 100) 
          : `${slot.postType || 'Work'} - ${slot.platforms?.join(', ') || 'Assignment'}`;
      }

      // Set description from brief
      if (!slot.description) {
        slot.description = slot.brief || 'No description provided';
      }

      // Set workType based on existing data
      if (!slot.workType) {
        if (slot.postType || slot.platforms?.length > 0) {
          slot.workType = 'Social Media Post';
        } else {
          slot.workType = 'Other';
        }
      }

      // Set status from designStatus
      if (!slot.status) {
        const statusMap = {
          'Planned': 'Pending',
          'In Design': 'In Progress',
          'Ready for Review': 'Review',
          'Approved': 'Approved',
          'Revision Needed': 'Revision'
        };
        slot.status = statusMap[slot.designStatus] || 'Pending';
      }

      // Set dueDate from designDeadline or postingDate
      if (!slot.dueDate) {
        slot.dueDate = slot.designDeadline || slot.postingDate || new Date();
      }

      // Set priority
      if (!slot.priority) {
        slot.priority = 'Medium';
      }

      // Migrate creatives to attachments
      if (slot.creatives && slot.creatives.length > 0 && (!slot.attachments || slot.attachments.length === 0)) {
        slot.attachments = slot.creatives.map(creative => ({
          name: `Creative ${creative.type}`,
          url: creative.url,
          type: creative.type,
          uploadedAt: creative.uploadedAt,
          uploadedBy: creative.uploadedBy
        }));
      }

      await slot.save();
      console.log(`Migrated slot: ${slot._id}`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateSlots();
