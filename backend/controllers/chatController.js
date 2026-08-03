/**
 * Chat Controller for Career Assistant
 * Handles incoming chat requests, builds career-tailored system context,
 * and formats structured responses.
 */

// System persona prompt for the AI Career Assistant
const CAREER_ASSISTANT_SYSTEM_PROMPT = `You are "CareerPulse", an expert AI Career Assistant & Counselor. 
Your goal is to provide practical, high-impact career advice, resume reviews, interview preparation strategies, 
skill development roadmaps, and job search guidance.

Guidelines:
1. Be encouraging, professional, structured, and direct.
2. Use markdown formatting (bullet points, bold text, code blocks where relevant) to make responses easy to read.
3. Offer actionable advice tailored to the user's specific industry, role, or skill level when provided.
4. Suggest relevant follow-up questions or next steps at the end of your response.`;

/**
 * Handle POST /api/chat
 */
const handleChatMessage = async (req, res) => {
  try {
    const { message, history = [], topic = 'general' } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message string is required.'
      });
    }

    const trimmedMessage = message.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // Check if an actual API Key is configured (and not placeholder)
    const hasValidKey = apiKey && apiKey !== 'your_gemini_api_key_here';

    let replyText = '';

    if (hasValidKey) {
      try {
        // Build conversation history for Gemini API
        const contents = [];
        
        // Add system instruction context
        contents.push({
          role: 'user',
          parts: [{ text: `${CAREER_ASSISTANT_SYSTEM_PROMPT}\n\nCurrent User Context Topic: ${topic}` }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'Understood. I am CareerPulse, your AI Career Assistant. How can I help you with your career goals today?' }]
        });

        // Add previous message history if available
        if (Array.isArray(history) && history.length > 0) {
          history.slice(-6).forEach(msg => {
            if (msg.role && msg.content) {
              contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
              });
            }
          });
        }

        // Add current user prompt
        contents.push({
          role: 'user',
          parts: [{ text: trimmedMessage }]
        });

        // Try gemini-flash-latest endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        });

        if (response.ok) {
          const data = await response.json();
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('Gemini API error:', errData?.error?.message || response.statusText);
        }
      } catch (aiError) {
        console.warn('AI API call failed, falling back to smart career engine:', aiError.message);
      }
    }

    // Fallback/Default Smart Career Engine if API key isn't active yet
    if (!replyText) {
      replyText = generateSmartCareerResponse(trimmedMessage, topic);
    }

    return res.status(200).json({
      success: true,
      data: {
        reply: replyText,
        timestamp: new Date().toISOString(),
        topic: topic
      }
    });

  } catch (error) {
    console.error('Error in chat controller:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing your request.'
    });
  }
};

/**
 * Smart Career Rule-Based Response Generator (Fallback when API key is pending)
 */
/**
 * Smart Career Contextual Response Generator
 * Analyzes the user's specific question text to return tailored, distinct advice.
 */
