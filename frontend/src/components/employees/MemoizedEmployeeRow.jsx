import { memo, useCallback } from "react";
import { Badge } from "react-bootstrap";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";

/**
 * Memoized Employee Table Row Component
 * Prevents unnecessary re-renders of table rows
 * Only re-renders if employee data or callbacks change
 */
const MemoizedEmployeeRow = memo(({ 
  employee, 
  onEdit, 
  onDelete, 
  onView,
  getDepartmentColor,
  getRoleColor
}) => {
  // Memoize click handlers
  const handleEdit = useCallback(() => {
    if (onEdit) onEdit(employee);
  }, [employee, onEdit]);

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(employee);
  }, [employee, onDelete]);

  const handleView = useCallback(() => {
    if (onView) onView(employee);
  }, [employee, onView]);

  return (
    <tr>
      <td className="text-truncate" title={employee.name}>
        {employee.name}
      </td>
      <td className="text-truncate" title={employee.email}>
        {employee.email}
      </td>
      <td className="text-truncate" title={employee.phone}>
        {employee.phone || '-'}
      </td>
      <td>
        {getDepartmentColor && employee.department && (
          <Badge bg={getDepartmentColor(employee.department)}>
            {employee.department}
          </Badge>
        )}
      </td>
      <td>
        {getRoleColor && (
          <Badge bg={getRoleColor(employee.role)}>
            {employee.role}
          </Badge>
        )}
      </td>
      <td>
        <Badge bg={employee.status === 'active' ? 'success' : 'danger'}>
          {employee.status}
        </Badge>
      </td>
      <td>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-sm btn-info"
            onClick={handleView}
            title="View"
          >
            <FaEye />
          </button>
          <button 
            className="btn btn-sm btn-warning"
            onClick={handleEdit}
            title="Edit"
          >
            <FaEdit />
          </button>
          <button 
            className="btn btn-sm btn-danger"
            onClick={handleDelete}
            title="Delete"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if employee data changes
  return (
    prevProps.employee._id === nextProps.employee._id &&
    prevProps.employee.name === nextProps.employee.name &&
    prevProps.employee.status === nextProps.employee.status
  );
});

MemoizedEmployeeRow.displayName = 'MemoizedEmployeeRow';

export default MemoizedEmployeeRow;
