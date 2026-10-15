import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

const showSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    theater: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    time: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: [String], required: true },
    category: { type: String, required: true },
    rating: { type: Number, min: 0, max: 10 },
    image: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seats: { type: [String], required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
    paymentId: String,
    stripeSessionId: { type: String, index: true, sparse: true },
    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Show = mongoose.models.Show || mongoose.model('Show', showSchema);
export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
