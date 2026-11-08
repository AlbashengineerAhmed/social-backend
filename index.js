/**
 * @fileoverview Application Entry Point
 * @module index
 * @description Loads environment configurations from .env.dev first, initializes Express application,
 * starts HTTP server with Socket.io listening on the configured PORT.
 */

import path from 'node:path';
import http from 'node:http';
import * as dotenv from 'dotenv';
import express from 'express';

// 1. Load environment configuration (.env or src/config/.env.dev)
dotenv.config();
dotenv.config({ path: path.resolve('./src/config/.env.dev') });

// 2. Dynamically import modules only after environment variables are loaded into process.env
const { default: bootstrap } = await import('./src/app.controller.js');
const { initSocket } = await import('./src/socket.js');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// Initialize middlewares, routes, and database connections
bootstrap(app, express);

// Initialize Socket.io real-time engine
export const io = initSocket(server);

// Start listening for incoming connections
if (!process.env.VERCEL) {
  server.listen(port, () => console.log(`Social Backend listening on port ${port} with Socket.IO enabled!`));
}

export default app;
