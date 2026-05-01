import { useEffect } from 'react';
import { usePWAScope } from '../../hooks/usePWAScope';
import MobileAppLayout from '../../components/mobileapp/MobileAppLayout';

export default function MobileAppShell() {
  // Enforce /mobileapp scope when running as installed PWA
  usePWAScope('/mobileapp');

  // Ensure the /mobileapp-scoped manifest is active
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

  return <MobileAppLayout />;
}
