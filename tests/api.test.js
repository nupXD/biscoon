const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Report = require('../src/models/Report');
const Discussion = require('../src/models/Discussion');

let mongo;
let userToken;
let adminToken;

async function registerUser(payload) {
  const res = await request(app).post('/api/auth/register').send(payload);
  expect(res.status).toBe(201);
  return res.body;
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();

  const user = await registerUser({
    name: 'Test User',
    email: 'user@example.com',
    phone: '555-0100',
    password: 'password123',
    confirmPassword: 'password123',
  });
  userToken = user.token;

  const admin = await registerUser({
    name: 'Super Admin User',
    email: 'admin@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  await User.updateOne({ id: admin.user.id }, { role: 'super-admin' });
  const login = await request(app).post('/api/auth/admin/login').send({
    email: 'admin@example.com',
    password: 'password123',
  });
  adminToken = login.body.token;
});

test('health endpoint returns service status', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.service).toBe('biscoon');
  expect(res.body.database).toBe('connected');
});

test('static serving does not expose project internals', async () => {
  const res = await request(app).get('/package.json');
  expect(res.status).toBe(404);
});

test('auth validation rejects invalid registration payloads', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: '',
    email: 'not-an-email',
    password: 'short',
    confirmPassword: 'short',
  });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/email|name|password/i);
});

test('listing creation stores uploaded images as file paths and paginates listings', async () => {
  const image = `data:image/png;base64,${Buffer.from('tiny image').toString('base64')}`;
  const created = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Room available in Queens',
      description: 'Clean room near transit.',
      category: 'housing',
      subcategory: 'room',
      location: 'Queens, NY',
      images: [image],
    });

  expect(created.status).toBe(201);
  expect(created.body.listing.images[0]).toMatch(/^\/uploads\/listings\//);

  const list = await request(app).get('/api/listings?page=1&limit=1');
  expect(list.status).toBe(200);
  expect(list.body.listings).toHaveLength(1);
  expect(list.body.total).toBe(1);
  expect(list.body.page).toBe(1);
});

test('listing categories are canonicalized and legacy aliases still query correctly', async () => {
  const created = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'PG room available',
      description: 'Paying guest space with meals.',
      category: 'pg',
      subcategory: 'paid PG',
      location: 'Somerville, MA',
    });

  expect(created.status).toBe(201);
  expect(created.body.listing.category).toBe('paying-guest');

  const list = await request(app).get('/api/listings?category=paying-guest');
  expect(list.status).toBe(200);
  expect(list.body.listings).toHaveLength(1);
  expect(list.body.listings[0].category).toBe('paying-guest');
});

test('legacy alias query includes older category values', async () => {
  const Listing = require('../src/models/Listing');
  await Listing.create({
    userId: 'legacy-user',
    title: 'Legacy PG listing',
    description: 'Old category value.',
    category: 'pg',
    subcategory: 'free PG',
    location: 'Boston, MA',
  });

  const list = await request(app).get('/api/listings?category=paying-guest');
  expect(list.status).toBe(200);
  expect(list.body.listings).toHaveLength(1);
  expect(list.body.listings[0].category).toBe('pg');
});

test('broad category with specific type can be found from old page category queries', async () => {
  const created = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Tech help needed',
      description: 'Looking for website support.',
      category: 'jobs',
      subcategory: 'tech',
      location: 'Remote, NY',
    });
  expect(created.status).toBe(201);

  const broad = await request(app).get('/api/listings?category=jobs&subcategory=tech');
  expect(broad.status).toBe(200);
  expect(broad.body.listings).toHaveLength(1);

  const legacy = await request(app).get('/api/listings?category=tech');
  expect(legacy.status).toBe(200);
  expect(legacy.body.listings).toHaveLength(1);
});

test('photography listings support photography-specific types', async () => {
  const created = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Dashain evening portraits',
      description: 'A small photo story about warm festival light and family portraits.',
      category: 'photography',
      subcategory: 'portrait',
      tags: ['portrait', 'festival', 'golden light'],
      images: Array.from({ length: 8 }, (_, index) => `https://example.com/photo-${index + 1}.jpg`),
    });

  expect(created.status).toBe(201);
  expect(created.body.listing.category).toBe('photography');
  expect(created.body.listing.subcategory).toBe('portrait');
  expect(created.body.listing.location).toBe('Photography showcase');
  expect(created.body.listing.price).toBe('');
  expect(created.body.listing.contactEmail).toBe('');
  expect(created.body.listing.images).toHaveLength(8);

  const byPage = await request(app).get('/api/listings?category=photography');
  expect(byPage.status).toBe(200);
  expect(byPage.body.listings).toHaveLength(1);

  const byType = await request(app).get('/api/listings?category=photography&subcategory=portrait');
  expect(byType.status).toBe(200);
  expect(byType.body.listings).toHaveLength(1);

  const noPhoto = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Caption only',
      description: 'Photography posts should include actual photos.',
      category: 'photography',
      subcategory: 'street',
    });
  expect(noPhoto.status).toBe(400);
  expect(noPhoto.body.error).toMatch(/photo/i);
});

test('admin APIs require an admin account', async () => {
  const userRes = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', `Bearer ${userToken}`);
  expect(userRes.status).toBe(403);

  const adminRes = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(adminRes.status).toBe(200);
  expect(adminRes.body.users.total).toBe(1);
  expect(adminRes.body.adminUsers.total).toBe(1);
});

