import { Container, Row, Col } from "react-bootstrap";
import {
  FaHeart,
  FaGithub,
  FaLinkedin,
  FaEnvelope,
  FaUser,
  FaFacebook,
  FaInstagram,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { BRAND_LOGO_FULL, BRAND_NAME } from "../../constants/branding";

const Footer = ({ sidebarCollapsed = false, isMobile = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Calculate margin based on sidebar state
  const footerMargin = isMobile ? "0" : sidebarCollapsed ? "70px" : "250px";

  return (
    <footer
      className="footer mt-auto"
      style={{
        zIndex: 1040,
        marginLeft: footerMargin,
        transition: "margin-left 0.3s ease",
        width: isMobile ? "100%" : `calc(100% - ${footerMargin})`,
      }}
    >
      <div
        className="footer-gradient py-3"
        style={{
          background:
            "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)",
          borderRadius: isMobile ? "0" : "16px 0 0 0",
        }}
      >
        <Container fluid className="px-4" style={{ paddingLeft: isMobile ? '1rem' : '2rem' }}>
          <Row className="align-items-center">
            <Col md={6} className="text-center text-md-start mb-2 mb-md-0">
              <div className="d-flex align-items-center justify-content-center justify-content-md-start">
                <div className="footer-logo-container">
                  <img
                    src={BRAND_LOGO_FULL}
                    alt={BRAND_NAME}
                    className="footer-logo-img"
                  />
                </div>
                <div className="footer-tagline">
                  <div
                    className="text-white-50"
                    style={{ fontSize: "0.75rem", lineHeight: "1.4" }}
                  >
                    Empowering Teams, Simplifying Management
                  </div>
                </div>
              </div>
            </Col>

            <Col md={6} className="text-center text-md-end">
              {user && (
                <div
                  className="text-white"
                  style={{
                    fontSize: "0.85rem",
                    marginBottom: "8px",
                    lineHeight: "1.5",
                  }}
                >
                  <FaUser className="me-2" size={14} />
                  <strong>{user.name}</strong>
                  <span
                    className="ms-2 badge bg-white bg-opacity-25 text-white"
                    style={{ fontSize: "0.7rem" }}
                  >
                    {user.role === "employee"
                      ? user.funBadge || "Team Member"
                      : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
              )}
              <div
                className="text-white-50"
                style={{
                  fontSize: "0.75rem",
                  marginBottom: "6px",
                  lineHeight: "1.5",
                }}
              >
                Made with{" "}
                <FaHeart
                  className="text-danger mx-1"
                  style={{ animation: "heartbeat 1.5s ease-in-out infinite" }}
                  size={12}
                />{" "}
                by We Alll Team
              </div>
              <div
                className="text-white-50"
                style={{ fontSize: "0.7rem", lineHeight: "1.4" }}
              >
                © {currentYear} We Alll. All rights reserved.
                <span className="ms-2 text-white-50">
                  V 5.1.0
                </span>
              </div>
            </Col>
          </Row>

          <Row className="mt-2 pt-2 border-top border-white border-opacity-25">
            <Col md={6} className="text-center text-md-start mb-2 mb-md-0">
              <div
                className="d-flex gap-3 justify-content-center justify-content-md-start"
                style={{ lineHeight: "1.6", paddingLeft: isMobile ? "0" : "60px" }}
              >
                <a
                  href="/privacy-policy"
                  className="text-white text-decoration-none footer-link"
                  style={{ fontSize: "0.75rem", padding: "2px 0" }}
                  onClick={(e) => { e.preventDefault(); }}
                >
                  Privacy Policy
                </a>
                <span className="text-white-50">•</span>
                <a
                  href="/terms-of-service"
                  className="text-white text-decoration-none footer-link"
                  style={{ fontSize: "0.75rem", padding: "2px 0" }}
                  onClick={(e) => { e.preventDefault(); }}
                >
                  Terms of Service
                </a>
                <span className="text-white-50">•</span>
                <a
                  href="/support"
                  className="text-white text-decoration-none footer-link"
                  style={{ fontSize: "0.75rem", padding: "2px 0" }}
                  onClick={(e) => { e.preventDefault(); navigate("/support"); }}
                >
                  Support
                </a>
              </div>
            </Col>

            <Col md={6} className="text-center text-md-end">
              <div className="d-flex gap-3 justify-content-center justify-content-md-end align-items-center">
                <span className="text-white-50 me-2" style={{ fontSize: "0.75rem" }}>
                  Follow us:
                </span>
                <a
                  href="https://www.facebook.com/profile.php?id=61556163594429"
                  className="text-white footer-social-link"
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaFacebook />
                </a>
                <a
                  href="https://www.instagram.com/wealll_official?igsh=MXkybmh3Z2x0b2Vrcg=="
                  className="text-white footer-social-link"
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaInstagram />
                </a>
                <a
                  href="mailto:amit@wealll.com"
                  className="text-white footer-social-link"
                  aria-label="Email"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaEnvelope />
                </a>
                <a
                  href="https://www.linkedin.com/company/we-alll/"
                  className="text-white footer-social-link"
                  aria-label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaLinkedin />
                </a>
                <a
                  href="https://x.com/"
                  className="text-white footer-social-link"
                  aria-label="X (Twitter)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaXTwitter />
                </a>
                <a
                  href="https://github.com/login"
                  className="text-white footer-social-link"
                  aria-label="GitHub"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaGithub />
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

        /* Footer logo */
        .footer-logo-container {
          width: 180px;
          height: 60px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.25);
          transition: all 0.3s ease;
          margin-right: 12px;
        }

        .footer-logo-container:hover {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(15px);
          transform: scale(1.05);
          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.2),
            0 6px 16px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.35);
        }

        .footer-logo-container:hover .footer-logo-img {
          filter: contrast(1.2) saturate(1.2) brightness(1.15);
          transform: scale(1.15);
        }

        .footer-logo-img {
          width: 120%;
          height: 120%;
          object-fit: contain;
          border-radius: 10px;
          filter: contrast(1.1) saturate(1.1) brightness(1.1);
          transition: all 0.3s ease;
          transform: scale(1.1);
          opacity: 1;
        }

        .footer-tagline {
          flex: 1;
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
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
          position: relative;
        }

        .footer-social-link:nth-child(2) { animation-delay: 0.1s; }
        .footer-social-link:nth-child(3) { animation-delay: 0.2s; }
        .footer-social-link:nth-child(4) { animation-delay: 0.3s; }
        .footer-social-link:nth-child(5) { animation-delay: 0.4s; }
        .footer-social-link:nth-child(6) { animation-delay: 0.5s; }
        .footer-social-link:nth-child(7) { animation-delay: 0.6s; }

        .footer-social-link svg {
          width: 20px;
          height: 20px;
          color: white;
          transition: all 0.3s ease;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .footer-social-link:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-3px) scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .footer-social-link:hover svg {
          color: white;
          transform: translate(-50%, -50%) scale(1.2);
        }

        /* Individual social media platform colors on hover */
        .footer-social-link:hover:nth-child(2) {
          background: rgba(24, 119, 242, 0.8); /* Facebook blue */
        }

        .footer-social-link:hover:nth-child(3) {
          background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%); /* Instagram gradient */
        }

        .footer-social-link:hover:nth-child(4) {
          background: rgba(234, 67, 53, 0.8); /* Gmail red */
        }

        .footer-social-link:hover:nth-child(5) {
          background: rgba(0, 119, 181, 0.8); /* LinkedIn blue */
        }

        .footer-social-link:hover:nth-child(6) {
          background: rgba(0, 0, 0, 0.8); /* X (Twitter) black */
        }

        .footer-social-link:hover:nth-child(7) {
          background: rgba(51, 51, 51, 0.8); /* GitHub dark */
        }

        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes socialPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
          }
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .footer-social-link:focus {
          animation: socialPulse 0.6s ease-in-out;
          outline: none;
        }

        /* Mobile styles */
        @media (max-width: 767.98px) {
          .footer {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100% !important;
          }

          .footer-gradient {
            padding: 1rem 0.5rem !important;
          }
          
          .footer-gradient .container-fluid {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .footer-logo-container {
            width: 140px;
            height: 45px;
            margin-right: 10px;
          }

          .footer-tagline {
            font-size: 0.7rem !important;
          }

          .footer-link {
            font-size: 0.7rem !important;
            padding: 4px 0 !important;
          }

          .footer-social-link {
            width: 36px;
            height: 36px;
          }

          .footer-social-link svg {
            width: 18px !important;
            height: 18px !important;
          }

          /* Stack footer sections on mobile */
          .footer-gradient .row .col-md-6 {
            text-align: center !important;
            margin-bottom: 0.75rem;
          }

          .footer-gradient .row .col-md-6:last-child {
            margin-bottom: 0;
          }

          /* Center align all content on mobile */
          .footer-gradient .d-flex {
            justify-content: center !important;
            flex-wrap: wrap;
          }
          
          /* Reduce gap on mobile */
          .footer-gradient .d-flex.gap-3 {
            gap: 0.75rem !important;
          }

          /* Hide "Follow us:" text on mobile */
          .footer-gradient .d-flex span {
            display: none;
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
            width: 32px;
            height: 32px;
          }
          
          .footer-social-link svg {
            width: 16px !important;
            height: 16px !important;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;

