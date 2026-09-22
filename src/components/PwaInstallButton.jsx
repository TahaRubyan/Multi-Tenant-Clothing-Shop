import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Smartphone } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export const PwaInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { showToast } = usePOS();

  useEffect(() => {
    // Check if running in standalone mode (PWA installed)
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && window.navigator && window.navigator.standalone);

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (showToast) {
        showToast('NOVA POS App installed successfully!', 'success');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, [showToast]);

  const handleInstallClick = async () => {
    if (isInstalled) {
      if (showToast) {
        showToast('NOVA POS is already running as an installed PWA!', 'info');
      }
      return;
    }

    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        if (showToast) {
          showToast('Installing NOVA POS App to device...', 'success');
        }
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction for browsers / environments where prompt cannot be triggered programmatically
      if (showToast) {
        showToast('PWA Ready: To install, tap the Share / Install icon in your browser URL bar and select "Add to Home Screen" or "Install App".', 'info');
      }
    }
  };

  return (
    <button
      type="button"
      className={`btn-pwa-header ${isInstalled ? 'btn-pwa-active' : ''}`}
      onClick={handleInstallClick}
      title={isInstalled ? 'Running as Installed PWA' : 'Install NOVA POS as a Progressive Web App (PWA)'}
      aria-label="PWA App Install"
    >
      {isInstalled ? (
        <>
          <CheckCircle2 size={14} className="text-success" />
          <span className="pwa-text">PWA Ready</span>
        </>
      ) : (
        <>
          <Download size={14} className="pwa-download-icon" />
          <span className="pwa-text">Install PWA</span>
        </>
      )}
    </button>
  );
};
