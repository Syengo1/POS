import { useState, useEffect } from 'react';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome's default mini-infobar from appearing automatically
      e.preventDefault(); 
      // Stash the event so we can trigger it from our custom button
      setDeferredPrompt(e); 
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    
    // Show the browser's official install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // If they install it, clear the prompt so the button disappears
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return { isInstallable: !!deferredPrompt, installApp };
}