import initSqlJs, { SqlJsStatic, Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

let SQL: SqlJsStatic;
let rawDb: SqlJsDatabase;
const dbPath = process.env.DATABASE_PATH || './data/catering.db';

function getRawDb(): SqlJsDatabase {
  if (!rawDb) throw new Error('Database not initialized');
  return rawDb;
}

function isMutation(sql: string): boolean {
  const s = sql.trim().toUpperCase();
  return s.startsWith('INSERT') || s.startsWith('UPDATE') || s.startsWith('DELETE') ||
         s.startsWith('CREATE') || s.startsWith('DROP') || s.startsWith('ALTER');
}

export function saveDb(): void {
  if (rawDb) {
    const data = rawDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

class Statement {
  private sql: string;
  constructor(sql: string) { this.sql = sql; }

  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    const db = getRawDb();
    if (isMutation(this.sql)) {
      db.run(this.sql, params);
      saveDb();
      return { changes: db.getRowsModified(), lastInsertRowid: 0 };
    }
    db.run(this.sql, params);
    return { changes: 0, lastInsertRowid: 0 };
  }

  get(...params: any[]): any {
    const db = getRawDb();
    const s = db.prepare(this.sql);
    if (params.length > 0) s.bind(params);
    let row: any = undefined;
    if (s.step()) row = s.getAsObject();
    s.free();
    return row;
  }

  all(...params: any[]): any[] {
    const db = getRawDb();
    const s = db.prepare(this.sql);
    if (params.length > 0) s.bind(params);
    const rows: any[] = [];
    while (s.step()) rows.push(s.getAsObject());
    s.free();
    return rows;
  }
}

export async function initializeDb(): Promise<void> {
  SQL = await initSqlJs();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(dbPath)) {
    rawDb = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    rawDb = new SQL.Database();
  }
  rawDb.run('PRAGMA foreign_keys = ON');
  console.log('[DB] Database initialized with sql.js');
}

export function getDb(): any {
  return {
    prepare: (sql: string) => new Statement(sql),
    exec: (sql: string) => {
      getRawDb().exec(sql);
      saveDb();
    },
    close: () => {},
    pragma: () => {},
  };
}
