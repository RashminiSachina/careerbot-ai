const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : '/api';

/**
 * Build session auth headers for protected requests.
 */
function sessionHeaders(sessionId, sessionSecret) {
  return {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId,
    'X-Session-Secret': sessionSecret
  };
}

/**
 * Send a chat message to the backend Career Assistant API.
 * @param {string} message - User query
 * @param {Array}  history - Previous messages array
 * @param {string} topic   - Selected topic context
 * @param {string} [convId]       - Active conversation UUID (optional)
 * @param {string} [sessionId]    - Session ID for DB persistence (optional)
 * @param {string} [sessionSecret]- Session secret for DB persistence (optional)
 * @returns {Promise<Object>} API response object
 */
export async function sendChatMessage(message, history = [], topic = 'general', convId, sessionId, sessionSecret) {
  const headers = { 'Content-Type': 'application/json' };
  // Attach session headers only when persistence is intended
  if (convId && sessionId && sessionSecret) {
    headers['X-Session-Id'] = sessionId;
    headers['X-Session-Secret'] = sessionSecret;
  }
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, topic, conv_id: convId ?? undefined })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }
  return response.json();
}

/**
 * Check backend health status.
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Conversation API — all protected with session headers
// ---------------------------------------------------------------------------

/**
 * Create a new conversation (also creates session row on first use).
 */
export async function createConversation(convId, sessionId, sessionSecret, topic = 'general', title = 'New Conversation') {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: sessionHeaders(sessionId, sessionSecret),
    body: JSON.stringify({ conv_id: convId, topic, title })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Create conversation failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * List all conversations for the current session, ordered by most recent.
 */
export async function listConversations(sessionId, sessionSecret) {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    headers: sessionHeaders(sessionId, sessionSecret)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `List conversations failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * Search conversation titles.
 */
export async function searchConversations(sessionId, sessionSecret, query) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_BASE_URL}/conversations/search?${params}`, {
    headers: sessionHeaders(sessionId, sessionSecret)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Search failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * Get full message history for a single conversation.
 */
export async function getConversation(convId, sessionId, sessionSecret) {
  const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(convId)}`, {
    headers: sessionHeaders(sessionId, sessionSecret)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Get conversation failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * Update the title of a conversation.
 */
export async function updateConversationTitle(convId, sessionId, sessionSecret, title) {
  const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(convId)}/title`, {
    method: 'PUT',
    headers: sessionHeaders(sessionId, sessionSecret),
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Update title failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
}

/**
 * Delete a conversation (cascades to messages in DB).
 */
export async function deleteConversation(convId, sessionId, sessionSecret) {
  const response = await fetch(`${API_BASE_URL}/conversations/${encodeURIComponent(convId)}`, {
    method: 'DELETE',
    headers: sessionHeaders(sessionId, sessionSecret)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Delete conversation failed: ${response.status}`);
  }
  return response.json();
}
