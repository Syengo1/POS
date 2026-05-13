import { useState, useEffect } from 'react';
import { Lock, Unlock, X, Download } from 'lucide-react';
import { getDB } from '../../core/db/database';
import { useStore } from '../../store/useStore';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { login } = useStore();
  
  // Initialize the PWA hook
  const { isInstallable, installApp } = usePwaInstall();

  const handleKeyPress = (num) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => setPin(prev => prev.slice(0, -1));

  useEffect(() => {
    const verifyPin = async () => {
      if (pin.length >= 4) { 
        try {
          const db = await getDB();
          const userDoc = await db.employees.findOne({
            selector: { pin_code: pin, is_active: true }
          }).exec();

          if (userDoc) {
            login(userDoc.toJSON()); 
          } else if (pin.length === 6) {
            setError(true);
            setTimeout(() => setPin(''), 1000);
          }
        } catch (err) {
          console.error("Auth error", err);
        }
      }
    };
    verifyPin();
  }, [pin, login]);

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${error ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
          {error ? <Lock size={32} /> : <Unlock size={32} />}
        </div>
        
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Enter Access PIN</h1>
        <p className="text-neutral-500 font-mono text-sm mb-8">DE' LICA POS SYSTEM</p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-10 h-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-amber-500 scale-125 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-neutral-800'}`} />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleKeyPress(num)} className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-white font-black text-2xl hover:bg-neutral-800 active:scale-95 transition-all">
              {num}
            </button>
          ))}
          <div className="h-16" /> {/* Empty spacer */}
          <button onClick={() => handleKeyPress(0)} className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-white font-black text-2xl hover:bg-neutral-800 active:scale-95 transition-all">
            0
          </button>
          <button onClick={handleBackspace} className="h-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center">
            <X size={28} />
          </button>
        </div>
      </div>
      
      {/* ==========================================
          THE INSTALL BUTTON
      ========================================== */}
      {isInstallable && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button 
            onClick={installApp}
            className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-neutral-400 hover:text-amber-500 px-6 py-3 rounded-full text-sm font-bold tracking-wider uppercase transition-all shadow-lg active:scale-95"
          >
            <Download size={16} />
            Install App to Device
          </button>
        </div>
      )}

    </div>
  );
}