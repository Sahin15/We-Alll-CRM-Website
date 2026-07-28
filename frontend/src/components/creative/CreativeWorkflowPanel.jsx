import React, { useMemo, useState } from "react";
import { Alert, Button, Form, ListGroup, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import creativeWorkflowApi from "../../api/creativeWorkflowApi";

/**
 * Creative revision + posting actions panel for a work item.
 */
const CreativeWorkflowPanel = ({ workItem, onUpdated }) => {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [postUrlsText, setPostUrlsText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const workItemId = workItem?._id || workItem?.id;
  const isCreative =
    workItem?.workflowMode === "creative" ||
    workItem?.workflowType === "design" ||
    workItem?.workflowType === "video-production";

  const tip = useMemo(
    () => revisions.find((r) => r.isCurrentTip) || revisions[0],
    [revisions]
  );

  const loadRevisions = async () => {
    if (!workItemId) return;
    setLoading(true);
    try {
      const res = await creativeWorkflowApi.listRevisions(workItemId);
      setRevisions(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load revisions");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isCreative && workItemId) {
      loadRevisions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workItemId, isCreative]);

  if (!isCreative) {
    return null;
  }

  const runAction = async (fn, successMessage) => {
    setLoading(true);
    try {
      await fn();
      toast.success(successMessage);
      await loadRevisions();
      if (onUpdated) onUpdated();
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded p-3 bg-light">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Creative Workflow</h6>
        <Button size="sm" variant="outline-secondary" onClick={loadRevisions} disabled={loading}>
          Refresh
        </Button>
      </div>

      <p className="small text-muted mb-2">
        Status: <strong>{workItem.status}</strong>
        {workItem.requiresPosting ? (
          <>
            {" "}
            · Posting date:{" "}
            <strong>
              {workItem.postingDate
                ? new Date(workItem.postingDate).toLocaleDateString()
                : "—"}
            </strong>
          </>
        ) : (
          " · Client posts (no Posting department)"
        )}
      </p>

      {loading && <Spinner animation="border" size="sm" className="mb-2" />}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          onClick={() => runAction(() => creativeWorkflowApi.startWork(workItemId), "Work started")}
        >
          Start / Revision 1
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() =>
            runAction(() => creativeWorkflowApi.submitForReview(workItemId), "Submitted for review")
          }
        >
          Submit for Review
        </Button>
        <Button
          size="sm"
          variant="warning"
          onClick={() =>
            runAction(
              () =>
                creativeWorkflowApi.recordReview(workItemId, {
                  decision: "minor",
                  notes: reviewNotes || "Minor changes requested",
                }),
              "Changes requested"
            )
          }
        >
          Request Minor Changes
        </Button>
        <Button
          size="sm"
          variant="success"
          onClick={() =>
            runAction(
              () =>
                creativeWorkflowApi.recordReview(workItemId, {
                  decision: "approve",
                  notes: reviewNotes,
                }),
              "Approved"
            )
          }
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline-warning"
          onClick={() =>
            runAction(() => creativeWorkflowApi.startRework(workItemId), "Rework started")
          }
        >
          Start Rework
        </Button>
        <Button
          size="sm"
          variant="outline-success"
          onClick={() =>
            runAction(() => creativeWorkflowApi.markDelivered(workItemId), "Delivered")
          }
        >
          Mark Delivered
        </Button>
        <Button
          size="sm"
          variant="dark"
          onClick={() => runAction(() => creativeWorkflowApi.closeTask(workItemId), "Closed")}
        >
          Close
        </Button>
      </div>

      <Form.Group className="mb-3">
        <Form.Label className="small fw-bold">Review / QA notes</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="Notes for reject / major rework / QA fail"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label className="small fw-bold">Add file URL to current draft revision</Form.Label>
        <div className="d-flex gap-2">
          <Form.Control
            placeholder="File name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <Form.Control
            placeholder="https://..."
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() =>
              runAction(
                () =>
                  creativeWorkflowApi.addRevisionAttachment(workItemId, {
                    name: fileName || "attachment",
                    url: fileUrl,
                    type: "other",
                  }),
                "Attachment added"
              )
            }
            disabled={!fileUrl}
          >
            Add
          </Button>
        </div>
      </Form.Group>

      {workItem.requiresPosting &&
        (workItem.status === "Awaiting Posting" || workItem.status === "Delivered") && (
          <Alert variant="info" className="mb-3">
            <Form.Group className="mb-2">
              <Form.Label className="fw-bold">Post URL(s) — one per line</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={postUrlsText}
                onChange={(e) => setPostUrlsText(e.target.value)}
                placeholder="https://instagram.com/p/...&#10;https://facebook.com/..."
              />
            </Form.Group>
            <Button
              size="sm"
              variant="success"
              onClick={() =>
                runAction(
                  () =>
                    creativeWorkflowApi.submitPostingDone(workItemId, {
                      postUrls: postUrlsText
                        .split("\n")
                        .map((u) => u.trim())
                        .filter(Boolean),
                    }),
                  "Posting marked done"
                )
              }
            >
              Submit Posting Done
            </Button>
          </Alert>
        )}

      <h6 className="mt-2">Revisions</h6>
      {revisions.length === 0 ? (
        <p className="small text-muted mb-0">No revisions yet. Click Start / Revision 1.</p>
      ) : (
        <ListGroup>
          {revisions.map((rev) => (
            <ListGroup.Item key={rev._id}>
              <strong>Revision {rev.revisionNumber}</strong>
              {rev.isCurrentTip ? " (current)" : ""} — {rev.status}
              {rev.parentRevision?.revisionNumber
                ? ` · based on R${rev.parentRevision.revisionNumber}`
                : ""}
              <div className="small text-muted">{rev.reason}</div>
              <div className="small">
                Files: {(rev.attachments || []).filter((a) => !a.softDeprecated).length}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {tip && (
        <p className="small text-muted mt-2 mb-0">
          Tip revision: R{tip.revisionNumber} ({tip.status})
        </p>
      )}
    </div>
  );
};

export default CreativeWorkflowPanel;
