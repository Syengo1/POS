// src/core/db/database.js
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { productSchema, saleSchema, categorySchema, promotionSchema, mpesaTransactionSchema } from './schema';

// 1. IMPORT BOTH THE ENGINE AND THE SUPABASE CLIENT
import { startBackgroundSync } from './sync';
import { supabase } from '../cloud/supabase'; 

if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin);
}

addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

const createDB = async () => {
  console.log('Initializing RxDB Local Storage with Ajv Validation...');
  
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
    mpesa_transactions: { schema: mpesaTransactionSchema }
  });

  // 2. DEPENDENCY INJECTION: Pass the client explicitly
  startBackgroundSync(db, supabase);

  return db;
};

// Singleton HMR Fix
export const getDB = () => {
  if (!window.__pos_db_promise) {
    window.__pos_db_promise = createDB();
  }
  return window.__pos_db_promise;
};