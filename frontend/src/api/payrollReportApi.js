import api from "../services/api";

/**
 * Trigger a browser download from an axios blob response.
 * @param {import("axios").AxiosResponse} response
 * @param {string} fallbackFileName
 */
export function downloadBlobResponse(response, fallbackFileName) {
  const disposition = response.headers?.["content-disposition"] || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const fileName = (match?.[1] || fallbackFileName).trim();
  const blob = new Blob([response.data], {
    type: response.headers?.["content-type"] || "text/csv;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Payroll reporting / bank export APIs (V2 Milestone 8 / R4 Ops UI).
 */
export const payrollReportApi = {
  getCapabilities: () => api.get("/payroll/reports/capabilities"),
  getExportHistory: (params) => api.get("/payroll/reports/exports", { params }),
  downloadBankNeft: (params) =>
    api.get("/payroll/reports/bank-neft.csv", {
      params,
      responseType: "blob",
    }),
  downloadRegister: (registerId, params) =>
    api.get(`/payroll/reports/registers/${registerId}.csv`, {
      params,
      responseType: "blob",
    }),
};

export default payrollReportApi;
