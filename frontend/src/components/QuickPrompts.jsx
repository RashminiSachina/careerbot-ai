import React from 'react';
import { FileText, Target, Sparkles, Compass } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: FileText,
    title: 'Resume Bullet Points',
    text: 'How can I rewrite my resume bullets using the Google XYZ formula?',
    topic: 'resume'
  },
  {
    icon: Target,
    title: 'STAR Interview Prep',
    text: 'Help me structure an answer for: "Tell me about a difficult challenge."',
    topic: 'interview'
  },
  {
    icon: Sparkles,
    title: 'In-Demand Skills 2026',
    text: 'What technical and soft skills should I prioritize to get promoted?',
    topic: 'skills'
  },
  {
    icon: Compass,
    title: 'Career Switch Strategy',
    text: 'How do I transition into Software Engineering from another field?',
    topic: 'career_path'
  }
];

export default function QuickPrompts({ onSelectPrompt }) {
  return (
    <div className="quick-prompts-grid">
      {SUGGESTIONS.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            className="prompt-card"
            onClick={() => onSelectPrompt(item.text, item.topic)}
          >
            <div className="prompt-card-icon">
              <Icon size={18} />
            </div>
            <div className="prompt-card-title">{item.title}</div>
            <div className="prompt-card-text">{item.text}</div>
          </button>
        );
      })}
    </div>
  );
}
