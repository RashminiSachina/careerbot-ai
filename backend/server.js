const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const chatRoutes = require('./routes/chat');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev setup flexibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API Routes
app.use('/api/chat', chatRoutes);

// Base root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AI Career Assistant API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/chat/health',
      chat: 'POST /api/chat'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// Start Server with Port Conflict Handling (only in local dev, not on Vercel)
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Career Assistant Backend Server`);
    console.log(`📡 Listening on http://localhost:${PORT}`);
    console.log(`=================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
      console.error(`👉 Solution: Stop the existing Node process using port ${PORT} or change the PORT in your .env file.\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

// Export for Vercel serverless function
module.exports = app;
