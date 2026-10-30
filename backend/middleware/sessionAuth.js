/**
 * Session Authentication Middleware
 * Verifies X-Session-Id and X-Session-Secret headers for protected routes.
 * Validates input format before any database operation.
 */
const crypto = require('crypto');
const { pool } = require('../db');

// Validation helpers
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX64_REGEX = /^[0-9a-f]{64}$/i;
const SESSION_ID_REGEX = /^[a-zA-Z0-9\-]{1,128}$/;

/**
 * Hash a plaintext secret with SHA-256.
 * @param {string} secret
 * @returns {string} hex digest
 */
function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/**
 * Middleware: validate and verify session ownership.
 * Attaches req.sessionId to the request on success.
 */
async function sessionAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  const sessionSecret = req.headers['x-session-secret'];

  // --- Input validation ---
  if (!sessionId || !SESSION_ID_REGEX.test(sessionId)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing X-Session-Id header.' });
  }
  if (!sessionSecret || !HEX64_REGEX.test(sessionSecret)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing X-Session-Secret header (must be 64 hex chars).' });
  }

  // --- DB not available ---
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available.' });
  }

  // --- Verify ownership ---
  try {
    const hashedSecret = hashSecret(sessionSecret);
    const [rows] = await pool.execute(
      'SELECT session_id, session_secret FROM chat_sessions WHERE session_id = ? LIMIT 1',
      [sessionId]
    );

    if (rows.length === 0) {
      // Session doesn't exist yet — not an error for POST /api/conversations (create flow)
      // Attach sessionId for the controller to handle creation
      req.sessionId = sessionId;
      req.sessionSecret = hashedSecret;
      req.sessionExists = false;
      return next();
    }

    // Session exists — verify secret matches
    if (rows[0].session_secret !== hashedSecret) {
      return res.status(403).json({ success: false, error: 'Session ownership mismatch.' });
    }

    req.sessionId = sessionId;
    req.sessionSecret = hashedSecret;
    req.sessionExists = true;
    return next();
  } catch (err) {
    // Safe: log only code and sqlState — never credentials or user content
    console.error('[DB] sessionAuth error:', err.code, err.sqlState);
    return res.status(500).json({ success: false, error: 'Session verification failed.' });
  }
}

module.exports = { sessionAuth, hashSecret, UUID_V4_REGEX, SESSION_ID_REGEX, HEX64_REGEX };
