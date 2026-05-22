import { getDb } from './connection.js';
import { SCHEMA_SQL } from './schema.js';

export function initializeDatabase(): void {
  const db = getDb();
  db.exec(SCHEMA_SQL);
  console.log('[DB] Database initialized with schema.');
}
