import express from 'express';
import { getSeeder } from './seed.js';

const router = express.Router();
const seeder = getSeeder();

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Public auth routes
router.post('/auth/register', async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required (name, email, password)',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }
    // Check if user exists
    const User = mongoose.model('User');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered. Please login instead.',
      });
    }
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',
    });
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    return res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
      message: 'VannyShow account created successfully! Welcome aboard.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
});

router.post('/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }
    const User = mongoose.model('User');
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
      });
    }
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    // Remove password from user object
    const userResponse = user.toObject();
    delete userResponse.password;
    return res.status(200).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
      message: 'Welcome back to VannyShow!',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Login failed. Please try again later.',
    });
  }
});

// Logout - clear cookie
router.get('/auth/logout', (req: any, res: any) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  return res.json({
    success: true,
    message: 'You have been logged out successfully. Come back soon!',
  });
});

// Get current user (protected - will be middleware-wrapped)
router.get('/auth/me', async (req: any, res: any) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user?.userId).select(
      '-password -__v'
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    return res.json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    });
  }
});

// ==========================================
// SHOWS / EVENTS ROUTES
// ==========================================

// Get all shows/events (public)
router.get('/shows', async (req: any, res: any) => {
  try {
    const Show = mongoose.model('Show');
    const shows = await Show.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({
      success: true,
      count: shows.length,
      data: shows,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch shows',
    });
  }
});

// Get single show (public)
router.get('/shows/:id', async (req: any, res: any) => {
  try {
    const Show = mongoose.model('Show');
    const show = await Show.findById(req.params.id);
    if (!show) {
      return res.status(404).json({
        success: false,
        error: 'Show not found',
      });
    }
    return res.json({
      success: true,
      data: show,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch show details',
    });
  }
});

// Admin: Create show
router.post('/admin/shows', async (req: any, res: any) => {
  try {
    const { title, theater, location, time, price, totalSeats, category } =
      req.body;
    if (
      !title ||
      !theater ||
      !location ||
      !time ||
      price == null ||
      !totalSeats
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields: title, theater, location, time, price, totalSeats',
      });
    }
    const Show = mongoose.model('Show');
    const show = await Show.create({
      title,
      theater,
      location,
      time: new Date(time),
      price: Number(price),
      totalSeats,
      availableSeats: generateSeatArray(Number(totalSeats)),
      isActive: true,
      category: category || 'movie',
      createdAt: new Date(),
    });
    return res.status(201).json({
      success: true,
      data: show,
      message: 'Show added to VannyShow successfully!',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create show',
    });
  }
});