function generateSmartCareerResponse(userMessage, topic) {
  const msg = userMessage.trim();
  const lowerMsg = msg.toLowerCase();

  // 1. Specific Bullet Points / Resume Optimization
  if (lowerMsg.includes('bullet') || lowerMsg.includes('xyz') || lowerMsg.includes('accomplish')) {
    return `### ✍️ Action-Oriented Resume Bullet Point Formula

To make your bullet points stand out for **"${msg}"**, structure them with the **Google XYZ Formula**:

- **Formula**: *Achieved [X] as measured by [Y], by doing [Z]*
- **Example**: *"Engineered automated data pipelines using Python, reducing processing latency by 45% and saving 12 developer hours weekly."*

**Key Verbs to Use**:
- *Engineering/Tech*: Spearheaded, Architected, Refactored, Deployed, Automated.
- *Product/Management*: Scaled, Accelerated, Streamlined, Orchestrated, Increased.

💡 **Try this**: Share 1 bullet point from your experience, and I will rewrite it into 3 polished ATS-friendly versions for you!`;
  }

  // 2. ATS Formatting & Keywords
  if (lowerMsg.includes('ats') || lowerMsg.includes('format') || lowerMsg.includes('template') || lowerMsg.includes('scanner')) {
    return `### 🤖 ATS (Applicant Tracking System) Optimization Checklist

Here is how to ensure your resume passes automated ATS scanners:

1. **File Format**: Use clean, standard \`.pdf\` or \`.docx\` without text boxes, tables, or complex graphic elements.
2. **Standard Section Headers**: Use exact headings: \`Work Experience\`, \`Skills\`, \`Projects\`, \`Education\`.
3. **Keyword Matching**: Tailor skills to match the exact terms in the Job Description (e.g. if the JD asks for *"React.js"*, don't just write *"Frontend"*).
4. **Font & Styling**: Stick to clean typography (Arial, Inter, Calibri) between 10pt and 12pt.

💡 **Quick Question**: What target job title (e.g., Frontend Developer, Data Analyst) are you applying for?`;
  }

  // 3. General Resume Improvement (when user asks "how can i improve my resume")
  if (lowerMsg.includes('improve') || lowerMsg.includes('make better') || lowerMsg.includes('review') || lowerMsg.includes('resume')) {
    return `### 📄 4-Step Master Plan to Improve Your Resume

Regarding your query (*"${msg}"*), here are the top 4 structural improvements:

1. **Top 1/3 Impact Header**: Place a 2-line professional summary highlighting your core tech stack, years of experience, and primary achievement.
2. **Prioritize Impact Over Duties**: Don't list daily responsibilities. Show **results** (e.g. percentages, dollars saved, users impacted).
3. **Technical Skills Grouping**: Categorize skills by type:
   - **Languages**: *JavaScript, TypeScript, Python*
   - **Frameworks & Tools**: *React, Node.js, Express, Git, Docker*
4. **Project Highlights**: Include 2-3 key projects with live demo links and GitHub links.

💡 **Next Step**: Paste your current Summary section or a project description, and I'll give you instant feedback!`;
  }

  // 4. Interview prep / STAR method questions
  if (lowerMsg.includes('interview') || lowerMsg.includes('star') || lowerMsg.includes('question') || lowerMsg.includes('prepare')) {
    return `### 🎯 STAR Interview Framework Strategy

To answer behavioral interview questions effectively:

- **S (Situation)**: Set the scene in 2 sentences.
- **T (Task)**: Explain your explicit responsibility or problem.
- **A (Action)**: Highlight the exact technical steps YOU executed (60% of your answer).
- **R (Result)**: Quantify the positive outcome or key business takeaway.

**Top Technical Interview Questions**:
1. *"Tell me about a technical bottleneck you encountered and how you solved it."*
2. *"How do you handle scope changes or tight deadlines?"*

💡 Would you like to conduct a 3-question Mock Interview right now? Just say **"Start Mock Interview"**!`;
  }

  // 5. Salary / Negotiation
  if (lowerMsg.includes('salary') || lowerMsg.includes('negotiat') || lowerMsg.includes('offer') || lowerMsg.includes('pay')) {
    return `### 💰 Salary & Offer Negotiation Guide

Here is how to maximize your offer during salary discussions:

1. **Delay Giving Exact Numbers First**: Response: *"I'm focused on finding the right mutual fit. I'd love to learn more about the role requirements before discussing compensation."*
2. **Benchmark Market Rates**: Research compensation ranges on Levels.fyi, Glassdoor, and LinkedIn Salary.
3. **Negotiate Beyond Base Pay**: Include signing bonus, equity/stock options, annual review cycles, and remote work flexibility.

💡 **Need a script?** Tell me your target role and country/location, and I'll write a custom negotiation email script for you!`;
  }

  // 6. Skill Upgrades & Transition
  if (lowerMsg.includes('skill') || lowerMsg.includes('transition') || lowerMsg.includes('roadmap') || lowerMsg.includes('learn')) {
    return `### 🚀 High-Growth Career Roadmap

To address your goal (*"${msg}"*):

1. **Target Stack**: Pick 1 primary domain (e.g., Full-Stack Web Dev, Cloud DevOps, AI Engineering).
2. **Build Portfolio Proof**: Build 2 complete, production-ready apps with authentication, database design, and automated testing.
3. **Open Source & Community**: Contribute small PRs to active open source repos or document your learning journey on LinkedIn/GitHub.

💡 **What domain or technology stack are you most interested in exploring next?**`;
  }

  // 7. Generic Conversational Fallback (Echoes user query specifically)
  return `### 💼 CareerPulse Advice

You asked: **"${msg}"**

Here is tailored guidance to help you navigate this:

- **Action Step 1**: Identify your primary goal for this request (e.g., job application, interview prep, skill growth).
- **Action Step 2**: Breakdown complex challenges into actionable weekly targets.
- **Action Step 3**: Track measurable progress and update your professional profiles (LinkedIn/GitHub/Resume) accordingly.

💡 **How would you like to proceed?** Feel free to ask a follow-up or provide more details for deeper analysis!`;
}

module.exports = {
  handleChatMessage
};
