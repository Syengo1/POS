// src/core/db/database.js
import { createRxDatabase, addRxPlugin, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { 
  productSchema, 
  saleSchema, 
  categorySchema, 
  promotionSchema, 
  mpesaTransactionSchema, 
  inventoryLedgerSchema, 
  employeeSchema 
} from './schema';

import { startBackgroundSync } from './sync';

if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin);
}

addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

const createDB = async () => {
  console.log('Initializing RxDB Local Storage...');
  let dbInstance = null; // Track the instance so we can destroy it if it crashes
  
  try {
    // Step 1: Create the instance in RAM
    dbInstance = await createRxDatabase({
      name: 'pos_local_db',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageDexie()
      }),
      ignoreDuplicate: true 
    });

    // Step 2: Apply Schemas to Hard Drive (This is where outdated databases crash)
    await dbInstance.addCollections({
      categories: { schema: categorySchema },
      promotions: { schema: promotionSchema },
      products: { schema: productSchema },
      sales: { schema: saleSchema },
      mpesa_transactions: { schema: mpesaTransactionSchema },
      inventory_ledger: { schema: inventoryLedgerSchema },
      employees: { schema: employeeSchema }
    });

    // ---------------------------------------------------------
    // THE BULLETPROOF DATA SANITIZER
    // ---------------------------------------------------------
    const sanitizeProduct = (doc) => {
      if (typeof doc.promotion_ids === 'string') {
        try { doc.promotion_ids = JSON.parse(doc.promotion_ids); } catch { doc.promotion_ids = []; }
      }
      if (!Array.isArray(doc.promotion_ids)) doc.promotion_ids = [];
    };

    dbInstance.products.preInsert(sanitizeProduct, false);
    dbInstance.products.preSave(sanitizeProduct, false);

    const sanitizeSale = (doc) => {
      if (typeof doc.items === 'string') {
        try { doc.items = JSON.parse(doc.items); } catch { doc.items = []; }
      }
      if (!Array.isArray(doc.items)) doc.items = [];
    };

    dbInstance.sales.preInsert(sanitizeSale, false);
    dbInstance.sales.preSave(sanitizeSale, false);
    // ---------------------------------------------------------

    startBackgroundSync(dbInstance);

    return dbInstance;
  } catch (err) {
    console.error("FATAL: Failed to initialize RxDB.", err);
    
    // CRITICAL FIX: Destroy the RAM instance before throwing the error 
    // so the Self-Heal protocol doesn't trigger a DB9 crash on retry.
    if (dbInstance) {
      try { await dbInstance.destroy(); } catch  { /* ignore cleanup errors */ }
    }
    throw err; 
  }
};

// ============================================================================
// SELF-HEALING SINGLETON PATTERN
// ============================================================================
let dbPromise = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await createDB();
      } catch  {
        console.warn("⚠️ FATAL DB ERROR DETECTED. INITIATING SELF-HEAL PROTOCOL...");
        
        try {
          // 1. Wipe the corrupted/outdated local database completely from the hard drive
          await removeRxDatabase('pos_local_db', getRxStorageDexie());
          console.log("✅ Corrupted local storage wiped successfully.");
          
          // 2. Try building it one more time from scratch
          return await createDB();
        } catch (recoveryErr) {
          console.error("❌ Self-Heal Failed. Database is unrecoverable:", recoveryErr);
          dbPromise = null; 
          throw recoveryErr;
        }
      }
    })();
  }
  return dbPromise;
};