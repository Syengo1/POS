// src/core/db/database.js
import { createRxDatabase, addRxPlugin, removeRxDatabase } from 'rxdb'; // <-- ADDED: removeRxDatabase
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
  console.log('Initializing RxDB Local Storage with Ajv Validation...');
  
  try {
    const db = await createRxDatabase({
      name: 'pos_local_db',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageDexie()
      }),
      ignoreDuplicate: true 
    });

    await db.addCollections({
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
    // Forces Supabase strings back into Arrays during conflicts
    // ---------------------------------------------------------
    const sanitizeProduct = (doc) => {
      if (typeof doc.promotion_ids === 'string') {
        try { doc.promotion_ids = JSON.parse(doc.promotion_ids); } catch { doc.promotion_ids = []; }
      }
      if (!Array.isArray(doc.promotion_ids)) doc.promotion_ids = [];
    };

    db.products.preInsert(sanitizeProduct, false);
    db.products.preSave(sanitizeProduct, false);

    const sanitizeSale = (doc) => {
      if (typeof doc.items === 'string') {
        try { doc.items = JSON.parse(doc.items); } catch { doc.items = []; }
      }
      if (!Array.isArray(doc.items)) doc.items = [];
    };

    db.sales.preInsert(sanitizeSale, false);
    db.sales.preSave(sanitizeSale, false);
    // ---------------------------------------------------------

    startBackgroundSync(db);

    return db;
  } catch (err) {
    console.error("FATAL: Failed to initialize RxDB.", err);
    throw err; // Throw to trigger the self-heal catch block below
  }
};

// ============================================================================
// SELF-HEALING SINGLETON PATTERN
// Caches the Promise. If a schema update causes a fatal crash (DB9), 
// it automatically wipes the corrupted local IndexedDB and rebuilds it.
// ============================================================================
let dbPromise = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        return await createDB();
      } catch (err) {
        console.warn("⚠️ FATAL DB ERROR DETECTED. INITIATING SELF-HEAL PROTOCOL...", err);
        
        try {
          // 1. Wipe the corrupted/outdated local database completely
          await removeRxDatabase('pos_local_db', getRxStorageDexie());
          console.log("✅ Corrupted local storage wiped successfully.");
          
          // 2. Try building it one more time from scratch
          return await createDB();
        } catch (recoveryErr) {
          console.error("❌ Self-Heal Failed. Database is unrecoverable:", recoveryErr);
          dbPromise = null; // Reset so the user can manually refresh to try again
          throw recoveryErr;
        }
      }
    })();
  }
  return dbPromise;
};