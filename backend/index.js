import 'dotenv/config';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as IOServer } from 'socket.io';
import { registerRoutes, setSocketServer } from './routes.js';

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();

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

/**
 * Connect to MongoDB exactly once per running instance. On Vercel the Express
 * app runs as a function, so we connect lazily on the first request and reuse
 * the connection for every request handled by the same instance.
 */
let connectionPromise;
export const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Configure it in backend/.env or the hosting environment.');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required. Configure it in backend/.env or the hosting environment.');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI)
      .then(async () => {
        console.log('MongoDB connected for TicketNest');

        // Populate the show catalog when deploying against a fresh database so
        // the site is usable immediately. This never creates demo accounts.
        const { Show } = await import('./models.js');
        if ((await Show.countDocuments()) === 0) {
          const { seedShows } = await import('./seedData.js');
          const inserted = await seedShows();
          console.log(`Populated the empty show catalog with ${inserted} sample shows.`);
        }
      })
      .catch((error) => {
        // Allow a later request to retry instead of caching a failed attempt.
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
};

app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    return next();
  } catch (error) {
    return next(error);
  }
});

registerRoutes(app);

app.use((err, _req, res, _next) => {
  console.error('TicketNest request failed:', err);

  // Never leak Stripe internals or its auth status to the client.
  if (typeof err?.type === 'string' && err.type.startsWith('Stripe')) {
    return res.status(502).json({
      success: false,
      message: 'Payments are temporarily unavailable. Please try again in a moment.',
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.statusCode ? err.message : 'Internal server error',
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Standalone mode for local development (and any classic Node host). Vercel
// sets VERCEL=1 and drives the app through the default export below instead.
if (!process.env.VERCEL) {
  const server = http.createServer(app);
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
  setSocketServer(io);

  const port = Number(process.env.PORT) || 5000;
  connectDatabase()
    .then(() => {
      server.listen(port, () => {
        console.log(`TicketNest backend listening on http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error('TicketNest backend failed to start:', error);
      process.exitCode = 1;
    });
}

export default app;
