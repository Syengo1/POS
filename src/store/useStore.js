// src/store/useStore.js
import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // --- UI STATE ---
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // --- CART STATE ---
  cart: [],
  
  addToCart: (product) => set((state) => {
    const existingItem = state.cart.find(item => item.id === product.id);
    if (existingItem) {
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

  // 2. NEW: Calculate total savings for receipts and manager analytics
  cartTotalSavings: () => get().cart.reduce((savings, item) => {
    if (item.sale_price && item.sale_price > 0 && item.sale_price < item.base_price) {
      const discountPerItem = item.base_price - item.sale_price;
      return savings + (discountPerItem * item.qty);
    }
    return savings;
  }, 0),
  
  // 3. Calculate total physical items (handles multi-quantity)
  cartItemCount: () => get().cart.reduce((count, item) => count + item.qty, 0)
}));