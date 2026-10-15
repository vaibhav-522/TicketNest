import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { Booking, Show, User } from './models.js';

const router = express.Router();
let socketServer;
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const issueToken = (user) =>
  jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const setAuthCookie = (res, token) =>
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

const requireAuth = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};

router.post(
  '/auth/register',
  asyncRoute(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
    });
    const token = issueToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ success: true, user: publicUser(user), token });
  })
);

router.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = issueToken(user);
    setAuthCookie(res, token);
    return res.json({ success: true, user: publicUser(user), token });
  })
);

router.get(
  '/auth/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists' });
    }
    return res.json({ success: true, user: publicUser(user) });
  })
);

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res.json({ success: true });
});

router.get(
  '/shows',
  asyncRoute(async (_req, res) => {
    const shows = await Show.find({ isActive: true }).sort({ time: 1 }).lean();
    return res.json({
      success: true,
      shows: shows.map((show) => ({
        ...show,
        id: show._id.toString(),
        availableSeats: show.availableSeats.length,
      })),
    });
  })
);

router.get(
  '/shows/:id',
  asyncRoute(async (req, res) => {
    const show = await Show.findById(req.params.id).lean();
    if (!show || !show.isActive) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }
    return res.json({
      success: true,
      show: { ...show, id: show._id.toString() },
      availableSeats: show.availableSeats,
    });
  })
);

router.post(
  '/bookings',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { showId, seats, paymentId } = req.body;
    if (!Array.isArray(seats) || seats.length === 0 || seats.length > 8) {
      return res.status(400).json({ success: false, message: 'Choose between 1 and 8 seats' });
    }

    const show = await Show.findById(showId);
    if (!show || !show.isActive) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }
    if (new Set(seats).size !== seats.length) {
      return res.status(409).json({ success: false, message: 'One or more seats are unavailable' });
    }

    const reservedShow = await Show.findOneAndUpdate(
      { _id: show._id, isActive: true, availableSeats: { $all: seats } },
      { $pull: { availableSeats: { $in: seats } } },
      { new: true }
    );
    if (!reservedShow) {
      return res.status(409).json({ success: false, message: 'One or more seats are unavailable' });
    }

    let booking;
    try {
      booking = await Booking.create({
        user: req.auth.userId,
        show: reservedShow._id,
        seats,
        totalPrice: seats.length * reservedShow.price,
        paymentId,
      });
    } catch (error) {
      await Show.updateOne(
        { _id: reservedShow._id },
        { $addToSet: { availableSeats: { $each: seats } } }
      );
      throw error;
    }
    socketServer?.emit('booking-confirmed', {
      bookingId: booking._id,
      showId: reservedShow._id,
      seats,
      remainingSeats: reservedShow.availableSeats.length,
    });
    return res.status(201).json({ success: true, booking });
  })
);

router.get(
  '/bookings/user',
  requireAuth,
  asyncRoute(async (req, res) => {
    const bookings = await Booking.find({ user: req.auth.userId })
      .populate('show', 'title theater time')
      .sort({ bookedAt: -1 });
    return res.json({ success: true, bookings });
  })
);

// Stripe is optional. When STRIPE_SECRET_KEY is set we run a real Checkout flow;
// otherwise bookings fall back to the no-payment path used for local development.
const stripeClient = () =>
  process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

const MAX_SEATS_PER_BOOKING = 8;

const parseSeats = (seats) => {
  if (!Array.isArray(seats) || seats.length === 0 || seats.length > MAX_SEATS_PER_BOOKING) {
    return { error: `Choose between 1 and ${MAX_SEATS_PER_BOOKING} seats` };
  }
  const cleaned = seats.map((seat) => String(seat).trim()).filter(Boolean);
  if (cleaned.length !== seats.length || new Set(cleaned).size !== cleaned.length) {
    return { error: 'Duplicate or invalid seats are not allowed' };
  }
  return { seats: cleaned };
};

router.post(
  '/payment/checkout',
  requireAuth,
  asyncRoute(async (req, res) => {
    const stripe = stripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payments are disabled. Configure STRIPE_SECRET_KEY to enable them.',
      });
    }

    const parsed = parseSeats(req.body.seats);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }
    const { seats } = parsed;

    const show = await Show.findById(req.body.showId);
    if (!show || !show.isActive) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    const unavailable = seats.filter((seat) => !show.availableSeats.includes(seat));
    if (unavailable.length) {
      return res.status(409).json({
        success: false,
        message: `These seats are no longer available: ${unavailable.join(', ')}`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `${show.title} — ${seats.length} seat${seats.length > 1 ? 's' : ''}`,
              description: `${show.theater}, ${show.location} • Seats ${seats.join(', ')}`,
            },
            unit_amount: Math.round(show.price * 100),
          },
          quantity: seats.length,
        },
      ],
      metadata: {
        userId: req.auth.userId,
        showId: show._id.toString(),
        seats: seats.join(','),
      },
      success_url: `${clientUrl()}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl()}/booking/${show._id.toString()}?canceled=1`,
    });

    return res.json({ success: true, url: session.url, sessionId: session.id });
  })
);

router.post(
  '/payment/confirm',
  requireAuth,
  asyncRoute(async (req, res) => {
    const stripe = stripeClient();
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payments are disabled. Configure STRIPE_SECRET_KEY to enable them.',
      });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'A checkout session id is required' });
    }

    // Idempotent: the success page may be refreshed after the booking exists.
    const existing = await Booking.findOne({ stripeSessionId: sessionId });
    if (existing) {
      return res.json({ success: true, booking: existing, alreadyConfirmed: true });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ success: false, message: 'This payment has not completed yet.' });
    }

    const meta = session.metadata || {};
    if (meta.userId !== req.auth.userId) {
      return res.status(403).json({ success: false, message: 'This payment belongs to another account.' });
    }

    const seats = String(meta.seats || '')
      .split(',')
      .map((seat) => seat.trim())
      .filter(Boolean);
    if (!seats.length) {
      return res.status(400).json({ success: false, message: 'This payment has no seats attached.' });
    }

    const reservedShow = await Show.findOneAndUpdate(
      { _id: meta.showId, isActive: true, availableSeats: { $all: seats } },
      { $pull: { availableSeats: { $in: seats } } },
      { new: true }
    );

    if (!reservedShow) {
      // Someone else took the seats while the customer was paying: refund automatically.
      let refunded = false;
      try {
        if (session.payment_intent) {
          await stripe.refunds.create({ payment_intent: session.payment_intent });
          refunded = true;
        }
      } catch (error) {
        console.error('Automatic refund failed:', error);
      }
      return res.status(409).json({
        success: false,
        message: refunded
          ? 'Those seats were just taken, so your payment was automatically refunded.'
          : 'Those seats were just taken. Please contact support about your payment.',
      });
    }

    const booking = await Booking.create({
      user: req.auth.userId,
      show: reservedShow._id,
      seats,
      totalPrice: seats.length * reservedShow.price,
      paymentId: session.payment_intent || session.id,
      status: 'confirmed',
      stripeSessionId: sessionId,
    });

    socketServer?.emit('booking-confirmed', {
      bookingId: booking._id,
      showId: reservedShow._id,
      seats,
      remainingSeats: reservedShow.availableSeats.length,
    });

    return res.status(201).json({ success: true, booking });
  })
);

export const setSocketServer = (io) => {
  socketServer = io;
};

export const registerRoutes = (app) => {
  app.use('/api', router);
};
