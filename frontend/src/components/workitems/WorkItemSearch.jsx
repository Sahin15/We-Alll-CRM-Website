import { InputGroup, Form } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';

/**
 * WorkItemSearch Component
 * Provides search functionality for work items
 */
const WorkItemSearch = ({ searchTerm, onSearchChange, placeholder }) => {
  return (
    <InputGroup>
      <InputGroup.Text>
        <FaSearch />
      </InputGroup.Text>
      <Form.Control
        type="text"
        placeholder={placeholder || 'Search by title, description, project, or tags...'}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </InputGroup>
  );
};

export default WorkItemSearch;
