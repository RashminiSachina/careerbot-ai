/**
 * Conversation Controller
 * Handles all CRUD operations for chat conversations.
 * All DB queries use parameterized placeholders (?).
 */
const { pool } = require('../db');
const { UUID_V4_REGEX } = require('../middleware/sessionAuth');

const VALID_TOPICS = ['general', 'resume', 'interview', 'skills', 'career_path'];
const MAX_TITLE_LEN = 255;
const MAX_SEARCH_LEN = 200;

// --------------------------------------------------------------------------
// POST /api/conversations — Create session (if new) + conversation (atomic)
// --------------------------------------------------------------------------
const createConversation = async (req, res) => {
  const { conv_id, topic = 'general', title = 'New Conversation' } = req.body;

  // Validate conv_id
  if (!conv_id || !UUID_V4_REGEX.test(conv_id)) {
    return res.status(400).json({ success: false, error: 'conv_id must be a valid UUID v4.' });
  }
  // Validate topic
  if (!VALID_TOPICS.includes(topic)) {
    return res.status(400).json({ success: false, error: `Invalid topic. Must be one of: ${VALID_TOPICS.join(', ')}.` });
  }
  // Validate title
  const trimmedTitle = String(title).trim().slice(0, MAX_TITLE_LEN) || 'New Conversation';

  const { sessionId, sessionSecret, sessionExists } = req;
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Create session row only if it doesn't exist yet
    if (!sessionExists) {
      await conn.execute(
        'INSERT INTO chat_sessions (session_id, session_secret) VALUES (?, ?)',
        [sessionId, sessionSecret]
      );
    }

    // Create the conversation (ignore duplicate conv_id gracefully)
    await conn.execute(
      'INSERT INTO conversations (conv_id, session_id, title, topic) VALUES (?, ?, ?, ?)',
      [conv_id, sessionId, trimmedTitle, topic]
    );

    await conn.commit();
    return res.status(201).json({ success: true, data: { conv_id, title: trimmedTitle, topic } });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Conversation already exists.' });
    }
    console.error('[DB] createConversation error:', err.code, err.sqlState);
    return res.status(500).json({ success: false, error: 'Failed to create conversation.' });
  } finally {
    if (conn) conn.release();
  }
};

// --------------------------------------------------------------------------
// GET /api/conversations — List all conversations for session
// --------------------------------------------------------------------------
const listConversations = async (req, res) => {
  const { sessionId } = req;
  try {
    const [rows] = await pool.execute(
      `SELECT c.conv_id, c.title, c.topic, c.created_at, c.updated_at,
              COUNT(m.id) AS message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conv_id = c.conv_id
       WHERE c.session_id = ?
       GROUP BY c.conv_id, c.title, c.topic, c.created_at, c.updated_at
       ORDER BY c.updated_at DESC
       LIMIT 200`,
      [sessionId]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[DB] listConversations error:', err.code, err.sqlState);
    return res.status(500).json({ success: false, error: 'Failed to list conversations.' });
  }
};

// --------------------------------------------------------------------------
// GET /api/conversations/search?q= — Search conversation titles
// --------------------------------------------------------------------------
const searchConversations = async (req, res) => {
  const { sessionId } = req;
  const q = String(req.query.q || '').trim();

  if (!q || q.length > MAX_SEARCH_LEN) {
    return res.status(400).json({ success: false, error: 'Search query must be 1–200 characters.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT conv_id, title, topic, created_at, updated_at
       FROM conversations
       WHERE session_id = ?
         AND title LIKE CONCAT('%', ?, '%')
       ORDER BY updated_at DESC
       LIMIT 50`,
      [sessionId, q]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[DB] searchConversations error:', err.code, err.sqlState);
    return res.status(500).json({ success: false, error: 'Search failed.' });
  }
};

// --------------------------------------------------------------------------
// GET /api/conversations/:convId — Get messages for one conversation
// --------------------------------------------------------------------------
const getConversation = async (req, res) => {
  const { convId } = req.params;
  const { sessionId } = req;

  if (!UUID_V4_REGEX.test(convId)) {
    return res.status(400).json({ success: false, error: 'Invalid conv_id format.' });
  }

  try {
    // Verify ownership
    const [convRows] = await pool.execute(
      'SELECT conv_id, title, topic, created_at, updated_at FROM conversations WHERE conv_id = ? AND session_id = ? LIMIT 1',
      [convId, sessionId]
    );
    if (convRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const [msgRows] = await pool.execute(
      'SELECT role, content, created_at FROM messages WHERE conv_id = ? ORDER BY created_at ASC',
      [convId]
    );

    return res.status(200).json({
      success: true,
      data: {
        conversation: convRows[0],
        messages: msgRows
      }
    });
  } catch (err) {
    console.error('[DB] getConversation error:', err.code, err.sqlState);
    return res.status(500).json({ success: false, error: 'Failed to retrieve conversation.' });
  }
};

// --------------------------------------------------------------------------
// PUT /api/conversations/:convId/title — Update conversation title
// --------------------------------------------------------------------------
const updateConversationTitle = async (req, res) => {
  const { convId } = req.params;
  const { sessionId } = req;
  const rawTitle = req.body.title;

  if (!UUID_V4_REGEX.test(convId)) {
    return res.status(400).json({ success: false, error: 'Invalid conv_id format.' });
  }
  if (!rawTitle || typeof rawTitle !== 'string') {
    return res.status(400).json({ success: false, error: 'title is required.' });
  }
  const title = rawTitle.trim().slice(0, MAX_TITLE_LEN);
  if (!title) {
    return res.status(400).json({ success: false, error: 'title cannot be empty.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE conversations SET title = ? WHERE conv_id = ? AND session_id = ?',
      [title, convId, sessionId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    return res.status(200).json({ success: true, data: { conv_id: convId, title } });
  } catch (err) {
    console.error('[DB] updateTitle error:', err.code, err.sqlState);
    return res.status(500).json({ success: false, error: 'Failed to update title.' });
  }
};

// --------------------------------------------------------------------------
// DELETE /api/conversations/:convId — Delete conversation + cascade messages
// --------------------------------------------------------------------------
const deleteConversation = async (req, res) => {
  const { convId } = req.params;
  const { sessionId } = req;

  if (!UUID_V4_REGEX.test(convId)) {
    return res.status(400).json({ success: false, error: 'Invalid conv_id format.' });
  }

  try {
    const [result] = await pool.execute(
      'DELETE FROM conversations WHERE conv_id = ? AND session_id = ?',
      [convId, sessionId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    return res.status(200).json({ success: true, data: { conv_id: convId, deleted: true } });
  } catch (err) {
    console.error('[DB] deleteConversation error:', err.code, err.sqlState);
    return res.status(500).json({ success: false, error: 'Failed to delete conversation.' });
  }
};

module.exports = {
  createConversation,
  listConversations,
  searchConversations,
  getConversation,
  updateConversationTitle,
  deleteConversation
};
