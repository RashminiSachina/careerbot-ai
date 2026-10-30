const express = require('express');
const router = express.Router();
const { handleChatMessage } = require('../controllers/chatController');
const { testConnection } = require('../db');

// Health check endpoint for chat API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Career Chatbot API is operational',
    timestamp: new Date().toISOString()
  });
});

// Database connectivity health check
router.get('/db-health', async (req, res) => {
  const result = await testConnection();
  const status = result.ok ? 200 : 503;
  res.status(status).json({
    status: result.ok ? 'ok' : 'error',
    latencyMs: result.latencyMs ?? null,
    error: result.error ?? null
  });
});

// POST /api/chat - Process user messages
router.post('/', handleChatMessage);

module.exports = router;
