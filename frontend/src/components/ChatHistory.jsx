/**
 * ChatHistory — Full conversation history page.
 * Groups conversations by: Today, Yesterday, Previous 7 Days, Older.
 * Supports search, continue, delete with confirmation, and start new chat.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, Trash2, MessageCircle, Plus, ChevronRight, X } from 'lucide-react';
import { listConversations, searchConversations, deleteConversation } from '../services/api';

const TOPIC_LABELS = {
  general: 'General',
  resume: 'Resume',
  interview: 'Interview',
  skills: 'Skills',
  career_path: 'Career Path'
};

function groupByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);

  const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
  conversations.forEach((conv) => {
    const d = new Date(conv.updated_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups['Today'].push(conv);
    else if (day >= yesterday) groups['Yesterday'].push(conv);
    else if (day >= sevenDaysAgo) groups['Previous 7 Days'].push(conv);
    else groups['Older'].push(conv);
  });
  return groups;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatHistory({ sessionId, sessionSecret, onViewConversation, onNewChat }) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listConversations(sessionId, sessionSecret);
      setConversations(data || []);
    } catch (err) {
      setError('Failed to load conversation history.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, sessionSecret]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await searchConversations(sessionId, sessionSecret, searchQuery.trim());
        setSearchResults(results || []);
      } catch {
        setSearchResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, sessionId, sessionSecret]);

  const handleDelete = async (convId) => {
    try {
      await deleteConversation(convId, sessionId, sessionSecret);
      setConversations((prev) => prev.filter((c) => c.conv_id !== convId));
      if (searchResults) setSearchResults((prev) => prev.filter((c) => c.conv_id !== convId));
    } catch {
      setError('Failed to delete conversation. Please try again.');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const displayList = searchResults ?? conversations;
  const grouped = searchResults ? null : groupByDate(conversations);

  const renderConvItem = (conv) => (
    <div key={conv.conv_id} className="history-item">
      <div className="history-item-main" onClick={() => onViewConversation(conv.conv_id)}>
        <div className="history-item-top">
          <span className="history-item-title">{conv.title}</span>
          <span className={`history-topic-badge topic-${conv.topic}`}>
            {TOPIC_LABELS[conv.topic] || conv.topic}
          </span>
        </div>
        <div className="history-item-meta">
          <span>{formatDate(conv.updated_at)}</span>
          <span>{conv.message_count ?? 0} messages</span>
        </div>
      </div>
      <div className="history-item-actions">
        <button className="icon-btn" title="Open conversation" onClick={() => onViewConversation(conv.conv_id)}>
          <ChevronRight size={16} />
        </button>
        {confirmDeleteId === conv.conv_id ? (
          <div className="delete-confirm-inline">
            <span>Delete?</span>
            <button className="del-confirm-btn" onClick={() => handleDelete(conv.conv_id)}>Yes</button>
            <button className="del-cancel-btn" onClick={() => setConfirmDeleteId(null)}>No</button>
          </div>
        ) : (
          <button
            className="icon-btn danger"
            title="Delete conversation"
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(conv.conv_id); }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Chat History</h2>
        </div>
        <button className="icon-btn new-chat-btn" onClick={onNewChat} title="Start New Chat">
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="history-search-bar">
        <Search size={15} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
        <input
          className="history-search-input"
          type="text"
          placeholder="Search conversations…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxLength={200}
        />
        {searchQuery && (
          <button className="icon-btn" style={{ padding: '4px' }} onClick={() => setSearchQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="history-content">
        {error && (
          <div className="history-error">{error}</div>
        )}

        {isLoading ? (
          <div className="history-empty">
            <div className="typing-indicator" style={{ justifyContent: 'center' }}>
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        ) : displayList.length === 0 ? (
          <div className="history-empty">
            <MessageCircle size={36} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
            <p>{searchResults ? 'No conversations match your search.' : 'No conversations yet. Start a new chat!'}</p>
          </div>
        ) : searchResults ? (
          // Flat list for search results
          <>
            <div className="history-group-label">Search Results ({searchResults.length})</div>
            {searchResults.map(renderConvItem)}
          </>
        ) : (
          // Grouped by date
          Object.entries(grouped).map(([label, group]) =>
            group.length > 0 && (
              <div key={label}>
                <div className="history-group-label">{label}</div>
                {group.map(renderConvItem)}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
