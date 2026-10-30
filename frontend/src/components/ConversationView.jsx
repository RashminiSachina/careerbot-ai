/**
 * ConversationView — Read-only view of a past conversation.
 * Allows the user to read all messages and continue the conversation.
 */
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageCircle, RotateCcw } from 'lucide-react';
import ChatMessage from './ChatMessage';
import { getConversation } from '../services/api';

const TOPIC_LABELS = {
  general: 'General Assistant',
  resume: 'Resume Review',
  interview: 'Mock Interview Prep',
  skills: 'Skill Upgrade Roadmap',
  career_path: 'Career Transition'
};

export default function ConversationView({ convId, sessionId, sessionSecret, onBack, onContinue }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!convId) return;
    setIsLoading(true);
    setError(null);

    getConversation(convId, sessionId, sessionSecret)
      .then(({ conversation: conv, messages: msgs }) => {
        setConversation(conv);
        // Map DB roles to the format ChatMessage expects
        setMessages(msgs.map((m, i) => ({
          id: i,
          role: m.role === 'assistant' ? 'bot' : 'user',
          content: m.content,
          timestamp: m.created_at
        })));
      })
      .catch(() => setError('Failed to load conversation.'))
      .finally(() => setIsLoading(false));
  }, [convId, sessionId, sessionSecret]);

  // Scroll to bottom after messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="conv-view-loading">
        <div className="typing-indicator"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conv-view-loading">
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button className="topic-btn" style={{ marginTop: '12px' }} onClick={onBack}>← Back</button>
      </div>
    );
  }

  return (
    <div className="conv-view">
      {/* Toolbar */}
      <div className="conv-view-header">
        <button className="icon-btn" onClick={onBack} title="Back to History">
          <ArrowLeft size={18} />
        </button>
        <div className="conv-view-meta">
          <span className="conv-view-title">{conversation?.title || 'Conversation'}</span>
          <span className="conv-view-topic">{TOPIC_LABELS[conversation?.topic] || conversation?.topic}</span>
        </div>
        <button
          className="icon-btn continue-btn"
          onClick={() => onContinue({ convId, messages, topic: conversation?.topic || 'general' })}
          title="Continue this conversation"
        >
          <RotateCcw size={16} />
          <span>Continue</span>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="history-empty">
            <MessageCircle size={32} style={{ color: 'var(--text-dim)', marginBottom: '8px' }} />
            <p>This conversation has no messages.</p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
