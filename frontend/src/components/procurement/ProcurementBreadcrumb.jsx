import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb navigation for procurement pages.
 *
 * Props:
 *   items – Array<{ label: string, href?: string }>
 *           The last item should have no href (it becomes the active crumb).
 *
 * Usage:
 *   <ProcurementBreadcrumb
 *     items={[
 *       { label: 'Home', href: '/' },
 *       { label: 'Procurement', href: '/procurement' },
 *       { label: 'Purchase Requests' },
 *     ]}
 *   />
 */
export const ProcurementBreadcrumb = ({ items = [] }) => {
  return (
    <Breadcrumb className="mb-3">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Breadcrumb.Item
            key={index}
            active={isLast}
            linkAs={!isLast && item.href ? Link : undefined}
            linkProps={!isLast && item.href ? { to: item.href } : undefined}
          >
            {item.label}
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
};

export default ProcurementBreadcrumb;
