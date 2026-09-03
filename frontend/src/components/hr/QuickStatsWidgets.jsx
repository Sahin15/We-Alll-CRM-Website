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
import "./QuickStatsWidgets.css";

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
      const response = await api.get("/users", { params: { excludePast: true, limit: 1000 } });
      // Include ALL users regardless of role
      const allUsers = response.data || [];
      
      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDate = today.getDate();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Upcoming Birthdays (next 7 days) - ALL USERS
      const birthdays = allUsers.filter(user => {
        if (!user.dateOfBirth) return false;
        
        const dob = new Date(user.dateOfBirth);
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();
        
        // Get today at midnight (no time component)
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // Get the birthday for this year at midnight
        const thisYearBirthday = new Date(today.getFullYear(), dobMonth, dobDate);
        
        // If birthday already passed this year, check next year's birthday
        let birthdayToCheck = thisYearBirthday;
        if (thisYearBirthday < todayMidnight) {
          birthdayToCheck = new Date(today.getFullYear() + 1, dobMonth, dobDate);
        }
        
        // Check if birthday is within the next 7 days
        const sevenDaysLater = new Date(todayMidnight.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        return birthdayToCheck >= todayMidnight && birthdayToCheck <= sevenDaysLater;
      }).map(user => {
        const dob = new Date(user.dateOfBirth);
        const dobMonth = dob.getMonth();
        const dobDate = dob.getDate();
        
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const thisYearBirthday = new Date(today.getFullYear(), dobMonth, dobDate);
        
        let birthdayToCheck = thisYearBirthday;
        if (thisYearBirthday < todayMidnight) {
          birthdayToCheck = new Date(today.getFullYear() + 1, dobMonth, dobDate);
        }
        
        // Calculate days until birthday (using midnight dates)
        const daysUntil = Math.ceil((birthdayToCheck - todayMidnight) / (1000 * 60 * 60 * 24));
        
        return {
          ...user,
          upcomingBirthday: birthdayToCheck,
          daysUntil: daysUntil
        };
      }).sort((a, b) => a.daysUntil - b.daysUntil); // Sort by days until birthday

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
        
        // Use midnight dates for accurate comparison
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const probationEndMidnight = new Date(probationEnd.getFullYear(), probationEnd.getMonth(), probationEnd.getDate());
        const thirtyDaysLaterMidnight = new Date(todayMidnight.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        return probationEndMidnight >= todayMidnight && probationEndMidnight <= thirtyDaysLaterMidnight;
      }).map(user => {
        const joinDate = new Date(user.joiningDate);
        const probationEnd = new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const probationEndMidnight = new Date(probationEnd.getFullYear(), probationEnd.getMonth(), probationEnd.getDate());
        
        // Calculate accurate days until
        const daysUntil = Math.ceil((probationEndMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        
        return {
          ...user,
          probationEnd: probationEndMidnight,
          daysUntilProbationEnd: daysUntil
        };
      });

      // Contract Renewals Due (within 30 days) - ALL USERS with contract employment
      const contractRenewals = allUsers.filter(user => {
        if (!user.joiningDate) return false;
        if (user.employmentType !== "contract") return false;
        
        // Assuming 1 year contract from joining date
        const joinDate = new Date(user.joiningDate);
        const contractEnd = new Date(joinDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        // Use midnight dates for accurate comparison
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const contractEndMidnight = new Date(contractEnd.getFullYear(), contractEnd.getMonth(), contractEnd.getDate());
        const thirtyDaysLaterMidnight = new Date(todayMidnight.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        return contractEndMidnight >= todayMidnight && contractEndMidnight <= thirtyDaysLaterMidnight;
      }).map(user => {
        const joinDate = new Date(user.joiningDate);
        const contractEnd = new Date(joinDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const contractEndMidnight = new Date(contractEnd.getFullYear(), contractEnd.getMonth(), contractEnd.getDate());
        
        // Calculate accurate days until
        const daysUntil = Math.ceil((contractEndMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        
        return {
          ...user,
          contractEnd: contractEndMidnight,
          daysUntilContractEnd: daysUntil
        };
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
      {/* Upcoming Birthdays */}
      <Col lg={2} md={4} sm={6}>
        <Card 
          className="dashboard-card border-0 shadow-sm h-100" 
          style={{ cursor: stats.birthdays.length > 0 ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('birthdays', "Upcoming Birthdays (Next 7 Days)", stats.birthdays)}
        >
          <Card.Body className="text-center">
            <div className="mb-2">
              <FaBirthdayCake className="text-danger" style={{ fontSize: '2rem' }} />
            </div>
            <h4 className="mb-1">{stats.birthdays.length}</h4>
            <small className="text-muted">Upcoming Birthdays</small>
            {stats.birthdays.length > 0 && (
              <div className="mt-2">
                {stats.birthdays.slice(0, 2).map(emp => (
                  <Badge key={emp._id} bg="danger" className="d-block mb-1 text-truncate">
                    {emp.name} {emp.daysUntil === 0 ? '(Today)' : `(${emp.daysUntil}d)`}
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

    {/* Details Modal - Modern Card Design */}
    <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          {modalData.type === 'birthdays' && <FaBirthdayCake className="text-danger" />}
          {modalData.type === 'anniversaries' && <FaTrophy className="text-warning" />}
          {modalData.type === 'probation' && <FaUserClock className="text-info" />}
          {modalData.type === 'contracts' && <FaFileContract className="text-primary" />}
          {modalData.type === 'documents' && <FaExclamationTriangle className="text-danger" />}
          {modalData.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {modalData.items.length > 0 ? (
          <div className="row g-3">
            {modalData.items.map((item) => {
              const joinDate = item.joiningDate ? new Date(item.joiningDate) : null;
              const probationEnd = joinDate ? new Date(joinDate.getTime() + 90 * 24 * 60 * 60 * 1000) : null;
              const contractEnd = joinDate ? new Date(joinDate.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
              
              return (
                <div key={item._id} className="col-12">
                  <Card className="border-0 shadow-sm hover-shadow" style={{ transition: 'all 0.3s ease' }}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          {/* Name and Role */}
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                              style={{ 
                                width: '48px', 
                                height: '48px',
                                background: modalData.type === 'birthdays' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                                           modalData.type === 'anniversaries' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                                           modalData.type === 'probation' ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                                           modalData.type === 'contracts' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' :
                                           'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                fontSize: '18px'
                              }}
                            >
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h6 className="mb-0 fw-bold">{item.name}</h6>
                              <div className="d-flex gap-2 align-items-center mt-1">
                                <Badge 
                                  bg="" 
                                  className="text-capitalize"
                                  style={{ 
                                    background: modalData.type === 'birthdays' ? '#667eea' :
                                               modalData.type === 'anniversaries' ? '#f5576c' :
                                               modalData.type === 'probation' ? '#4facfe' :
                                               modalData.type === 'contracts' ? '#43e97b' :
                                               '#fa709a'
                                  }}
                                >
                                  {item.role}
                                </Badge>
                                {item.department?.name && (
                                  <small className="text-muted">• {item.department.name}</small>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Type-specific Information */}
                          <div className="mt-3">
                            {modalData.type === 'birthdays' && (
                              <div className="d-flex flex-wrap gap-3">
                                <div>
                                  <small className="text-muted d-block">Date of Birth</small>
                                  <strong>{item.dateOfBirth ? formatDate(item.dateOfBirth) : 'N/A'}</strong>
                                </div>
                                <div>
                                  <small className="text-muted d-block">Upcoming Birthday</small>
                                  <strong>{item.upcomingBirthday ? formatDate(item.upcomingBirthday) : 'N/A'}</strong>
                                </div>
                                <div>
                                  <small className="text-muted d-block">Days Until</small>
                                  <Badge 
                                    bg="" 
                                    className="fs-6"
                                    style={{ 
                                      background: item.daysUntil === 0 ? '#10b981' : 
                                                 item.daysUntil <= 2 ? '#f59e0b' : '#667eea',
                                      padding: '6px 12px'
                                    }}
                                  >
                                    {item.daysUntil === 0 ? '🎉 Today!' : `${item.daysUntil} days`}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            {modalData.type === 'anniversaries' && (
                              <div className="d-flex flex-wrap gap-3">
                                <div>
                                  <small className="text-muted d-block">Joining Date</small>
                                  <strong>{joinDate ? formatDate(joinDate) : 'N/A'}</strong>
                                </div>
                                <div>
                                  <small className="text-muted d-block">Years Completed</small>
                                  <Badge bg="" style={{ background: '#f5576c', padding: '6px 12px', fontSize: '14px' }}>
                                    🏆 {item.years} {item.years === 1 ? 'Year' : 'Years'}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            {modalData.type === 'probation' && (
                              <div className="d-flex flex-wrap gap-3">
                                <div>
                                  <small className="text-muted d-block">Joining Date</small>
                                  <strong>{joinDate ? formatDate(joinDate) : 'N/A'}</strong>
                                </div>
                                <div>
                                  <small className="text-muted d-block">Probation Ends</small>
                                  <strong>{probationEnd ? formatDate(probationEnd) : 'N/A'}</strong>
                                </div>
                                <div>
                                  <small className="text-muted d-block">Days Left</small>
                                  <Badge bg="" style={{ background: '#4facfe', padding: '6px 12px', fontSize: '14px' }}>
                                    {item.daysUntilProbationEnd || (probationEnd ? getDaysUntil(probationEnd) : 0)} days
                                  </Badge>
                                </div>
                              </div>
                            )}

                            {modalData.type === 'contracts' && (
                              <div className="d-flex flex-wrap gap-3">
                                <div>
                                  <small className="text-muted d-block">Contract Start</small>
                                  <strong>{joinDate ? formatDate(joinDate) : 'N/A'}</strong>
                                </div>
                                <div>
                                  <small className="text-muted d-block">Contract Ends</small>
                                  <strong>{contractEnd ? formatDate(contractEnd) : 'N/A'}</strong>
                                </div>
                                <div>
                                  <small className="text-muted d-block">Days Left</small>
                                  <Badge bg="" style={{ background: '#43e97b', padding: '6px 12px', fontSize: '14px' }}>
                                    {item.daysUntilContractEnd || (contractEnd ? getDaysUntil(contractEnd) : 0)} days
                                  </Badge>
                                </div>
                              </div>
                            )}

                            {modalData.type === 'documents' && (
                              <div>
                                <small className="text-muted d-block mb-2">Expiring Documents</small>
                                {item.expiringDocs && item.expiringDocs.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2">
                                    {item.expiringDocs.map((doc, idx) => (
                                      <Badge 
                                        key={idx} 
                                        bg="" 
                                        style={{ background: '#fa709a', padding: '6px 12px' }}
                                      >
                                        {doc.type} - {formatDate(doc.date)} ({getDaysUntil(doc.date)} days)
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted">No expiring documents</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Contact Information */}
                          <div className="mt-3 pt-3 border-top">
                            <div className="d-flex flex-wrap gap-3 small">
                              {item.email && (
                                <div className="d-flex align-items-center gap-1">
                                  <FaEnvelope className="text-muted" />
                                  <span className="text-muted">{item.email}</span>
                                </div>
                              )}
                              {item.phone && (
                                <div className="d-flex align-items-center gap-1">
                                  <FaPhone className="text-muted" />
                                  <span className="text-muted">{item.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setShowModal(false);
                              navigate(`/employees/${item._id}`);
                            }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-5">
            <div className="mb-3" style={{ fontSize: '3rem', opacity: 0.3 }}>
              {modalData.type === 'birthdays' && '🎂'}
              {modalData.type === 'anniversaries' && '🏆'}
              {modalData.type === 'probation' && '⏰'}
              {modalData.type === 'contracts' && '📄'}
              {modalData.type === 'documents' && '⚠️'}
            </div>
            <p className="text-muted">No items to display</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="secondary" onClick={() => setShowModal(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
};

export default QuickStatsWidgets;
