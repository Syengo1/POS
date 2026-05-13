// src/store/useStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // --- AUTHENTICATION STATE ---
      currentUser: null,
      login: (user) => set({ currentUser: user }),
      logout: () => set({ 
        currentUser: null, 
        cart: [],         // Security: Wipe active order on logout
        searchQuery: ''   // Security: Clear search history on logout
      }),

      // --- UI STATE ---
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      // --- CART STATE ---
      cart: [],
      
      addToCart: (product) => set((state) => {
        // SECURITY GUARD 1: Prevent adding out-of-stock items entirely
        if (product.stock <= 0) return state;

        const existingItem = state.cart.find(item => item.id === product.id);
        
        if (existingItem) {
          // SECURITY GUARD 2: Prevent adding beyond available physical stock
          if (existingItem.qty >= product.stock) return state; 
          
          return {
            cart: state.cart.map(item => 
              item.id === product.id ? { ...item, qty: item.qty + 1 } : item
            )
          };
        }
        
        // Deep clone the product into the cart to prevent unintended reference mutations
        return { cart: [...state.cart, { ...product, qty: 1 }] };
      }),

      decreaseQuantity: (productId) => set((state) => {
        const existingItem = state.cart.find(item => item.id === productId);
        if (existingItem?.qty === 1) {
          return { cart: state.cart.filter(item => item.id !== productId) };
        }
        return {
          cart: state.cart.map(item => 
            item.id === productId ? { ...item, qty: item.qty - 1 } : item
          )
        };
      }),

      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item.id !== productId)
      })),

      clearCart: () => set({ cart: [] }),

      // --- DERIVED STATE & MATHEMATICS ENGINE ---

      // 1. Calculate the final payable total, actively checking for valid sale prices
      cartTotal: () => get().cart.reduce((total, item) => {
        const effectivePrice = (item.sale_price && item.sale_price > 0 && item.sale_price < item.base_price) 
          ? item.sale_price 
          : item.base_price;
        return total + (effectivePrice * item.qty);
      }, 0),

      // 2. Calculate total savings for receipts and manager analytics
      cartTotalSavings: () => get().cart.reduce((savings, item) => {
        if (item.sale_price && item.sale_price > 0 && item.sale_price < item.base_price) {
          const discountPerItem = item.base_price - item.sale_price;
          return savings + (discountPerItem * item.qty);
        }
        return savings;
      }, 0),
      
      // 3. Calculate total physical items (handles multi-quantity)
      cartItemCount: () => get().cart.reduce((count, item) => count + item.qty, 0)
    }),
    {
      name: 'delica-pos-session', // Storage key name in localStorage
      // STRICT GATEKEEPER: Only save the auth state to disk. Discard cart/search on refresh.
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);