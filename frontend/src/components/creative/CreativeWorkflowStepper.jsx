import React from 'react';

const BASE_STEPS = [
  { key: 'start', label: 'Start', statuses: ['To Do', 'Assigned', 'Backlog'] },
  { key: 'work', label: 'Work', statuses: ['In Progress', 'Rework In Progress', 'Changes Requested'] },
  { key: 'review', label: 'Review', statuses: ['Submitted for Review'] },
  { key: 'qa', label: 'QA', statuses: ['QA Review'] },
  { key: 'approved', label: 'Approved', statuses: ['Approved'] },
  { key: 'deliver', label: 'Delivered', statuses: ['Delivered'] },
];

const POSTING_STEP = { key: 'posting', label: 'Posting', statuses: ['Awaiting Posting', 'Posted'] };
const CLOSE_STEP = { key: 'close', label: 'Closed', statuses: ['Closed'] };

/**
 * Horizontal workflow stepper for creative tasks.
 * @param {{ status: string, requiresPosting?: boolean }} props
 */
const CreativeWorkflowStepper = ({ status = '', requiresPosting = false }) => {
  const steps = requiresPosting
    ? [...BASE_STEPS, POSTING_STEP, CLOSE_STEP]
    : [...BASE_STEPS, CLOSE_STEP];

  const activeIndex = steps.findIndex((step) => step.statuses.includes(status));
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;
        const variant = isComplete ? 'success' : isActive ? 'primary' : 'secondary';

        return (
          <div
            key={step.key}
            className={`badge bg-${variant}${isActive ? '' : ' bg-opacity-25 text-dark'}`}
            style={{ fontSize: '0.75rem', padding: '0.45em 0.65em' }}
          >
            {step.label}
          </div>
        );
      })}
    </div>
  );
};

export default CreativeWorkflowStepper;
