// src/components/CheckoutModal.jsx
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getDB } from '../core/db/database';
import { supabase } from '../core/cloud/supabase';
import { useNetwork } from '../hooks/useNetwork';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckoutModal({ isCheckoutOpen, setIsCheckoutOpen, onComplete }) {
  const { cart, cartTotal, cartTotalSavings, clearCart } = useStore();
  
  // FIX: Destructure according to your custom hook's return value.
  // If your useNetwork returns a boolean directly, change this to: const isOnline = useNetwork();
  const isOnline = useNetwork(); 
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH', 'MPESA', 'SPLIT'
  const [amountTendered, setAmountTendered] = useState('');
  
  // Split Payment States
  const [splitCash, setSplitCash] = useState('');
  const [splitMpesa, setSplitMpesa] = useState('');
  
  // M-Pesa States
  const [mpesaRef, setMpesaRef] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stkStatus, setStkStatus] = useState('IDLE'); // IDLE, PENDING, COMPLETED, FAILED, TIMEOUT
  const [stkCountdown, setStkCountdown] = useState(45);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const amountInputRef = useRef(null);

  // 1. Safe State Initialization
  useEffect(() => {
    if (isCheckoutOpen) {
      setAmountTendered(cartTotal().toString());
      setPaymentMethod('CASH');
      setSplitCash('');
      setSplitMpesa(cartTotal().toString());
      setMpesaRef('');
      setPhoneNumber('');
      setStkStatus('IDLE');
      setStkCountdown(45);
      setCheckoutRequestId(null);
      setIsProcessing(false);
      
      setTimeout(() => {
        if (amountInputRef.current) {
          amountInputRef.current.focus();
          amountInputRef.current.select();
        }
      }, 100);
    }
  }, [isCheckoutOpen, cartTotal]);

  // 2. M-Pesa Clipboard Extraction Engine
  useEffect(() => {
    const upperRef = mpesaRef.toUpperCase();
    const extracted = upperRef.match(/[A-Z0-9]{10}/);
    if (extracted && extracted[0] !== mpesaRef) {
      setMpesaRef(extracted[0]);
    } else {
      setMpesaRef(upperRef);
    }
  }, [mpesaRef]);

  // 3. Fast Split Payment Calculation
  const handleSplitCashChange = (val) => {
    setSplitCash(val);
    const remaining = cartTotal() - Number(val || 0);
    setSplitMpesa(remaining > 0 ? remaining.toString() : '0');
  };

  const handleSplitMpesaChange = (val) => {
    setSplitMpesa(val);
    const remaining = cartTotal() - Number(val || 0);
    setSplitCash(remaining > 0 ? remaining.toString() : '0');
  };

  // 4. STK Push Timer Logic (The Timeout Feature)
  useEffect(() => {
    let timer;
    if (stkStatus === 'PENDING' && stkCountdown > 0) {
      timer = setInterval(() => setStkCountdown((prev) => prev - 1), 1000);
    } else if (stkStatus === 'PENDING' && stkCountdown === 0) {
      setStkStatus('TIMEOUT');
    }
    return () => clearInterval(timer);
  }, [stkStatus, stkCountdown]);

  // 5. Trigger Edge Function for STK Push
  const handleStkPush = async () => {
    if (!phoneNumber || phoneNumber.length < 9) return;
    setIsProcessing(true);
    setStkStatus('PENDING');
    setStkCountdown(45); // Reset timer to 45 seconds

    const amountToCharge = paymentMethod === 'SPLIT' ? Number(splitMpesa) : cartTotal();

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: { phone: phoneNumber, amount: amountToCharge }
      });

      if (error) throw error;
      setCheckoutRequestId(data.checkout_request_id);
    } catch (err) {
      console.error("STK Error:", err);
      setStkStatus('FAILED');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Supabase Realtime Webhook Listener
  useEffect(() => {
    if (!checkoutRequestId) return;

    const channel = supabase.channel(`stk_${checkoutRequestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mpesa_transactions', filter: `checkout_request_id=eq.${checkoutRequestId}` },
        (payload) => {
          const { status, mpesa_receipt_number } = payload.new;
          if (status === 'COMPLETED') {
            setStkStatus('COMPLETED');
            setMpesaRef(mpesa_receipt_number); // Auto-fill the ref!
          } else if (status === 'FAILED') {
            setStkStatus('FAILED');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkoutRequestId]);

  // 7. Transaction Validation & Finalization
  const isCheckoutValid = () => {
    if (paymentMethod === 'CASH') return Number(amountTendered) >= cartTotal();
    if (paymentMethod === 'MPESA') return mpesaRef.length >= 8;
    if (paymentMethod === 'SPLIT') {
      const sum = Number(splitCash || 0) + Number(splitMpesa || 0);
      return sum >= cartTotal() && mpesaRef.length >= 8;
    }
    return false;
  };

  const finalizeTransaction = async () => {
    setIsProcessing(true);
    try {
      const db = await getDB();
      const timestamp = Date.now();

      let finalCash = 0;
      let finalMpesa = 0;

      if (paymentMethod === 'CASH') {
        finalCash = cartTotal();
      } else if (paymentMethod === 'MPESA') {
        finalMpesa = cartTotal();
      } else if (paymentMethod === 'SPLIT') {
        finalCash = Number(splitCash || 0);
        finalMpesa = Number(splitMpesa || 0);
      }

      const salePayload = {
        id: crypto.randomUUID(),
        items: cart,
        total_amount: cartTotal(),
        total_discount: cartTotalSavings(),
        payment_method: paymentMethod,
        cash_amount: finalCash,
        mpesa_amount: finalMpesa,
        mpesa_ref: paymentMethod !== 'CASH' ? mpesaRef : null,
        timestamp,
        sync_status: 'SYNCED',
        _deleted: false
      };

      await db.sales.insert(salePayload);
      
      clearCart();
      setIsCheckoutOpen(false);
      if (onComplete) onComplete(salePayload);
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isCheckoutOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/30">
            <h2 className="text-2xl font-black text-white tracking-tight">Checkout</h2>
            <div className="text-right">
              <p className="text-sm text-neutral-400 font-medium">Total Amount</p>
              <p className="text-3xl font-black text-white tracking-tighter">KES {cartTotal().toLocaleString()}</p>
            </div>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar">
            {/* Payment Method Toggle */}
            <div className="flex gap-2 p-1 bg-neutral-900 rounded-xl mb-6">
              {['CASH', 'MPESA', 'SPLIT'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                    paymentMethod === method 
                      ? 'bg-neutral-700 text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* PURE CASH UI */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">Amount Tendered</label>
                  <input
                    ref={amountInputRef}
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white p-4 rounded-xl font-mono text-2xl focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all"
                  />
                </div>
                {Number(amountTendered) > cartTotal() && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                    <span className="text-amber-500/80 font-bold text-sm">Change Due</span>
                    <span className="text-amber-500 font-mono font-black text-2xl">
                      KES {(Number(amountTendered) - cartTotal()).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SPLIT UI */}
            {paymentMethod === 'SPLIT' && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">Cash Portion</label>
                  <input
                    ref={amountInputRef}
                    type="number"
                    value={splitCash}
                    onChange={(e) => handleSplitCashChange(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-white p-4 rounded-xl font-mono text-xl focus:border-amber-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">M-Pesa Portion</label>
                  <input
                    type="number"
                    value={splitMpesa}
                    onChange={(e) => handleSplitMpesaChange(e.target.value)}
                    className="w-full bg-neutral-900 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl font-mono text-xl focus:border-emerald-500/50 outline-none"
                  />
                </div>
              </div>
            )}

            {/* M-PESA & SPLIT UI */}
            {(paymentMethod === 'MPESA' || paymentMethod === 'SPLIT') && (
              <div className="space-y-4">
                
                {/* 1. Online STK Push Box */}
                {isOnline && (
                  <div className="p-5 border border-emerald-500/20 bg-emerald-500/5 rounded-xl space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="text-emerald-500 font-bold text-sm">Send STK Push</h4>
                        <p className="text-emerald-500/60 text-xs mt-1">Amount: KES {paymentMethod === 'SPLIT' ? splitMpesa : cartTotal()}</p>
                      </div>
                    </div>

                    {/* IDLE STATE */}
                    {stkStatus === 'IDLE' && (
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          placeholder="e.g. 0712345678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="flex-1 bg-neutral-950 border border-emerald-500/30 text-white p-3 rounded-lg text-sm focus:border-emerald-500 outline-none"
                        />
                        <button 
                          onClick={handleStkPush}
                          disabled={isProcessing || phoneNumber.length < 9}
                          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-bold px-6 rounded-lg text-sm transition-all"
                        >
                          Send Prompt
                        </button>
                      </div>
                    )}

                    {/* PENDING / COUNTDOWN STATE */}
                    {stkStatus === 'PENDING' && (
                      <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-lg border border-emerald-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-emerald-500/80 font-medium">Waiting for customer PIN...</span>
                        </div>
                        <span className={`font-mono text-sm font-bold ${stkCountdown <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-500/50'}`}>
                          {stkCountdown}s
                        </span>
                      </div>
                    )}

                    {/* SUCCESS STATE */}
                    {stkStatus === 'COMPLETED' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg flex items-center gap-3">
                        <svg className="w-6 h-6 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-emerald-400 font-medium">Payment Successful! Reference auto-filled below.</span>
                      </div>
                    )}

                    {/* FAILED OR TIMEOUT STATE */}
                    {(stkStatus === 'FAILED' || stkStatus === 'TIMEOUT') && (
                      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-3">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <div className="text-sm text-red-400 font-medium">
                            {stkStatus === 'TIMEOUT' ? 'Prompt timed out (No PIN entered).' : 'Payment failed or was cancelled by the customer.'}
                            <p className="text-xs text-red-400/70 font-normal mt-1">Try again, or enter the reference manually if they paid via the business till.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setStkStatus('IDLE')}
                          className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-lg font-bold text-xs transition-colors"
                        >
                          TRY AGAIN
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Manual Input Box (ALWAYS VISIBLE) */}
                <div className={`p-5 border rounded-xl space-y-3 transition-colors ${stkStatus === 'COMPLETED' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-neutral-800 bg-neutral-900/50'}`}>
                   <div>
                      <h4 className="text-white font-bold text-sm">M-Pesa Reference Code</h4>
                      <p className="text-neutral-500 text-xs mt-1">
                        {!isOnline ? "System is offline. Enter code manually from Business Till SMS." : "Auto-fills when STK completes, or type manually if paid prior."}
                      </p>
                   </div>
                  <input
                    type="text"
                    placeholder="e.g. RKT9X..."
                    value={mpesaRef}
                    onChange={(e) => setMpesaRef(e.target.value)}
                    maxLength={10}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white p-4 rounded-xl font-mono text-xl uppercase focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-700"
                  />
                </div>

              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex gap-4">
            <button 
              onClick={() => setIsCheckoutOpen(false)} 
              className="px-6 py-4 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              CANCEL
            </button>
            <button 
              onClick={finalizeTransaction} 
              disabled={isProcessing || !isCheckoutValid()} 
              className="flex-1 bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-600 hover:bg-amber-400 text-neutral-950 font-black text-xl rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isProcessing ? 'PROCESSING...' : 'COMPLETE SALE'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}