import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected\n');
    
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({
      employee: mongoose.Schema.Types.ObjectId,
      date: Date,
      clockIn: Date,
      status: String
    }));
    
    const User = mongoose.model('User', new mongoose.Schema({ 
      name: String, 
      email: String 
    }));
    
    const suman = await User.findOne({ email: /sumanwealll/i });
    console.log('Suman ID:', suman._id.toString());
    
    // Get today in IST
    const now = new Date();
    const istString = now.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    const [month, day, year] = istString.split(', ')[0].split('/');
    const todayStart = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('\nToday Range:');
    console.log('Start:', todayStart.toISOString());
    console.log('End:', todayEnd.toISOString());
    
    const existing = await Attendance.findOne({
      employee: suman._id,
      date: { $gte: todayStart, $lt: todayEnd }
    });
    
    if (existing) {
      console.log('\n❌ FOUND RECORD:');
      console.log('Date:', existing.date.toISOString());
      console.log('Clock-in:', existing.clockIn.toISOString());
      console.log('Status:', existing.status);
    } else {
      console.log('\n✅ No record found');
    }
    
    // Check last 3 records
    console.log('\nLast 3 records:');
    const last3 = await Attendance.find({ employee: suman._id })
      .sort({ date: -1 })
      .limit(3);
    
    last3.forEach(r => {
      console.log(`  ${r.date.toISOString()} - ${r.status}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

check();
