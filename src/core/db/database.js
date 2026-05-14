// src/core/db/database.js
import { createRxDatabase, addRxPlugin, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'; 
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { 
  productSchema, saleSchema, categorySchema, promotionSchema, 
  mpesaTransactionSchema, inventoryLedgerSchema, employeeSchema 
} from './schema';
import { startBackgroundSync } from './sync';

// ALWAYS enable DevMode so Vercel consoles show REAL errors instead of cryptic codes
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

const createDB = async () => {
  console.log('Initializing RxDB Local Storage...');
  try {
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

    // Clear the healing flag on success
    sessionStorage.removeItem('db_healing');

    return dbInstance;
  } catch (err) {
    console.error("FATAL: Failed to initialize RxDB.", err);
    throw err; 
  }
};

// ============================================================================
// GLOBAL SINGLETON & SAFE SELF-HEALING
// ============================================================================
export const getDB = () => {
  // GLOBAL LOCK: Perfectly prevents DB9 concurrency across all React chunks
  if (!window.__posDbPromise) {
    window.__posDbPromise = (async () => {
      try {
        return await createDB();
      } catch (err) {
        console.warn("⚠️ FATAL DB ERROR DETECTED. INITIATING SELF-HEAL PROTOCOL...");
        
        // CIRCUIT BREAKER: Prevents infinite refresh loops
        if (sessionStorage.getItem('db_healing')) {
          console.error("❌ Self-heal loop detected. Halting to prevent infinite refresh. See error above.", err);
          sessionStorage.removeItem('db_healing');
          throw err; 
        }

        sessionStorage.setItem('db_healing', 'true');

        try {
          await removeRxDatabase('pos_local_db', getRxStorageDexie());
          console.log("✅ Corrupted local storage wiped successfully.");
          
          window.location.reload();
          return new Promise(() => {}); // Halt execution while browser reloads
        } catch (recoveryErr) {
          console.error("❌ Self-Heal Failed.", recoveryErr);
          window.__posDbPromise = null; 
          throw recoveryErr;
        }
      }
    })();
  }
  return window.__posDbPromise;
};