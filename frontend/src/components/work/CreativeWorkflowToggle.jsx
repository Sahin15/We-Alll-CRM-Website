import { Form, Alert } from 'react-bootstrap';

/**
 * Explicit creative workflow choice (Graphic / Video) on assign/create forms.
 * @param {object} props
 * @param {boolean} props.checked
 * @param {boolean} props.disabled
 * @param {boolean} props.eligible - assignee/project qualifies for Graphic/Video
 * @param {(checked: boolean) => void} props.onChange
 */
const CreativeWorkflowToggle = ({ checked, disabled, eligible, onChange }) => (
  <div className="border rounded p-3 mb-3 bg-white">
    <Form.Check
      type="checkbox"
      id="use-creative-workflow"
      className="mb-1"
      label="Use creative workflow (Graphic / Video steps)"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <Form.Text className="text-muted d-block">
      Review, revisions, QA, and optional Posting handoff. Turn off for a simple task
      (To Do → In Progress → Done).
    </Form.Text>
    {!eligible && !checked && (
      <Alert variant="secondary" className="py-2 small mt-2 mb-0">
        Defaults to creative when the assignee is in Graphic or Video Production (or has
        a creative project role). Select a Graphic/Video assignee to enable this option.
      </Alert>
    )}
  </div>
);

export default CreativeWorkflowToggle;
