import { Wifi, WifiOff } from 'lucide-react';

export default function Header({ isOnline }) {
  return (
    <header className="flex justify-between items-center h-12 md:h-16">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase italic">Registers</h1>
        <p className="text-xs md:text-sm text-neutral-500 font-mono">ST-01 // CA-SYENGO</p>
      </div>

      <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase border transition-colors duration-500 ${
        isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
      }`}>
        {isOnline ? <Wifi size={14} className="animate-pulse hidden md:block" /> : <WifiOff size={14} className="hidden md:block" />}
        {isOnline ? 'Online' : 'Offline'}
      </div>
    </header>
  );
}