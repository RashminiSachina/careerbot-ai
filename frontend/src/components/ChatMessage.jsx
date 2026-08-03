import React, { useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format basic markdown text cleanly
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={index}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={index}>{line.replace('## ', '')}</h3>;
      }
      
      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        return (
          <li key={index} style={{ marginLeft: '16px', marginBottom: '4px' }}>
            {parseInlineStyles(bulletText)}
          </li>
        );
      }

      // Numbered lists
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={index} style={{ marginBottom: '4px', fontWeight: 500 }}>
            {parseInlineStyles(line.trim())}
          </div>
        );
      }

      // Empty line spacing
      if (!line.trim()) {
        return <div key={index} style={{ height: '8px' }} />;
      }

      return <p key={index} style={{ marginBottom: '6px' }}>{parseInlineStyles(line)}</p>;
    });
  };

  // Simple inline parser for **bold** and `code`
  const parseInlineStyles = (str) => {
    // Split by bold regex **text**
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#ffffff' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const formattedTime = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`message-row ${isUser ? 'user' : 'bot'}`}>
      <div className={`avatar ${isUser ? 'user' : 'bot'}`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div className="message-bubble">
        <div className="message-content">
          {renderFormattedText(message.content)}
        </div>

        <div className="message-meta">
          <span>{formattedTime}</span>
          {!isUser && (
            <button 
              onClick={handleCopy} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-dim)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Copy response"
            >
              {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span style={{ fontSize: '0.7rem' }}>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
