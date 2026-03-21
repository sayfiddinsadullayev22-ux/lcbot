import Database from 'better-sqlite3';
import path from 'path';

let db: any = null;

export async function initDb() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'bot_database.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      full_name TEXT,
      referal_code TEXT UNIQUE,
      referer_id INTEGER,
      referal_count INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      referer_id INTEGER,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

export async function getDb() {
  if (!db) {
    return await initDb();
  }
  return db;
}
