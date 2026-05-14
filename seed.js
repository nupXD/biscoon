const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/biscoon';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✓ Connected to MongoDB');
}).catch(err => {
  console.error('✗ MongoDB connection error:', err);
  process.exit(1);
});

// ── User Schema ──
const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'users' });

// ── Listing Schema ──
const listingSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4, unique: true, required: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String },
  price: { type: String },
  location: { type: String, index: true },
  contactEmail: { type: String },
  contactPhone: { type: String },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'listings' });

// ── Text Index for full-text search ──
listingSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  location: 'text',
});

const User = mongoose.model('User', userSchema);
const Listing = mongoose.model('Listing', listingSchema);

async function seedData() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Listing.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create sample user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = new User({
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      password: passwordHash,
    });

    await user.save();
    console.log('✓ Sample user created');

    // Create sample listings
    const listings = [
      {
        id: uuidv4(),
        userId: user.id,
        title: 'Senior Software Engineer — Full Stack (React/Node)',
        description: 'Looking for experienced full-stack developer with React and Node.js experience.',
        category: 'jobs',
        subcategory: 'tech',
        price: '$130–160k',
        location: 'Boston, MA',
        contactEmail: 'hr@techcorp.com',
        contactPhone: '',
        images: [],
      },
      {
        id: uuidv4(),
        userId: user.id,
        title: 'Room for rent — Allston, shared 3BR',
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
        title: 'Free PG stay — Cambridge MA, Nepali family',
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
        title: 'Airport rides & local transport — Nepali driver',
        description: 'Reliable transportation service from Boston Logan Airport and local rides.',
        category: 'services',
        subcategory: 'transport',
        price: 'From $35',
        location: 'Boston metro',
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

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();