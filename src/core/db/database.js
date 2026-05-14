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
  
  try {
    // ESLINT FIX: Declare it directly inside the try block
    const dbInstance = await createRxDatabase({
      name: 'pos_local_db',
      storage: wrappedValidateAjvStorage({
        storage: getRxStorageDexie()
      }),
      ignoreDuplicate: true 
    });

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
    // CRITICAL: We explicitly DO NOT try to call .destroy() here anymore. 
    // Doing so on a corrupted instance locks it in the RAM. We let it throw!
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
      } catch {
        console.warn("⚠️ FATAL DB ERROR DETECTED. INITIATING SELF-HEAL PROTOCOL...");
        
        try {
          // 1. Wipe the corrupted local database from the hard drive
          await removeRxDatabase('pos_local_db', getRxStorageDexie());
          console.log("✅ Corrupted local storage wiped successfully.");
          
          // 2. THE ULTIMATE FIX: Force a hard reload of the browser.
          // This entirely flushes the RAM and destroys the "DB9 Ghost Instance".
          window.location.reload();
          
          // 3. Return a pending promise to permanently halt execution 
          // while the browser handles the refresh.
          return new Promise(() => {});
        } catch (recoveryErr) {
          console.error("❌ Self-Heal Failed.", recoveryErr);
          dbPromise = null; 
          throw recoveryErr;
        }
      }
    })();
  }
  return dbPromise;
};