import { useState } from 'react';
import { Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { leadApi } from '../api/leadApi';

const GrowthSummitNew = () => {
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
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      color: '#2d3436',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Geometric Shapes */}
      <div style={{
        position: 'absolute',
        top: '5%',
        left: '5%',
        width: '120px',
        height: '120px',
        background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
        animation: 'morphShape 12s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '10%',
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
        borderRadius: '50%',
        animation: 'gentleFloat 8s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '15%',
        width: '100px',
        height: '100px',
        background: 'linear-gradient(225deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02))',
        borderRadius: '40% 60% 60% 40% / 60% 30% 70% 40%',
        animation: 'slowRotate 15s linear infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '5%',
        width: '60px',
        height: '60px',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '50%',
        animation: 'gentleFloat 10s ease-in-out infinite reverse'
      }}></div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes morphShape {
          0%, 100% { 
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
            transform: rotate(0deg) scale(1);
          }
          25% { 
            border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%;
            transform: rotate(90deg) scale(1.1);
          }
          50% { 
            border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%;
            transform: rotate(180deg) scale(0.9);
          }
          75% { 
            border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%;
            transform: rotate(270deg) scale(1.05);
          }
        }
        
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-15px) translateX(10px); }
          50% { transform: translateY(-25px) translateX(-5px); }
          75% { transform: translateY(-10px) translateX(-15px); }
        }
        
        @keyframes slowRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .premium-card {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.3s ease;
        }
        
        .mobile-optimized-card {
          max-height: 120px !important;
          overflow: hidden !important;
        }
        
        @media (max-width: 768px) {
          .mobile-optimized-card {
            padding: 0.4rem !important;
            gap: 0.4rem !important;
            max-height: 100px !important;
          }
        }
        
        .premium-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
        }
        
        .premium-button {
          animation: pulse 3s ease-in-out infinite;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%) !important;
          background-size: 200% 100% !important;
        }
        
        .premium-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 45px rgba(249, 115, 22, 0.5) !important;
          animation: shimmer 2s ease-in-out infinite, pulse 3s ease-in-out infinite;
        }
      `}</style>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        padding: '0 0.5rem'
      }}>
        <div style={{
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          <img loading="lazy" src="/growth-summit-logo.jpeg" 
            alt="Growth Summit 2026" 
            style={{
              maxWidth: '280px',
              width: '90%',
              height: 'auto',
              borderRadius: '10px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
              marginBottom: '1rem',
              display: 'block',
              margin: '0 auto 1rem auto'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: 'white',
            display: 'none'
          }}>
            Growth Summit 2026
          </h1>
          
          {/* Organizer Logos */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4rem',
            marginTop: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{ 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginBottom: '0.3rem',
                opacity: '1',
                letterSpacing: '1px',
                color: '#ffffff !important',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                textTransform: 'uppercase'
              }}>
                Presented By
              </span>
              <img loading="lazy" src="/images/we-all-logo.png" 
                alt="We All" 
                style={{
                  width: '100px',
                  height: '60px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '5px',
                  borderRadius: '8px',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.3)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div style={{ 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginBottom: '0.3rem',
                opacity: '1',
                letterSpacing: '1px',
                color: '#ffffff !important',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                textTransform: 'uppercase'
              }}>
                Organised By
              </span>
              <img loading="lazy" src="/images/choicefoundation-logo.jpg" 
                alt="Choice Foundation" 
                style={{
                  width: '100px',
                  height: '60px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '5px',
                  borderRadius: '8px',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.3)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Main Message Text - Compact Version */}
        <div className="premium-card" style={{
          textAlign: 'center',
          marginBottom: '1rem',
          padding: '1.5rem',
          borderRadius: '20px'
        }}>
          <div style={{
            fontSize: '1.4rem',
            fontWeight: 'bold',
            lineHeight: '1.1',
            marginBottom: '0.8rem'
          }}>
            <span style={{ color: '#2d3436' }}>Working hard in your </span>
            <span style={{ color: '#2d5016' }}>business</span>
            <span style={{ color: '#2d3436' }}> but not </span>
            <span style={{ 
              fontSize: '2.2rem', 
              color: '#2d5016', 
              fontWeight: 'bold',
              display: 'block',
              margin: '0.3rem 0'
            }}>
              GROWING?
            </span>
            <span style={{ 
              color: '#2d3436',
              fontSize: '1.2rem',
              position: 'relative'
            }}>
              It's time to learn 
              <span style={{ position: 'relative', marginLeft: '0.3rem' }}>
                the secrets!
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '0',
                  width: '100%',
                  height: '3px',
                  background: 'linear-gradient(90deg, #ff6b6b, #ee5a24)',
                  borderRadius: '2px'
                }}></div>
              </span>
            </span>
          </div>
        </div>
        
        {/* Compact Card with Large Mentor Image - Mobile Optimized */}
        <div className="premium-card mobile-optimized-card" style={{
          padding: '0.5rem',
          borderRadius: '15px',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'stretch',
          flexWrap: 'nowrap',
          minHeight: '100px',
          maxHeight: '120px'
        }}>
          {/* Event Details - Ultra Compact */}
          <div style={{
            flex: '1 1 auto',
            minWidth: '0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h3 style={{
              fontSize: '0.8rem',
              marginBottom: '0.2rem',
              color: '#2d3436',
              fontWeight: 'bold'
            }}>
              📅 Event Details
            </h3>
            <div style={{ fontSize: '0.7rem', color: '#92400e', lineHeight: '1.1' }}>
              <p style={{ margin: '0.02rem 0', fontWeight: '600' }}>January 3rd, 2026</p>
              <p style={{ margin: '0.02rem 0', fontWeight: '600' }}>📍 Asansol</p>
              <p style={{ margin: '0.02rem 0', fontWeight: '600' }}>🕘 9:30 AM - 5:00 PM</p>
            </div>
          </div>
          
          {/* Compact Mentor Image */}
          <div style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.2rem'
          }}>
            <img loading="lazy" src="/images/amit-santra-photo.jpg" 
              alt="Amit Santra" 
              style={{
                width: '75px',
                height: '75px',
                borderRadius: '50%',
                objectFit: 'cover',
                objectPosition: 'center top',
                border: '2px solid #f97316',
                boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)',
                flexShrink: 0
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{
                fontSize: '0.75rem',
                marginBottom: '0.02rem',
                color: '#2d3436',
                fontWeight: 'bold'
              }}>
                Amit Santra
              </h3>
              <p style={{
                fontSize: '0.65rem',
                color: '#f97316',
                margin: '0',
                fontWeight: '600'
              }}>
                Founder of We All
              </p>
            </div>
          </div>
        </div>
        
        <Button 
          className="premium-button"
          onClick={() => setShowRegistrationModal(true)}
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
            border: 'none',
            padding: '1rem 2.5rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '50px',
            boxShadow: '0 8px 30px rgba(249, 115, 22, 0.4)',
            color: 'white',
            cursor: 'pointer',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
          size="lg"
        >
          🚀 Register Now
        </Button>
        
        <div className="premium-card" style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '15px',
          textAlign: 'center'
        }}>
          <h4 style={{
            fontSize: '1rem',
            marginBottom: '0.3rem',
            color: '#2d3436'
          }}>
            For Registration & Queries
          </h4>
          <p style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#f97316',
            margin: '0'
          }}>
            📞 +91 89722 63758
          </p>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal 
        show={showRegistrationModal} 
        onHide={() => setShowRegistrationModal(false)} 
        size="lg" 
        centered
      >
        <Modal.Header closeButton style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderBottom: 'none'
        }}>
          <Modal.Title style={{ color: 'white' }}>Register for Growth Summit 2026</Modal.Title>
        </Modal.Header>
        
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ padding: '2rem', background: 'white' }}>
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
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0'
                  }}>
                    {serviceOptions.map((service) => (
                      <Form.Check
                        key={service}
                        type="checkbox"
                        id={`service-${service}`}
                        label={service}
                        checked={formData.service.includes(service)}
                        onChange={() => handleServiceChange(service)}
                        style={{ marginBottom: '0.5rem' }}
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
          
          <Modal.Footer style={{ background: 'white' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowRegistrationModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white'
              }}
            >
              {loading ? "Registering..." : "Register Now"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GrowthSummitNew;
