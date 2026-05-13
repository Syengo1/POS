// src/core/db/sync.js
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';
import { supabase } from '../cloud/supabase'; 

export const startBackgroundSync = (db) => {
  console.log('Starting Supabase Realtime Replication Engine (Staggered)...');

  if (!supabase || typeof supabase.channel !== 'function') {
    console.error("CRITICAL: supabase client is invalid or missing realtime capabilities.");
    return { destroy: () => {} }; // Return dummy destroy to prevent crashes
  }

  const sharedConfig = {
    client: supabase,
    live: true,
    retryTime: 5000,
  };

  // Keep track of delayed starts so we can cancel them if the app closes quickly
  const syncTimers = [];
  let categorySync, productSync, salesSync, mpesaSync, ledgerSync, promotionSync;

  const logSyncError = (module, err) => {
    if (err.innerErrors || err.message) {
      console.warn(`[Sync Warning] ${module}:`, err.message || err.innerErrors);
    }
  };

  // -------------------------------------------------------------------------
  // WAVE 1: Core Catalogs (Immediate)
  // These are required immediately for the POS UI to render correctly.
  // -------------------------------------------------------------------------
  categorySync = replicateSupabase({
    ...sharedConfig,
    replicationIdentifier: 'sync_categories',
    collection: db.categories,
    tableName: 'categories',
    pull: {}, push: {}
  });
  categorySync.error$.subscribe(err => logSyncError('Categories', err));

  const employeeSync = replicateSupabase({
  ...sharedConfig,
  replicationIdentifier: 'sync_employees',
  collection: db.employees,
  tableName: 'employees',
  pull: {}, push: {}
});
employeeSync.error$.subscribe(err => logSyncError('Employees', err));

  productSync = replicateSupabase({
    ...sharedConfig,
    replicationIdentifier: 'sync_products',
    collection: db.products,
    tableName: 'products',
    pull: {
      modifier: (doc) => {
        const d = { ...doc };
        if (typeof d.promotion_ids === 'string') {
          try { d.promotion_ids = JSON.parse(d.promotion_ids); } catch { d.promotion_ids = []; }
        }
        return d;
      }
    },
    push: {
      modifier: (doc) => {
        const d = { ...doc };
        if (Array.isArray(d.promotion_ids)) d.promotion_ids = JSON.stringify(d.promotion_ids);
        return d;
      }
    }
  });
  productSync.error$.subscribe(err => logSyncError('Products', err));

  // -------------------------------------------------------------------------
  // WAVE 2: Transactional Data (+500ms)
  // Delayed to prevent HTTP/2 Refused Stream errors from Supabase API Gateway
  // -------------------------------------------------------------------------
  syncTimers.push(setTimeout(() => {
    salesSync = replicateSupabase({
      ...sharedConfig,
      replicationIdentifier: 'sync_sales',
      collection: db.sales,
      tableName: 'sales',
      pull: {
        modifier: (doc) => {
          const d = { ...doc };
          if (typeof d.items === 'string') {
            try { d.items = JSON.parse(d.items); } catch { d.items = []; }
          }
          return d;
        }
      },
      push: {
        modifier: (doc) => {
          const d = { ...doc };
          if (Array.isArray(d.items)) d.items = JSON.stringify(d.items);
          return d;
        }
      }
    });
    salesSync.error$.subscribe(err => logSyncError('Sales', err));

    mpesaSync = replicateSupabase({
      ...sharedConfig,
      replicationIdentifier: 'sync_mpesa_transactions',
      collection: db.mpesa_transactions,
      tableName: 'mpesa_transactions',
      pull: {}, push: {}
    });
    mpesaSync.error$.subscribe(err => logSyncError('M-Pesa', err));
  }, 500));

  // -------------------------------------------------------------------------
  // WAVE 3: Audit & Background Data (+1000ms)
  // -------------------------------------------------------------------------
  syncTimers.push(setTimeout(() => {
    ledgerSync = replicateSupabase({
      ...sharedConfig,
      replicationIdentifier: 'sync_inventory_ledger',
      collection: db.inventory_ledger,
      tableName: 'inventory_ledger',
      pull: {}, push: {}
    });
    ledgerSync.error$.subscribe(err => logSyncError('Inventory Ledger', err));

    promotionSync = replicateSupabase({
      ...sharedConfig,
      replicationIdentifier: 'sync_promotions',
      collection: db.promotions,
      tableName: 'promotions',
      pull: {}, push: {}
    });
    promotionSync.error$.subscribe(err => logSyncError('Promotions', err));
  }, 1000));

  // -------------------------------------------------------------------------
  // CLEANUP CONTROLLER
  // Rigidly clears all memory, timers, and WebSockets when the app shuts down
  // -------------------------------------------------------------------------
  return { 
    destroy: () => {
      console.log('Safely shutting down replication engine...');
      
      // 1. Kill any pending start timers immediately to prevent ghost startups
      syncTimers.forEach(timer => clearTimeout(timer));
      
      // 2. Safely cancel active network streams
      if (categorySync) categorySync.cancel();
      if (productSync) productSync.cancel();
      if (salesSync) salesSync.cancel();
      if (mpesaSync) mpesaSync.cancel();
      if (ledgerSync) ledgerSync.cancel();
      if (promotionSync) promotionSync.cancel();
      if (employeeSync) employeeSync.cancel();
    }
  };
};