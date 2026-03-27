import { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Table, Button, Badge, Form, InputGroup, Spinner, Modal, Tabs, Tab } from "react-bootstrap";
import { FaPlus, FaSearch, FaFilter, FaUpload, FaPhone, FaEye, FaTrash, FaUserCheck, FaEdit, FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { rawDataApi } from "../../api/rawDataApi";
import RawDataFormModal from "../../components/raw-data/RawDataFormModal";
import CallLogModal from "../../components/raw-data/CallLogModal";
import RecordDetailModal from "../../components/raw-data/RecordDetailModal";
import BatchImportModal from "../../components/raw-data/BatchImportModal";
import AssignCallerModal from "../../components/raw-data/AssignCallerModal";
import ConvertToLeadModal from "../../components/raw-data/ConvertToLeadModal";
import RawDataTable from "../../components/raw-data/RawDataTable";
import "./RawDataList.css";

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

const STATUSES = ["New", "Pending Call", "Called", "No Response", "Wrong Number", "Not Interested", "Interested", "Follow-up Needed", "Converted to Lead", "Rejected"];
const CATEGORIES = ["Makeup Artist", "Salon", "Bridal Clients", "Tattoo Artists", "Nail Art", "Other"];
const SOURCES = ["Instagram", "Facebook", "Referral", "Manual", "Website", "Justdial", "Event", "Existing Contact", "Other"];

export default function RawDataList() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [activeTab, setActiveTab] = useState("all");

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSource, setFilterSource] = useState("");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showCallLog, setShowCallLog] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAssignCaller, setShowAssignCaller] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [assigningRecord, setAssigningRecord] = useState(null);
  const [convertingRecord, setConvertingRecord] = useState(null);

  // Check if user is manager
  const isManager = ['admin', 'superadmin', 'manager', 'hod'].includes(user?.role);

  const fetchRecords = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      if (filterSource) params.source = filterSource;
      
      // For "Interested" tab, filter by Interested status
      if (activeTab === "interested") {
        params.status = "Interested";
      }

      const res = await rawDataApi.getAll(params);
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterCategory, filterSource, activeTab]);

  useEffect(() => { fetchRecords(1); }, [fetchRecords]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await rawDataApi.delete(id);
      toast.success("Deleted");
      fetchRecords(pagination.page);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openCallLog = async (record) => {
    try {
      await rawDataApi.lock(record._id);
      setActiveRecord(record);
      setShowCallLog(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not lock record");
    }
  };

  const handleCallLogSave = () => {
    setShowCallLog(false);
    setActiveRecord(null);
    fetchRecords(pagination.page);
  };

  const openEdit = (record) => { setActiveRecord(record); setShowForm(true); };

  const openDetail = (record) => { setActiveRecord(record); setShowDetail(true); };

  const handleOpenAssignCaller = (record) => {
    setAssigningRecord(record);
    setShowAssignCaller(true);
  };

  const handleAssignCallerSubmit = async (callerId) => {
    try {
      await rawDataApi.assign(assigningRecord._id, callerId);
      toast.success("Caller assigned successfully");
      setShowAssignCaller(false);
      setAssigningRecord(null);
      fetchRecords(pagination.page);
    } catch {
      toast.error("Failed to assign caller");
    }
  };

  const handleOpenConvert = (record) => {
    setConvertingRecord(record);
    setShowConvert(true);
  };

  const handleConvertSuccess = () => {
    setShowConvert(false);
    setConvertingRecord(null);
    toast.success("Record converted to lead successfully");
    fetchRecords(pagination.page);
  };

  // Generate color-coded badge for assigned caller
  const getCallerColor = (caller) => {
    if (!caller) return '#E9ECEF';
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'];
    const hash = caller.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getCallerBadge = (record) => {
    if (!record.assignedCaller) {
      return (
        <span 
          style={{ 
            backgroundColor: '#E9ECEF',
            color: '#495057',
            fontSize: '0.75rem', 
            padding: '0.4rem 0.6rem',
            fontWeight: '600',
            minWidth: '32px',
            textAlign: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            cursor: 'default'
          }}
          title="Unassigned"
        >
          UN
        </span>
      );
    }
    
    const initials = record.assignedCaller.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return (
      <span 
        style={{ 
          backgroundColor: getCallerColor(record.assignedCaller),
          color: '#FFFFFF',
          fontSize: '0.75rem', 
          padding: '0.4rem 0.6rem',
          fontWeight: '600',
          minWidth: '32px',
          textAlign: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          cursor: 'default',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        title={record.assignedCaller.name}
      >
        {initials}
      </span>
    );
  };
  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () => setSelected(selected.length === records.length ? [] : records.map(r => r._id));

  return (
    <Container fluid className="raw-data-page py-3">
      {/* Header */}
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">Raw Data Sheet</h4>
          <small className="text-muted">Unqualified contacts pool — before Leads</small>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={() => setShowImport(true)}>
            <FaUpload className="me-1" /> Bulk Upload
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <FaPlus className="me-1" /> Add Record
          </Button>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="all" title="All Records">
          {/* Filters */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body className="py-2">
              <Row className="g-2 align-items-center">
                <Col md={4}>
                  <InputGroup size="sm">
                    <InputGroup.Text><FaSearch /></InputGroup.Text>
                    <Form.Control placeholder="Search name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Select size="sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select size="sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select size="sm" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                    <option value="">All Sources</option>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Stats bar */}
          <div className="d-flex gap-3 mb-3 flex-wrap">
            <span className="text-muted small">Total: <strong>{pagination.total}</strong></span>
            <span className="text-muted small">Page: <strong>{pagination.page}/{pagination.pages}</strong></span>
          </div>

          {/* Table */}
          <RawDataTable records={records} loading={loading} pagination={pagination} onCallLog={openCallLog} onEdit={openEdit} onDetail={openDetail} onDelete={handleDelete} onAssignCaller={handleOpenAssignCaller} getCallerBadge={getCallerBadge} fetchRecords={fetchRecords} />
        </Tab>

        {isManager && (
          <Tab eventKey="interested" title={`Ready for Conversion (${records.filter(r => r.status === 'Interested').length})`}>
            {/* Interested records for manager approval */}
            <Card className="mb-3 border-0 shadow-sm">
              <Card.Body className="p-0">
                {loading ? (
                  <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                ) : records.length === 0 ? (
                  <div className="text-center py-4 text-muted">No interested records ready for conversion</div>
                ) : (
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '50px' }}>Sl No.</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Location</th>
                          <th>Category</th>
                          <th>Source</th>
                          <th>Caller</th>
                          <th>Attempts</th>
                          <th style={{ width: '150px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r, index) => (
                          <tr key={r._id}>
                            <td className="text-muted small" style={{ width: '50px' }}>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                            <td className="fw-medium">{r.name}</td>
                            <td><a href={`tel:${r.phone}`}>{r.phone}</a></td>
                            <td>{r.location || "—"}</td>
                            <td><span className="text-muted small">{r.category}</span></td>
                            <td><span className="text-muted small">{r.source}</span></td>
                            <td>{getCallerBadge(r)}</td>
                            <td className="text-center">{r.callAttemptCount}</td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button size="sm" variant="outline-success" title="Convert to Lead" onClick={() => handleOpenConvert(r)}>
                                  <FaCheck />
                                </Button>
                                <Button size="sm" variant="outline-primary" title="View" onClick={() => openDetail(r)}>
                                  <FaEye />
                                </Button>
                                <Button size="sm" variant="outline-danger" title="Delete" onClick={() => handleDelete(r._id)}>
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
          </Tab>
        )}
      </Tabs>

      {/* Modals */}
      <RawDataFormModal show={showForm} record={activeRecord} onHide={() => { setShowForm(false); setActiveRecord(null); }} onSaved={() => { setShowForm(false); setActiveRecord(null); fetchRecords(1); }} />

      {activeRecord && showCallLog && (
        <CallLogModal show={showCallLog} record={activeRecord} onHide={() => { rawDataApi.unlock(activeRecord._id); setShowCallLog(false); setActiveRecord(null); }} onSaved={handleCallLogSave} />
      )}

      {activeRecord && showDetail && (
        <RecordDetailModal show={showDetail} recordId={activeRecord._id} onHide={() => { setShowDetail(false); setActiveRecord(null); }} onConverted={() => { setShowDetail(false); fetchRecords(pagination.page); }} />
      )}

      <BatchImportModal show={showImport} onHide={() => setShowImport(false)} onImported={() => { setShowImport(false); fetchRecords(1); }} />

      {assigningRecord && (
        <AssignCallerModal 
          show={showAssignCaller} 
          record={assigningRecord} 
          onHide={() => { setShowAssignCaller(false); setAssigningRecord(null); }} 
          onAssigned={handleAssignCallerSubmit}
        />
      )}

      {convertingRecord && (
        <ConvertToLeadModal 
          show={showConvert} 
          record={convertingRecord} 
          onHide={() => { setShowConvert(false); setConvertingRecord(null); }} 
          onConverted={handleConvertSuccess}
        />
      )}
    </Container>
  );
}
