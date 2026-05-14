import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, X, Download } from 'lucide-react';
import { getDB } from '../../core/db/database';
import { useStore } from '../../store/useStore';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { login } = useStore();
  
  const { isInstallable, installApp } = usePwaInstall();

  // REFACTORED: We use useCallback and check 'prev.length' inside setPin
  // This prevents React from locking stale state inside the keyboard listener.
  const handleKeyPress = useCallback((num) => {
    setPin(prev => {
      if (prev.length < 6) {
        setError(false);
        return prev + num;
      }
      return prev;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  // NEW FEATURE: Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if the key pressed is a number between 0 and 9
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(Number(e.key));
      } 
      // Check if the key pressed is the Backspace key
      else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup listener when component unmounts
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleBackspace]);

  useEffect(() => {
    let isCancelled = false; // Fast-typing guard

    const verifyPin = async () => {
      if (pin.length >= 4) { 
        try {
          const db = await getDB();
          if (isCancelled) return; // Abort if user typed another number

          const userDoc = await db.employees.findOne({
            selector: { pin_code: pin, is_active: true }
          }).exec();

          if (isCancelled) return;

          if (userDoc) {
            login(userDoc.toJSON()); 
          } else if (pin.length === 6) {
            setError(true);
            setTimeout(() => {
              if (!isCancelled) setPin('');
            }, 1000);
          }
        } catch (err) {
          console.error("Auth error", err);
        }
      }
    };
    
    verifyPin();

    // Cleanup function aborts previous queries when the PIN changes
    return () => { isCancelled = true; };
  }, [pin, login]);

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${error ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
          {error ? <Lock size={32} /> : <Unlock size={32} />}
        </div>
        
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Enter Access PIN</h1>
        <p className="text-neutral-500 font-mono text-sm mb-8">DE' LICA POS SYSTEM</p>

        <div className="flex gap-4 mb-10 h-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-amber-500 scale-125 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-neutral-800'}`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full mb-12">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleKeyPress(num)} className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-white font-black text-2xl hover:bg-neutral-800 active:scale-95 transition-all">
              {num}
            </button>
          ))}
          <div className="h-16" /> 
          <button onClick={() => handleKeyPress(0)} className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-white font-black text-2xl hover:bg-neutral-800 active:scale-95 transition-all">
            0
          </button>
          <button onClick={handleBackspace} className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center">
            <X size={28} />
          </button>
        </div>
      </div>

      {isInstallable && (
        <div className="absolute bottom-8 left-6 flex justify-center">
          <button 
            onClick={installApp}
            className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-neutral-400 hover:text-amber-500 px-6 py-3 rounded-full text-sm font-bold tracking-wider uppercase transition-all shadow-lg active:scale-95"
          >
            <Download size={16} />
            Install App
          </button>
        </div>
      )}
    </div>
  );
}