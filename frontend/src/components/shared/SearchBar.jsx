import { useState, useEffect } from "react";
import { Form, InputGroup } from "react-bootstrap";
import { FaSearch, FaTimes } from "react-icons/fa";

const SearchBar = ({
  placeholder = "Search...",
  onSearch,
  debounceMs = 300,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs, onSearch]);

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  return (
    <InputGroup className={className}>
      <InputGroup.Text>
        <FaSearch />
      </InputGroup.Text>
      <Form.Control
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <InputGroup.Text
          onClick={handleClear}
          style={{ cursor: "pointer" }}
          className="bg-light"
        >
          <FaTimes />
        </InputGroup.Text>
      )}
    </InputGroup>
  );
};

export default SearchBar;
