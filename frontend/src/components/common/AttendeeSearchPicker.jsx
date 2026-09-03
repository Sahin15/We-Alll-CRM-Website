import { useMemo, useState } from "react";
import { Badge, Form, InputGroup, ListGroup } from "react-bootstrap";
import { FaSearch, FaTimes, FaUserPlus, FaCheck } from "react-icons/fa";

/**
 * Searchable attendee picker — names only, click to add/remove.
 *
 * @param {object} props
 * @param {Array<{ _id: string, name: string }>} props.employees
 * @param {string[]} props.selectedIds
 * @param {(ids: string[]) => void} props.onChange
 * @param {string[]} [props.excludeIds]
 * @param {string} [props.label]
 * @param {boolean} [props.required]
 * @param {string} [props.emptyMessage]
 */
const AttendeeSearchPicker = ({
  employees = [],
  selectedIds = [],
  onChange,
  excludeIds = [],
  label = "Attendees",
  required = false,
  emptyMessage = "No employees match your search.",
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const excludedSet = useMemo(
    () => new Set(excludeIds.map((id) => String(id))),
    [excludeIds]
  );

  const selectedSet = useMemo(
    () => new Set(selectedIds.map((id) => String(id))),
    [selectedIds]
  );

  const availableEmployees = useMemo(
    () => employees.filter((employee) => !excludedSet.has(String(employee._id))),
    [employees, excludedSet]
  );

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return availableEmployees;

    return availableEmployees.filter((employee) =>
      employee.name?.toLowerCase().includes(query)
    );
  }, [availableEmployees, searchTerm]);

  const selectedEmployees = useMemo(
    () =>
      availableEmployees.filter((employee) =>
        selectedSet.has(String(employee._id))
      ),
    [availableEmployees, selectedSet]
  );

  const toggleEmployee = (employeeId) => {
    const id = String(employeeId);
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((selectedId) => String(selectedId) !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  const removeEmployee = (employeeId) => {
    const id = String(employeeId);
    onChange(selectedIds.filter((selectedId) => String(selectedId) !== id));
  };

  return (
    <Form.Group className="mb-0">
      <Form.Label>
        {label}
        {required ? " *" : ""}
      </Form.Label>

      {selectedEmployees.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {selectedEmployees.map((employee) => (
            <Badge
              key={employee._id}
              bg="primary"
              className="d-inline-flex align-items-center gap-2 py-2 px-3"
              style={{ fontSize: "0.85rem", fontWeight: 500 }}
            >
              {employee.name}
              <button
                type="button"
                className="btn btn-link p-0 border-0 text-white"
                onClick={() => removeEmployee(employee._id)}
                aria-label={`Remove ${employee.name}`}
                style={{ lineHeight: 1, opacity: 0.9 }}
              >
                <FaTimes size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <InputGroup className="mb-2">
        <InputGroup.Text>
          <FaSearch />
        </InputGroup.Text>
        <Form.Control
          type="search"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      <div
        style={{
          maxHeight: "220px",
          overflowY: "auto",
          border: "1px solid #dee2e6",
          borderRadius: "0.375rem",
        }}
      >
        {filteredEmployees.length > 0 ? (
          <ListGroup variant="flush">
            {filteredEmployees.map((employee) => {
              const isSelected = selectedSet.has(String(employee._id));
              return (
                <ListGroup.Item
                  key={employee._id}
                  action
                  active={isSelected}
                  onClick={() => toggleEmployee(employee._id)}
                  className="d-flex align-items-center justify-content-between py-2"
                  style={{ cursor: "pointer" }}
                >
                  <span className="fw-medium">{employee.name}</span>
                  {isSelected ? (
                    <FaCheck className="text-primary" />
                  ) : (
                    <FaUserPlus className="text-muted" size={14} />
                  )}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        ) : (
          <div className="text-muted text-center py-4 px-3 small">
            {availableEmployees.length === 0
              ? "Everyone available is already on this meeting."
              : emptyMessage}
          </div>
        )}
      </div>

      <Form.Text className="text-muted">
        Selected: {selectedIds.length} attendee(s). Click a name to add or remove.
      </Form.Text>
    </Form.Group>
  );
};

export default AttendeeSearchPicker;
