import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    const workItems = db.collection('workitems');
    const users = db.collection('users');
    const slots = db.collection('slots');
    
    // Find Monoj Hati
    const monoj = await users.findOne({ 
      name: { $regex: 'monoj hati', $options: 'i' }
    });
    
    if (!monoj) {
      console.log('❌ Monoj Hati not found');
      console.log('\nSearching for users with "monoj" in name:');
      const monjUsers = await users.find({ 
        name: { $regex: 'monoj', $options: 'i' }
      }).toArray();
      monjUsers.forEach(u => console.log(`- ${u.name}`));
      return;
    }
    
    console.log(`✅ Found user: ${monoj.name} (ID: ${monoj._id})`);
    
    // Find work items assigned to Monoj
    const monjWorkItems = await workItems.find({
      assignedTo: monoj._id
    }).toArray();
    
    console.log(`\nWork items assigned to ${monoj.name}: ${monjWorkItems.length}`);
    monjWorkItems.forEach(item => {
      console.log(`- ${item.title} (Slot ${item.slotNumber}) - Date: ${item.date} - Status: ${item.status}`);
    });
    
    // Check for April 7 work items
    const april7Start = new Date('2026-04-07');
    april7Start.setHours(0, 0, 0, 0);
    const april7End = new Date('2026-04-07');
    april7End.setHours(23, 59, 59, 999);
    
    const april7Items = await workItems.find({
      assignedTo: monoj._id,
      date: { $gte: april7Start, $lte: april7End }
    }).toArray();
    
    console.log(`\nWork items for ${monoj.name} on April 7: ${april7Items.length}`);
    april7Items.forEach(item => {
      console.log(`- ${item.title} (Slot ${item.slotNumber})`);
    });
    
    // Check slots for April 7
    console.log(`\n\nChecking slots for April 7:`);
    const april7Slots = await slots.find({
      'period.periodIdentifier': '2026-04',
      slotNumber: 1
    }).toArray();
    
    console.log(`Slots with Slot Number 1 in April 2026: ${april7Slots.length}`);
    april7Slots.slice(0, 5).forEach(slot => {
      console.log(`- Project: ${slot.project}, Title: ${slot.title}, Assigned: ${slot.assignedWorkItem}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}).catch(err => console.error('Connection error:', err.message));
