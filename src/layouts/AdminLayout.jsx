import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Package, ArrowLeft, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Auto-close the mobile drawer whenever the user clicks a link and the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-screen w-screen bg-neutral-900 text-neutral-100 flex flex-col md:flex-row overflow-hidden">

      {/* --- MOBILE HEADER (Hidden on Desktop) --- */}
      <header className="md:hidden h-16 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-4 flex-shrink-0 z-20">
        <h2 className="text-lg font-black text-white tracking-widest uppercase">Manager Portal</h2>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-neutral-900 rounded-lg text-neutral-400 hover:text-white transition-colors active:scale-95"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="hidden md:flex w-64 bg-neutral-950 border-r border-neutral-800 p-6 flex-col gap-4 flex-shrink-0 z-20">
        <h2 className="text-xl font-black text-white tracking-widest uppercase mb-8 mt-2">Manager Portal</h2>
        <NavContent location={location} />
      </aside>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            />
            
            {/* Sliding Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-neutral-950 border-r border-neutral-800 p-6 flex flex-col gap-4 z-50 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8 mt-2">
                <h2 className="text-xl font-black text-white tracking-widest uppercase">Menu</h2>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <NavContent location={location} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- MAIN CONTENT AREA --- */}
      {/* We remove padding here because individual admin pages should control their own internal padding for edge-to-edge mobile designs */}
      <main className="flex-1 overflow-y-auto bg-neutral-900 relative z-10">
        <Outlet /> 
      </main>
      
    </div>
  );
}

// --- REUSABLE NAVIGATION LINKS ---
function NavContent({ location }) {
  // Helper to check if a link is the current active route
  const isActive = (path) => location.pathname.includes(path);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          to="/admin/inventory"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
            isActive('/admin/inventory')
              ? 'bg-amber-500/10 text-amber-500 shadow-sm'
              : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <Package size={20} />
          Inventory
        </Link>
        
        {/* Placeholder for the next feature */}
        <Link
          to="/admin/reports"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
            isActive('/admin/reports')
              ? 'bg-amber-500/10 text-amber-500 shadow-sm'
              : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
          }`}
        >
          <BarChart3 size={20} />
          Sales Reports
        </Link>
      </div>

      <Link
        to="/"
        className="flex items-center gap-3 text-neutral-500 hover:text-white mt-auto pt-8 border-t border-neutral-800 text-sm font-bold transition-colors"
      >
        <ArrowLeft size={18} />
        Back to POS
      </Link>
    </>
  );
}