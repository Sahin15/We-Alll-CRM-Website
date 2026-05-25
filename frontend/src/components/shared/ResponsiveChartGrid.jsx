import { useBreakpoint } from "../../context/BreakpointContext";

const ResponsiveChartGrid = ({ children, className = "" }) => {
  const { isCompact, isAppMobile } = useBreakpoint();

  const columns = isCompact ? 1 : isAppMobile ? 2 : 3;

  return (
    <div
      className={`responsive-chart-grid ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: isCompact ? "0.75rem" : "1rem",
      }}
    >
      {children}
    </div>
  );
};

export const chartHeight = (isCompact) => (isCompact ? 220 : 300);

export default ResponsiveChartGrid;
