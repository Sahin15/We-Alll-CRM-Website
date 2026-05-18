import { useState } from 'react';
import { Container, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { leadApi } from '../api/leadApi';
import './GrowthSummit2026.css?v=' + Date.now();

const GrowthSummit2026 = () => {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    companyName: "",
    service: [],
    budget: "",
    source: "Growth Summit",
    reference: "",
    status: "New"
  });

  const serviceOptions = [
    "Marketing",
    "SEO",
    "Social Media Marketing",
    "Logo Designing",
    "Web Development",
    "Web Designing",
    "App Development",
    "Facebook Page Recovery",
    "Bridal Package",
  ];

  const budgetOptions = [
    "20k to 50k /Month",
    "50k to 80k /Month",
    "80k to 100k /Month",
    "100k to 200k /Month",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleServiceChange = (service) => {
    const currentServices = formData.service || [];
    const updatedServices = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    
    setFormData({ ...formData, service: updatedServices });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        phone: formData.phone ? Number(formData.phone) : undefined,
        service: formData.service,
      };

      await leadApi.createLead(submitData);
      toast.success("Registration successful! We'll contact you soon.");
      setShowRegistrationModal(false);
      
      // Reset form
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        companyName: "",
        service: [],
        budget: "",
        source: "Growth Summit",
        reference: "",
        status: "New"
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="growth-summit-page-v2" 
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* UPDATED VERSION - {Date.now()} */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ maxWidth: '600px' }}>
          {/* Growth Summit Logo */}
          <div style={{ marginBottom: '2rem' }}>
            <img loading="lazy" src="/growth summit logo.jpeg" 
              alt="Growth Summit 2026" 
              style={{
                maxWidth: '200px',
                height: 'auto',
                borderRadius: '10px'
              }}
            />
          </div>
          
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            color: 'white'
          }}>
            Growth Summit 2026
          </h1>
          
          <p style={{
            fontSize: '1.5rem',
            marginBottom: '2rem',
            opacity: '0.9',
            color: 'white'
          }}>
            Transform Your Business Growth Strategy
          </p>
          
          {/* Organizer Logos */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            margin: '2rem 0',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                opacity: '0.8',
                letterSpacing: '1px',
                color: 'white'
              }}>
                PRESENTED BY
              </span>
              <img loading="lazy" src="/We Alll.png" 
                alt="We All" 
                style={{
                  maxWidth: '80px',
                  maxHeight: '50px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '5px',
                  borderRadius: '5px'
                }}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                opacity: '0.8',
                letterSpacing: '1px',
                color: 'white'
              }}>
                ORGANISED BY
              </span>
              <img loading="lazy" src="/images/choicefoundation-logo.jpg" 
                alt="Choice Foundation" 
                style={{
                  maxWidth: '80px',
                  maxHeight: '50px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '5px',
                  borderRadius: '5px'
                }}
              />
            </div>
          </div>
          
          <div style={{
            margin: '2rem 0',
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            backdropFilter: 'blur(10px)'
          }}>
            <p style={{ fontSize: '1.2rem', margin: '0.5rem 0', fontWeight: '500', color: 'white' }}>
              January 3rd, 2026
            </p>
            <p style={{ fontSize: '1.2rem', margin: '0.5rem 0', fontWeight: '500', color: 'white' }}>
              Asansol
            </p>
            <p style={{ fontSize: '1.2rem', margin: '0.5rem 0', fontWeight: '500', color: 'white' }}>
              9:30 AM - 5:00 PM
            </p>
          </div>
          
          <Button 
            onClick={() => setShowRegistrationModal(true)}
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              border: 'none',
              padding: '1rem 3rem',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              borderRadius: '50px',
              boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'white'
            }}
            size="lg"
          >
            Register Now
          </Button>
        </div>
      </div>

      {/* About Section */}
      <div style={{
        padding: '4rem 2rem',
        background: 'rgba(102, 126, 234, 0.05)',
        color: '#2d3436',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            color: '#2d3436',
            marginBottom: '1.5rem',
            fontWeight: 'bold'
          }}>
            Working hard in your business but not growing?
          </h2>
          <p style={{
            fontSize: '1.3rem',
            color: '#636e72',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            It's time to learn the secrets of sustainable business growth!
          </p>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '15px',
            boxShadow: '0 5px 20px rgba(102, 126, 234, 0.1)',
            marginTop: '2rem',
            border: '1px solid rgba(102, 126, 234, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.8rem',
              color: '#2d3436',
              marginBottom: '0.5rem'
            }}>
              Mentor: Amit Santra
            </h3>
            <p style={{
              fontSize: '1.1rem',
              color: '#667eea',
              margin: '0',
              fontWeight: '500'
            }}>
              Founder of We All
            </p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div style={{
        padding: '3rem 2rem',
        background: '#f8f9fa',
        color: '#2d3436',
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '1.8rem',
          marginBottom: '1rem',
          color: '#2d3436'
        }}>
          For Registration & Queries
        </h3>
        <p style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#667eea',
          margin: '0'
        }}>
          📞 +91 89722 63758
        </p>
      </div>

      {/* Registration Modal */}
      <Modal 
        show={showRegistrationModal} 
        onHide={() => setShowRegistrationModal(false)} 
        size="lg" 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Register for Growth Summit 2026</Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number *</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter phone number"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Company Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Your company name"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Services Interested In</Form.Label>
                  <div className="services-list">
                    {serviceOptions.map((service) => (
                      <Form.Check
                        key={service}
                        type="checkbox"
                        id={`service-${service}`}
                        label={service}
                        checked={formData.service.includes(service)}
                        onChange={() => handleServiceChange(service)}
                      />
                    ))}
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Budget Range</Form.Label>
                  <Form.Select
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                  >
                    <option value="">Select budget range</option>
                    {budgetOptions.map((budget) => (
                      <option key={budget} value={budget}>
                        {budget}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Reference (Optional)</Form.Label>
                  <Form.Control
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    placeholder="Who referred you?"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowRegistrationModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register Now"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GrowthSummit2026;
