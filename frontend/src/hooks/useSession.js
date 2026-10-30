/**
 * useSession — generates and persists anonymous session tokens in localStorage.
 * Returns stable { sessionId, sessionSecret } for the life of the browser session.
 *
 * session_id:     UUID v4 — public namespace, sent as X-Session-Id header
 * session_secret: 32 random bytes as 64-char hex — private, sent as X-Session-Secret
 */
import { useState } from 'react';

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getOrCreateSession() {
  let sessionId = localStorage.getItem('cp_session_id');
  let sessionSecret = localStorage.getItem('cp_session_secret');

  if (!sessionId || !sessionSecret) {
    sessionId = generateUUID();
    sessionSecret = generateSecret();
    localStorage.setItem('cp_session_id', sessionId);
    localStorage.setItem('cp_session_secret', sessionSecret);
  }

  return { sessionId, sessionSecret };
}

export function useSession() {
  const [session] = useState(() => getOrCreateSession());
  return session;
}
