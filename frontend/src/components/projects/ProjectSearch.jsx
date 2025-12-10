import { InputGroup, Form } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';

/**
 * ProjectSearch Component
 * Provides search functionality for projects
 */
const ProjectSearch = ({ searchTerm, onSearchChange, placeholder }) => {
  return (
    <InputGroup>
      <InputGroup.Text>
        <FaSearch />
      </InputGroup.Text>
      <Form.Control
        type="text"
        placeholder={placeholder || 'Search projects by name, client, or description...'}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </InputGroup>
  );
};

export default ProjectSearch;
