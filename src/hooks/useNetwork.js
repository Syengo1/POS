import { useState, useEffect } from 'react';

export function useNetwork() {
  // Step 1: Set the initial state based on the browser's current status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Step 2: Define what happens when connection is lost
    const handleOffline = () => {
      console.warn("System Offline: Switched to Local-First Mode");
      setIsOnline(false);
    };

    // Step 3: Define what happens when connection is restored
    const handleOnline = () => {
      console.log("System Online: Background Sync Resumed");
      setIsOnline(true);
    };

    // Step 4: Tell the browser to listen for these events
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Step 5: Cleanup listeners if the component unmounts
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Return the state so CheckoutModal.jsx and other components can use it
  return { isOnline }; 
}