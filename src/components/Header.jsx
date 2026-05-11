// src/components/Header.jsx
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

export default function Header({ isOnline }) {
  // Real-time clock for the cashier
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex justify-between items-center h-16 md:h-20 px-4 md:px-6 bg-neutral-950 border-b border-neutral-800">
      
      {/* Left: Branding & Logo */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Logo Container */}
        <div className="w-10 h-10 md:w-12 md:h-12 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800 p-1.5 overflow-hidden shadow-sm">
          {/* IMPORTANT: Ensure your SVG is in the 'public' folder and update this path if needed */}
          <img 
            src="/delicalogo.svg" 
            alt="De' Lica Logo" 
            className="w-full h-full object-contain" 
          />
        </div>
        
        {/* Store Name */}
        <div className="flex flex-col justify-center">
          <h1 className="text-xl md:text-3xl font-black tracking-tight text-white uppercase">
            De' Lica
          </h1>
          <p className="text-[10px] md:text-xs text-amber-500/80 font-mono tracking-widest uppercase">
            Premium Liquor
          </p>
        </div>
      </div>

      {/* Right: Cashier Utilities & Network Status */}
      <div className="flex items-center gap-3 md:gap-6">
        
        {/* Live Clock (Hidden on very small mobile screens to save space) */}
        <div className="hidden md:flex items-center gap-2 text-neutral-400 bg-neutral-900/50 px-4 py-2 rounded-lg border border-neutral-800/50">
          <Clock size={16} className="text-amber-500/70" />
          <span className="font-mono text-sm font-medium">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Network Status Badge */}
        <div className={`flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-[10px] md:text-xs font-black tracking-widest uppercase transition-all duration-500 shadow-sm ${
          isOnline 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/5' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/5'
        }`}>
          {isOnline ? (
            <>
              <Wifi size={16} className="animate-pulse hidden md:block" />
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 md:hidden animate-pulse"></div>
                ONLINE
              </span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="hidden md:block" />
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 md:hidden animate-pulse"></div>
                OFFLINE
              </span>
            </>
          )}
        </div>

      </div>
    </header>
  );
}