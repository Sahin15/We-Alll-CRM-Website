import { useMemo, useState } from "react";
import { Badge, Button, Form, InputGroup } from "react-bootstrap";
import { FaSearch, FaTimes } from "react-icons/fa";

/**
 * Searchable checkbox picker for selecting multiple interviewers.
 * @param {{
 *   users: Array<{ _id: string, name?: string, role?: string, email?: string, designation?: string }>,
 *   value: string[],
 *   onChange: (ids: string[]) => void,
 * }} props
 */
const InterviewerMultiSelect = ({ users = [], value = [], onChange }) => {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.designation?.toLowerCase().includes(query)
    );
  }, [users, search]);

  const selectedUsers = useMemo(
    () => users.filter((user) => value.includes(user._id)),
    [users, value]
  );

  const toggleUser = (userId) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
      return;
    }
    onChange([...value, userId]);
  };

  const removeUser = (userId) => {
    onChange(value.filter((id) => id !== userId));
  };

  return (
    <div>
      {selectedUsers.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user._id}
              bg="primary"
              className="d-inline-flex align-items-center gap-1 py-2 px-2"
            >
              {user.name}
              <Button
                variant="link"
                className="p-0 text-white text-decoration-none lh-1"
                aria-label={`Remove ${user.name}`}
                onClick={() => removeUser(user._id)}
              >
                <FaTimes size={12} />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      <InputGroup className="mb-2">
        <InputGroup.Text>
          <FaSearch />
        </InputGroup.Text>
        <Form.Control
          placeholder="Search by name, role, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>

      <div
        className="border rounded p-2"
        style={{ maxHeight: 200, overflowY: "auto" }}
      >
        {filteredUsers.length === 0 ? (
          <p className="text-muted small mb-0 px-1 py-2">No people match your search</p>
        ) : (
          filteredUsers.map((user) => (
            <Form.Check
              key={user._id}
              type="checkbox"
              id={`interviewer-${user._id}`}
              className="mb-1"
              label={
                <span>
                  {user.name}
                  <span className="text-muted ms-1">
                    ({user.designation || user.role || "staff"})
                  </span>
                </span>
              }
              checked={value.includes(user._id)}
              onChange={() => toggleUser(user._id)}
            />
          ))
        )}
      </div>

      <Form.Text>
        {value.length === 0
          ? "Select one or more interviewers"
          : `${value.length} interviewer${value.length === 1 ? "" : "s"} selected`}
      </Form.Text>
    </div>
  );
};

export default InterviewerMultiSelect;
