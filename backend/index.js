import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { registerRoutes } from './routes.js';

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    maxAge: 86400,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'TicketNest Backend',
    timestamp: new Date().toISOString(),
  });
});

const io = new IOServer(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.on('join-show', (showId) => socket.join(showId));
  socket.on('leave-show', (showId) => socket.leave(showId));
});

registerRoutes(app, io);

app.use((err, _req, res, _next) => {
  console.error('TicketNest request failed:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.statusCode ? err.message : 'Internal server error',
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

const start = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Configure it in backend/.env.');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Configure it in backend/.env.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected for TicketNest');

  // Populate the show catalog when deploying against a fresh database so the
  // site is usable immediately. This never creates demo login accounts.
  const { Show } = await import('./models.js');
  if ((await Show.countDocuments()) === 0) {
    const { seedShows } = await import('./seedData.js');
    const inserted = await seedShows();
    console.log(`Populated the empty show catalog with ${inserted} sample shows.`);
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, () => {
    console.log(`TicketNest backend listening on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('TicketNest backend failed to start:', error);
  process.exitCode = 1;
});

export { io, app, server };
