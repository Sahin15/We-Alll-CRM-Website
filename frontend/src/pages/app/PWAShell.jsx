import { useEffect } from 'react';
import { usePWAScope } from '../../hooks/usePWAScope';
import PWALayout from '../../components/pwa/PWALayout';

export default function PWAShell() {
  // Enforce /app scope when running as installed PWA
  usePWAScope('/app');

  // Inject the /app-scoped manifest so this PWA installs separately
  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"]');
    if (existing) {
      existing.setAttribute('href', '/manifest-pwa.json');
    } else {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest-pwa.json';
      document.head.appendChild(link);
    }

    // Restore default manifest when leaving this shell
    return () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (link) link.setAttribute('href', '/manifest.json');
    };
  }, []);

  return <PWALayout />;
}
