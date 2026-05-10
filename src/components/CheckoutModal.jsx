import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getDB } from '../core/db/database';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckoutModal({ isCheckoutOpen, setIsCheckoutOpen, onComplete }) {
  const { cart, cartTotal, cartTotalSavings, cartItemCount, clearCart, setSearchQuery } = useStore();
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const amountInputRef = useRef(null);

  // 1. Safe State Initialization
  useEffect(() => {
    if (isCheckoutOpen) {
      setAmountTendered(cartTotal().toString());
      setPaymentMethod('CASH');
      setMpesaRef('');
      
      // NEW: Force focus onto the amount input after a tiny delay 
      // to allow the Framer Motion animation to mount the DOM element.
      setTimeout(() => {
        if (amountInputRef.current) {
          amountInputRef.current.focus();
          amountInputRef.current.select();
        }
      }, 100);
    }
  }, [isCheckoutOpen, cartTotal]);

  // 2. M-Pesa Clipboard Extraction Engine
  const attemptMpesaAutoFill = async () => {
    try {
      // Check if the browser allows clipboard access and we are online
      if (navigator.clipboard && navigator.onLine) {
        const text = await navigator.clipboard.readText();
        
        // Safaricom Receipt Regex: Usually starts with a letter, followed by 9 alphanumeric chars.
        // E.g., QKW7AB1C2D
        const safaricomRegex = /\b[A-Z0-9]{10}\b/i; 
        const match = text.match(safaricomRegex);

        if (match) {
          setMpesaRef(match[0].toUpperCase());
        }
      }
    } catch (err) {
      console.warn("Clipboard access denied or empty.", err);
      // Fails silently, cashier just types it manually as normal.
    }
  };

  // Watch for tab changes to trigger auto-fill
  useEffect(() => {
    if (paymentMethod === 'MPESA' && mpesaRef === '') {
      attemptMpesaAutoFill();
    }
  }, [paymentMethod]);


  const finalizeTransaction = async () => {
    if (paymentMethod === 'CASH' && Number(amountTendered) < cartTotal()) return;
    
    // Adjusted logic: M-Pesa refs in Kenya are exactly 10 chars. 
    // If the user manually typed the last 4, we allow it. If it auto-filled 10, we allow it.
    if (paymentMethod === 'MPESA' && mpesaRef.length < 4) return;
    
    setIsProcessing(true);

    try {
      const db = await getDB();
      const saleRecord = {
        id: crypto.randomUUID(),
        items: cart.map(item => ({ product_id: item.id, name: item.name, qty: item.qty, price_at_sale: item.base_price })),
        total_amount: cartTotal(),
        payment_method: paymentMethod,
        timestamp: Date.now(),
        sync_status: 'PENDING',
        ...(paymentMethod === 'MPESA' && { mpesa_ref: mpesaRef })
      };

      await db.sales.insert(saleRecord);

      for (const item of cart) {
        const productDoc = await db.products.findOne(item.id).exec();
        if (productDoc) {
          await productDoc.incrementalPatch({ stock: productDoc.stock - item.qty });
        }
      }

      clearCart();
      setIsCheckoutOpen(false);
      onComplete();
    } catch (error) {
      console.error("Transaction Failed:", error);
      alert("System Error: Could not save transaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCheckoutOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Complete Sale</h2>
                <p className="text-neutral-500 font-mono text-sm">{cartItemCount()} Items Total</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest">Amount Due</p>
                <p className="text-3xl font-black text-amber-500 font-mono">KES {cartTotal().toLocaleString()}</p>
                {cartTotalSavings() > 0 && (
                  <p className="text-xs text-emerald-500 font-mono mt-1">
                    Saved KES {cartTotalSavings().toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 pb-2">
              <div className="flex bg-neutral-950 rounded-xl p-1 border border-neutral-800">
                <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 py-3 rounded-lg font-bold text-sm tracking-widest transition-all ${paymentMethod === 'CASH' ? 'bg-amber-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-white'}`}>CASH</button>
                <button onClick={() => setPaymentMethod('MPESA')} className={`flex-1 py-3 rounded-lg font-bold text-sm tracking-widest transition-all ${paymentMethod === 'MPESA' ? 'bg-emerald-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-white'}`}>M-PESA</button>
              </div>
            </div>

            <div className="p-6 flex-1">
              {paymentMethod === 'CASH' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Amount Tendered</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-neutral-500">KES</span>
                      <input 
                        ref={amountInputRef}
                        type="number" 
                        value={amountTendered} 
                        onChange={(e) => setAmountTendered(e.target.value)} 
                        onFocus={(e) => e.target.select()} // 3. Auto-select text on click
                        autoFocus // 4. Instantly focus this input when modal opens
                        className="w-full h-16 bg-neutral-950 border-2 border-neutral-800 rounded-xl pl-16 pr-4 text-3xl font-black font-mono text-white focus:border-amber-500 outline-none transition-colors" 
                      />
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border ${Number(amountTendered) >= cartTotal() ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1">Change Due</p>
                    <p className="text-2xl font-black font-mono">KES {Math.max(0, Number(amountTendered) - cartTotal()).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">M-Pesa Reference</label>
                      <button 
                        onClick={attemptMpesaAutoFill}
                        className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-2 py-1 rounded transition-colors"
                      >
                        PASTE FROM CLIPBOARD
                      </button>
                    </div>
                    <input 
                      type="text" 
                      maxLength={10} // Increased to 10 for full Safaricom codes
                      placeholder="e.g. QKW7AB1C2D"
                      value={mpesaRef} 
                      onChange={(e) => setMpesaRef(e.target.value.toUpperCase())} 
                      className="w-full h-16 bg-neutral-950 border-2 border-neutral-800 rounded-xl px-6 text-3xl font-black font-mono text-emerald-400 focus:border-emerald-500 outline-none uppercase tracking-[0.2em] transition-colors" 
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500/80 text-sm font-mono flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                     {mpesaRef.length === 10 ? 'Full receipt code captured.' : 'Verify SMS confirmation before proceeding.'}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex gap-4">
              <button onClick={() => setIsCheckoutOpen(false)} className="px-6 py-4 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">CANCEL</button>
              <button 
                onClick={finalizeTransaction} 
                disabled={isProcessing || (paymentMethod === 'CASH' && Number(amountTendered) < cartTotal()) || (paymentMethod === 'MPESA' && mpesaRef.length < 4)} 
                className="flex-1 bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-600 hover:bg-amber-400 text-neutral-950 font-black text-xl rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isProcessing ? 'PROCESSING...' : 'CONFIRM SALE'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}