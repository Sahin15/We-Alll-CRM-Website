import { useState } from 'react';
import { Button, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { leadApi } from '../api/leadApi';

const GrowthSummitFinal = () => {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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

  const handleServiceClick = (e, service) => {
    e.preventDefault();
    e.stopPropagation();
    handleServiceChange(service);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return formData.phone && formData.phone.length >= 10;
      case 2:
        return formData.fullName && formData.fullName.trim().length > 0;
      case 3:
        return true; // Optional fields
      case 4:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleKeyDown = (e) => {
    // Prevent Enter key from submitting form unless on final step and explicitly intended
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep < 4 && canProceedToNext()) {
        nextStep();
      }
      // Don't auto-submit on step 4 - user must click the button
    }
  };

  const handleSubmitClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentStep !== 4 || loading) {
      return;
    }
    
    await handleSubmit(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow submission on the final step (step 4) and when explicitly submitted
    if (currentStep !== 4) {
      return;
    }
    
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        phone: formData.phone ? Number(formData.phone) : undefined,
        service: formData.service,
      };

      await leadApi.createPublicLead(submitData);
      toast.success("🎉 Registration Successful! Welcome to Growth Summit 2026! We'll contact you soon with event details.", {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          fontWeight: "600",
          borderRadius: "10px"
        }
      });
      setShowRegistrationModal(false);
      setCurrentStep(1);
      
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
      console.error("Registration error:", error);
      
      // Handle specific error cases with better messaging
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || "Registration failed";
        if (errorMessage.includes("already exists")) {
          toast.error("This phone number or email is already registered. Please use different contact details or contact us directly.", {
            position: "top-center",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } else {
          toast.error(errorMessage, {
            position: "top-center",
            autoClose: 4000,
          });
        }
      } else if (error.response?.status === 500) {
        toast.error("Server error occurred. Please try again or contact us directly at +91 89722 63758", {
          position: "top-center",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error("Registration failed. Please check your internet connection and try again.", {
          position: "top-center",
          autoClose: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowRegistrationModal(false);
    setCurrentStep(1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <h3 style={{ color: '#2d3436', marginBottom: '1rem', fontSize: '1.3rem' }}>
              📱 Let's Get Started!
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Enter your mobile number to secure your spot
            </p>
            <Form.Group className="mb-3">
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                style={{
                  fontSize: '1.1rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  textAlign: 'center'
                }}
                autoFocus
                autoComplete="off"
              />
            </Form.Group>
            {formData.phone && formData.phone.length < 10 && (
              <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Please enter a valid 10-digit phone number
              </p>
            )}
          </div>
        );

      case 2:
        return (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <h3 style={{ color: '#2d3436', marginBottom: '1rem', fontSize: '1.3rem' }}>
              👤 Great! What's Your Name?
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Help us personalize your Growth Summit experience
            </p>
            <Form.Group className="mb-3">
              <Form.Control
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                style={{
                  fontSize: '1.1rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  textAlign: 'center'
                }}
                autoFocus
                autoComplete="off"
              />
            </Form.Group>
          </div>
        );

      case 3:
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ color: '#2d3436', marginBottom: '1rem', fontSize: '1.2rem', textAlign: 'center' }}>
              📋 Tell Us About Your Business
            </h3>
            
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', color: '#374151' }}>Email Address</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                style={{
                  fontSize: '1rem',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0'
                }}
                autoComplete="off"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', color: '#374151' }}>Company Name</Form.Label>
              <Form.Control
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Your business name"
                style={{
                  fontSize: '1rem',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0'
                }}
                autoComplete="off"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', color: '#374151' }}>Investment Range</Form.Label>
              <Form.Select
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                style={{
                  fontSize: '1rem',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0'
                }}
                autoComplete="off"
              >
                <option value="">Select your investment capacity</option>
                {budgetOptions.map((budget) => (
                  <option key={budget} value={budget}>
                    {budget}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: '600', color: '#374151' }}>Reference</Form.Label>
              <Form.Control
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="Who referred you to us? (optional)"
                style={{
                  fontSize: '1rem',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0'
                }}
                autoComplete="off"
              />
            </Form.Group>
          </div>
        );

      case 4:
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ color: '#2d3436', marginBottom: '1rem', fontSize: '1.3rem', textAlign: 'center' }}>
              🎯 Final Step: Choose Your Interests
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem', textAlign: 'center' }}>
              Select the services you'd like to learn about at the Growth Summit (optional - you can skip this step)
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              {serviceOptions.map((service) => (
                <div
                  key={service}
                  onClick={(e) => handleServiceClick(e, service)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    border: formData.service.includes(service) 
                      ? '3px solid #667eea' 
                      : '2px solid #e2e8f0',
                    background: formData.service.includes(service) 
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(102, 126, 234, 0.05))' 
                      : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: formData.service.includes(service) ? '#667eea' : '#374151',
                    transition: 'all 0.3s ease',
                    boxShadow: formData.service.includes(service) 
                      ? '0 4px 15px rgba(102, 126, 234, 0.2)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!formData.service.includes(service)) {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!formData.service.includes(service)) {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.transform = 'translateY(0px)';
                    }
                  }}
                >
                  {formData.service.includes(service) && '✅ '}{service}
                </div>
              ))}
            </div>
            
            {/* Show selected services count */}
            {formData.service.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
                border: '2px solid #0ea5e9',
                borderRadius: '10px',
                padding: '0.75rem',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ color: '#0369a1', fontSize: '0.9rem', margin: '0', fontWeight: '600' }}>
                  ✨ {formData.service.length} service{formData.service.length !== 1 ? 's' : ''} selected: {formData.service.join(', ')}
                </p>
              </div>
            )}
            
            {/* Final step confirmation */}
            <div style={{
              background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              marginTop: '1rem'
            }}>
              <h4 style={{ color: '#15803d', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                🎉 Ready to Complete Registration!
              </h4>
              <p style={{ color: '#16a34a', fontSize: '0.9rem', margin: '0' }}>
                Click the green "Secure My Spot!" button below to finalize your Growth Summit 2026 registration
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Step 1 of 4";
      case 2: return "Step 2 of 4";
      case 3: return "Step 3 of 4";
      case 4: return "Step 4 of 4";
      default: return "";
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
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .final-card {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
          transition: all 0.3s ease;
        }
        
        .final-button {
          animation: pulse 3s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>

      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        padding: '0 0.5rem'
      }}>
        {/* Header Section */}
        <div style={{
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          <img 
            src="/growth-summit-logo.jpeg" 
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
          />
          
          {/* Organizer Logos */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '3rem',
            marginTop: '0.5rem',
            marginBottom: '1rem'
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
                letterSpacing: '1px',
                color: '#ffffff',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                textTransform: 'uppercase'
              }}>
                Presented By
              </span>
              <img 
                src="/images/we-all-logo.png" 
                alt="We Alll" 
                style={{
                  width: '80px',
                  height: '50px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '5px',
                  borderRadius: '8px',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.2)'
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
                letterSpacing: '1px',
                color: '#ffffff',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                textTransform: 'uppercase'
              }}>
                Organised By
              </span>
              <img 
                src="/images/choicefoundation-logo.jpg" 
                alt="Choice Foundation" 
                style={{
                  width: '80px',
                  height: '50px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '5px',
                  borderRadius: '8px',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.2)'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Main Message Text */}
        <div className="final-card" style={{
          textAlign: 'center',
          marginBottom: '0.8rem',
          padding: '1rem',
          borderRadius: '20px'
        }}>
          <div style={{
            fontSize: '1.4rem',
            fontWeight: 'bold',
            lineHeight: '1.1',
            marginBottom: '0.5rem'
          }}>
            <span style={{ color: '#2d3436' }}>Working hard in your </span>
            <span style={{ color: '#2d5016' }}>business</span>
            <span style={{ color: '#2d3436' }}> but not </span>
            <span style={{ 
              fontSize: '2.2rem', 
              color: '#2d5016', 
              fontWeight: 'bold',
              display: 'block',
              margin: '0.2rem 0'
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

        {/* ULTRA COMPACT Event & Mentor Card */}
        <div className="final-card" style={{
          padding: '0.6rem',
          borderRadius: '15px',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'center',
          flexWrap: 'nowrap'
        }}>
          {/* Event Details - Super Compact */}
          <div style={{
            flex: '1 1 auto',
            minWidth: '0'
          }}>
            <h3 style={{
              fontSize: '0.8rem',
              marginBottom: '0.2rem',
              color: '#2d3436',
              fontWeight: 'bold'
            }}>
              📅 Event Details
            </h3>
            <div style={{ fontSize: '0.7rem', color: '#92400e', lineHeight: '1.2' }}>
              <p style={{ margin: '0.1rem 0', fontWeight: '600' }}>January 3rd, 2026</p>
              <p style={{ margin: '0.1rem 0', fontWeight: '600' }}>📍 Asansol</p>
              <p style={{ margin: '0.1rem 0', fontWeight: '600' }}>🕘 9:30 AM - 5:00 PM</p>
            </div>
          </div>
          
          {/* Super Compact Mentor */}
          <div style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            <img 
              src="/images/amit-santra-photo.jpg" 
              alt="Amit Santra" 
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                objectFit: 'cover',
                objectPosition: 'center top',
                border: '2px solid #f97316',
                boxShadow: '0 3px 10px rgba(249, 115, 22, 0.3)',
                flexShrink: 0
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{
                fontSize: '0.75rem',
                marginBottom: '0.05rem',
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
                Founder of We Alll
              </p>
            </div>
          </div>
        </div>

        {/* Register Button */}
        <Button 
          className="final-button"
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

        {/* Contact Info */}
        <div className="final-card" style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '15px',
          textAlign: 'center'
        }}>
          <h4 style={{
            fontSize: '1rem',
            marginBottom: '0.3rem',
            color: '#2d3436',
            fontWeight: '600'
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

      {/* Step-by-Step Registration Modal */}
      <Modal 
        show={showRegistrationModal} 
        onHide={closeModal} 
        size="lg" 
        centered
        style={{ zIndex: 9999 }}
      >
        <Modal.Header 
          closeButton 
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderBottom: 'none',
            padding: '1rem 1.5rem'
          }}
        >
          <div style={{ width: '100%' }}>
            <Modal.Title style={{ 
              color: 'white', 
              fontSize: '1.2rem',
              marginBottom: '0.5rem'
            }}>
              Growth Summit 2026 Registration
            </Modal.Title>
            <div style={{ 
              fontSize: '0.9rem', 
              opacity: '0.9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{getStepTitle()}</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: step <= currentStep ? 'white' : 'rgba(255,255,255,0.3)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Modal.Header>
        
        <Form onKeyDown={handleKeyDown} autoComplete="off">
          <Modal.Body style={{ 
            padding: '0',
            background: 'white',
            minHeight: '300px'
          }}>
            {renderStepContent()}
          </Modal.Body>
          
          <Modal.Footer style={{ 
            background: 'white',
            borderTop: '1px solid #e2e8f0',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <div>
              {currentStep > 1 && (
                <Button 
                  type="button"
                  variant="outline-secondary"
                  onClick={prevStep}
                  disabled={loading}
                  style={{
                    borderRadius: '25px',
                    padding: '1rem 1.5rem',
                    fontWeight: '600',
                    fontSize: '1rem',
                    border: '2px solid #e5e7eb',
                    color: '#6b7280',
                    background: 'white',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#9ca3af';
                    e.target.style.color = '#374151';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.color = '#6b7280';
                    e.target.style.transform = 'translateY(0px)';
                  }}
                >
                  ← Back
                </Button>
              )}
            </div>
            
            <div>
              {currentStep < 4 ? (
                <Button 
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext() || loading}
                  style={{
                    background: canProceedToNext() 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '25px',
                    padding: '1rem 2.5rem',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    boxShadow: canProceedToNext() 
                      ? '0 8px 25px rgba(102, 126, 234, 0.4)' 
                      : '0 4px 15px rgba(148, 163, 184, 0.3)',
                    transition: 'all 0.3s ease',
                    cursor: canProceedToNext() ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: canProceedToNext() ? 1 : 0.8
                  }}
                  onMouseEnter={(e) => {
                    if (canProceedToNext()) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canProceedToNext()) {
                      e.target.style.transform = 'translateY(0px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {currentStep === 1 ? '🚀 Let\'s Go!' : 
                     currentStep === 2 ? '✨ Next Step' : 
                     currentStep === 3 ? '📋 Choose Services' : 'Continue'}
                  </span>
                  {canProceedToNext() && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'shimmer 2s infinite'
                    }}></div>
                  )}
                </Button>
              ) : (
                <Button 
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '25px',
                    padding: '1rem 2.5rem',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ marginRight: '0.5rem' }}>⏳</span>
                      Securing Your Spot...
                    </>
                  ) : (
                    <>
                      <span style={{ marginRight: '0.5rem' }}>🎉</span>
                      Secure My Spot!
                    </>
                  )}
                  {!loading && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'shimmer 2s infinite'
                    }}></div>
                  )}
                </Button>
              )}
            </div>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default GrowthSummitFinal;