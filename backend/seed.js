import 'dotenv/config';
import mongoose from 'mongoose';
import { seedDatabase } from './seedData.js';

const seed = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Configure it in backend/.env.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const insertedShows = await seedDatabase();

  console.log('TicketNest seed data is ready.');
  if (insertedShows > 0) {
    console.log(`Inserted ${insertedShows} sample shows.`);
  } else {
    console.log('Show catalog already existed; skipped inserting shows.');
  }
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
