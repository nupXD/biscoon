const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const connectDatabase = require('./src/config/database');
const User = require('./src/models/User');
const Listing = require('./src/models/Listing');

async function seedData() {
  try {
    await connectDatabase();
    console.log('✓ Connected to MongoDB');

    await User.deleteMany({});
    await Listing.deleteMany({});
    console.log('✓ Cleared existing data');

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = new User({
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      password: passwordHash,
    });

    const adminHash = await bcrypt.hash('admin123', 10);
    const admin = new User({
      id: uuidv4(),
      name: 'Super Admin',
      email: 'admin@biscoon.com',
      password: adminHash,
      role: 'admin',
    });

    await Promise.all([user.save(), admin.save()]);
    console.log('✓ Sample user created');
    console.log('✓ Admin user created  (admin@biscoon.com / admin123)');

    const listings = [
      {
        id: uuidv4(),
        userId: user.id,
        title: 'Senior Software Engineer - Full Stack (React/Node)',
        description: 'Looking for experienced full-stack developer with React and Node.js experience.',
        category: 'jobs',
        subcategory: 'tech',
        price: '$130-160k',
        location: 'Boston, MA',
        contactEmail: 'hr@techcorp.com',
        contactPhone: '',
        images: [],
      },
      {
        id: uuidv4(),
        userId: user.id,
        title: 'Room for rent - Allston, shared 3BR',
        description: 'Beautiful room available in shared apartment near BU. All utilities included.',
        category: 'housing',
        subcategory: 'room',
        price: '$1,100/mo',
        location: 'Allston, MA',
        contactEmail: 'roommate@example.com',
        contactPhone: '555-1234',
        images: [],
      },
      {
        id: uuidv4(),
        userId: user.id,
        title: 'Free PG stay - Cambridge MA, Nepali family',
        description: 'Free paying guest accommodation for new arrivals. Meals included.',
        category: 'pg',
        subcategory: 'free',
        price: 'FREE',
        location: 'Cambridge, MA',
        contactEmail: 'nepalihost@example.com',
        contactPhone: '',
        images: [],
      },
      {
        id: uuidv4(),
        userId: user.id,
        title: 'Airport rides & local transport - Nepali driver',
        description: 'Reliable transportation service from Boston Logan Airport and local rides.',
        category: 'services',
        subcategory: 'transport',
        price: 'From $35',
        location: 'Boston metro, MA',
        contactEmail: 'driver@example.com',
        contactPhone: '555-5678',
        images: [],
      },
    ];

    for (const listingData of listings) {
      const listing = new Listing(listingData);
      await listing.save();
      console.log(`✓ Listing created: "${listing.title}"`);
    }

    console.log('\nDatabase seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
