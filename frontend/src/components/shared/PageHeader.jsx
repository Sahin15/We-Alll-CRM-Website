import { useBreakpoint } from "../../context/BreakpointContext";

const PageHeader = ({ title, subtitle, actions }) => {
  const { isAppMobile } = useBreakpoint();

  return (
    <div
      className={`page-header d-flex mb-3 mb-md-4 ${
        isAppMobile ? "flex-column gap-2" : "flex-row justify-content-between align-items-center"
      }`}
    >
      <div>
        {title && (
          <h1 className={`h3 mb-0 page-header__title ${isAppMobile ? "fs-5" : ""}`}>{title}</h1>
        )}
        {subtitle && <p className="text-muted mb-0 small mt-1 page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className={`page-header-actions d-flex gap-2 ${isAppMobile ? "w-100 flex-column" : "flex-wrap"}`}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
