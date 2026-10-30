/**
 * Chat Controller for Career Assistant
 * Handles incoming chat requests, builds career-tailored system context,
 * and formats structured responses.
 *
 * DB persistence: when conv_id + session headers are provided, the user
 * message and assistant reply are saved in one atomic transaction BEFORE
 * the response is sent. A DB failure returns saved:false but never blocks
 * the AI response from reaching the client.
 */
const crypto = require('crypto');
const { pool } = require('../db');
const { UUID_V4_REGEX, SESSION_ID_REGEX, HEX64_REGEX } = require('../middleware/sessionAuth');

const MAX_MESSAGE_LEN = 20000;

/**
 * Hash a secret string with SHA-256 (same as sessionAuth).
 */
function hashSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

// ---------------------------------------------------------------------------
// Gemini API Configuration
// ---------------------------------------------------------------------------

// Verified stable model names (Google AI docs — ai.google.dev/gemini-api/docs/models/gemini)
// Primary:  gemini-3.8-flash — newest stable Flash model (Gemini 3, GA)
// Fallback: gemini-3.6-flash — previous-generation stable Flash model (Gemini 3, GA)
// Note: Free tier has limited quota (20 requests/day for gemini-3.8-flash)
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash'];
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_TIMEOUT_MS = 60000;   // 60 s per attempt (increased from 15s)
const GEMINI_MAX_RETRIES = 3;      // per model (applies to 429 / 503 / timeout only)

/**
 * Generate random jitter for exponential backoff (±25% of base delay).
 * Prevents thundering herd when multiple requests retry simultaneously.
 *
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @returns {number} - Delay with jitter applied
 */
function getJitteredDelay(baseDelayMs) {
  const jitterFactor = 0.25; // ±25% jitter
  const jitter = (Math.random() * 2 - 1) * baseDelayMs * jitterFactor;
  return Math.max(0, baseDelayMs + jitter);
}

/**
 * Build request body for Gemini API with system instruction.
 *
 * @param {string} modelName - Model name
 * @param {Array} contents - Conversation contents
 * @param {string} systemPrompt - System instruction text
 * @returns {Object} - Request body
 */
function buildRequestBody(modelName, contents, systemPrompt) {
  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents
  };

  return body;
}

/**
 * Call the Gemini generateContent REST API with exponential backoff and jitter.
 * Retries only on transient errors (HTTP 429, 503, timeout).
 * Times out each attempt after GEMINI_TIMEOUT_MS (60s).
 *
 * @param {string} modelName  - e.g. 'gemini-3.8-flash'
 * @param {string} apiKey
 * @param {Array}  contents   - Gemini contents array
 * @returns {string|null}     - reply text, or null on permanent failure
 */
