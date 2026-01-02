import { useState, useEffect } from "react";
import { Container, Row, Col, Modal, Table, Badge, Button } from "react-bootstrap";
import {
  FaDollarSign,
  FaFileInvoice,
  FaChartPie,
  FaWallet,
  FaChartLine,
  FaEye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/dashboard/StatCard";
import QuickActions from "../../components/dashboard/QuickActions";
import GreetingBanner from "../../components/common/GreetingBanner";
import { leadApi } from "../../api/leadApi";
import toast from "../../utils/toast";

const AccountsDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    leads: 0,
  });
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [leadsList, setLeadsList] = useState([]);

  useEffect(() => {
    fetchLeadsData();
  }, []);

  const fetchLeadsData = async () => {
    try {
      const leadsRes = await leadApi.getAllLeads();
      setStats({
        leads: leadsRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const handleLeadsCardClick = async () => {
    try {
      const response = await leadApi.getAllLeads();
      setLeadsList(response.data || []);
      setShowLeadsModal(true);
    } catch (error) {
      toast.error('Failed to load leads');
    }
  };

  const quickActions = [
    {
      label: "Create Invoice",
      icon: <FaFileInvoice />,
      path: "/invoices",
      variant: "primary",
    },
    {
      label: "View Reports",
      icon: <FaChartPie />,
      path: "/reports",
      variant: "success",
    },
  ];

  return (
    <Container fluid className="py-4">
      <GreetingBanner subtitle="Financial overview and management" />

      <Row className="g-4 mb-4">
        <Col lg={3} md={6}>
          <StatCard
            title="Total Revenue"
            value="$0"
            icon={<FaDollarSign />}
            bgColor="success"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Pending Invoices"
            value="0"
            icon={<FaFileInvoice />}
            bgColor="warning"
          />
        </Col>
        <Col lg={3} md={6}>
          <StatCard
            title="Expenses"
            value="$0"
            icon={<FaWallet />}
            bgColor="danger"
          />
        </Col>
        <Col lg={3} md={6}>
          <div onClick={handleLeadsCardClick} style={{ cursor: 'pointer', height: '100%' }}>
            <StatCard
              title="Total Leads"
              value={stats.leads}
              icon={<FaChartLine />}
              bgColor="primary"
            />
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={4}>
          <QuickActions actions={quickActions} />
        </Col>
      </Row>

      {/* Leads Modal */}
      <Modal show={showLeadsModal} onHide={() => setShowLeadsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title><FaChartLine className="me-2 text-primary" />All Leads ({leadsList.length})</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leadsList.map(lead => (
                <tr key={lead._id}>
                  <td><strong>{lead.fullName || lead.name || 'N/A'}</strong></td>
                  <td>{lead.companyName || lead.company || 'N/A'}</td>
                  <td><Badge bg={lead.status === 'hot' ? 'danger' : lead.status === 'warm' ? 'warning' : 'info'}>{lead.status || 'cold'}</Badge></td>
                  <td><Badge bg="secondary">{lead.source || 'N/A'}</Badge></td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => navigate(`/leads/${lead._id}`)}>
                      <FaEye className="me-1" />View
                    </Button>
                  </td>
                </tr>
              ))}
              {leadsList.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted">No leads found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AccountsDashboard;
