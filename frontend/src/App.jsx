import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import QuickPrompts from './components/QuickPrompts';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ToolkitModal from './components/ToolkitModal';
import ChatHistory from './components/ChatHistory';
import ConversationView from './components/ConversationView';
import { sendChatMessage, checkBackendHealth, createConversation } from './services/api';
import { useSession } from './hooks/useSession';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const { sessionId, sessionSecret } = useSession();

  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'history' | 'conversation'
  const [viewingConvId, setViewingConvId] = useState(null);

  const [activeTopic, setActiveTopic] = useState('general');
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null); // current active conversation UUID
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [activeToolkit, setActiveToolkit] = useState(null); // 'star' | 'ats' | null
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Check backend health on mount
  useEffect(() => {
    const verifyBackend = async () => {
      const isHealthy = await checkBackendHealth();
      setIsBackendConnected(isHealthy);
    };
    verifyBackend();
  }, []);

  /**
   * Ensure a conversation row exists in the DB before the first message.
   * Only runs once per conversation (when convId is null).
   * Returns the convId to use for this turn.
   */
  const ensureConversation = async (topic) => {
    if (convId) return convId;
    try {
      const newConvId = crypto.randomUUID();
      await createConversation(newConvId, sessionId, sessionSecret, topic);
      setConvId(newConvId);
      return newConvId;
    } catch {
      // DB unavailable — proceed without persistence
      return null;
    }
  };

  const handleSendMessage = async (text, topicOverride) => {
    const topic = topicOverride || activeTopic;

    // Add user message immediately
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Resolve conversation ID (creates DB row on first message if DB is available)
    const activeConvId = await ensureConversation(topic);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await sendChatMessage(text, history, topic, activeConvId, sessionId, sessionSecret);

      if (response && response.success && response.data) {
        const botMsg = {
          id: Date.now() + 1,
          role: 'bot',
          content: response.data.reply,
          timestamp: response.data.timestamp
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsBackendConnected(true);
      }
    } catch (error) {
      console.error('Failed to get bot response:', error);
      setIsBackendConnected(false);

      const errorMsg = {
        id: Date.now() + 1,
        role: 'bot',
        content: `⚠️ **Connection Notice**: Unable to connect to backend server at \`http://localhost:5000\`. \n\nPlease verify that the backend server is running via \`npm run dev\` inside the \`backend\` folder.`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setConvId(null);
  };

  /** Called from Sidebar when navigating between views */
  const handleNavigate = (view) => {
    setActiveView(view);
    if (view === 'chat') {
      setViewingConvId(null);
    }
  };

  /** Open a past conversation in ConversationView */
  const handleViewConversation = (id) => {
    setViewingConvId(id);
    setActiveView('conversation');
  };

  /** Load a past conversation into the active chat and continue it */
  const handleContinueConversation = ({ convId: resumedId, messages: resumedMessages, topic }) => {
    setConvId(resumedId);
    setMessages(resumedMessages);
    setActiveTopic(topic || 'general');
    setActiveView('chat');
    setViewingConvId(null);
  };

  /** Start a brand-new chat from history page */
  const handleNewChat = () => {
    setMessages([]);
    setConvId(null);
    setActiveView('chat');
  };

  const getTopicLabel = () => {
    const labels = {
      general: 'General Assistant',
      resume: 'Resume Review',
      interview: 'Mock Interview Prep',
      skills: 'Skill Upgrade Roadmap',
      career_path: 'Career Transition'
    };
    return labels[activeTopic] || 'Career Assistant';
  };

  return (
    <div className="app-container">
      {/* Toolkit Modal */}
      {activeToolkit && (
        <ToolkitModal
          type={activeToolkit}
          onClose={() => setActiveToolkit(null)}
        />
      )}

      {/* Left Sidebar */}
      <Sidebar
        activeTopic={activeTopic}
        onSelectTopic={setActiveTopic}
        onOpenToolkit={setActiveToolkit}
        onNavigate={handleNavigate}
        activeView={activeView}
      />

      {/* Main Content Area */}
      <main className="chat-main">
        {activeView === 'history' ? (
          <ChatHistory
            sessionId={sessionId}
            sessionSecret={sessionSecret}
            onViewConversation={handleViewConversation}
            onNewChat={handleNewChat}
          />
        ) : activeView === 'conversation' ? (
          <ConversationView
            convId={viewingConvId}
            sessionId={sessionId}
            sessionSecret={sessionSecret}
            onBack={() => setActiveView('history')}
            onContinue={handleContinueConversation}
          />
        ) : (
          <>
            <Header
              onClearChat={handleClearChat}
              topicLabel={getTopicLabel()}
            />

            {/* Backend Warning Banner */}
            {!isBackendConnected && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '10px 24px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>Backend server is offline at http://localhost:5000. Please start the backend to test live requests.</span>
              </div>
            )}

            {/* Chat Feed */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <div className="welcome-badge">
                    <Sparkles size={14} />
                    <span>AI Career Coach Ready</span>
                  </div>
                  <h2 className="welcome-title">How can I help advance your career today?</h2>
                  <p className="welcome-desc">
                    Get tailored guidance on optimizing your resume, practicing STAR method interview questions,
                    negotiating job offers, and mastering high-impact skills.
                  </p>
                  <QuickPrompts
                    onSelectPrompt={(text, topic) => {
                      setActiveTopic(topic);
                      handleSendMessage(text, topic);
                    }}
                  />
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))
              )}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="message-row bot">
                  <div className="avatar bot">
                    <Bot size={18} />
                  </div>
                  <div className="message-bubble">
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Fixed Chat Input */}
            <ChatInput
              onSendMessage={(text) => handleSendMessage(text)}
              isLoading={isLoading}
            />
          </>
        )}
      </main>
    </div>
  );
}
