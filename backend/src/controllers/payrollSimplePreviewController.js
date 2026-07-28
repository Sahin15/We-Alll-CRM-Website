import {
  getSimplePayrollPreview,
} from "../services/payroll/simplePayrollPreviewService.js";

/**
 * GET /api/payroll/simple-preview?employee=&month=&year=&automaticDeductions=&applyAutomatic=
 * Default: Net ignores attendance LOP; attendanceReport is informational for HR.
 */
export const getSimplePreview = async (req, res) => {
  try {
    const { employee, month, year, automaticDeductions, applyAutomatic } =
      req.query;

    if (!employee || !month || !year) {
      return res.status(400).json({
        success: false,
        error: "employee, month, and year are required",
      });
    }

    const data = await getSimplePayrollPreview({
      employeeId: employee,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      automaticDeductions:
        automaticDeductions != null && automaticDeductions !== ""
          ? Number(automaticDeductions)
          : undefined,
      applyAutomaticDeductions:
        applyAutomatic === "1" ||
        applyAutomatic === "true" ||
        applyAutomatic === true,
    });

    if (!data.applicable) {
      return res.status(200).json({
        success: true,
        data,
        message: data.reason || "Simple preview not applicable",
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getSimplePreview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to build simple payroll preview",
    });
  }
};
