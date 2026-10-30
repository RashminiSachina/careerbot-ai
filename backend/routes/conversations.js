/**
 * Conversations Router
 * IMPORTANT: /search must be registered before /:convId to prevent
 * Express treating "search" as a convId parameter.
 */
const express = require('express');
const router = express.Router();
const { sessionAuth } = require('../middleware/sessionAuth');
const {
  createConversation,
  listConversations,
  searchConversations,
  getConversation,
  updateConversationTitle,
  deleteConversation
} = require('../controllers/conversationController');

// All conversation routes require session authentication
router.use(sessionAuth);

// List conversations for session
router.get('/', listConversations);

// Search conversation titles — registered BEFORE /:convId
router.get('/search', searchConversations);

// Get full message history for one conversation
router.get('/:convId', getConversation);

// Create a new conversation (+ session if first time)
router.post('/', createConversation);

// Update conversation title
router.put('/:convId/title', updateConversationTitle);

// Delete conversation (cascades to messages via FK)
router.delete('/:convId', deleteConversation);

module.exports = router;
