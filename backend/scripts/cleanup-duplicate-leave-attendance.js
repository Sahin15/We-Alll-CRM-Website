import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  toISTDateKey,
  preferAttendanceRecord,
} from "../src/utils/attendanceISTDay.js";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const attendance = mongoose.connection.db.collection("attendances");

  const from = new Date("2026-08-01T00:00:00.000Z");
  const rows = await attendance
    .find({ date: { $gte: from }, status: "on-leave" })
    .toArray();

  const groups = new Map();
  for (const r of rows) {
    const key = `${r.employee.toString()}-${toISTDateKey(r.date)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const toDelete = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    let keep = list[0];
    for (let i = 1; i < list.length; i += 1) {
      keep = preferAttendanceRecord(keep, list[i]);
    }
    for (const r of list) {
      if (String(r._id) !== String(keep._id)) {
        toDelete.push(r._id);
        console.log("DELETE", {
          key,
          id: String(r._id),
          date: r.date,
          notes: (r.notes || "").slice(0, 60),
          keepId: String(keep._id),
          keepDate: keep.date,
        });
      }
    }
  }

  if (toDelete.length) {
    const result = await attendance.deleteMany({ _id: { $in: toDelete } });
    console.log("Deleted", result.deletedCount);
  } else {
    console.log("No duplicates found");
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
