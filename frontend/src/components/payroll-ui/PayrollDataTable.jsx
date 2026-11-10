import { Form, Table } from "react-bootstrap";

/**
 * @param {object} props
 */
const PayrollDataTable = ({
  children,
  headers,
  selectable,
  allSelected,
  onToggleAll,
  responsive = true,
  size = "sm",
}) => {
  const table = (
    <Table hover className="mb-0 align-middle" size={size}>
      <thead className="table-light">
        <tr>
          {selectable && (
            <th style={{ width: 40 }}>
              <Form.Check
                type="checkbox"
                aria-label="Select all rows"
                checked={allSelected}
                onChange={(e) => onToggleAll?.(e.target.checked)}
              />
            </th>
          )}
          {headers}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </Table>
  );

  return responsive ? (
    <div className="table-responsive">{table}</div>
  ) : (
    table
  );
};

export default PayrollDataTable;
