import { Card, Table, Button, Badge, Spinner } from "react-bootstrap";
import { FaPhone, FaEye, FaTrash, FaUserCheck, FaEdit } from "react-icons/fa";

const STATUS_COLORS = {
  "New": "secondary",
  "Pending Call": "warning",
  "Called": "info",
  "No Response": "dark",
  "Wrong Number": "danger",
  "Not Interested": "danger",
  "Interested": "success",
  "Follow-up Needed": "warning",
  "Converted to Lead": "primary",
  "Rejected": "danger",
};

export default function RawDataTable({ 
  records, 
  loading, 
  pagination, 
  onCallLog, 
  onEdit, 
  onDetail, 
  onDelete, 
  onAssignCaller, 
  getCallerBadge, 
  fetchRecords 
}) {
  return (
    <>
      {/* Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 raw-data-table">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }}>Sl No.</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Location</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Caller</th>
                    <th>Attempts</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-4 text-muted">No records found</td></tr>
                  ) : records.map((r, index) => (
                    <tr key={r._id}>
                      <td className="text-muted small" style={{ width: '50px' }}>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td className="fw-medium">{r.name}</td>
                      <td><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                      <td>{r.location || "—"}</td>
                      <td><span className="text-muted small">{r.category}</span></td>
                      <td><span className="text-muted small">{r.source}</span></td>
                      <td><Badge bg={STATUS_COLORS[r.status] || "secondary"} className="small">{r.status}</Badge></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {getCallerBadge(r)}
                          <Button 
                            size="sm" 
                            variant="outline-primary" 
                            title="Assign Caller"
                            onClick={() => onAssignCaller(r)}
                            style={{ padding: '0.25rem 0.5rem' }}
                          >
                            <FaUserCheck style={{ fontSize: '0.875rem' }} />
                          </Button>
                        </div>
                      </td>
                      <td className="text-center">{r.callAttemptCount}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button size="sm" variant="outline-success" title="Log Call" onClick={() => onCallLog(r)} disabled={r.convertedToLead}>
                            <FaPhone />
                          </Button>
                          <Button size="sm" variant="outline-secondary" title="Edit" onClick={() => onEdit(r)}>
                            <FaEdit />
                          </Button>
                          <Button size="sm" variant="outline-primary" title="View" onClick={() => onDetail(r)}>
                            <FaEye />
                          </Button>
                          <Button size="sm" variant="outline-danger" title="Delete" onClick={() => onDelete(r._id)}>
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <Button size="sm" variant="outline-secondary" disabled={pagination.page === 1} onClick={() => fetchRecords(pagination.page - 1)}>Prev</Button>
          <span className="align-self-center small">{pagination.page} / {pagination.pages}</span>
          <Button size="sm" variant="outline-secondary" disabled={pagination.page === pagination.pages} onClick={() => fetchRecords(pagination.page + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}
