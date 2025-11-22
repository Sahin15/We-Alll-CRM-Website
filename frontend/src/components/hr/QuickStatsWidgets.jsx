import { useState, useEffect } from "react";
import { Row, Col, Card, Badge, Spinner, Modal, Table, Button } from "react-bootstrap";
import { 
  FaBirthdayCake, 
  FaTrophy, 
  FaUserClock, 
  FaFileContract, 
  FaExclamationTriangle,
  FaEnvelope,
  FaPhone
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatDate } from "../../utils/helpers";

const QuickStatsWidgets = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ title: '', items: [], type: '' });
  const [stats, setStats] = useState({
    birthdays: [],
    anniversaries: [],
    probationEnding: [],
    contractRenewals: [],
    documentExpiry: []
  });

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      // Include ALL users regardless of role
      const allUsers = response.data || [];
      
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDate = today.getDate();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Today's Birthdays - ALL USERS
      const birthdays = allUsers.filter(user => {
        if (!user.dateOfBirth) return false;
        const dob = new Date(user.dateOfBirth);
        return dob.getMonth() === todayMonth && dob.getDate() === todayDate;
      });

      // Work Anniversaries (today) - ALL USERS
      const anniversaries = allUsers.filter(user => {
        if (!user.joiningDate) return false;
        const joinDate = new Date(user.joiningDate);
        return joinDate.getMonth() === todayMonth && joinDate.getDate() === todayDate;
      }).map(user => ({
        ...user,
        years: today.getFullYear() - new Date(user.joiningDate).getFullYear()
      }));

      // Probation Ending Soon (within 30 days) - ALL USERS with full-time employment
      const probationEnding = allUsers.filter(user => {
        if (!user.joiningDate) return false;
        // Check if employment type is full-time or not set (default to full-time)
        const isFullTime = !user.employmentType || user.employmentType === "full-time";
        if (!isFullTime) return false;
        
        const joinDate = new Date(user.joiningDate);
        const probationEnd = new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days probation
        return probationEnd >= today && probationEnd <= thirtyDaysLater;
      });

      // Contract Renewals Due (within 30 days) - ALL USERS with contract employment
      const contractRenewals = allUsers.filter(user => {
        if (!user.joiningDate) return false;
        if (user.employmentType !== "contract") return false;
        
        // Assuming 1 year contract from joining date
        const joinDate = new Date(user.joiningDate);
        const contractEnd = new Date(joinDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        return contractEnd >= today && contractEnd <= thirtyDaysLater;
      });

      // Document Expiry Alerts - Check for passport, visa, certifications expiry
      const documentExpiry = allUsers.filter(user => {
        if (!user.documents) return false;
        
        // Check passport expiry
        if (user.documents.passport?.expiryDate) {
          const expiryDate = new Date(user.documents.passport.expiryDate);
          if (expiryDate >= today && expiryDate <= thirtyDaysLater) {
            return true;
          }
        }
        
        // Check visa expiry
        if (user.documents.visa?.expiryDate) {
          const expiryDate = new Date(user.documents.visa.expiryDate);
          if (expiryDate >= today && expiryDate <= thirtyDaysLater) {
            return true;
          }
        }
        
        // Check certifications expiry
        if (user.certifications && Array.isArray(user.certifications)) {
          return user.certifications.some(cert => {
            if (cert.expiryDate) {
              const expiryDate = new Date(cert.expiryDate);
              return expiryDate >= today && expiryDate <= thirtyDaysLater;
            }
            return false;
          });
        }
        
        return false;
      }).map(user => ({
        ...user,
        expiringDocs: getExpiringDocuments(user, today, thirtyDaysLater)
      }));

      setStats({
        birthdays,
        anniversaries,
        probationEnding,
        contractRenewals,
        documentExpiry
      });
    } catch (error) {
      console.error("Error fetching quick stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (type, title, items) => {
    if (items.length === 0) return;
    setModalData({ type, title, items });
    setShowModal(true);
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiringDocuments = (user, today, thirtyDaysLater) => {
    const expiring = [];
    
    if (user.documents?.passport?.expiryDate) {
      const expiryDate = new Date(user.documents.passport.expiryDate);
      if (expiryDate >= today && expiryDate <= thirtyDaysLater) {
        expiring.push({ type: 'Passport', date: expiryDate });
      }
    }
    
    if (user.documents?.visa?.expiryDate) {
      const expiryDate = new Date(user.documents.visa.expiryDate);
      if (expiryDate >= today && expiryDate <= thirtyDaysLater) {
        expiring.push({ type: 'Visa', date: expiryDate });
      }
    }
    
    if (user.certifications && Array.isArray(user.certifications)) {
      user.certifications.forEach(cert => {
        if (cert.expiryDate) {
          const expiryDate = new Date(cert.expiryDate);
          if (expiryDate >= today && expiryDate <= thirtyDaysLater) {
            expiring.push({ type: cert.name || 'Certification', date: expiryDate });
          }
        }
      });
    }
    
    return expiring;
  };

  if (loading) {
    return (
      <Row className="g-3 mb-4">
        <Col>
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" variant="primary" />
          </div>
        </Col>
      </Row>
    );
  }

  return (
    <>
    <Row className="g-3 mb-4">
      {/* Today's Birthdays */}
      <Col lg={2} md={4} sm={6}>
        <Card 
          className="dashboard-card border-0 shadow-sm h-100" 
          style={{ cursor: stats.birthdays.length > 0 ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('birthdays', "Today's Birthdays", stats.birthdays)}
        >
          <Card.Body className="text-center">
            <div className="mb-2">
              <FaBirthdayCake className="text-danger" style={{ fontSize: '2rem' }} />
            </div>
            <h4 className="mb-1">{stats.birthdays.length}</h4>
            <small className="text-muted">Today's Birthdays</small>
            {stats.birthdays.length > 0 && (
              <div className="mt-2">
                {stats.birthdays.slice(0, 2).map(emp => (
                  <Badge key={emp._id} bg="danger" className="d-block mb-1 text-truncate">
                    {emp.name}
                  </Badge>
                ))}
                {stats.birthdays.length > 2 && (
                  <small className="text-muted">+{stats.birthdays.length - 2} more</small>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Work Anniversaries */}
      <Col lg={2} md={4} sm={6}>
        <Card 
          className="dashboard-card border-0 shadow-sm h-100"
          style={{ cursor: stats.anniversaries.length > 0 ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('anniversaries', "Work Anniversaries Today", stats.anniversaries)}
        >
          <Card.Body className="text-center">
            <div className="mb-2">
              <FaTrophy className="text-warning" style={{ fontSize: '2rem' }} />
            </div>
            <h4 className="mb-1">{stats.anniversaries.length}</h4>
            <small className="text-muted">Anniversaries</small>
            {stats.anniversaries.length > 0 && (
              <div className="mt-2">
                {stats.anniversaries.slice(0, 2).map(emp => (
                  <Badge key={emp._id} bg="warning" className="d-block mb-1 text-truncate">
                    {emp.name} ({emp.years}y)
                  </Badge>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Probation Ending */}
      <Col lg={2} md={4} sm={6}>
        <Card 
          className="dashboard-card border-0 shadow-sm h-100"
          style={{ cursor: stats.probationEnding.length > 0 ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('probation', "Probation Ending Soon", stats.probationEnding)}
        >
          <Card.Body className="text-center">
            <div className="mb-2">
              <FaUserClock className="text-info" style={{ fontSize: '2rem' }} />
            </div>
            <h4 className="mb-1">{stats.probationEnding.length}</h4>
            <small className="text-muted">Probation Ending</small>
            {stats.probationEnding.length > 0 && (
              <div className="mt-2">
                <Badge bg="info" className="d-block">
                  Within 30 days
                </Badge>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Contract Renewals */}
      <Col lg={2} md={4} sm={6}>
        <Card 
          className="dashboard-card border-0 shadow-sm h-100"
          style={{ cursor: stats.contractRenewals.length > 0 ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('contracts', "Contract Renewals Due", stats.contractRenewals)}
        >
          <Card.Body className="text-center">
            <div className="mb-2">
              <FaFileContract className="text-primary" style={{ fontSize: '2rem' }} />
            </div>
            <h4 className="mb-1">{stats.contractRenewals.length}</h4>
            <small className="text-muted">Contract Renewals</small>
            {stats.contractRenewals.length > 0 && (
              <div className="mt-2">
                <Badge bg="primary" className="d-block">
                  Due Soon
                </Badge>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Document Expiry */}
      <Col lg={2} md={4} sm={6}>
        <Card 
          className="dashboard-card border-0 shadow-sm h-100"
          style={{ cursor: stats.documentExpiry.length > 0 ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('documents', "Document Expiry Alerts", stats.documentExpiry)}
        >
          <Card.Body className="text-center">
            <div className="mb-2">
              <FaExclamationTriangle className="text-danger" style={{ fontSize: '2rem' }} />
            </div>
            <h4 className="mb-1">{stats.documentExpiry.length}</h4>
            <small className="text-muted">Doc Expiry Alerts</small>
            {stats.documentExpiry.length > 0 && (
              <div className="mt-2">
                <Badge bg="danger" className="d-block">
                  Action Required
                </Badge>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>

    {/* Details Modal */}
    <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{modalData.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {modalData.items.length > 0 ? (
          <Table hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                {modalData.type === 'birthdays' && <th>Date of Birth</th>}
                {modalData.type === 'anniversaries' && <><th>Joining Date</th><th>Years</th></>}
                {modalData.type === 'probation' && <><th>Joining Date</th><th>Probation Ends</th></>}
                {modalData.type === 'contracts' && <><th>Joining Date</th><th>Contract Ends</th></>}
                {modalData.type === 'documents' && <th>Expiring Documents</th>}
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {modalData.items.map((item) => {
                const joinDate = item.joiningDate ? new Date(item.joiningDate) : null;
                const probationEnd = joinDate ? new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000) : null;
                const contractEnd = joinDate ? new Date(joinDate.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
                
                return (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.name}</strong>
                      <br />
                      <small className="text-muted">{item.employeeId || item.email}</small>
                    </td>
                    <td>
                      <Badge bg="secondary" className="text-capitalize">
                        {item.role}
                      </Badge>
                    </td>
                    <td>{item.department?.name || 'N/A'}</td>
                    
                    {modalData.type === 'birthdays' && (
                      <td>{item.dateOfBirth ? formatDate(item.dateOfBirth) : 'N/A'}</td>
                    )}
                    
                    {modalData.type === 'anniversaries' && (
                      <>
                        <td>{joinDate ? formatDate(joinDate) : 'N/A'}</td>
                        <td><Badge bg="warning">{item.years} years</Badge></td>
                      </>
                    )}
                    
                    {modalData.type === 'probation' && (
                      <>
                        <td>{joinDate ? formatDate(joinDate) : 'N/A'}</td>
                        <td>
                          {probationEnd ? formatDate(probationEnd) : 'N/A'}
                          <br />
                          <small className="text-info">
                            {probationEnd ? `${getDaysUntil(probationEnd)} days left` : ''}
                          </small>
                        </td>
                      </>
                    )}
                    
                    {modalData.type === 'contracts' && (
                      <>
                        <td>{joinDate ? formatDate(joinDate) : 'N/A'}</td>
                        <td>
                          {contractEnd ? formatDate(contractEnd) : 'N/A'}
                          <br />
                          <small className="text-primary">
                            {contractEnd ? `${getDaysUntil(contractEnd)} days left` : ''}
                          </small>
                        </td>
                      </>
                    )}
                    
                    {modalData.type === 'documents' && (
                      <td>
                        {item.expiringDocs && item.expiringDocs.length > 0 ? (
                          item.expiringDocs.map((doc, idx) => (
                            <div key={idx} className="mb-1">
                              <Badge bg="danger" className="me-1">{doc.type}</Badge>
                              <small className="text-muted">
                                {formatDate(doc.date)} ({getDaysUntil(doc.date)} days)
                              </small>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted">No expiring documents</span>
                        )}
                      </td>
                    )}
                    
                    <td>
                      <div className="small">
                        {item.email && (
                          <div>
                            <FaEnvelope className="me-1" />
                            {item.email}
                          </div>
                        )}
                        {item.phone && (
                          <div>
                            <FaPhone className="me-1" />
                            {item.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setShowModal(false);
                          navigate(`/users/${item._id}`);
                        }}
                      >
                        View Profile
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <p className="text-center text-muted py-4">No items to display</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowModal(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
};

export default QuickStatsWidgets;
