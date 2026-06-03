/**
 * Dynamic loaders for heavy libraries — only fetched when export/report/chart runs.
 */

let xlsxModule = null;
export async function loadXlsx() {
  if (!xlsxModule) {
    xlsxModule = await import("xlsx");
  }
  return xlsxModule;
}

let pdfModule = null;
export async function loadPdfExport() {
  if (!pdfModule) {
    const [{ jsPDF }, autoTable] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    pdfModule = { jsPDF, autoTable: autoTable.default };
  }
  return pdfModule;
}

let chartJsModule = null;
export async function loadChartJs() {
  if (!chartJsModule) {
    const [chart, reactChart] = await Promise.all([
      import("chart.js"),
      import("react-chartjs-2"),
    ]);
    chartJsModule = { chart, reactChart };
  }
  return chartJsModule;
}

let rechartsModule = null;
export async function loadRecharts() {
  if (!rechartsModule) {
    rechartsModule = await import("recharts");
  }
  return rechartsModule;
}

let html2canvasModule = null;
export async function loadHtml2Canvas() {
  if (!html2canvasModule) {
    html2canvasModule = (await import("html2canvas")).default;
  }
  return html2canvasModule;
}
