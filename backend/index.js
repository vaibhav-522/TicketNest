import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server as IOServer, type Socket } from 'socket.io';
import { registerRoutes } from './routes.js';
import path from 'path';

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => console.log('MongoDB connected for TicketNest'))
  .catch((err) => console.error('DB connection error:', err));

const app = express();
const server = http.createServer(app);

// Socket.io setup with careful configuration
const io = new IOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket: Socket) => {
  console.log(`TicketNest User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`TicketNest User disconnected: ${socket.id}`);
  });

  socket.on('join-show', (showId: string) => {
    socket.join(showId);
    console.log(`User ${socket.id} joined show ${showId}`);
  });

  socket.on('leave-show', (showId: string) => {
    socket.leave(showId);
  });
});

// Apply CORS before other middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    maxAge: 86400,
  })
);

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TicketNest Backend',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: process.uptime(),
  });
});

// API v1 routes
registerRoutes(app);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`TicketNest Error [${req.id}]:`, err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'TicketNest API endpoint not found',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`TicketNest Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export for testing
export { io, app, server };
