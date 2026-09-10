import React, { useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { buildUnifiedStepTimeline, formatClockTime } from '../../utils/creativeTimeUtils';

/**
 * Single chronological time audit — assignee steps + delivery (no duplicate sections).
 *
 * @param {{
 *   revisions?: object[],
 *   workItem?: object|null,
 *   loading?: boolean,
 * }} props
 */
const CreativeStepTimeline = ({ revisions = [], workItem = null, loading = false }) => {
  const events = useMemo(
    () => buildUnifiedStepTimeline(revisions, workItem),
    [revisions, workItem]
  );

  const hasWorkItemMilestones = (workItem?.statusHistory?.length || 0) > 0;

  if (events.length === 0 && !loading && !hasWorkItemMilestones) {
    return null;
  }

  return (
    <div className="border rounded p-2 mb-3 bg-white">
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="small fw-bold">Time by step</span>
        {loading && events.length === 0 && (
          <Spinner animation="border" size="sm" />
        )}
      </div>
      {events.length === 0 ? (
        <p className="small text-muted mb-0">
          {loading ? 'Loading step times…' : 'No step times recorded yet.'}
        </p>
      ) : (
        <>
          <ul className="small mb-0 ps-3">
            {events.map((event, idx) => (
              <li key={`step-${event.sortKey}-${idx}`} className="mb-2">
                <strong>{formatClockTime(event.at)}</strong>
                {' — '}
                {event.primary}
                {event.secondary ? (
                  <span className="text-muted d-block">{event.secondary}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {loading && (
            <p className="small text-muted mb-0 mt-2">Updating step times…</p>
          )}
        </>
      )}
    </div>
  );
};

export default CreativeStepTimeline;
