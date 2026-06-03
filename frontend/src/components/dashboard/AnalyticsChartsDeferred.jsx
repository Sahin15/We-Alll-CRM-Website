import { lazy, Suspense } from "react";
import { Spinner } from "react-bootstrap";

const AnalyticsChartsCore = lazy(() => import("./AnalyticsCharts"));

/** Defers chart.js until dashboard renders this section. */
const AnalyticsChartsDeferred = (props) => (
  <Suspense
    fallback={
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" variant="primary" />
      </div>
    }
  >
    <AnalyticsChartsCore {...props} />
  </Suspense>
);

export default AnalyticsChartsDeferred;
