import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Show, User } from './models.js';

const makeSeatList = (total) =>
  Array.from(
    { length: total },
    (_, index) => `${String.fromCharCode(65 + Math.floor(index / 10))}${(index % 10) + 1}`
  );

const seed = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Configure it in backend/.env.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const demoUsers = [
    ['Admin User', 'admin@ticketnest.local', 'admin123', 'admin'],
    ['Sample User', 'user@ticketnest.local', 'user123', 'user'],
  ];
  for (const [name, email, password, role] of demoUsers) {
    await User.updateOne(
      { email },
      { $setOnInsert: { name, email, password: await bcrypt.hash(password, 12), role } },
      { upsert: true }
    );
  }

  if ((await Show.countDocuments()) === 0) {
    const samples = [
      ['Avatar: The Way of Water', 'Grand Cinema Premium', 'Downtown Theater', 250, 'Action', 8.7],
      ['Pathaan', 'INOX Multiplex', 'City Center', 300, 'Action', 7.5],
      ['The Kashmir Files', 'PVR Cinemas', 'MG Road', 200, 'Drama', 6.8],
      ['Top Gun: Maverick', 'IMAX Theatre', 'Airport Center', 350, 'Action', 8.3],
    ];
    await Show.insertMany(
      samples.map(([title, theater, location, price, category, rating], index) => ({
        title,
        theater,
        location,
        time: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
        price,
        totalSeats: 60,
        availableSeats: makeSeatList(60),
        category,
        rating,
      }))
    );
  }

  console.log('TicketNest seed data is ready.');
  console.log('Demo admin: admin@ticketnest.local / admin123');
  console.log('Demo user: user@ticketnest.local / user123');
};

seed()
  .catch((error) => {
    console.error('TicketNest seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
