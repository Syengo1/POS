import { useStore } from '../store/useStore';
import { Plus, Minus, Trash2, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartSidebar({ isMobileCartOpen, setIsMobileCartOpen, openCheckout }) {
  const { cart, addToCart, decreaseQuantity, removeFromCart, cartTotal, cartItemCount, cartTotalSavings } = useStore();

  const savings = cartTotalSavings ? cartTotalSavings() : 0;

  return (
    <>
      {/* Mobile Floating Checkout Bar */}
      <div className={`md:hidden fixed bottom-4 left-4 right-4 z-40 transition-all duration-300 ease-in-out ${cart.length > 0 && !isMobileCartOpen ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-lg h-16 rounded-2xl shadow-[0_10px_40px_rgba(245,158,11,0.3)] flex items-center justify-between px-6 active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <span className="bg-neutral-950 text-amber-500 px-3 py-1 rounded-lg text-sm font-mono">{cartItemCount()}</span>
            <span className="text-sm">ITEMS</span>
          </div>
          <span className="tracking-widest">VIEW CART</span>
          <span className="font-mono">KES {cartTotal().toLocaleString()}</span>
        </button>
      </div>

      {/* Responsive Cart Drawer */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-full bg-neutral-950 flex flex-col shadow-2xl transition-all duration-300 ease-in-out md:relative md:bg-neutral-900 md:border-l md:border-neutral-800 flex-shrink-0 ${cart.length > 0 ? 'md:w-96 md:opacity-100' : 'md:w-0 md:opacity-0 md:border-l-0 overflow-hidden'} ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="w-full md:w-96 h-full flex flex-col">
          
          {/* Header */}
          <div className="h-16 flex items-center px-4 md:px-6 border-b border-neutral-800 justify-between bg-neutral-950/50 shrink-0">
            <h2 className="text-lg font-semibold text-white uppercase tracking-tight">Active Order</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-mono font-bold border border-amber-500/20">{cartItemCount()} ITEMS</span>
              <button onClick={() => setIsMobileCartOpen(false)} className="md:hidden flex items-center justify-center w-8 h-8 bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            <AnimatePresence initial={false}>
              {cart.map((item) => {
                const isDiscounted = item.sale_price && item.sale_price < item.base_price;
                const activePrice = isDiscounted ? item.sale_price : item.base_price;
                const lineTotal = activePrice * item.qty;
                const originalTotal = item.base_price * item.qty;
                const isMaxStock = item.qty >= item.stock;

                return (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="bg-neutral-900 md:bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex flex-col gap-3 relative overflow-hidden">
                    {/* Item Header */}
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-bold leading-tight pr-6 text-sm md:text-base flex items-center gap-2">
                        {item.name}
                        {isDiscounted && <Tag size={12} className="text-emerald-500 shrink-0" />}
                      </h4>
                      <button onClick={() => removeFromCart(item.id)} className="text-neutral-600 hover:text-red-500 mt-0.5 p-1 absolute right-2 top-2"><Trash2 size={16} /></button>
                    </div>

                    {/* Controls & Price */}
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        {isDiscounted && (
                          <span className="text-[10px] text-neutral-500 line-through font-mono decoration-red-500/50">
                            KES {originalTotal.toLocaleString()}
                          </span>
                        )}
                        <span className={`font-mono font-bold text-sm md:text-base ${isDiscounted ? 'text-emerald-400' : 'text-amber-500'}`}>
                          KES {lineTotal.toLocaleString()}
                        </span>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center bg-neutral-950 md:bg-neutral-900 rounded-lg border border-neutral-800 p-1">
                        <button onClick={() => decreaseQuantity(item.id)} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"><Minus size={16} /></button>
                        <span className="w-8 text-center font-mono font-bold text-white text-sm">{item.qty}</span>
                        <button onClick={() => addToCart(item)} disabled={isMaxStock} className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${isMaxStock ? 'text-neutral-700 bg-neutral-900 cursor-not-allowed' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Footer Summary */}
          <div className="p-4 md:p-6 bg-neutral-950 border-t border-neutral-800 shrink-0 z-20">
            {savings > 0 && (
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-neutral-800/50">
                <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Total Savings</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">KES {savings.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-end mb-4 md:mb-6">
              <span className="text-neutral-500 font-bold uppercase text-[10px] md:text-xs tracking-widest flex flex-col">
                <span>Total Amount</span>
                {cartTotal() > 10000 && <span className="text-emerald-500 text-[10px] animate-pulse">HIGH VALUE TARGET</span>}
              </span>
              <span className="text-3xl md:text-4xl font-black text-white tracking-tighter font-mono">KES {cartTotal().toLocaleString()}</span>
            </div>
            <button onClick={openCheckout} className="w-full h-14 md:h-16 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-lg md:text-xl rounded-xl md:rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10">
              PROCESS PAYMENT
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}