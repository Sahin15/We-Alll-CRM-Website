/**
 * Chart color palettes for light/dark themes.
 * Use with Chart.js or Recharts when configuring datasets.
 */
export const getChartTheme = (theme = "light") => {
  const isDark = theme === "dark";

  return {
    textColor: isDark ? "#94a3b8" : "#64748b",
    gridColor: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(0, 0, 0, 0.06)",
    tooltipBg: isDark ? "#1c2230" : "#ffffff",
    tooltipBorder: isDark ? "rgba(148, 163, 184, 0.2)" : "#e2e8f0",
    tooltipText: isDark ? "#f1f5f9" : "#0f172a",
    palette: isDark
      ? ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa", "#a78bfa", "#fb923c"]
      : ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#f97316"],
    backgroundColor: isDark ? "#141820" : "#ffffff",
  };
};

export default getChartTheme;
