// src/core/db/sync.js
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';
import { supabase } from '../cloud/supabase'; 

export const startBackgroundSync = (db) => {
  console.log('Starting Supabase Realtime Replication Engine...');

  if (!supabase || typeof supabase.channel !== 'function') {
    console.error("CRITICAL: supabase client is invalid or missing realtime capabilities.");
    return;
  }

  // Define shared configuration using the NEW RxDB v16+ parameter names
  const sharedConfig = {
    client: supabase, // FIX 1: Renamed from 'supabaseClient' to 'client'
    live: true,
    retryTime: 5000,
    pull: {},
    push: {}
  };

  const categorySync = replicateSupabase({
    ...sharedConfig,
    replicationIdentifier: 'sync_categories',
    collection: db.categories,
    tableName: 'categories', // FIX 2: Explicitly define the Postgres table name
  });

  const productSync = replicateSupabase({
    ...sharedConfig,
    replicationIdentifier: 'sync_products',
    collection: db.products,
    tableName: 'products', // FIX 2: Explicitly define the Postgres table name
  });

  const salesSync = replicateSupabase({
    ...sharedConfig,
    replicationIdentifier: 'sync_sales',
    collection: db.sales,
    tableName: 'sales', // FIX 2: Explicitly define the Postgres table name
  });


  const mpesaSync = replicateSupabase({
  ...sharedConfig,
  replicationIdentifier: 'sync_mpesa_transactions',
  collection: db.mpesa_transactions,
  tableName: 'mpesa_transactions',
  pull: {}, // Pull updates so the UI knows when a payment completes
  push: {}  // Push STK requests up to Supabase
});

  // -------------------------------------------------------------------------
  // TELEMETRY & ERROR HANDLING
  // -------------------------------------------------------------------------
  const logSyncError = (module, err) => {
    console.warn(`[Sync Warning] ${module}:`, err.message || 'Network disconnected');
  };

  productSync.error$.subscribe(err => logSyncError('Products', err));
  categorySync.error$.subscribe(err => logSyncError('Categories', err));
  salesSync.error$.subscribe(err => logSyncError('Sales', err));

  return { 
    categorySync, 
    productSync, 
    salesSync,
    mpesaSync,
    destroy: () => {
      console.log('Shutting down replication engine...');
      categorySync.cancel();
      productSync.cancel();
      salesSync.cancel();
      mpesaSync.cancel();
    }
  };
};