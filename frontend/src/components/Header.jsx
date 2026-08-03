import React from 'react';
import { RotateCcw, Sparkles, Server } from 'lucide-react';

export default function Header({ onClearChat, topicLabel }) {
  return (
    <header className="chat-header">
      <div className="header-status">
        <span className="status-dot"></span>
        <Server size={15} />
        <span>Backend Online</span>
        <span style={{ margin: '0 6px', color: 'var(--text-dim)' }}>•</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{topicLabel}</span>
      </div>

      <div className="header-actions">
        <button 
          className="icon-btn" 
          onClick={onClearChat} 
          title="Clear Conversation"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </header>
  );
}
