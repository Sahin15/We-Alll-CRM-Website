import {
  buildCompensationTimeline,
  getCompensationRoster,
} from "../services/payroll/compensationTimelineService.js";

export const getCompensationRosterHandler = async (req, res) => {
  try {
    const data = await getCompensationRoster();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getCompensationRoster:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to load compensation roster",
    });
  }
};

export const getCompensationTimelineHandler = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const data = await buildCompensationTimeline(employeeId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.httpStatus === 404) {
      return res.status(404).json({ success: false, error: error.message });
    }
    console.error("getCompensationTimeline:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to load timeline",
    });
  }
};
