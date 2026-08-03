const express = require('express');
const router = express.Router();
const { handleChatMessage } = require('../controllers/chatController');

// Health check endpoint for chat API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Career Chatbot API is operational',
    timestamp: new Date().toISOString()
  });
});

// POST /api/chat - Process user messages
router.post('/', handleChatMessage);

module.exports = router;
