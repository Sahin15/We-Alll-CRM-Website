import { ButtonGroup, Button } from 'react-bootstrap';
import { FaList, FaLayerGroup } from 'react-icons/fa';

/**
 * ViewToggle - Switch between "All Work" and "By Slots" views
 * Only renders when project has slots enabled
 */
const ViewToggle = ({ viewMode, onViewChange, slotsEnabled }) => {
  if (!slotsEnabled) return null;

  return (
    <ButtonGroup size="sm">
      <Button
        variant={viewMode === 'all' ? 'primary' : 'outline-primary'}
        onClick={() => onViewChange('all')}
      >
        <FaList className="me-1" />
        All Work
      </Button>
      <Button
        variant={viewMode === 'slots' ? 'primary' : 'outline-primary'}
        onClick={() => onViewChange('slots')}
      >
        <FaLayerGroup className="me-1" />
        By Slots
      </Button>
    </ButtonGroup>
  );
};

export default ViewToggle;
