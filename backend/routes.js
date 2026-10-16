import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
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

router.get(
  '/bookings/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.auth.userId,
    }).populate('show', 'title theater location time price');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    return res.json({ success: true, booking });
  })
);

// Razorpay powers payments. When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set
// the booking flow takes a real payment; otherwise it falls back to the
// payment-less path used for local development.
const razorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const razorpayRequest = async (path, options = {}) => {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data?.error?.description || 'The payment gateway rejected the request.'
    );
    error.statusCode = 502;
    throw error;
  }
  return data;
};

const createRazorpayOrder = ({ amount, receipt, notes }) =>
  razorpayRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({ amount, currency: 'INR', receipt, notes }),
  });

const fetchRazorpayOrder = (orderId) => razorpayRequest(`/orders/${orderId}`);

const refundRazorpayPayment = (paymentId) =>
  razorpayRequest(`/payments/${paymentId}/refund`, { method: 'POST', body: '{}' });

/**
 * Verify a Razorpay Checkout signature. Razorpay signs the string
 * "order_id|payment_id" with the key secret; our HMAC-SHA256 must match.
 */
const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const provided = Buffer.from(String(signature || ''), 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return provided.length === wanted.length && crypto.timingSafeEqual(provided, wanted);
};

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
    if (!razorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payments are disabled. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
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

    // Razorpay expects the amount in paise (₹1 = 100 paise).
    const order = await createRazorpayOrder({
      amount: seats.length * Math.round(show.price * 100),
      receipt: `tn_${Date.now()}`,
      notes: {
        userId: req.auth.userId,
        showId: show._id.toString(),
        seats: seats.join(','),
      },
    });

    return res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      seats,
      show: {
        id: show._id.toString(),
        title: show.title,
        theater: show.theater,
        location: show.location,
      },
    });
  })
);

router.post(
  '/payment/confirm',
  requireAuth,
  asyncRoute(async (req, res) => {
    if (!razorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payments are disabled. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
    }

    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
    }

    // The signature proves Razorpay processed this payment for this order.
    if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
      return res.status(400).json({ success: false, message: 'We could not verify this payment.' });
    }

    // Idempotent: Razorpay's handler can fire more than once.
    const existing = await Booking.findOne({ paymentOrderId: orderId });
    if (existing) {
      return res.json({ success: true, booking: existing, alreadyConfirmed: true });
    }

    // Read the seats and show back from the order we created (never trust the client).
    const order = await fetchRazorpayOrder(orderId);
    const notes = order.notes || {};
    if (notes.userId !== req.auth.userId) {
      return res.status(403).json({ success: false, message: 'This payment belongs to another account.' });
    }

    const seats = String(notes.seats || '')
      .split(',')
      .map((seat) => seat.trim())
      .filter(Boolean);
    if (!seats.length) {
      return res.status(400).json({ success: false, message: 'This payment has no seats attached.' });
    }

    const reservedShow = await Show.findOneAndUpdate(
      { _id: notes.showId, isActive: true, availableSeats: { $all: seats } },
      { $pull: { availableSeats: { $in: seats } } },
      { new: true }
    );

    if (!reservedShow) {
      // Seats were sold while the customer was paying: refund automatically.
      let refunded = false;
      try {
        await refundRazorpayPayment(paymentId);
        refunded = true;
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
      paymentId,
      status: 'confirmed',
      paymentOrderId: orderId,
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
