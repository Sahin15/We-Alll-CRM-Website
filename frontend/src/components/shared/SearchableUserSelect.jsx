import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Form, InputGroup, ListGroup, Spinner } from "react-bootstrap";
import { FaSearch, FaTimes } from "react-icons/fa";
import "./SearchableUserSelect.css";

/**
 * @typedef {object} SearchableUserOption
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 */

/**
 * Searchable user picker (combobox) for admin forms.
 *
 * @param {object} props
 * @param {SearchableUserOption[]} props.users
 * @param {string} props.value - Selected user id
 * @param {(userId: string) => void} props.onChange
 * @param {boolean} [props.loading]
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 */
const SearchableUserSelect = ({
  users = [],
  value,
  onChange,
  loading = false,
  placeholder = "Search by name…",
  disabled = false,
}) => {
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const selectedUser = useMemo(
    () => users.find((user) => user._id === value) || null,
    [users, value]
  );

  const updateDropdownPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 2000,
    });
  };

  useEffect(() => {
    if (selectedUser) {
      setQuery(selectedUser.name);
    } else if (!value) {
      setQuery("");
    }
  }, [selectedUser, value]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return users.slice(0, 50);
    }

    return users
      .filter((user) => {
        const haystack = `${user.name || ""} ${user.email || ""} ${user.role || ""}`.toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 50);
  }, [users, query]);

  useEffect(() => {
    if (!open) return undefined;

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, query, filteredUsers.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inContainer = containerRef.current?.contains(event.target);
      const inDropdown = dropdownRef.current?.contains(event.target);
      if (!inContainer && !inDropdown) {
        setOpen(false);
        if (selectedUser) {
          setQuery(selectedUser.name);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedUser]);

  const handleSelect = (user) => {
    onChange(user._id);
    setQuery(user.name);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (event) => {
    const next = event.target.value;
    setQuery(next);
    setOpen(true);
    if (selectedUser && next !== selectedUser.name) {
      onChange("");
    }
  };

  const dropdownMenu =
    open && !disabled && dropdownStyle ? (
      <div ref={dropdownRef} style={dropdownStyle}>
        <ListGroup
          className="shadow searchable-user-select-menu"
          style={{
            maxHeight: "280px",
            overflowY: "auto",
            backgroundColor: "#fff",
          }}
        >
          {filteredUsers.length === 0 ? (
            <ListGroup.Item disabled className="small text-muted">
              No users match your search
            </ListGroup.Item>
          ) : (
            filteredUsers.map((user) => (
              <ListGroup.Item
                key={user._id}
                action
                active={user._id === value}
                onClick={() => handleSelect(user)}
              >
                {user.name}
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      </div>
    ) : null;

  if (loading) {
    return <Spinner size="sm" animation="border" />;
  }

  return (
    <div ref={containerRef} className="position-relative">
      <InputGroup className="searchable-user-select-field">
        <InputGroup.Text className="searchable-user-select-icon">
          <FaSearch className="text-muted" aria-hidden="true" />
        </InputGroup.Text>
        <Form.Control
          ref={inputRef}
          type="text"
          className="searchable-user-select-input"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true);
            updateDropdownPosition();
          }}
          autoComplete="off"
        />
        {query && !disabled && (
          <InputGroup.Text
            className="searchable-user-select-clear"
            role="button"
            tabIndex={0}
            aria-label="Clear user selection"
            onClick={handleClear}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleClear();
              }
            }}
          >
            <FaTimes className="text-muted" aria-hidden="true" />
          </InputGroup.Text>
        )}
      </InputGroup>

      {selectedUser && (
        <div className="mt-2 d-flex align-items-center gap-2 flex-wrap">
          <Badge bg="secondary" className="text-uppercase">
            {selectedUser.role}
          </Badge>
          <span className="small text-muted">{selectedUser.email}</span>
        </div>
      )}

      {typeof document !== "undefined" && dropdownMenu
        ? createPortal(dropdownMenu, document.body)
        : null}
    </div>
  );
};

export default SearchableUserSelect;