test('regular and admin logins are separated by role', async () => {
  const userViaRegularLogin = await request(app).post('/api/auth/login').send({
    email: 'user@example.com',
    password: 'password123',
  });
  expect(userViaRegularLogin.status).toBe(200);
  expect(userViaRegularLogin.body.user.role).toBe('user');

  const adminViaAdminLogin = await request(app).post('/api/auth/admin/login').send({
    email: 'admin@example.com',
    password: 'password123',
  });
  expect(adminViaAdminLogin.status).toBe(200);
  expect(adminViaAdminLogin.body.user.role).toBe('super-admin');

  const adminViaRegularLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'password123',
  });
  expect(adminViaRegularLogin.status).toBe(403);
  expect(adminViaRegularLogin.body.error).toMatch(/Admin Panel/i);

  const userViaAdminLogin = await request(app).post('/api/auth/admin/login').send({
    email: 'user@example.com',
    password: 'password123',
  });
  expect(userViaAdminLogin.status).toBe(403);
  expect(userViaAdminLogin.body.error).toMatch(/admin access/i);
});

test('super admins can create admin users with assigned privileges', async () => {
  const created = await request(app)
    .post('/api/admin/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Listing Manager',
      email: 'listing-manager@example.com',
      password: 'password123',
      permissions: ['listings', 'reports', 'staff'],
    });
  expect(created.status).toBe(201);
  expect(created.body.staff.role).toBe('staff');
  expect(created.body.staff.permissions).toEqual(['listings', 'reports']);

  const regularUsers = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(regularUsers.status).toBe(200);
  expect(regularUsers.body.total).toBe(1);

  const staff = await request(app)
    .get('/api/admin/staff')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(staff.status).toBe(200);
  expect(staff.body.total).toBe(2);
});

test('admin users can only use assigned privileges', async () => {
  const created = await request(app)
    .post('/api/admin/staff')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Listing Manager',
      email: 'listing-manager@example.com',
      password: 'password123',
      permissions: ['listings'],
    });
  expect(created.status).toBe(201);

  const login = await request(app).post('/api/auth/admin/login').send({
    email: 'listing-manager@example.com',
    password: 'password123',
  });
  const staffToken = login.body.token;

  const listings = await request(app)
    .get('/api/admin/listings')
    .set('Authorization', `Bearer ${staffToken}`);
  expect(listings.status).toBe(200);

  const users = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${staffToken}`);
  expect(users.status).toBe(403);

  const createStaff = await request(app)
    .post('/api/admin/staff')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({
      name: 'Another Admin',
      email: 'another-admin@example.com',
      password: 'password123',
      permissions: ['users'],
    });
  expect(createStaff.status).toBe(403);
});

test('admins can create discussion topics from the admin panel API', async () => {
  const created = await request(app)
    .post('/api/admin/discussions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Official community update',
      body: 'Please review the updated community posting guidelines.',
      category: 'community',
      tags: ['official', 'guidelines'],
    });

  expect(created.status).toBe(201);
  expect(created.body.discussion.title).toBe('Official community update');
  expect(created.body.discussion.authorName).toBe('Super Admin User');

  const publicList = await request(app).get('/api/discussions?category=community');
  expect(publicList.status).toBe(200);
  expect(publicList.body.discussions).toHaveLength(1);
  expect(publicList.body.discussions[0].title).toBe('Official community update');

  const saved = await Discussion.findOne({ id: created.body.discussion.id });
  expect(saved.userId).toBeTruthy();
  expect(saved.tags).toEqual(['official', 'guidelines']);
});

test('admins can publish news and drafts stay private', async () => {
  const published = await request(app)
    .post('/api/admin/news')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Nepali community center opens in Queens',
      summary: 'A new community center is bringing services, events, and language classes together.',
      body: 'The center opened this week with support from local volunteers.\n\n**Organizers** say the space will host legal clinics, cultural programs, and youth workshops.\n\n[[media:photo-1]]',
      category: 'community',
      status: 'published',
      featured: true,
      media: [
        {
          id: 'photo-1',
          type: 'image',
          url: 'https://example.com/community-center.jpg',
          caption: 'Community members gather at the opening.',
        },
      ],
    });
  expect(published.status).toBe(201);
  expect(published.body.article.slug).toBe('nepali-community-center-opens-in-queens');

  const draft = await request(app)
    .post('/api/admin/news')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Draft story',
      summary: 'Not public yet.',
      body: 'This story should not appear publicly.',
      category: 'business',
      status: 'draft',
    });
  expect(draft.status).toBe(201);

  const list = await request(app).get('/api/news');
  expect(list.status).toBe(200);
  expect(list.body.news).toHaveLength(1);
  expect(list.body.news[0].title).toBe('Nepali community center opens in Queens');

  const detail = await request(app).get(`/api/news/${published.body.article.slug}`);
  expect(detail.status).toBe(200);
  expect(detail.body.article.body).toMatch(/legal clinics/);
  expect(detail.body.article.media[0].id).toBe('photo-1');

  const draftDetail = await request(app).get(`/api/news/${draft.body.article.slug}`);
  expect(draftDetail.status).toBe(404);
});

test('users can report content and admins can update report status', async () => {
  const created = await request(app)
    .post('/api/moderation/reports')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      targetType: 'listing',
      targetId: 'listing-1',
      reason: 'spam',
      details: 'Looks suspicious.',
    });
  expect(created.status).toBe(201);

  const reports = await request(app)
    .get('/api/admin/reports?status=open')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(reports.status).toBe(200);
  expect(reports.body.reports).toHaveLength(1);

  const updated = await request(app)
    .put(`/api/admin/reports/${reports.body.reports[0].id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'resolved' });
  expect(updated.status).toBe(200);

  const report = await Report.findOne({ id: reports.body.reports[0].id });
  expect(report.status).toBe('resolved');
});
