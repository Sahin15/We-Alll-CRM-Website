import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Enforces that when running as an installed PWA (standalone mode),
 * the app stays within its declared scope.
 *
 * @param {string} scope - The URL prefix this PWA owns, e.g. "/mobileapp" or "/app"
 */
export function usePWAScope(scope) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (!isStandalone) return;

    // If the current path is outside this PWA's scope, redirect back to scope root
    if (!location.pathname.startsWith(scope)) {
      navigate(scope, { replace: true });
    }
  }, [location.pathname, scope, navigate]);
}
