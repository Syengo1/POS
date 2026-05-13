// src/components/CheckoutModal.jsx
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getDB } from '../core/db/database';
import { supabase } from '../core/cloud/supabase';
import { useNetwork } from '../hooks/useNetwork';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Banknote } from 'lucide-react';

export default function CheckoutModal({ isCheckoutOpen, setIsCheckoutOpen, onComplete }) {
  const { cart, cartTotal, cartTotalSavings, clearCart } = useStore();
  const isOnline = useNetwork(); 
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitMpesa, setSplitMpesa] = useState('');
  
  // M-Pesa States
  const [mpesaRef, setMpesaRef] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stkStatus, setStkStatus] = useState('IDLE');
  const [stkCountdown, setStkCountdown] = useState(45);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  
  // Transaction UI State
  const [transactionState, setTransactionState] = useState('INPUT');
  const [errorMessage, setErrorMessage] = useState('');
  const amountInputRef = useRef(null);

  const resetAndClose = () => {
    setAmountTendered('');
    setPaymentMethod('CASH');
    setSplitCash('');
    setSplitMpesa('');
    setMpesaRef('');
    setPhoneNumber('');
    setStkStatus('IDLE');
    setCheckoutRequestId(null);
    setTransactionState('INPUT');
    setIsCheckoutOpen(false);
  };

  // ESLINT FIX 1: Use microtasks to prevent synchronous cascading renders
  useEffect(() => {
    if (isCheckoutOpen) {
      const timer = setTimeout(() => {
        setAmountTendered(cartTotal().toString());
        setSplitMpesa(cartTotal().toString());
        amountInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isCheckoutOpen, cartTotal]);

  const handleMpesaRefChange = (e) => {
    const raw = e.target.value.toUpperCase();
    const extracted = raw.match(/[A-Z0-9]{10}/);
    setMpesaRef(extracted ? extracted[0] : raw);
  };

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

  // ESLINT FIX 2: Wrapped STK timeout in a non-synchronous scheduler
  useEffect(() => {
    let timer;
    if (stkStatus === 'PENDING') {
      if (stkCountdown > 0) {
        timer = setTimeout(() => setStkCountdown(c => c - 1), 1000);
      } else {
        timer = setTimeout(() => setStkStatus('TIMEOUT'), 0);
      }
    }
    return () => clearTimeout(timer);
  }, [stkStatus, stkCountdown]);

  const handleStkPush = async () => {
    if (phoneNumber.length !== 10) return;
    setTransactionState('PROCESSING');
    setStkStatus('PENDING');
    setStkCountdown(45);

    // M-Pesa Gatekeeper: Format strictly for Daraja
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    }

    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      setErrorMessage("Invalid phone number formatting.");
      setTransactionState('ERROR');
      return;
    }

    const amountToCharge = paymentMethod === 'SPLIT' ? Number(splitMpesa) : cartTotal();

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: { phone: formattedPhone, amount: amountToCharge }
      });
      if (error) throw error;
      
      // Standard Success
      setCheckoutRequestId(data.checkout_request_id);
      setTransactionState('INPUT'); 
      
    } catch { 
      // ESLINT FIX: Removed the unused '(err)' binding
      console.warn("Network drop detected. Attempting Daraja Auto-Recovery...");
      
      try {
        // THE RECOVERY ENGINE: Check if the Edge Function succeeded before the connection died
        const { data: latestTx } = await supabase
          .from('mpesa_transactions')
          .select('checkout_request_id, status, timestamp')
          .eq('phone_number', formattedPhone)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (latestTx && latestTx.length > 0) {
          const tx = latestTx[0];
          const isRecent = (Date.now() - tx.timestamp) < 15000; // Check if created in the last 15 seconds

          if (tx.status === 'PENDING' && isRecent) {
            console.log("Recovery successful! Re-attaching to Safaricom stream...");
            setCheckoutRequestId(tx.checkout_request_id);
            setTransactionState('INPUT');
            return; // Exit safely, recovery worked!
          }
        }
      } catch (recoveryErr) {
        console.error("Recovery failed:", recoveryErr);
      }

      // If recovery fails, it was a true failure
      setStkStatus('FAILED');
      setTransactionState('INPUT');
    }
  };

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
            setMpesaRef(mpesa_receipt_number);
          } else if (status === 'FAILED') {
            setStkStatus('FAILED');
          }
        }
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [checkoutRequestId]);

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
    setTransactionState('PROCESSING');
    try {
      const db = await getDB();
      const timestamp = Date.now();
      const saleId = crypto.randomUUID();

      let finalCash = paymentMethod === 'CASH' ? cartTotal() : (paymentMethod === 'SPLIT' ? Number(splitCash) : 0);
      let finalMpesa = paymentMethod === 'MPESA' ? cartTotal() : (paymentMethod === 'SPLIT' ? Number(splitMpesa) : 0);

      const salePayload = {
        id: saleId,
        items: cart.map(item => ({ 
          product_id: item.id, 
          name: item.name, 
          qty: item.qty, 
          price_at_sale: item.sale_price || item.base_price,
          cost_at_sale: Number(item.cost_price) || 0 
        })),
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

      for (const item of cart) {
        const product = await db.products.findOne(item.id).exec();
        if (product) {
          const newStock = Math.max(0, product.stock - item.qty);
          await product.incrementalPatch({ stock: newStock, updated_at: timestamp });

          await db.inventory_ledger.insert({
            id: crypto.randomUUID(),
            product_id: item.id,
            change_amount: -item.qty, 
            new_stock: newStock,
            reason: 'SALE',
            reference_id: saleId,
            timestamp: timestamp,
            _deleted: false
          });
        }
      }
      
      setTransactionState('SUCCESS');
      
      setTimeout(() => {
        clearCart();
        resetAndClose();
        if (onComplete) onComplete(salePayload);
      }, 1500);

    } catch (err) {
      console.error('Checkout failed:', err);
      setErrorMessage(err.message || "Database synchronization failed.");
      setTransactionState('ERROR');
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
          
          {transactionState === 'SUCCESS' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-16 flex flex-col items-center justify-center text-center h-[500px]">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Sale Complete</h2>
              <p className="text-emerald-400 font-mono">Stock successfully deducted.</p>
            </motion.div>
          )}

          {transactionState === 'ERROR' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-16 flex flex-col items-center justify-center text-center h-[500px]">
              <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <XCircle size={48} className="text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Transaction Failed</h2>
              <p className="text-red-400 mb-8">{errorMessage}</p>
              <button 
                onClick={() => setTransactionState('INPUT')}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
              >
                Go Back & Try Again
              </button>
            </motion.div>
          )}

          {transactionState === 'INPUT' && (
            <>
              <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/30">
                <h2 className="text-2xl font-black text-white tracking-tight">Checkout</h2>
                <div className="text-right">
                  <p className="text-sm text-neutral-400 font-medium">Total Amount</p>
                  <p className="text-3xl font-black text-white tracking-tighter">KES {cartTotal().toLocaleString()}</p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
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

                {paymentMethod === 'CASH' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-bold text-neutral-400">Amount Tendered</label>
                        {/* QUICK CASH UI FEATURE */}
                        <div className="flex gap-2">
                          {['EXACT', 500, 1000, 2000].map(amt => (
                            <button 
                              key={amt} 
                              onClick={() => setAmountTendered(amt === 'EXACT' ? cartTotal().toString() : amt.toString())}
                              className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold px-2 py-1 rounded transition-colors"
                            >
                              {amt === 'EXACT' ? amt : `+${amt}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"><Banknote size={24} /></div>
                        <input ref={amountInputRef} type="number" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 text-white p-4 pl-12 rounded-xl font-mono text-2xl outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all" />
                      </div>
                    </div>
                    {Number(amountTendered) > cartTotal() && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center shadow-inner">
                        <span className="text-amber-500/80 font-bold text-sm uppercase tracking-wider">Change Due</span>
                        <span className="text-amber-500 font-mono font-black text-3xl">
                          {(Number(amountTendered) - cartTotal()).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'SPLIT' && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-400 mb-2">Cash Portion</label>
                      <input ref={amountInputRef} type="number" value={splitCash} onChange={(e) => handleSplitCashChange(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 text-white p-4 rounded-xl font-mono text-xl outline-none focus:border-amber-500/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-400 mb-2">M-Pesa Portion</label>
                      <input type="number" value={splitMpesa} onChange={(e) => handleSplitMpesaChange(e.target.value)} className="w-full bg-neutral-900 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl font-mono text-xl outline-none focus:border-emerald-500/50" />
                    </div>
                  </div>
                )}

                {(paymentMethod === 'MPESA' || paymentMethod === 'SPLIT') && (
                  <div className="space-y-4 mt-2">
                    {isOnline && (
                      <div className="p-5 border border-emerald-500/20 bg-emerald-500/5 rounded-xl space-y-4 transition-all">
                        <div className="flex justify-between items-end">
                          <div>
                            <h4 className="text-emerald-500 font-bold text-sm">Send STK Push</h4>
                            <p className="text-emerald-500/60 text-xs mt-1">Amount: KES {paymentMethod === 'SPLIT' ? splitMpesa : cartTotal()}</p>
                          </div>
                        </div>

                        {stkStatus === 'IDLE' && (
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              placeholder="e.g. 0712345678"
                              value={phoneNumber}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setPhoneNumber(cleaned);
                              }}
                              className="flex-1 bg-neutral-950 border border-emerald-500/30 text-white p-3 rounded-lg text-sm focus:border-emerald-500 outline-none font-mono tracking-widest transition-colors"
                            />
                            {/* ESLINT FIX 3: Replaced undefined `isProcessing` with `transactionState === 'PROCESSING'` */}
                            <button 
                              onClick={handleStkPush}
                              disabled={transactionState === 'PROCESSING' || phoneNumber.length !== 10}
                              className={`font-bold px-6 rounded-lg text-sm transition-all duration-300 ${
                                phoneNumber.length === 10 && transactionState !== 'PROCESSING'
                                  ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:bg-emerald-400 active:scale-95' 
                                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                              }`}
                            >
                              Send Prompt
                            </button>
                          </div>
                        )}

                        {stkStatus === 'PENDING' && (
                          <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-lg border border-emerald-500/30">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-sm text-emerald-500/80 font-medium">Waiting for PIN...</span>
                            </div>
                            <span className={`font-mono text-sm font-bold ${stkCountdown <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-500/50'}`}>{stkCountdown}s</span>
                          </div>
                        )}

                        {stkStatus === 'COMPLETED' && (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span className="text-sm text-emerald-400 font-medium">Payment Successful!</span>
                          </div>
                        )}

                        {(stkStatus === 'FAILED' || stkStatus === 'TIMEOUT') && (
                          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-3">
                            <div className="flex items-start gap-3">
                              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <div className="text-sm text-red-400 font-medium">
                                {stkStatus === 'TIMEOUT' ? 'Prompt timed out.' : 'Payment failed or cancelled.'}
                              </div>
                            </div>
                            <button onClick={() => setStkStatus('IDLE')} className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-lg font-bold text-xs transition-colors">
                              TRY AGAIN
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`p-5 border rounded-xl space-y-3 transition-colors ${stkStatus === 'COMPLETED' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-neutral-800 bg-neutral-900/50'}`}>
                       <div>
                          <h4 className="text-white font-bold text-sm">M-Pesa Reference Code</h4>
                          <p className="text-neutral-500 text-xs mt-1">
                            {!isOnline ? "System offline. Enter manually." : "Auto-fills or type manually."}
                          </p>
                       </div>
                      <input type="text" placeholder="e.g. RKT9X..." value={mpesaRef} onChange={handleMpesaRefChange} maxLength={10} className="w-full bg-neutral-950 border border-neutral-800 text-white p-4 rounded-xl font-mono text-xl uppercase outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-neutral-700" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex gap-4 shrink-0">
                <button onClick={resetAndClose} className="px-6 py-4 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
                  CANCEL
                </button>
                <button onClick={finalizeTransaction} disabled={transactionState === 'PROCESSING' || !isCheckoutValid()} className="flex-1 bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-600 hover:bg-amber-400 text-neutral-950 font-black text-xl rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                  {transactionState === 'PROCESSING' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                      PROCESSING...
                    </div>
                  ) : 'COMPLETE SALE'}
                </button>
              </div>
            </>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}