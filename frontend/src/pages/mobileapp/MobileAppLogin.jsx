import { useState } from 'react';
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { BRAND_LOGO_MINI } from '../../constants/branding';

export default function MobileAppLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.');
      }
      // On success, AuthContext updates isAuthenticated → MobileAppShell
      // re-renders and shows MobileAppLayout automatically. No navigate needed.
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #10B981 0%, #059669 60%, #047857 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <img loading="lazy" src={BRAND_LOGO_MINI}
          alt="WeAlll Office"
          style={{ width: '72px', height: '72px', objectFit: 'contain', borderRadius: '18px', background: 'rgba(255,255,255,0.2)', padding: '10px', marginBottom: '12px' }}
        />
        <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.02em' }}>WeAlll Office</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginTop: '4px' }}>Sign in to continue</div>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '28px 24px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px',
            padding: '12px 14px', marginBottom: '20px', color: '#DC2626', fontSize: '0.85rem', fontWeight: '500',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              style={{
                width: '100%', height: '46px', border: '2px solid #E5E7EB', borderRadius: '10px',
                padding: '0 14px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{
                  width: '100%', height: '46px', border: '2px solid #E5E7EB', borderRadius: '10px',
                  padding: '0 44px 0 14px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px',
                }}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: '48px', background: loading ? '#6EE7B7' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none', borderRadius: '12px', color: '#fff', fontSize: '1rem', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px', transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <FaSpinner size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

