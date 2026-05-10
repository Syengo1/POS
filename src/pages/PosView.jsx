// src/pages/PosView.jsx
import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getDB } from '../core/db/database';
import { useNetwork } from '../hooks/useNetwork';
import { supabase } from '../core/cloud/supabase';

import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import ProductGrid from '../components/ProductGrid';
import CartSidebar from '../components/CartSidebar';
import CheckoutModal from '../components/CheckoutModal';

export default function PosView() {
  const isOnline = useNetwork();
  const { cart } = useStore();
  
  const [products, setProducts] = useState([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState(null); // NEW: Fatal error tracking

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // --- SUPABASE DIRECT PING TEST ---
  useEffect(() => {
    const testConnection = async () => {
      console.log("1. Testing Environment Variables...");
      console.log("URL:", import.meta.env.VITE_SUPABASE_URL);
      console.log("KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "Loaded (Hidden for security)" : "MISSING!");

      console.log("2. Pinging Supabase Directly...");
      const { data, error } = await supabase.from('categories').select('*').limit(1);
      
      if (error) {
        console.error("❌ SUPABASE CONNECTION FAILED:", error.message, error.details);
      } else {
        console.log("✅ SUPABASE CONNECTION SUCCESSFUL! Data received:", data);
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    if (cart.length === 0) setIsMobileCartOpen(false);
  }, [cart.length]);

  useEffect(() => {
    let subscription;
    const initDB = async () => {
      try {
        const db = await getDB();
        setIsDbReady(true);
        
        // The UI subscribes to the local DB as normal.
        // As Supabase pumps data into RxDB, this subscription will instantly update the UI.
        subscription = db.products.find({ sort: [{ name: 'asc' }] }).$.subscribe(results => {
          setProducts(results.map(doc => doc.toJSON()));
        });

      } catch (error) {
        console.error("CRITICAL: Failed to boot local database", error);
        setDbError("Local storage is disabled or corrupted. Please check browser settings.");
      }
    };
    initDB();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Fatal Error UI
  if (dbError) {
    return (
      <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center text-red-500 p-6 text-center space-y-4">
        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        <h1 className="text-2xl font-black uppercase tracking-widest">System Failure</h1>
        <p className="text-neutral-400 font-mono">{dbError}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-neutral-950 text-neutral-100 flex overflow-hidden font-sans select-none relative">
      <main className="flex-1 flex flex-col p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden relative">
        <Header isOnline={isOnline} />
        <SearchBar disabled={isCheckoutOpen} />
        <ProductGrid isDbReady={isDbReady} products={products} />
      </main>

      <CartSidebar 
        isMobileCartOpen={isMobileCartOpen} 
        setIsMobileCartOpen={setIsMobileCartOpen}
        openCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal 
        isCheckoutOpen={isCheckoutOpen} 
        setIsCheckoutOpen={setIsCheckoutOpen}
        onComplete={() => setIsMobileCartOpen(false)}
      />
    </div>
  );
}