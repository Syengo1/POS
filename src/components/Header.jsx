// src/components/Header.jsx
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, ShieldCheck, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function Header({ isOnline }) {
  const [time, setTime] = useState(new Date());
  const { currentUser, logout } = useStore();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex justify-between items-center h-16 md:h-20 px-3 md:px-6 bg-neutral-950 border-b border-neutral-800">
      
      {/* Left: Branding & Logo */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="w-8 h-8 md:w-12 md:h-12 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800 p-1 md:p-1.5 overflow-hidden shadow-sm">
          <img src="/delicalogo.svg" alt="De' Lica Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          {/* Shrunk text on mobile to save space */}
          <h1 className="text-sm md:text-xl font-black text-white tracking-tight uppercase">De' Lica</h1>
          <p className="hidden md:block text-xs text-neutral-500 font-mono tracking-widest uppercase">Point of Sale</p>
        </div>
      </div>

      {/* Right: Controls & Info */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* 1. THE RESPONSIVE ADMIN BUTTON */}
        {currentUser?.role === 'ADMIN' && (
          <Link 
            to="/admin" 
            title="Admin Panel"
            className="flex items-center justify-center gap-2 p-2 md:px-4 md:py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-neutral-950 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <ShieldCheck size={16} className="shrink-0" />
            {/* Text hidden on mobile, visible on tablets/desktops */}
            <span className="hidden md:block">Admin Panel</span>
          </Link>
        )}

        {/* 2. Real-Time Clock (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-2 bg-neutral-900/50 px-4 py-2.5 rounded-lg border border-neutral-800/50">
          <Clock size={16} className="text-amber-500/70" />
          <span className="font-mono text-sm font-medium text-neutral-300">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* 3. Network Status Badge (Compact on Mobile) */}
        <div className={`flex items-center justify-center gap-1.5 px-2 py-1.5 md:px-5 md:py-2.5 rounded-lg text-[9px] md:text-xs font-black tracking-widest uppercase transition-all duration-500 shadow-sm ${
          isOnline 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/5' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/5'
        }`}>
          {isOnline ? (
            <>
              <Wifi size={14} className="animate-pulse hidden md:block" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 md:hidden animate-pulse"></div>
              <span className="hidden sm:block">ONLINE</span>
              <span className="sm:hidden">ON</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="hidden md:block" />
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 md:hidden"></div>
              <span className="hidden sm:block">OFFLINE</span>
              <span className="sm:hidden">OFF</span>
            </>
          )}
        </div>

        {/* 4. Active User & Lock Screen Button */}
        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-neutral-800 ml-0.5 md:ml-1 shrink-0">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-white uppercase tracking-wider">{currentUser?.name || 'Staff'}</p>
            <p className="text-[10px] text-neutral-500 font-mono tracking-widest">{currentUser?.role}</p>
          </div>
          <button 
            onClick={logout} 
            className="p-2 md:p-2.5 bg-neutral-900 border border-neutral-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-neutral-400 rounded-lg transition-all" 
            title="Lock POS"
          >
            <LogOut size={16} />
          </button>
        </div>

      </div>
    </header>
  );
}