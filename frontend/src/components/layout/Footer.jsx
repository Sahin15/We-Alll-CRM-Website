import { Container, Row, Col } from "react-bootstrap";
import { FaHeart, FaGithub, FaLinkedin, FaEnvelope, FaUser } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useAuth } from "../../context/AuthContext";

const Footer = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer mt-auto" style={{ width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', zIndex: 1040 }}>
      <div 
        className="footer-gradient py-3"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container fluid className="px-4">
          <Row className="align-items-center">
            <Col md={6} className="text-center text-md-start mb-2 mb-md-0">
              <div className="d-flex align-items-center justify-content-center justify-content-md-start">
                <img 
                  src={new URL('./We-Alll-Logo.jpg', import.meta.url).href}
                  alt="WE ALLL"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    marginRight: '10px',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
                <div>
                  <div className="text-white fw-semibold" style={{ fontSize: '0.95rem', marginBottom: '4px' }}>
                    WE ALLL Office
                  </div>
                  <div className="text-white-50" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                    Empowering Teams, Simplifying Management
                  </div>
                </div>
              </div>
            </Col>
            
            <Col md={6} className="text-center text-md-end">
              {user && (
                <div className="text-white" style={{ fontSize: '0.85rem', marginBottom: '8px', lineHeight: '1.5' }}>
                  <FaUser className="me-2" size={14} />
                  <strong>{user.name}</strong>
                  <span className="ms-2 badge bg-white bg-opacity-25 text-white" style={{ fontSize: '0.7rem' }}>
                    {user.role === 'employee' ? (user.funBadge || 'Team Member') : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
              )}
              <div className="text-white-50" style={{ fontSize: '0.75rem', marginBottom: '6px', lineHeight: '1.5' }}>
                Made with <FaHeart className="text-danger mx-1" style={{ animation: 'heartbeat 1.5s ease-in-out infinite' }} size={12} /> by WE ALLL Team
              </div>
              <div className="text-white-50" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>
                © {currentYear} WE ALLL. All rights reserved.
              </div>
            </Col>
          </Row>
          
          <Row className="mt-2 pt-2 border-top border-white border-opacity-25">
            <Col md={6} className="text-center text-md-start mb-2 mb-md-0">
              <div className="d-flex gap-3 justify-content-center justify-content-md-start" style={{ lineHeight: '1.6' }}>
                <a 
                  href="/privacy-policy" 
                  className="text-white text-decoration-none footer-link"
                  style={{ fontSize: '0.75rem', padding: '2px 0' }}
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Navigate to privacy policy page
                    console.log('Navigate to Privacy Policy');
                  }}
                >
                  Privacy Policy
                </a>
                <span className="text-white-50">•</span>
                <a 
                  href="/terms-of-service" 
                  className="text-white text-decoration-none footer-link"
                  style={{ fontSize: '0.75rem', padding: '2px 0' }}
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Navigate to terms page
                    console.log('Navigate to Terms of Service');
                  }}
                >
                  Terms of Service
                </a>
                <span className="text-white-50">•</span>
                <a 
                  href="/support" 
                  className="text-white text-decoration-none footer-link"
                  style={{ fontSize: '0.75rem', padding: '2px 0' }}
                  onClick={(e) => {
                    e.preventDefault();
                    // TODO: Navigate to support page
                    console.log('Navigate to Support');
                  }}
                >
                  Support
                </a>
              </div>
            </Col>
            
            <Col md={6} className="text-center text-md-end">
              <div className="d-flex gap-3 justify-content-center justify-content-md-end">
                <a 
                  href="mailto:contact@wealll.com" 
                  className="text-white footer-social-link"
                  aria-label="Email"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaEnvelope size={16} />
                </a>
                <a 
                  href="https://www.linkedin.com/company/we-alll/" 
                  className="text-white footer-social-link"
                  aria-label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaLinkedin size={16} />
                </a>
                <a 
                  href="https://x.com/" 
                  className="text-white footer-social-link"
                  aria-label="X (Twitter)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaXTwitter size={16} />
                </a>
                <a 
                  href="https://github.com/login" 
                  className="text-white footer-social-link"
                  aria-label="GitHub"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaGithub size={16} />
                </a>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <style>{`
        .footer {
          margin-top: auto;
        }

        .footer-gradient {
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .footer-link {
          transition: all 0.3s ease;
          opacity: 0.9;
        }

        .footer-link:hover {
          opacity: 1;
          transform: translateY(-2px);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .footer-social-link {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .footer-social-link:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        /* Mobile styles */
        @media (max-width: 767.98px) {
          .footer {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .footer-gradient {
            padding: 1.5rem 0 !important;
          }

          .footer-link {
            font-size: 0.75rem !important;
          }

          .footer-social-link {
            width: 32px;
            height: 32px;
          }

          .footer-social-link svg {
            width: 16px;
            height: 16px;
          }

          /* Stack footer sections on mobile */
          .footer-gradient .row .col-md-6 {
            text-align: center !important;
            margin-bottom: 1rem;
          }

          .footer-gradient .row .col-md-6:last-child {
            margin-bottom: 0;
          }

          /* Center align all content on mobile */
          .footer-gradient .d-flex {
            justify-content: center !important;
          }
        }

        /* Very small screens */
        @media (max-width: 575.98px) {
          .footer-link {
            font-size: 0.7rem !important;
          }

          .footer-gradient .d-flex.gap-3 {
            gap: 0.5rem !important;
          }

          .footer-social-link {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
