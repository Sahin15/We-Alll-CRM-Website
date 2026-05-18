import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Form, Alert } from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to go after login:
  // 1. If redirected here from a protected route (e.g. /mobileapp), go back there
  // 2. If running as installed PWA standalone, go to the correct shell
  // 3. Otherwise go to /dashboard
  const getRedirectPath = () => {
    const from = location.state?.from;
    if (from && from !== '/login') return from;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      const manifestHref = document.querySelector('link[rel="manifest"]')?.getAttribute('href') || '';
      return manifestHref.includes('manifest-pwa') ? '/app' : '/mobileapp';
    }

    return '/dashboard';
  };

  // Get motivational messages
  const getMotivationalMessage = () => {
    const messages = [
      "Ready to make today productive?",
      "Let's achieve great things together!",
      "Your workspace awaits you!",
      "Time to turn ideas into reality!",
      "Ready to make an impact today?"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login({ email, password });
      if (result.success) {
        // Set user name from profile for personalized welcome
        // The login function returns { success: true, data: { user, token } }
        const user = result.data?.user;
        const fullName = user?.name || "";
        
        // Extract first name for personalized greeting
        const firstName = fullName ? fullName.split(' ')[0] : email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        
        setUserName(firstName);
        
        // Show welcome animation before navigating
        setShowWelcome(true);
        setTimeout(() => {
          navigate(getRedirectPath());
        }, 4000); // 4 seconds welcome animation
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  // Welcome Loading Screen
  if (showWelcome) {
    return (
      <div className="welcome-screen">
        <div className="sparkle sparkle-1"></div>
        <div className="sparkle sparkle-2"></div>
        <div className="sparkle sparkle-3"></div>
        <div className="sparkle sparkle-4"></div>
        <div className="sparkle sparkle-5"></div>
        <div className="welcome-content">
          <div className="logo-animation">
            <div className="logo-full-container">
              <img loading="lazy" src="/We Alll Office Logo.png" 
                alt="We Alll Office" 
                className="logo-img-full"
              />
            </div>
          </div>
          <div className="welcome-text">
            <h1 className="welcome-title">Welcome to We Alll Office</h1>
            <h2 className="user-name">{userName}</h2>
            <p className="motivational-text">{getMotivationalMessage()}</p>
          </div>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        
        <style>{`
          .welcome-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: welcomeFadeIn 0.5s ease-out;
            overflow: hidden;
          }
          
          .welcome-screen::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(
              circle at center,
              rgba(255,255,255,0.3) 0%,
              rgba(255,255,255,0.15) 30%,
              transparent 60%
            );
            animation: rotateGradient 6s linear infinite, pulse 3s ease-in-out infinite;
            z-index: 1;
          }
          
          .welcome-screen::after {
            content: '';
            position: absolute;
            top: 0;
            left: -150%;
            width: 80%;
            height: 100%;
            background: linear-gradient(90deg, 
              transparent 0%, 
              rgba(255,255,255,0.2) 25%,
              rgba(255,255,255,0.5) 50%,
              rgba(255,255,255,0.2) 75%,
              transparent 100%
            );
            animation: shine 4s ease-in-out infinite;
            z-index: 2;
            transform: skewX(-20deg);
          }
          
          .welcome-content {
            text-align: center;
            color: white;
            position: relative;
            z-index: 10;
          }
          
          .logo-animation {
            margin-bottom: 2rem;
            animation: logoScale 1s ease-out;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .logo-animation .logo-full-container {
            width: 240px;
            height: 80px;
          }
          
          .logo-icon {
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
            animation: logoPulse 2s ease-in-out infinite, logoGlow 3s ease-in-out infinite;
            background: rgba(255, 255, 255, 0.1);
            padding: 8px;
            border-radius: 12px;
            box-shadow: 
              0 10px 30px rgba(79, 70, 229, 0.3),
              0 4px 12px rgba(79, 70, 229, 0.2),
              inset 0 2px 0 rgba(255, 255, 255, 0.2);
          }
          
          .welcome-text {
            margin-bottom: 3rem;
          }
          
          .welcome-title {
            font-size: 1.6rem !important;
            font-weight: 400;
            margin-bottom: 1rem;
            opacity: 0;
            animation: textSlideUp 0.8s ease-out 0.5s forwards, titleGlow 4s ease-in-out infinite;
            text-shadow: 
              0 0 10px rgba(255, 255, 255, 0.5),
              0 0 20px rgba(79, 70, 229, 0.3);
          }
          
          .user-name {
            font-size: 3.2rem !important;
            font-weight: 700;
            margin: 0.5rem 0 1rem;
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B6B 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            opacity: 0;
            animation: nameGlow 1.2s ease-out 0.8s forwards, nameTextGlow 3s ease-in-out infinite;
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.3));
          }
          
          .motivational-text {
            font-size: 1.2rem;
            font-weight: 300;
            margin: 0;
            opacity: 0.9;
            font-style: italic;
            opacity: 0;
            animation: textSlideUp 0.8s ease-out 1.2s forwards;
          }
          
          .loading-dots {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
          }
          
          .dot {
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            animation: dotBounce 1.4s ease-in-out infinite both;
          }
          
          .dot:nth-child(1) { animation-delay: -0.32s; }
          .dot:nth-child(2) { animation-delay: -0.16s; }
          .dot:nth-child(3) { animation-delay: 0s; }
          
          @keyframes welcomeFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes logoScale {
            0% { transform: scale(0) rotate(-180deg); opacity: 0; }
            50% { transform: scale(1.2) rotate(-90deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          
          @keyframes logoPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          
          @keyframes textSlideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes nameGlow {
            0% {
              opacity: 0;
              transform: translateY(30px) scale(0.8);
            }
            50% {
              opacity: 0.8;
              transform: translateY(0) scale(1.1);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          @keyframes dotBounce {
            0%, 80%, 100% {
              transform: scale(0);
            }
            40% {
              transform: scale(1);
            }
          }
          
          @keyframes logoGlow {
            0%, 100% {
              box-shadow: 
                0 10px 30px rgba(79, 70, 229, 0.3),
                0 4px 12px rgba(79, 70, 229, 0.2),
                inset 0 2px 0 rgba(255, 255, 255, 0.2),
                0 0 20px rgba(79, 70, 229, 0.4);
            }
            50% {
              box-shadow: 
                0 12px 35px rgba(79, 70, 229, 0.4),
                0 6px 16px rgba(79, 70, 229, 0.3),
                inset 0 2px 0 rgba(255, 255, 255, 0.3),
                0 0 30px rgba(79, 70, 229, 0.6);
            }
          }
          
          @keyframes titleGlow {
            0%, 100% {
              text-shadow: 
                0 0 10px rgba(255, 255, 255, 0.5),
                0 0 20px rgba(79, 70, 229, 0.3),
                0 0 30px rgba(124, 58, 237, 0.2);
            }
            50% {
              text-shadow: 
                0 0 15px rgba(255, 255, 255, 0.7),
                0 0 30px rgba(79, 70, 229, 0.5),
                0 0 45px rgba(124, 58, 237, 0.4);
            }
          }
          
          @keyframes nameTextGlow {
            0%, 100% {
              filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.3));
            }
            50% {
              filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
            }
          }
          
          @keyframes rotateGradient {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          
          @keyframes shine {
            0% { 
              left: -150%; 
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            20% { 
              left: 150%; 
              opacity: 0;
            }
            100% { 
              left: 150%; 
              opacity: 0;
            }
          }
          
          @keyframes sparkle {
            0%, 100% {
              opacity: 0;
              transform: scale(0);
            }
            50% {
              opacity: 1;
              transform: scale(2);
            }
          }
          
          .sparkle {
            position: absolute;
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(255,255,255,1), 0 0 25px rgba(255,255,255,0.5);
            animation: sparkle 2s ease-in-out infinite;
            z-index: 5;
          }
          
          .sparkle-1 {
            top: 20%;
            left: 15%;
            animation-delay: 0s;
          }
          
          .sparkle-2 {
            top: 70%;
            left: 80%;
            animation-delay: 1s;
          }
          
          .sparkle-3 {
            top: 40%;
            right: 20%;
            animation-delay: 2s;
          }
          
          .sparkle-4 {
            top: 60%;
            left: 30%;
            animation-delay: 0.5s;
          }
          
          .sparkle-5 {
            top: 30%;
            left: 70%;
            animation-delay: 1.5s;
          }
          
          .sparkle-login-1 {
            top: 15%;
            left: 10%;
            animation-delay: 0.3s;
          }
          
          .sparkle-login-2 {
            top: 80%;
            right: 15%;
            animation-delay: 1.2s;
          }
          
          .sparkle-login-3 {
            top: 45%;
            left: 85%;
            animation-delay: 2.1s;
          }
          
          @keyframes containerGlow {
            0%, 100% {
              box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.1),
                0 0 30px rgba(79, 70, 229, 0.3);
            }
            50% {
              box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.1),
                0 0 50px rgba(79, 70, 229, 0.5);
            }
          }
          
          @media (max-width: 575.98px) {
            .welcome-title {
              font-size: 1.3rem;
            }
            .user-name {
              font-size: 2.5rem !important;
            }
            .motivational-text {
              font-size: 1rem;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="sparkle sparkle-login-1"></div>
      <div className="sparkle sparkle-login-2"></div>
      <div className="sparkle sparkle-login-3"></div>
      <div className="login-container">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-full-container" style={{ width: '160px', height: '50px', margin: '0 auto 1rem' }}>
            <img loading="lazy" src="/We Alll Office Logo.png" 
              alt="We Alll Office" 
              className="logo-img-full"
            />
          </div>
          <p className="brand-tagline">Your Digital Workspace</p>
        </div>

        {/* Login Form */}
        <div className="login-form-container">
          <div className="form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to access your account</p>
          </div>

          {error && (
            <Alert variant="danger" className="error-alert">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit} className="login-form">
            <Form.Group className="form-group">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </Form.Group>

            <Form.Group className="form-group">
              <Form.Label>Password</Form.Label>
              <div className="password-input-container">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </Form.Group>

            <div className="form-options">
              <Form.Check 
                type="checkbox" 
                label="Remember me"
                className="remember-checkbox"
              />
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <div
              className="custom-login-button-wrapper"
              data-loading={loading}
              style={{
                width: '100%',
                height: '44px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? '0.8' : '1',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={!loading ? (e) => {
                e.preventDefault();
                const form = e.target.closest('form');
                if (form) {
                  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                  form.dispatchEvent(submitEvent);
                }
              } : undefined}
            >
              <button
                type="submit"
                className="invisible-submit-button"
                disabled={loading}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'inherit',
                  opacity: 0,
                  zIndex: 1
                }}
              />
              {loading ? (
                <div className="loading-content" style={{ 
                  color: 'white', 
                  zIndex: 2, 
                  position: 'relative',
                  background: 'transparent'
                }}>
                  <div className="spinner"></div>
                  <span style={{ 
                    color: 'white',
                    background: 'transparent'
                  }}>Signing in...</span>
                </div>
              ) : (
                <span style={{ 
                  color: 'white', 
                  zIndex: 2, 
                  position: 'relative',
                  background: 'transparent'
                }}>Sign In</span>
              )}
            </div>
          </Form>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Full logo container - when expanded */
        .logo-full-container {
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
        }

        .logo-full-container:hover {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(15px);
          transform: scale(1.05);
          box-shadow: 
            0 12px 35px rgba(0, 0, 0, 0.2),
            0 6px 16px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.35);
        }

        .logo-full-container:hover .logo-img-full {
          filter: contrast(1.2) saturate(1.2) brightness(1.15);
          transform: scale(1.15);
        }

        /* Full logo image */
        .logo-img-full {
          width: 120%;
          height: 120%;
          object-fit: contain;
          border-radius: 10px;
          filter: contrast(1.1) saturate(1.1) brightness(1.1);
          transition: all 0.3s ease;
          transform: scale(1.1);
        }
        
        .login-page::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle at center,
            rgba(255,255,255,0.25) 0%,
            rgba(255,255,255,0.15) 30%,
            transparent 60%
          );
          animation: rotateGradient 8s linear infinite, pulse 4s ease-in-out infinite;
          z-index: 1;
        }
        
        .login-page::after {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 80%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255,255,255,0.15) 25%,
            rgba(255,255,255,0.4) 50%,
            rgba(255,255,255,0.15) 75%,
            transparent 100%
          );
          animation: shine 5s ease-in-out infinite;
          z-index: 2;
          transform: skewX(-20deg);
        }
        
        .login-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 16px;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.1),
            0 0 30px rgba(79, 70, 229, 0.3);
          overflow: hidden;
          width: 100%;
          max-width: 380px;
          max-height: 90vh;
          animation: slideUp 0.6s ease-out, containerGlow 4s ease-in-out infinite;
          position: relative;
          z-index: 10;
        }
        
        .logo-section {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);
          padding: 1.5rem 1.5rem 1.2rem;
          text-align: center;
          color: white;
        }
        
        .brand-tagline {
          font-size: 0.85rem;
          opacity: 0.9;
          margin: 0;
          font-weight: 300;
        }
        
        .login-form-container {
          padding: 1.8rem 1.5rem;
        }
        
        .form-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        .form-header h2 {
          font-size: 1.4rem !important;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 0.3rem;
          line-height: 1.3;
        }
        
        .form-header p {
          color: #666;
          margin: 0;
          font-size: 0.85rem;
        }
        
        .error-alert {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          border-radius: 12px;
          color: white;
          padding: 1rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }
        
        .form-group {
          margin-bottom: 1.2rem;
        }
        
        .form-group label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.4rem;
          font-size: 0.9rem;
        }
        
        .form-input {
          height: 44px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: 0 0.9rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          background: #f9fafb;
        }
        
        .form-input:focus {
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          background: white;
        }
        
        .password-input-container {
          position: relative;
        }
        
        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: color 0.2s ease;
        }
        
        .password-toggle:hover {
          color: #4F46E5;
        }
        
        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .remember-checkbox {
          font-size: 0.85rem;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .remember-checkbox input {
          margin: 0;
          accent-color: #4F46E5;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        
        .remember-checkbox label {
          margin: 0;
          cursor: pointer;
          user-select: none;
        }
        
        .forgot-link {
          color: #4F46E5;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        
        .forgot-link:hover {
          color: #7C3AED;
        }
        
        /* Login Button Wrapper - Complete control over styling */
        .custom-login-button-wrapper {
          width: 100% !important;
          height: 44px !important;
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%) !important;
          border: none !important;
          border-radius: 10px !important;
          color: white !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          position: relative !important;
          overflow: hidden !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          user-select: none !important;
        }
        
        .custom-login-button-wrapper * {
          color: white !important;
          background: transparent !important;
        }
        
        .custom-login-button-wrapper .loading-content {
          color: white !important;
          background: transparent !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.5rem !important;
          z-index: 2 !important;
          position: relative !important;
        }
        
        .custom-login-button-wrapper .loading-content * {
          color: white !important;
          background: transparent !important;
        }
        
        .custom-login-button-wrapper:hover:not([data-loading="true"]) {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3) !important;
        }
        
        .custom-login-button-wrapper:active:not([data-loading="true"]) {
          transform: translateY(0) !important;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3) !important;
        }
        
        .custom-login-button-wrapper[data-loading="true"] {
          opacity: 0.8 !important;
          cursor: not-allowed !important;
        }
        
        .invisible-submit-button {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: transparent !important;
          border: none !important;
          cursor: inherit !important;
          opacity: 0 !important;
          z-index: 1 !important;
        }
        
        .loading-content {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.5rem !important;
          color: white !important;
          background: transparent !important;
          z-index: 2 !important;
          position: relative !important;
        }
        
        .loading-content * {
          color: white !important;
          background: transparent !important;
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        /* Glowing Effects Animations */
        @keyframes rotateGradient {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @keyframes shine {
          0% { 
            left: -150%; 
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          20% { 
            left: 150%; 
            opacity: 0;
          }
          100% { 
            left: 150%; 
            opacity: 0;
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(2);
          }
        }
        
        @keyframes containerGlow {
          0%, 100% {
            box-shadow: 
              0 20px 40px rgba(0, 0, 0, 0.1),
              0 0 30px rgba(79, 70, 229, 0.3);
          }
          50% {
            box-shadow: 
              0 20px 40px rgba(0, 0, 0, 0.1),
              0 0 50px rgba(79, 70, 229, 0.5);
          }
        }
        
        /* Sparkle Styles */
        .sparkle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(255,255,255,1), 0 0 25px rgba(255,255,255,0.5);
          animation: sparkle 2s ease-in-out infinite;
          z-index: 5;
        }
        
        .sparkle-login-1 {
          top: 15%;
          left: 10%;
          animation-delay: 0.3s;
        }
        
        .sparkle-login-2 {
          top: 80%;
          right: 15%;
          animation-delay: 1.2s;
        }
        
        .sparkle-login-3 {
          top: 45%;
          left: 85%;
          animation-delay: 2.1s;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 480px) {
          .login-page {
            padding: 0.5rem;
          }
          
          .login-container {
            max-width: 100%;
            border-radius: 12px;
          }
          
          .logo-section {
            padding: 1.2rem 1rem 1rem;
          }
          
          .logo {
            width: 40px;
            height: 40px;
            margin-bottom: 0.8rem;
          }
          
          .brand-name {
            font-size: 1.3rem;
          }
          
          .brand-tagline {
            font-size: 0.8rem;
          }
          
          .login-form-container {
            padding: 1.5rem 1.2rem;
          }
          
          .form-header h2 {
            font-size: 1.2rem !important;
          }
          
          .form-header p {
            font-size: 0.8rem;
          }
          
          .form-input {
            height: 42px;
            font-size: 0.9rem;
          }
          
          .login-button {
            height: 42px;
            font-size: 0.95rem;
          }
        }
        
        @media (max-height: 700px) {
          .login-page {
            padding: 0.5rem;
          }
          
          .logo-section {
            padding: 1rem;
          }
          
          .login-form-container {
            padding: 1.2rem;
          }
          
          .form-group {
            margin-bottom: 1rem;
          }
          
          .form-options {
            margin-bottom: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;

