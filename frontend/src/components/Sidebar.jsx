import React from 'react';
import { 
  Bot, 
  FileText, 
  Target, 
  Sparkles, 
  Compass, 
  Briefcase, 
  BookOpen, 
  CheckCircle2 
} from 'lucide-react';

const TOPICS = [
  { id: 'general', label: 'General Assistant', icon: Bot },
  { id: 'resume', label: 'Resume Review', icon: FileText },
  { id: 'interview', label: 'Mock Interview Prep', icon: Target },
  { id: 'skills', label: 'Skill Upgrade Roadmap', icon: Sparkles },
  { id: 'career_path', label: 'Career Transition', icon: Compass },
];

export default function Sidebar({ activeTopic, onSelectTopic, onOpenToolkit }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <Briefcase size={22} />
        </div>
        <div>
          <h1 className="brand-title">CareerPulse</h1>
          <p className="brand-subtitle">AI Career Assistant</p>
        </div>
      </div>

      <div className="sidebar-content">
        <div>
          <div className="sidebar-section-title">Focus Areas</div>
          <div className="topic-list">
            {TOPICS.map((topic) => {
              const Icon = topic.icon;
              const isActive = activeTopic === topic.id;
              return (
                <button
                  key={topic.id}
                  className={`topic-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTopic(topic.id)}
                >
                  <Icon className="topic-icon" />
                  <span>{topic.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="sidebar-section-title">Career Toolkit</div>
          <div className="topic-list">
            <button
              className="topic-btn"
              onClick={() => onOpenToolkit('star')}
              title="Open STAR Method Guide"
            >
              <BookOpen className="topic-icon" />
              <span>STAR Method Guide</span>
            </button>
            <button
              className="topic-btn"
              onClick={() => onOpenToolkit('ats')}
              title="Open ATS Score Checklist"
            >
              <CheckCircle2 className="topic-icon" />
              <span>ATS Score Checklist</span>
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <span>v1.0.0 • React + Express</span>
        <span style={{ color: 'var(--accent-emerald)' }}>● Active</span>
      </div>
    </aside>
  );
}
