// src/hooks/useNetwork.js
import { useState, useEffect } from 'react';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. Hardware-level listeners (Triggers instantly if user toggles device Wi-Fi)
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Active Outbound Ping (Detects "Fake Wi-Fi" where the router lost internet)
    const pingInterval = setInterval(async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }

      try {
        // THE PWA CACHE-BUSTER FIX:
        // We ping an external domain that our Service Worker does not control.
        // 'no-cors' mode guarantees zero console security errors.
        await fetch('https://www.google.com/favicon.ico?_=' + new Date().getTime(), {
          method: 'GET', // Standard GET is safest for no-cors
          mode: 'no-cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(4000) 
        });
        
        // If the fetch resolves at all (even an opaque response), we have real internet!
        setIsOnline(true);
      } catch {
        // If the fetch completely fails, the router lost outbound connection.
        setIsOnline(false); 
      }
    }, 5000); // Ping every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, []);

  return isOnline;
}