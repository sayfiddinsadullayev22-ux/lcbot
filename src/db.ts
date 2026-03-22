import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export async function initDb() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL is not set in environment variables');
    // Fallback or throw error
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id BIGINT PRIMARY KEY,
        username TEXT,
        full_name TEXT,
        referal_code TEXT UNIQUE,
        referer_id BIGINT,
        referal_count INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 0,
        joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        user_id BIGINT,
        referer_id BIGINT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }

  return pool;
}

export async function getDb() {
  if (!pool) {
    return await initDb();
  }
  return pool;
}
