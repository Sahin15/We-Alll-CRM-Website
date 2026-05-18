import { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Badge } from 'react-bootstrap';

/**
 * Modal shown after a Goods Receipt for trackable categories.
 * Lets the user select which received line items to register as assets.
 *
 * Props:
 *   show          – boolean
 *   onHide        – () => void
 *   grLineItems   – Array<{ _id, description, quantity, unitOfMeasure, category }>
 *   onCreateAsset – (selectedAssets: Array<{ lineItemId, name, quantity, category }>) => void
 */
export const AssetCreationPrompt = ({ show, onHide, grLineItems = [], onCreateAsset }) => {
  // Track which items are selected and their asset names
  const [selections, setSelections] = useState({});

  // Re-initialise whenever the modal opens with new items
  useEffect(() => {
    if (show) {
      const initial = {};
      grLineItems.forEach((item) => {
        initial[item._id] = {
          selected: true,
          name: item.description || '',
        };
      });
      setSelections(initial);
    }
  }, [show, grLineItems]);

  const handleToggle = (id) => {
    setSelections((prev) => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id]?.selected },
    }));
  };

  const handleNameChange = (id, value) => {
    setSelections((prev) => ({
      ...prev,
      [id]: { ...prev[id], name: value },
    }));
  };

  const handleSubmit = () => {
    const selectedAssets = grLineItems
      .filter((item) => selections[item._id]?.selected)
      .map((item) => ({
        lineItemId: item._id,
        name: selections[item._id]?.name || item.description,
        quantity: item.quantity,
        category: item.category,
      }));

    if (onCreateAsset) onCreateAsset(selectedAssets);
  };

  const selectedCount = Object.values(selections).filter((s) => s?.selected).length;

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Register Items as Assets</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="text-muted mb-3">
          The following items were received. Select the ones you want to register in the
          asset register and confirm their names.
        </p>

        {grLineItems.length === 0 ? (
          <p className="text-center text-muted">No trackable items found.</p>
        ) : (
          <Table responsive bordered hover size="sm">
            <thead className="table-light">
              <tr>
                <th style={{ width: 40 }}>
                  <Form.Check
                    type="checkbox"
                    aria-label="Select all"
                    checked={selectedCount === grLineItems.length}
                    onChange={(e) => {
                      const next = {};
                      grLineItems.forEach((item) => {
                        next[item._id] = { ...selections[item._id], selected: e.target.checked };
                      });
                      setSelections(next);
                    }}
                  />
                </th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Qty</th>
                <th>UoM</th>
              </tr>
            </thead>
            <tbody>
              {grLineItems.map((item) => (
                <tr key={item._id} className={selections[item._id]?.selected ? '' : 'table-secondary'}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      aria-label={`Select ${item.description}`}
                      checked={!!selections[item._id]?.selected}
                      onChange={() => handleToggle(item._id)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      size="sm"
                      type="text"
                      value={selections[item._id]?.name ?? item.description}
                      onChange={(e) => handleNameChange(item._id, e.target.value)}
                      disabled={!selections[item._id]?.selected}
                    />
                  </td>
                  <td>
                    <Badge bg="info" className="text-capitalize">
                      {item.category || '—'}
                    </Badge>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{item.unitOfMeasure || '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Skip
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={selectedCount === 0}
        >
          Register {selectedCount > 0 ? `${selectedCount} ` : ''}Asset{selectedCount !== 1 ? 's' : ''}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AssetCreationPrompt;
