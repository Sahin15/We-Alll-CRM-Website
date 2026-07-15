import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import MobileAppLayout from '../../components/mobileapp/MobileAppLayout';
import MobileAppLogin from './MobileAppLogin';
import { BRAND_LOGO_MINI } from '../../constants/branding';

export default function MobileAppShell() {
  const { isAuthenticated, loading } = useAuth();

  // Ensure the /mobileapp-scoped manifest is active so this PWA
  // installs and stays within its own scope — never navigates to /login or /dashboard
  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]');
    if (existing) {
      existing.setAttribute('href', '/manifest.json');
    } else {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }
  }, []);

  // Show spinner while auth state is being restored from localStorage
  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px',
      }}>
        <img loading="lazy" src={BRAND_LOGO_MINI} alt="WeAlll" style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', padding: '10px' }} />
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in → show built-in login (stays within /mobileapp scope)
  if (!isAuthenticated) {
    return <MobileAppLogin />;
  }

  // Logged in → show the mobile app
  return <MobileAppLayout />;
}

