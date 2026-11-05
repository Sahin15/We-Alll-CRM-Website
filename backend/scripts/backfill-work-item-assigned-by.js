/**
 * Backfill workItem.assignedBy for legacy rows (Assigned Work / timeline attribution).
 *
 * Sets assignedBy = slotAssignment.assignedBy ?? createdBy when an assignee exists
 * and assignedBy is not already set.
 *
 * Dry run (default): node backend/scripts/backfill-work-item-assigned-by.js
 * Apply:           node backend/scripts/backfill-work-item-assigned-by.js --apply
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

import WorkItem from "../src/models/workItemModel.js";

const apply = process.argv.includes("--apply");

async function backfillWorkItemAssignedBy() {
  await mongoose.connect(process.env.MONGO_URI);

  const cursor = WorkItem.find({
    isDeleted: { $ne: true },
    $or: [{ assignedBy: null }, { assignedBy: { $exists: false } }],
    $and: [
      {
        $or: [
          { assignedTo: { $exists: true, $ne: null } },
          { assignedToMultiple: { $exists: true, $not: { $size: 0 } } },
        ],
      },
    ],
  })
    .select("_id title assignedBy createdBy assignedTo slotAssignment.assignedBy")
    .cursor();

  let scanned = 0;
  let wouldUpdate = 0;
  let updated = 0;

  for await (const doc of cursor) {
    scanned += 1;
    const slotAssigner = doc.slotAssignment?.assignedBy;
    const fallback = slotAssigner || doc.createdBy;
    if (!fallback) continue;

    wouldUpdate += 1;
    if (apply) {
      await WorkItem.updateOne({ _id: doc._id }, { $set: { assignedBy: fallback } });
      updated += 1;
    }
  }

  console.log(
    apply
      ? `Backfill complete: scanned=${scanned}, updated=${updated}`
      : `Dry run: scanned=${scanned}, wouldUpdate=${wouldUpdate} (re-run with --apply to write)`
  );

  await mongoose.disconnect();
}

backfillWorkItemAssignedBy().catch((err) => {
  console.error(err);
  process.exit(1);
});
