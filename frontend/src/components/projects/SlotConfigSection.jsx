import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * SlotConfigSection Component
 * Checkbox and configuration for enabling slots during project creation
 */
const SlotConfigSection = ({ enabled, onToggle, totalSlots, onSlotsChange }) => {
  return (
    <div className="slot-config-section mb-3">
      <Form.Group>
        <Form.Check
          type="checkbox"
          id="enableSlots"
          label="Enable slot-based tracking"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <Form.Text className="text-muted">
          Organize work into numbered project phases (Slot 1, Slot 2, etc.) for better tracking
        </Form.Text>
      </Form.Group>

      {enabled && (
        <Form.Group className="mt-3">
          <Form.Label>Total Slots</Form.Label>
          <Form.Control
            type="number"
            min="1"
            max="1000"
            value={totalSlots}
            onChange={(e) => onSlotsChange(parseInt(e.target.value) || 10)}
            placeholder="Enter number of slots"
          />
          <Form.Text className="text-muted">
            Number of project phases/stages (default: 10, range: 1-1000)
          </Form.Text>
        </Form.Group>
      )}
    </div>
  );
};

export default SlotConfigSection;
