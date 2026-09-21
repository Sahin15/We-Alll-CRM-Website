/**
 * Reset creative work items stuck in invalid states (e.g. In Progress without a revision).
 *
 * Usage:
 *   node scripts/cleanup-stuck-creative-work.js --dry-run
 *   node scripts/cleanup-stuck-creative-work.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import WorkItem from "../src/models/workItemModel.js";
import CreativeRevision from "../src/models/creativeRevisionModel.js";

dotenv.config();

const isDryRun = process.argv.includes("--dry-run");

const isCreativeItem = (item) => {
  if (item.workflowMode === "creative") return true;
  const type = item.workflowType || item.departmentWorkflowType;
  return type === "design" || type === "design-advanced" || type === "video-production";
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const creativeItems = await WorkItem.find({
    $or: [
      { workflowMode: "creative" },
      { workflowType: { $in: ["design", "design-advanced", "video-production"] } },
    ],
    status: { $in: ["In Progress", "Rework In Progress"] },
    isDeleted: { $ne: true },
  }).select("_id title status workflowMode workflowType");

  let resetCount = 0;

  for (const item of creativeItems) {
    if (!isCreativeItem(item)) continue;

    const tipCount = await CreativeRevision.countDocuments({
      workItem: item._id,
      isCurrentTip: true,
    });

    if (tipCount > 0) continue;

    console.log(
      `${isDryRun ? "[dry-run] " : ""}Reset ${item._id} "${item.title}" (${item.status}) → To Do`
    );

    if (!isDryRun) {
      item.status = "To Do";
      item.statusHistory = item.statusHistory || [];
      item.statusHistory.push({
        fromStatus: "In Progress",
        toStatus: "To Do",
        changedAt: new Date(),
        changedBy: null,
        reason: "cleanup-stuck-creative-work: no revision tip",
      });
      await item.save();
    }

    resetCount += 1;
  }

  console.log(`Done. ${resetCount} item(s) ${isDryRun ? "would be" : "were"} reset.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
