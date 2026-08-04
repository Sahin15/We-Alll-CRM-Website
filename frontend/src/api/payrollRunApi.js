import api from "../services/api";
import { downloadBlobResponse } from "./payrollReportApi";

/**
 * Payroll dual-run APIs (R3 / PH-10 staging validation).
 */
export const payrollRunApi = {
  dualRunEmployee: (data) => api.post("/payroll/runs/dual-run", data),
  dualRunMonth: (data, params = {}) =>
    api.post("/payroll/runs/dual-run/month", data, { params }),
  dualRunMonthCsv: (data, params = {}) =>
    api.post(
      "/payroll/runs/dual-run/month",
      data,
      {
        params: { ...params, format: "csv" },
        responseType: "blob",
      }
    ),
};

/**
 * @param {import("axios").AxiosResponse} response
 * @param {{ month: number, year: number }} period
 */
export function downloadDualRunCsv(response, period) {
  const fallback = `dual-run-${period.year}-${String(period.month).padStart(2, "0")}.csv`;
  downloadBlobResponse(response, fallback);
}

export default payrollRunApi;
