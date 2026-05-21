const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const connectDatabaseModule = require('./src/config/database');
const userModule = require('./src/models/User');
const listingModule = require('./src/models/Listing');
const newsModule = require('./src/models/News');
const auditLogModule = require('./src/models/AdminAuditLog');
const { createUniqueNewsSlug } = require('./src/utils/news');

const connectDatabase = connectDatabaseModule.default || connectDatabaseModule;
const User = userModule.default || userModule;
const Listing = listingModule.default || listingModule;
const News = newsModule.default || newsModule;
const AdminAuditLog = auditLogModule.default || auditLogModule;

async function seedData() {
  try {
    await connectDatabase();
    console.log('✓ Connected to MongoDB');

    // Never wipe real user accounts. Only reset if the DB is completely empty.
    const existingUsers = await User.countDocuments();
    const isBlankSlate = existingUsers === 0;

    if (!isBlankSlate) {
      console.log(`ℹ ${existingUsers} existing user(s) found — skipping destructive reset.`);
      console.log('  Running in additive mode: only missing seed data will be inserted.\n');
    }

    // ── Admin account (upsert — never duplicated) ──────────────────────────
    const adminEmail = 'admin@biscoon.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const adminHash = await bcrypt.hash('admin123', 10);
      await new User({
        id: uuidv4(),
        name: 'Super Admin',
        email: adminEmail,
        password: adminHash,
        role: 'super-admin',
        emailVerified: true,
      }).save();
      console.log('✓ Super admin created  (admin@biscoon.com / admin123)');
    } else {
      console.log('✓ Super admin already exists — skipped');
    }

    // ── Sample regular user (only on blank-slate run) ──────────────────────
    let sampleUserId;
    const existingSample = await User.findOne({ email: 'john@example.com' });
    if (!existingSample) {
      sampleUserId = uuidv4();
      const passwordHash = await bcrypt.hash('password123', 10);
      await new User({
        id: sampleUserId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        password: passwordHash,
        emailVerified: true,
      }).save();
      console.log('✓ Sample user created  (john@example.com / password123)');
    } else {
      sampleUserId = existingSample.id;
      console.log('✓ Sample user already exists — skipped');
    }

    // ── Sample listings (only on first run — never re-insert deleted items) ─
    const existingListings = await Listing.countDocuments();
    if (existingListings > 0) {
      console.log(`ℹ ${existingListings} listing(s) already exist — skipping listing seed.`);
    }
    const SAMPLE_LISTINGS = existingListings > 0 ? [] : [
      {
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
      {
        title: 'Homemade Momo – Nepali dumplings, fresh daily',
        description: 'Authentic Nepali momo (dumplings) made fresh every day. Chicken, vegetable, and buff momo available. Catering and bulk orders welcome. Best momo in Boston!',
        category: 'services',
        subcategory: 'food',
        tags: ['momo', 'nepali food', 'dumplings', 'catering', 'homemade'],
        price: '$12/dozen',
        location: 'Somerville, MA',
        contactEmail: 'momolover@example.com',
        contactPhone: '555-9001',
        images: [],
      },
      {
        title: 'Nepali Restaurant – Momo, Chowmein, Dal Bhat',
        description: 'Family-run Nepali restaurant serving authentic dishes: steamed and fried momo, chowmein, thukpa, dal bhat, and more. Dine-in and takeout available.',
        category: 'services',
        subcategory: 'restaurant',
        tags: ['momo', 'nepali restaurant', 'dal bhat', 'chowmein', 'thukpa'],
        price: 'Menu $8–$18',
        location: 'Cambridge, MA',
        contactEmail: 'restaurant@example.com',
        contactPhone: '617-555-2200',
        images: [],
      },
      {
        title: 'Nepali Cooking Classes – Learn momo, sel roti & more',
        description: 'Join our hands-on Nepali cooking classes. Learn to make momo from scratch, sel roti, gundruk soup, and other traditional Nepali dishes. Small groups, fun atmosphere.',
        category: 'education',
        subcategory: 'cooking',
        tags: ['momo', 'cooking class', 'nepali food', 'sel roti', 'hands-on'],
        price: '$40/session',
        location: 'Jamaica Plain, MA',
        contactEmail: 'cookingclass@example.com',
        contactPhone: '',
        images: [],
      },
    ];

    for (const listingData of SAMPLE_LISTINGS) {
      await new Listing({ id: uuidv4(), userId: sampleUserId, ...listingData }).save();
      console.log(`✓ Listing created: "${listingData.title}"`);
    }

    // ── Sample news (only on first run — never re-insert deleted stories) ──
    const admin = await User.findOne({ email: adminEmail });
    const existingNews = await News.countDocuments();
    if (existingNews > 0) {
      console.log(`ℹ ${existingNews} news story(s) already exist — skipping news seed.`);
    }
    const NEWS_STORIES = existingNews > 0 ? [] : [
      {
        title: 'Nepali community groups expand newcomer support across Boston',
        summary: 'Local volunteers are coordinating housing guidance, job referrals, and language support for newly arrived Nepali families.',
        body: 'Community organizers in Greater Boston say demand for newcomer support has grown steadily this year.\n\nThe volunteer network is focusing on practical help: finding rooms, understanding transit, connecting families with legal clinics, and sharing verified job leads.',
        category: 'community',
        featured: true,
      },
      {
        title: 'Small Nepali-owned businesses find new customers through digital marketplaces',
        summary: 'Restaurants, salons, tutors, and service providers are using community platforms to reach diaspora customers more directly.',
        body: 'Nepali-owned small businesses across the United States are leaning into digital discovery as community buying habits shift online.\n\nOwners say local visibility matters as much as paid advertising, especially when customers want trusted recommendations from within the community.',
        category: 'business',
      },
      {
        title: 'Students prepare for summer housing moves near major US campuses',
        summary: 'With semester changes approaching, student groups are sharing room leads, furniture exchanges, and moving help.',
        body: 'Nepali student groups near large US campuses are preparing for another busy summer moving season.\n\nMost demand is concentrated around shared apartments, short-term sublets, used furniture, and airport pickup coordination for incoming students.',
        category: 'usa',
      },
    ];

    for (const story of NEWS_STORIES) {
      await new News({
        ...story,
        slug: await createUniqueNewsSlug(story.title),
        status: 'published',
        sourceName: 'Biscoon Newsroom',
        authorName: 'Biscoon Desk',
        createdBy: admin.id,
        publishedAt: new Date(),
      }).save();
      console.log(`✓ News story created: "${story.title}"`);
    }

    console.log('\nSeed complete. No existing user accounts were touched.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
