import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { registerRoutes } from './routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Socket.io setup
const server = http.createServer(app);
const io = new IOServer(server);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use((req, res, next) => {
  next();
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`TicketNest Backend running on port ${PORT}`));