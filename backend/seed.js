// VannyShow Database Seeder
// Run: node seed.js

const mongoose = require('mongoose');
const faker = require('faker'); // or use your own data

async function seedDatabase() {
  // Clear existing data
  await mongoose.connection.db.dropDatabase();
  console.log('Database cleared');

  // Create categories
  const categories = ['Action', 'Drama', 'Comedy', 'Thriller', 'Drama', 'Family', 'Documentary'];

  // Create users
  const User = mongoose.model('User');
  const users = await User.create([
    {
      name: 'Admin User',
      email: 'admin@vannyshow.com',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'admin',
      isVerified: true,
    },
    {
      name: 'Premium User',
      email: 'premium@vannyshow.com',
      password: 'premium123',
      role: 'user',
      isVerified: true,
    },
    {
      name: 'Regular User',
      email: 'user@vannyshow.com',
      password: 'user123',
      role: 'user',
      isVerified: true,
    },
  ]);

  console.log(`Created ${users.length} users`);

  // Create shows with realistic data
  const Show = mongoose.model('Show');
  const shows = await Show.create([
    {
      title: 'Avatar: The Way of Water',
      theater: 'Grand Cinema Premium',
      location: 'Downtown Theater Complex',
      time: new Date('2024-01-15T17:00:00'),
      price: 250,
      totalSeats: 100,
      category: 'Action',
      rating: 8.7,
      image: '/images/avatar.jpg',
    },
    {
      title: 'Pathaan',
      theater: 'INOX Multiplex',
      location: 'City Center',
      time: new Date('2024-01-15T19:30:00'),
      price: 300,
      totalSeats: 80,
      category: 'Action',
      rating: 7.5,
      image: '/images/pathaan.jpg',
    },
    {
      title: 'The Kashmir Files',
      theater: 'PVR Cinemas',
      location: 'MG Road',
      time: new Date('2024-01-16T16:00:00'),
      price: 200,
      totalSeats: 120,
      category: 'Drama',
      rating: 6.8,
      image: '/images/kashmir.jpg',
    },
    {
      title: 'Top Gun: Maverick',
      theater: 'IMAX Theatre',
      location: 'Airport Center',
      time: new Date('2024-01-16T18:30:00'),
      price: 350,
      totalSeats: 90,
      category: 'Action',
      rating: 8.3,
      image: '/images/topgun.jpg',
    },
    {
      title: 'RRR',
      theater: 'PVR Cinemas',
      location: 'Civil Lines',
      time: new Date('2024-01-17T20:00:00'),
      price: 280,
      totalSeats: 70,
      category: 'Action',
      rating: 8.1,
      image: '/images/rr.jpg',
    },
    {
      title: 'Brahmastra',
      theater: ' multiplex',
      location: 'South City',
      time: new Date('2024-01-18T17:00:00'),
      price: 320,
      totalSeats: 60,
      category: 'Sci-Fi',
      rating: 6.5,
      image: '/images/brahmastra.jpg',
    },
    {
      title: 'Gangubai Kathiawadi',
      theater: 'NG Cinema',
      location: 'Fort Area',
      time: new Date('2024-01-18T20:00:00'),
      price: 220,
      totalSeats: 110,
      category: 'Drama',
      rating: 7.8,
      image: '/images/gangubai.jpg',
    },
    {
      title: 'The Ferryman',
      theater: 'Prithvi Theatre',
      location: 'Juhu',
      time: new Date('2024-01-19T19:00:00'),
      price: 180,
      totalSeats: 50,
      category: 'Drama',
      rating: 9.0,
      image: '/images/theater.jpg',
    },
  ]);

  console.log(`Created ${shows.length} shows`);
  console.log('Sample login credentials:');
  console.log('Admin: admin@vannyshow.com / admin123');
  console.log('User: user@vannyshow.com / user123');
  console.log('Premium: premium@vannyshow.com / premium123');
  process.exit();
}

seedDatabase();