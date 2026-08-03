/**
 * Vercel Serverless Function Entry Point
 * Wraps the Express app for serverless deployment.
 */
const app = require('../backend/server');

module.exports = app;
