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
        // Attempt AI API call using Gemini or standard fetch endpoint if configured
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${CAREER_ASSISTANT_SYSTEM_PROMPT}\n\nUser Context Topic: ${topic}\n\nUser Question: ${trimmedMessage}` }] }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
function generateSmartCareerResponse(userMessage, topic) {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.includes('resume') || lowerMsg.includes('cv') || topic === 'resume') {
    return `### 📄 High-Impact Resume Optimization Tips

Here is how you can make your resume stand out to top recruiters and ATS (Applicant Tracking Systems):

1. **Quantify Achievements**: Use the **Google XYZ formula**: *"Accomplished [X] as measured by [Y], by doing [Z]"* (e.g., *"Increased user signups by 35% in 3 months by redesigning onboarding flow"*).
2. **Tailor Keywords**: Match core keywords from the target Job Description into your Skills and Work Experience sections.
3. **Keep Format Clean**: Use single-column layouts with clear section headers (\`Experience\`, \`Skills\`, \`Projects\`, \`Education\`).
4. **Action Verbs First**: Start every bullet point with strong verbs like *Spearheaded, Optimized, Engineered, Delivered, Redesigned*.

💡 **Next Step**: Would you like me to review a specific bullet point from your resume or suggest target keywords for your industry?`;
  }

  if (lowerMsg.includes('interview') || lowerMsg.includes('mock') || topic === 'interview') {
    return `### 🎯 Interview Preparation Strategy & STAR Framework

Mastering interview responses requires clear structure and confidence!

- **Use the STAR Method**:
  - **S**ituation: Set the scene & context.
  - **T**ask: Explain your specific responsibility.
  - **A**ction: Detail the exact steps YOU took.
  - **R**esult: Highlight outcomes, metrics, and key takeaways.

- **Top 3 Core Questions to Prepare**:
  1. *"Tell me about a time you solved a complex problem under tight deadlines."*
  2. *"How do you handle disagreement with team members or stakeholders?"*
  3. *"Why do you want to join our team specifically?"*

💡 **Next Step**: Type a common interview question you are preparing for, and we can practice a mock response together!`;
  }

  if (lowerMsg.includes('skill') || lowerMsg.includes('roadmap') || lowerMsg.includes('learn') || topic === 'skills') {
    return `### 🚀 Career Skill Upgrade & Learning Roadmap

Building in-demand skills will accelerate your career trajectory:

1. **Core Technical/Role Mastery**: Focus on depth over breadth. Master the core framework or domain methodology first.
2. **AI & Automation Literacy**: Learn prompt engineering, workflow automation, and how to leverage AI tools to double your efficiency.
3. **Soft Skills & Communication**: Technical skills get you interviewed; communication & leadership get you promoted.
4. **Build Public Proof**: Create real-world case studies, GitHub repositories, or articles showing your knowledge in action.

💡 **Next Step**: What specific field (e.g., Software Engineering, Data Science, Product Management, Marketing) are you currently targeting?`;
  }

  return `### 💼 Hello! I'm CareerPulse, your AI Career Assistant

I can help you accelerate your professional journey with personalized guidance on:

- 📄 **Resume & LinkedIn Profile Optimization**
- 🎯 **Mock Interviews & STAR Technique Coaching**
- 🗺️ **Career Transition & Skill Roadmaps**
- 💡 **Salary Negotiation & Job Search Strategy**

How can I assist your career goals today? Feel free to ask a specific question or choose one of the topics above!`;
}

module.exports = {
  handleChatMessage
};
