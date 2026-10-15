import bcrypt from 'bcryptjs';
import { Show, User } from './models.js';

export const makeSeatList = (total) =>
  Array.from(
    { length: total },
    (_, index) => `${String.fromCharCode(65 + Math.floor(index / 10))}${(index % 10) + 1}`
  );

const SAMPLE_SHOWS = [
  ['Avatar: The Way of Water', 'Grand Cinema Premium', 'Downtown Theater', 250, 'Action', 8.7],
  ['Pathaan', 'INOX Multiplex', 'City Center', 300, 'Action', 7.5],
  ['The Kashmir Files', 'PVR Cinemas', 'MG Road', 200, 'Drama', 6.8],
  ['Top Gun: Maverick', 'IMAX Theatre', 'Airport Center', 350, 'Action', 8.3],
];

/**
 * Insert the sample show catalog, but only when the database has no shows yet.
 * Returns the number of shows inserted (0 when the catalog already exists).
 */
export const seedShows = async () => {
  if ((await Show.countDocuments()) > 0) {
    return 0;
  }

  await Show.insertMany(
    SAMPLE_SHOWS.map(([title, theater, location, price, category, rating], index) => ({
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

  return SAMPLE_SHOWS.length;
};

/** Create the demo accounts used during local development. */
export const seedDemoUsers = async () => {
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
};

/** Seed shows plus demo users (used by `npm run seed`). */
export const seedDatabase = async () => {
  const insertedShows = await seedShows();
  await seedDemoUsers();
  return insertedShows;
};
