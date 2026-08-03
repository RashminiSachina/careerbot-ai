import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const CONTENT = {
  star: {
    title: '⭐ STAR Method Guide',
    sections: [
      {
        heading: 'What is STAR?',
        body: 'The STAR framework structures your answers to behavioral interview questions so they are clear, concise, and impactful.'
      },
      {
        heading: 'S — Situation',
        body: 'Set the context. Describe the background in 1–2 sentences. Where were you? What project or team was involved?',
        example: '"I was a junior developer at a startup where our main checkout API was randomly failing under peak traffic."'
      },
      {
        heading: 'T — Task',
        body: 'Explain your specific responsibility. What were YOU asked to achieve or solve?',
        example: '"I was tasked with identifying the root cause and reducing 5xx error rates before our upcoming marketing launch."'
      },
      {
        heading: 'A — Action (60% of your answer)',
        body: 'Detail the exact steps YOU personally took. Use strong verbs. Avoid "we" — focus on your individual contribution.',
        example: '"I profiled API latency, identified N+1 query patterns, added Redis caching for product data, and implemented a circuit breaker using the Resilience4j library."'
      },
      {
        heading: 'R — Result',
        body: 'Quantify the outcome. Numbers are powerful: percentages, time saved, revenue impact, users affected.',
        example: '"Error rates dropped from 12% to under 0.3%, checkout latency fell by 60%, and the launch had zero downtime."'
      },
      {
        heading: '💡 Pro Tips',
        bullets: [
          'Prepare 5–7 STAR stories that can flex across multiple question types.',
          'Keep your full answer to 90–120 seconds when speaking.',
          'Always end with a Result — never leave the story hanging.',
          'Rehearse out loud, not just in your head.'
        ]
      }
    ]
  },
  ats: {
    title: '🤖 ATS Score Checklist',
    sections: [
      {
        heading: 'What is ATS?',
        body: 'An Applicant Tracking System automatically scans and scores your resume before a human ever sees it. Most companies use one.'
      },
      {
        heading: '✅ File & Format',
        bullets: [
          'Submit as .pdf (preferred) or .docx — avoid .pages or .odt.',
          'No text boxes, tables, headers/footers, or columns (ATS cannot parse them).',
          'Font size 10–12pt; use Arial, Calibri, or Inter.',
          'File name: FirstName-LastName-Resume.pdf'
        ]
      },
      {
        heading: '✅ Section Headers',
        bullets: [
          'Use standard headings: Work Experience, Education, Skills, Projects, Certifications.',
          'Avoid creative headers like "My Journey" or "What I Have Built".',
          'Place Work Experience above Education if you have 2+ years of experience.'
        ]
      },
      {
        heading: '✅ Keyword Matching',
        bullets: [
          'Copy exact keywords from the job description into your Skills and Experience sections.',
          'If the JD says "React.js", write "React.js" — not just "React" or "Frontend".',
          'Include both acronyms and full forms: "SEO (Search Engine Optimization)".',
          'Match the job title exactly in your summary line.'
        ]
      },
      {
        heading: '✅ Content Quality',
        bullets: [
          'Start every bullet with a strong action verb: Engineered, Designed, Led, Reduced.',
          'Quantify at least 50% of your bullets with numbers or percentages.',
          'Keep each bullet to 1–2 lines maximum.',
          'Remove personal pronouns (I, my, we) completely.'
        ]
      },
      {
        heading: '✅ Contact & Links',
        bullets: [
          'Include: Email, Phone, LinkedIn URL, GitHub/Portfolio URL.',
          'LinkedIn URL should be customized (linkedin.com/in/yourname).',
          'No photos, no date of birth, no marital status.'
        ]
      },
      {
        heading: '🏆 Quick Score Guide',
        bullets: [
          '90–100%: Strong match — very likely to pass ATS.',
          '70–89%: Good — tweak keywords to match JD more closely.',
          '50–69%: Moderate — review section headers and keyword density.',
          'Below 50%: Rewrite targeting this specific role.'
        ]
      }
    ]
  }
};

export default function ToolkitModal({ type, onClose }) {
  const content = CONTENT[type];

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!content) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0f172a, #1e2a45)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '660px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 50px rgba(99,102,241,0.2)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>{content.title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', borderRadius: '8px', width: '34px', height: '34px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          ><X size={16} /></button>
        </div>

        {/* Modal Body — Scrollable */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {content.sections.map((section, i) => (
            <div key={i}>
              <h3 style={{
                fontSize: '0.95rem', fontWeight: 700,
                color: '#a5b4fc',
                marginBottom: '8px'
              }}>{section.heading}</h3>

              {section.body && (
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: section.example ? '8px' : 0 }}>
                  {section.body}
                </p>
              )}

              {section.example && (
                <div style={{
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '8px', padding: '10px 14px',
                  fontSize: '0.85rem', color: '#e2e8f0',
                  fontStyle: 'italic'
                }}>
                  {section.example}
                </div>
              )}

              {section.bullets && (
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {section.bullets.map((b, j) => (
                    <li key={j} style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.55 }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>Esc</kbd> or click outside to close
        </div>
      </div>
    </div>
  );
}
