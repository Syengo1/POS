import { Search, X } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function SearchBar({ disabled }) { 
  const { searchQuery, setSearchQuery } = useStore();
  const searchInputRef = useRef(null);

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus(); 
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 2. THE LOCKOUT: If the modal is open, completely ignore global keystrokes
      if (disabled) return; 

      const activeTag = document.activeElement?.tagName;
      const isTypingInAnotherInput = 
        (activeTag === 'INPUT' || activeTag === 'TEXTAREA') && 
        document.activeElement !== searchInputRef.current;

      if (isTypingInAnotherInput) return;

      if (e.key === 'Escape') {
        setSearchQuery('');
        searchInputRef.current?.blur();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
        return;
      }

      if (document.activeElement !== searchInputRef.current) {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    
  }, [setSearchQuery, disabled]);

  return (
    <div className="relative group">
      {/* Search Icon (Left) */}
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-amber-500 transition-colors duration-300">
        <Search size={20} />
      </div>

      {/* Main Input */}
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search inventory..."
        // Upgraded padding: `pr-24` ensures long search text doesn't hide behind the right-side buttons
        className="w-full h-14 md:h-16 bg-neutral-900 rounded-2xl border-2 border-neutral-800 pl-12 pr-24 text-lg md:text-xl font-medium focus:outline-none focus:border-amber-500/50 focus:bg-neutral-800/50 transition-all placeholder:text-neutral-600 shadow-inner text-white"
      />

      {/* Dynamic Actions (Right) */}
      <div className="absolute inset-y-0 right-4 flex items-center gap-3">
        {searchQuery && (
          <>
            {/* Desktop Hint */}
            <kbd className="hidden md:flex items-center h-6 px-2 text-[10px] font-bold text-neutral-500 bg-neutral-800 border border-neutral-700 rounded uppercase tracking-widest pointer-events-none shadow-sm">
              ESC to clear
            </kbd>
            
            {/* Touch/Mouse Clear Button */}
            <button
              onClick={clearSearch}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors active:scale-90 shadow-sm"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}