// Admin: Update show
router.put('/admin/shows/:id', async (req: any, res: any) => {
  try {
    const { title, theater, location, time, price, totalSeats, category, isActive } =
      req.body;
    const Show = mongoose.model('Show');
    const show = await Show.findByIdAndUpdate(
      req.params.id,
      {
        title,
        theater,
        location,
        time: time ? new Date(time) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        totalSeats,
        availableSeats: totalSeats
          ? generateSeatArray(Number(totalSeats))
          : undefined,
        isActive,
        category,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
    if (!show) {
      return res.status(404).json({
        success: false,
        error: 'Show not found',
      });
    }
    return res.json({
      success: true,
      data: show,
      message: 'Show updated successfully on VannyShow!',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update show',
    });
  }
});

// Admin: Delete show (soft delete - toggle active)
router.delete('/admin/shows/:id', async (req: any, res: any) => {
  try {
    const Show = mongoose.model('Show');
    const show = await Show.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    if (!show) {
      return res.status(404).json({
        success: false,
        error: 'Show not found',
      });
    }
    return res.json({
      success: true,
      data: show,
      message: 'Show removed from VannyShow listings.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to remove show',
    });
  }
});

// ==========================================
// BOOKING ROUTES
// ==========================================

// Create booking (protected)
router.post('/bookings', async (req: any, res: any) => {
  try {
    const { showId, seats, paymentId } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login first.',
      });
    }
    if (!showId || !seats || seats.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Show ID and at least one seat are required',
      });
    }
    if (seats.length > 8) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 8 seats can be booked at once on VannyShow',
      });
    }
    
    const Show = mongoose.model('Show');
    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({
        success: false,
        error: 'Show not found',
      });
    }
    
    // Validate seats are available
    const selectedSeats = Array.isArray(seats) ? seats : [seats];
    const invalidSeats = selectedSeats.filter(
      (seat: string) => !show.availableSeats.includes(seat)
    );
    if (invalidSeats.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Seats not available: ${invalidSeats.join(', ')}. Please choose available seats.`,
        availableCount: show.availableSeats.length,
      });
    }
    
    // Calculate price
    const pricePerSeat = show.price;
    const totalPrice = selectedSeats.length * pricePerSeat;
    
    // Create booking
    const Booking = mongoose.model('Booking');
    const booking = await Booking.create({
      user: userId,
      show: showId,
      seats: selectedSeats,
      totalPrice,
      status: 'confirmed',
      paymentId,
      bookedAt: new Date(),
    });
    
    // Update show available seats
    show.availableSeats = show.availableSeats.filter(
      (seat: string) => !selectedSeats.includes(seat)
    );
    if (show.availableSeats.length === 0) {
      show.isActive = false;
    }
    await show.save();
    
    // Emit real-time update
    io.emit('booking-confirmed', {
      bookingId: booking._id,
      showId: show._id,
      seats: selectedSeats,
      totalPrice,
      remainingSeats: show.availableSeats.length,
    });
    
    return res.status(201).json({
      success: true,
      data: {
        booking: {
          id: booking._id,
          seats: booking.seats,
          totalPrice: booking.totalPrice,
          status: booking.status,
          bookedAt: booking.bookedAt,
        },
        remainingSeats: show.availableSeats.length,
      },
      message: 'Booking confirmed on VannyShow! Your seats are reserved.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Booking failed. Please try again.',
    });
  }
});

// Get user bookings (protected)
router.get('/bookings/user', async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    const Booking = mongoose.model('Booking');
    const bookings = await Booking.find({ user: userId })
      .populate('show', 'title theater price')
      .sort({ bookedAt: -1 })
      .limit(20);
    return res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch booking history',
    });
  }
});

// Get all bookings (admin only)
router.get('/admin/bookings', async (req: any, res: any) => {
  try {
    const Admin = mongoose.model('Admin');
    // Check admin - simple check for now
    const Booking = mongoose.model('Booking');
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('show', 'title theater')
      .sort({ bookedAt: -1 })
      .limit(100);
    return res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
    });
  }
});

// Cancel booking (protected)
router.put('/bookings/:id/cancel', async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    const bookingId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }
    
    // Check ownership or admin
    if (booking.user.toString() !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only cancel your own bookings',
      });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Release seats back to show
    const Show = mongoose.model('Show');
    const show = await Show.findById(booking.show);
    if (show) {
      booking.seats.forEach((seat: string) => {
        if (!show.availableSeats.includes(seat)) {
          show.availableSeats.push(seat);
        }
      });
      // Remove duplicates
      show.availableSeats = [...new Set(show.availableSeats)];
      // Reactivate if seats available
      if (show.availableSeats.length > 0) {
        show.isActive = true;
      }
      await show.save();
      
      // Emit real-time update
      io.emit('seats-released', {
        showId: show._id,
        seats: booking.seats,
        remainingSeats: show.availableSeats.length,
      });
    }
    
    return res.json({
      success: true,
      data: {
        booking: {
          id: booking._id,
          status: booking.status,
          seats: booking.seats,
        },
        remainingSeats: show.availableSeats.length,
      },
      message: 'Booking cancelled on VannyShow. Seats have been released.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel booking',
    });
  }
});

// ==========================================
// USER PROFILE ROUTES
// ==========================================

// Update user profile (protected)
router.put('/user/profile', async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    const { name, phone, ...updateData } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const User = mongoose.model('User');
    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    return res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully on VannyShow!',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

// ==========================================
// SEARCH & FILTER ROUTES
// ==========================================

// Search shows
router.get('/search', async (req: any, res: any) => {
  try {
    const { query, genre, language, dateMin, dateMax } = req.query;
    const Show = mongoose.model('Show');
    
    const filter: any = { isActive: true };
    
    if (query) {
      filter.$or = [
        { title: { $regex: query as string, $options: 'i' } },
        { theater: { $regex: query as string, $options: 'i' } },
      ];
    }
    if (genre) filter.category = genre;
    if (language) filter.language = language;
    if (dateMin || dateMax) {
      filter.time = {};
      if (dateMin) filter.time.$gte = new Date(dateMin as string);
      if (dateMax) filter.time.$lte = new Date(dateMax as string);
    }
    
    const shows = await Show.find(filter).sort({ time: 1 });
    return res.json({
      success: true,
      count: shows.length,
      data: shows,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Generate seat array helper
function generateSeatArray(totalSeats: number): string[] {
  const seats: string[] = [];
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  let count = 0;
  for (let row of rowLabels) {
    for (let col = 1; col <= 10; col++) {
      if (count < totalSeats) {
        seats.push(`${row}${col}`);
        count++;
      } else {
        break;
      }
    }
    if (count >= totalSeats) break;
  }
  return seats;
}

// Export seeder
export { seeder };