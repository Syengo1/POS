// src/core/db/sync.js
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';

// We MUST accept supabaseClient as a parameter to avoid Vite Proxy bugs
export const startBackgroundSync = (db, supabaseClient) => {
  console.log('Starting Supabase Background Replication Engine (HTTP Polling)...');

  // Strict check to ensure we have the real client, not a Vite Proxy
  if (!supabaseClient || typeof supabaseClient.from !== 'function') {
    console.error("CRITICAL: supabaseClient is invalid. Sync engine aborted.");
    return;
  }

  const categorySync = replicateSupabase({
    replicationIdentifier: 'sync_categories',
    collection: db.categories,
    supabaseClient: supabaseClient,
    live: false, 
    pull: {},
    push: {}  
  });

  const productSync = replicateSupabase({
    replicationIdentifier: 'sync_products',
    collection: db.products,
    supabaseClient: supabaseClient,
    live: false, 
    pull: {},
    push: {}  
  });

  const salesSync = replicateSupabase({
    replicationIdentifier: 'sync_sales',
    collection: db.sales,
    supabaseClient: supabaseClient,
    live: false, 
    pull: false, // Cashiers do not pull other people's sales
    push: {}     
  });

  // Force HTTP Polling every 3 seconds to bypass browser extension blocks
  setInterval(() => {
    if (!productSync.isStopped()) productSync.reSync();
    if (!categorySync.isStopped()) categorySync.reSync();
    if (!salesSync.isStopped()) salesSync.reSync();
  }, 3000);

  // Error Logging
  productSync.error$.subscribe(err => console.error('Product Sync Error:', err));
  categorySync.error$.subscribe(err => console.error('Category Sync Error:', err));
  salesSync.error$.subscribe(err => console.error('Sales Sync Error:', err));

  return { categorySync, productSync, salesSync };
};