import Activity from "../models/activityModel.js";

// Get my recent activities
export const getMyActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const activities = await Activity.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create activity (helper function, can be called from other controllers)
export const createActivity = async (activityData) => {
  try {
    const activity = await Activity.create(activityData);
    return activity;
  } catch (error) {
    console.error("Error creating activity:", error);
    throw error;
  }
};

// Delete old activities (cleanup function)
export const deleteOldActivities = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Activity.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
    });

    res.json({
      message: "Old activities deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting old activities:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