async function callGeminiWithRetry(modelName, apiKey, contents, systemPrompt) {
  const url = `${GEMINI_BASE_URL}/${modelName}:generateContent`;
  const requestBody = buildRequestBody(modelName, contents, systemPrompt);

  console.log(`[Gemini] Requesting ${modelName} with ${contents.length} content turns, system prompt length: ${systemPrompt.length} chars`);

  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      console.log(`[Gemini] Attempt ${attempt + 1}/${GEMINI_MAX_RETRIES} for ${modelName}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[Gemini] ${modelName}: successful response (${text.length} chars) on attempt ${attempt + 1}/${GEMINI_MAX_RETRIES}`);
          return text;
        }
        // Empty candidate — treat as soft failure, try next model
        console.warn(`[Gemini] ${modelName}: empty candidate on attempt ${attempt + 1}/${GEMINI_MAX_RETRIES}`, JSON.stringify(data).substring(0, 200));
        return null;
      }

      const status = response.status;
      const errData = await response.json().catch(() => ({}));
      const errCode = errData?.error?.code;
      const errMsg = errData?.error?.message || response.statusText;
      const errStatus = errData?.error?.status;
      console.log(`[Gemini] ${modelName}: HTTP ${status} response, error code: ${errCode || 'N/A'}, status: ${errStatus || 'N/A'}`);

      // Check for quota exhaustion (RESOURCE_EXHAUSTED) - do not retry, bail immediately
      if (status === 429 && errStatus === 'RESOURCE_EXHAUSTED') {
        console.warn(`[Gemini] ${modelName}: Quota exhausted (free tier limit reached). Skipping to next model/fallback.`);
        return null;
      }

      // Retry on transient rate-limit / overload errors with jittered backoff
      if (status === 429 || status === 503) {
        const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        const jitteredDelay = getJitteredDelay(baseDelay);
        console.warn(`[Gemini] ${modelName}: HTTP ${status} (code: ${errCode || 'N/A'}) on attempt ${attempt + 1}/${GEMINI_MAX_RETRIES}. Retrying in ${Math.round(jitteredDelay)}ms...`);
        await new Promise((r) => setTimeout(r, jitteredDelay));
        continue;
      }

      // Permanent error (400, 401, 404, etc.) — log safely and bail
      console.warn(`[Gemini] ${modelName}: permanent error HTTP ${status} (code: ${errCode || 'N/A'}) — ${errMsg}`);
      return null;

    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        // Timeout error - retry with jittered backoff
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitteredDelay = getJitteredDelay(baseDelay);
        console.warn(`[Gemini] ${modelName}: request timed out after ${GEMINI_TIMEOUT_MS}ms on attempt ${attempt + 1}/${GEMINI_MAX_RETRIES}`);
        if (attempt < GEMINI_MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, jitteredDelay));
        }
      } else {
        // Network error - log error type and retry with jittered backoff
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitteredDelay = getJitteredDelay(baseDelay);
        const errType = err.constructor.name;
        console.warn(`[Gemini] ${modelName}: network error (${errType}) — ${err.message} on attempt ${attempt + 1}/${GEMINI_MAX_RETRIES}`);
        if (attempt < GEMINI_MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, jitteredDelay));
        }
      }
    }
  }

  return null;
}


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
    const { message, history = [], topic = 'general', conv_id } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message string is required.'
      });
    }

    if (message.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({
        success: false,
        error: `Message exceeds maximum length of ${MAX_MESSAGE_LEN} characters.`
      });
    }

    const trimmedMessage = message.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // Check if an actual API Key is configured (and not placeholder)
    const hasValidKey = apiKey && apiKey !== 'your_gemini_api_key_here';

    let replyText = '';

    if (hasValidKey) {
      // Build conversation contents array (shared across model attempts)
      const contents = [];

      // Add previous message history (last 6 turns)
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
      contents.push({ role: 'user', parts: [{ text: trimmedMessage }] });

      // System instruction with topic context
      const systemPrompt = `${CAREER_ASSISTANT_SYSTEM_PROMPT}\n\nCurrent User Context Topic: ${topic}`;

      // Try each model in order: gemini-3.8-flash → gemini-3.6-flash
      for (const model of GEMINI_MODELS) {
        try {
          const text = await callGeminiWithRetry(model, apiKey, contents, systemPrompt);
          if (text) {
            replyText = text;
            console.log(`[Gemini] Response from model: ${model}`);
            break;
          }
        } catch (err) {
          console.warn(`[Gemini] ${model} cascade error:`, err.message);
        }
      }

      if (!replyText) {
        console.warn('[Gemini] All models exhausted; using smart career engine fallback.');
      }
    }

    // Fallback/Default Smart Career Engine if API key isn't active yet.
    if (!replyText) {
      replyText = generateSmartCareerResponse(trimmedMessage, topic);
    }

    // --- Persist to DB (transaction-then-respond) ---
    let saved = false;
    if (conv_id && pool) {
      const sessionId = req.headers['x-session-id'];
      const sessionSecret = req.headers['x-session-secret'];

      const headersValid =
        sessionId && SESSION_ID_REGEX.test(sessionId) &&
        sessionSecret && HEX64_REGEX.test(sessionSecret);

      if (headersValid && UUID_V4_REGEX.test(conv_id)) {
        const hashedSecret = hashSecret(sessionSecret);
        let conn;
        try {
          conn = await pool.getConnection();

          // Verify conv_id belongs to this session before writing
          const [ownership] = await conn.execute(
            'SELECT conv_id FROM conversations WHERE conv_id = ? AND session_id = ? LIMIT 1',
            [conv_id, sessionId]
          );

          if (ownership.length > 0) {
            // Also verify session secret matches
            const [sessionRow] = await conn.execute(
              'SELECT session_secret FROM chat_sessions WHERE session_id = ? LIMIT 1',
              [sessionId]
            );

            if (sessionRow.length > 0 && sessionRow[0].session_secret === hashedSecret) {
              await conn.beginTransaction();
              await conn.execute(
                'INSERT INTO messages (conv_id, role, content) VALUES (?, ?, ?)',
                [conv_id, 'user', trimmedMessage]
              );
              await conn.execute(
                'INSERT INTO messages (conv_id, role, content) VALUES (?, ?, ?)',
                [conv_id, 'assistant', replyText]
              );
              await conn.execute(
                'UPDATE conversations SET updated_at = NOW() WHERE conv_id = ?',
                [conv_id]
              );
              await conn.commit();
              saved = true;
            }
          }
        } catch (dbErr) {
          if (conn) {
            try { await conn.rollback(); } catch (_) {}
          }
          // Safe logging: code and sqlState only — never user content or credentials
          console.error('[DB] chat persist error:', dbErr.code, dbErr.sqlState);
        } finally {
          if (conn) conn.release();
        }
      }
    }

    // Response is always sent after the DB attempt (never fire-and-forget)
    return res.status(200).json({
      success: true,
      data: {
        reply: replyText,
        timestamp: new Date().toISOString(),
        topic: topic
      },
      saved
    });

  } catch (error) {
    console.error('Error in chat controller:', error.message);
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
