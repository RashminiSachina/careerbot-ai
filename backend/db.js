/**
 * Database Connection Pool
 * MySQL2 promise pool for Aiven Cloud MySQL 8.4
 * Supports SSL with optional CA certificate via MYSQL_CA_CERT env var.
 */
const mysql = require('mysql2/promise');

// Validate that all required MySQL environment variables are set
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_CA_CERT
} = process.env;

const hasConfig = MYSQL_HOST && MYSQL_USER && MYSQL_PASSWORD && MYSQL_DATABASE;

// SSL configuration — rejectUnauthorized is always true
// CA cert is injected via MYSQL_CA_CERT env var (full PEM string)
// This works for both local .env and Vercel environment variables
const sslConfig = MYSQL_CA_CERT
  ? { ca: MYSQL_CA_CERT, rejectUnauthorized: true }
  : { rejectUnauthorized: true }; // falls back to Node.js bundled CA store

// Use a smaller connection limit on Vercel serverless to avoid
// exhausting the Aiven free-tier connection limit
const connectionLimit = process.env.VERCEL ? 2 : 5;

let pool = null;

if (hasConfig) {
  try {
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: parseInt(MYSQL_PORT || '3306', 10),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      ssl: sslConfig,
      connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    console.log('[DB] Connection pool created');
  } catch (err) {
    // Log only safe error codes — never credentials or connection strings
    console.error('[DB] Failed to create pool:', err.code);
    pool = null;
  }
} else {
  console.warn('[DB] MySQL env vars not configured. Database features disabled.');
}

/**
 * Test the database connection and return latency in ms.
 * @returns {{ ok: boolean, latencyMs?: number, error?: string }}
 */
async function testConnection() {
  if (!pool) {
    return { ok: false, error: 'Database not configured' };
  }
  const start = Date.now();
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    // Safe: log only code and state, never credentials
    console.error('[DB] Health check failed:', err.code, err.sqlState);
    return { ok: false, error: 'Connection failed' };
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, testConnection };
