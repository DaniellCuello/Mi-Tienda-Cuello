import * as schema from './schema';

let sqlite: any = null;
let db: any = null;

// En navegadores web, openDatabaseSync requiere soporte de SharedArrayBuffer
if (typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined') {
  try {
    const { openDatabaseSync } = require('expo-sqlite');
    const { drizzle } = require('drizzle-orm/expo-sqlite');
    sqlite = openDatabaseSync('mitienda.db', { enableChangeListener: true });
    if (sqlite.execSync) {
      sqlite.execSync('PRAGMA foreign_keys = ON;');
    }
    db = drizzle(sqlite, { schema });
  } catch (err) {
    console.warn('SQLite nativo web no disponible, usando fallback web:', err);
  }
}

export { sqlite, db };

