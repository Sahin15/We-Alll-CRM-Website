import { Form } from "react-bootstrap";

const FilterDropdown = ({
  label,
  options,
  value,
  onChange,
  placeholder = "All",
  className = "",
}) => {
  return (
    <Form.Group className={className}>
      {label && <Form.Label className="small text-muted">{label}</Form.Label>}
      <Form.Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
};

export default FilterDropdown;
