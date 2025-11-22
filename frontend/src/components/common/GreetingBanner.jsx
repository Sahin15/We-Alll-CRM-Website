import { Card } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { FaSun, FaMoon, FaCloudSun } from "react-icons/fa";

const GreetingBanner = ({ subtitle = "Welcome to your dashboard" }) => {
  const { user } = useAuth();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good Morning", icon: <FaSun /> };
    if (hour < 18) return { text: "Good Afternoon", icon: <FaCloudSun /> };
    return { text: "Good Evening", icon: <FaMoon /> };
  };

  const getFormattedDate = () => {
    const options = { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    };
    return new Date().toLocaleDateString("en-US", options);
  };

  const greeting = getGreeting();

  return (
    <Card className="greeting-banner shadow-lg mb-4">
      <Card.Body className="text-white py-4 position-relative">
        <div className="greeting-content">
          <div className="d-flex align-items-center mb-2">
            <span className="greeting-icon me-3">{greeting.icon}</span>
            <h2 className="mb-0 greeting-text">
              {greeting.text}! 👋
            </h2>
          </div>
          <p className="mb-1 fs-5 greeting-subtitle">
            {subtitle}, <strong className="user-name">{user?.name || "User"}</strong>
          </p>
          <small className="opacity-75 d-flex align-items-center">
            <span className="date-badge">{getFormattedDate()}</span>
          </small>
        </div>
        
        {/* Animated background elements */}
        <div className="greeting-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </Card.Body>
      
      <style>{`
        .greeting-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          margin-top: -8px;
        }
        
        .greeting-banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, 
            rgba(255,255,255,0.3) 0%, 
            rgba(255,255,255,0.8) 50%, 
            rgba(255,255,255,0.3) 100%);
          animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .greeting-content {
          position: relative;
          z-index: 2;
        }
        
        .greeting-icon {
          font-size: 2.5rem;
          animation: float 3s ease-in-out infinite;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .greeting-text {
          font-weight: 700;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          animation: fadeInUp 0.6s ease-out;
        }
        
        .greeting-subtitle {
          animation: fadeInUp 0.8s ease-out;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .user-name {
          background: rgba(255,255,255,0.2);
          padding: 2px 12px;
          border-radius: 20px;
          display: inline-block;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
          transition: all 0.3s ease;
        }
        
        .user-name:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.05);
        }
        
        .date-badge {
          background: rgba(255,255,255,0.15);
          padding: 4px 12px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          font-size: 0.9rem;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .greeting-bg-shapes {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 1;
        }
        
        .shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          animation: float-shapes 20s ease-in-out infinite;
        }
        
        .shape-1 {
          width: 150px;
          height: 150px;
          top: -50px;
          right: 10%;
          animation-delay: 0s;
        }
        
        .shape-2 {
          width: 100px;
          height: 100px;
          bottom: -30px;
          left: 15%;
          animation-delay: 2s;
        }
        
        .shape-3 {
          width: 80px;
          height: 80px;
          top: 50%;
          right: 5%;
          animation-delay: 4s;
        }
        
        @keyframes float-shapes {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.6;
          }
        }
      `}</style>
    </Card>
  );
};

export default GreetingBanner;
