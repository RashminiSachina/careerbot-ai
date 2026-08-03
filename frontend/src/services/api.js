const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Send a chat message to the backend Career Assistant API
 * @param {string} message - User query
 * @param {Array} history - Previous messages array
 * @param {string} topic - Selected topic context
 * @returns {Promise<Object>} API response object
 */
export async function sendChatMessage(message, history = [], topic = 'general') {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        topic
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API service error:', error);
    throw error;
  }
}

/**
 * Check backend health status
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/health`);
    return response.ok;
  } catch {
    return false;
  }
}
