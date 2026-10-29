process.env.EMAIL_VERIFICATION_REQUIRED = 'false';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const appModule = require('../src/app');
const userModule = require('../src/models/User');
const reportModule = require('../src/models/Report');
const discussionModule = require('../src/models/Discussion');
const limiters = require('../src/middleware/rateLimit');
const Listing = require('../src/models/Listing').default;
const Conversation = require('../src/models/Conversation').default;
const News = require('../src/models/News').default;

const app = appModule.default || appModule;
const User = userModule.default || userModule;
const Report = reportModule.default || reportModule;
const Discussion = discussionModule.default || discussionModule;

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
  Object.values(limiters).forEach(limiter => limiter.reset?.());
  await mongoose.connection.db.dropDatabase();
  await Promise.all([User.createIndexes(), Listing.createIndexes(), Conversation.createIndexes()]);

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

test('email verification and password reset tokens work without exposing hashes', async () => {
  const registered = await registerUser({
    name: 'Verify User',
    email: 'verify@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  expect(registered.verificationToken).toBeTruthy();
  expect(registered.user.emailVerified).toBe(false);
  expect(registered.user.emailVerificationTokenHash).toBeUndefined();

  const verified = await request(app).post('/api/auth/verify-email').send({
    email: 'verify@example.com',
    token: registered.verificationToken,
  });
  expect(verified.status).toBe(200);
  expect(verified.body.user.emailVerified).toBe(true);
  expect(verified.body.user.emailVerificationTokenHash).toBeUndefined();

  const forgot = await request(app).post('/api/auth/forgot-password').send({
    email: 'verify@example.com',
  });
  expect(forgot.status).toBe(200);
  expect(forgot.body.resetToken).toBeTruthy();
  expect(forgot.body.resetUrl).toMatch(/reset-password\.html/);

  const unknown = await request(app).post('/api/auth/forgot-password').send({
    email: 'nobody@example.com',
  });
  expect(unknown.status).toBe(200);
  expect(unknown.body.resetToken).toBeUndefined();

  const resend = await request(app).post('/api/auth/resend-verification').send({
    email: 'nobody@example.com',
  });
  expect(resend.status).toBe(200);
  expect(resend.body.ok).toBe(true);

  const reset = await request(app).post('/api/auth/reset-password').send({
    email: 'verify@example.com',
    token: forgot.body.resetToken,
    password: 'newpassword123',
    confirmPassword: 'newpassword123',
  });
  expect(reset.status).toBe(200);

  const login = await request(app).post('/api/auth/login').send({
    email: 'verify@example.com',
    password: 'newpassword123',
  });
  expect(login.status).toBe(200);
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

test('users can save and unsave listings', async () => {
  const created = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      title: 'Saveable listing',
      description: 'A listing that can be saved for later.',
      category: 'services',
      subcategory: 'handyman',
      location: 'Boston, MA',
    });
  expect(created.status).toBe(201);

  const saved = await request(app)
    .post(`/api/listings/${created.body.listing.id}/save`)
    .set('Authorization', `Bearer ${userToken}`);
  expect(saved.status).toBe(200);
  expect(saved.body.saved).toBe(true);

  const status = await request(app)
    .get(`/api/listings/${created.body.listing.id}/save`)
    .set('Authorization', `Bearer ${userToken}`);
  expect(status.status).toBe(200);
  expect(status.body.saved).toBe(true);

  const list = await request(app)
    .get('/api/listings/saved')
    .set('Authorization', `Bearer ${userToken}`);
  expect(list.status).toBe(200);
  expect(list.body.listings).toHaveLength(1);
  expect(list.body.listings[0].savedByMe).toBe(true);

  const removed = await request(app)
    .delete(`/api/listings/${created.body.listing.id}/save`)
    .set('Authorization', `Bearer ${userToken}`);
  expect(removed.status).toBe(200);
  expect(removed.body.saved).toBe(false);
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
  const listingModule = require('../src/models/Listing');
  const Listing = listingModule.default || listingModule;
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

  const audit = await request(app)
    .get('/api/admin/audit-logs')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(audit.status).toBe(200);
  expect(audit.body.auditLogs.some(log => log.action === 'admin_user.created')).toBe(true);
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

test('latest news orders by publication before pagination and excludes nonpublic stories', async () => {
  const now = Date.now();
  const article = (id, age, extra = {}) => ({
    id, slug: id, title: id, summary: 'News fixture', body: 'News fixture body',
    status: 'published', publishedAt: new Date(now - age), ...extra,
  });
  await News.insertMany([
    article('older-featured', 30000, { featured: true }),
    article('recent', 20000),
    article('latest', 10000),
    article('removed', 1000, { deleted: true }),
    article('draft', 1000, { status: 'draft' }),
    article('scheduled', -86400000),
  ]);

  const first = await request(app).get('/api/news?sort=latest&limit=1');
  expect(first.status).toBe(200);
  expect(first.body.news.map(item => item.id)).toEqual(['latest']);
  expect(first.body.total).toBe(3);
  const second = await request(app).get('/api/news?sort=latest&limit=1&page=2');
  expect(second.body.news.map(item => item.id)).toEqual(['recent']);
  const featured = await request(app).get('/api/news?limit=1');
  expect(featured.body.news[0].id).toBe('older-featured');

  for (const slug of ['removed', 'draft', 'scheduled']) {
    expect((await request(app).get(`/api/news/${slug}`)).status).toBe(404);
  }
  expect((await request(app).get('/api/news/latest')).body.article.id).toBe('latest');
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

test('deleted listings disappear from details, saved items, stats and write endpoints', async () => {
  const created = await request(app).post('/api/listings').set('Authorization', `Bearer ${userToken}`).send({
    title: 'Removal fixture', description: 'Fixture listing', category: 'housing', subcategory: 'room', location: 'Boston',
  });
  expect(created.status).toBe(201);
  const id = created.body.listing.id;
  await request(app).post(`/api/listings/${id}/save`).set('Authorization', `Bearer ${userToken}`);
  expect((await request(app).delete(`/api/listings/${id}`).set('Authorization', `Bearer ${userToken}`)).status).toBe(200);
  expect((await request(app).get(`/api/listings/${id}`)).status).toBe(404);
  expect((await request(app).get(`/api/listings/${id}/save`).set('Authorization', `Bearer ${userToken}`)).status).toBe(404);
  for (const endpoint of ['mine', 'saved']) {
    const result = await request(app).get(`/api/listings/${endpoint}`).set('Authorization', `Bearer ${userToken}`);
    expect(result.body.listings).toEqual([]);
  }
  expect((await request(app).get('/api/listings/stats/summary')).body.total).toBe(0);
  expect((await request(app).put(`/api/listings/${id}`).set('Authorization', `Bearer ${userToken}`).send({ title: 'Changed' })).status).toBe(404);
  expect((await request(app).post(`/api/listings/${id}/comments`).set('Authorization', `Bearer ${userToken}`).send({ body: 'Comment' })).status).toBe(404);
  expect((await request(app).post(`/api/listings/${id}/save`).set('Authorization', `Bearer ${userToken}`)).status).toBe(404);
  expect((await Listing.findOne({ id })).deleted).toBe(true);
});

test('price ordering is numeric, includes older pages and puts unpriced listings last', async () => {
  const prices = ['$2,500/month', '$100', '$15/hour', 'free', 'negotiable'];
  await Listing.insertMany(prices.map((price, index) => ({
    id: `price-${index}`, userId: 'fixture', title: 'Sorting fixture', description: 'Sorting fixture', category: 'jobs',
    subcategory: 'general', location: index === 2 ? 'Boston, MA' : 'Arlington, VA', price, createdAt: new Date(2026, 0, index + 1),
  })));
  const low = await request(app).get('/api/listings?sort=price-low&limit=2&page=1');
  expect(low.status).toBe(200);
  expect(low.body.listings.map(item => item.price)).toEqual(['free', '$15/hour']);
  const next = await request(app).get('/api/listings?sort=price-low&limit=2&page=2');
  expect(next.body.listings.map(item => item.price)).toEqual(['$100', '$2,500/month']);
  const high = await request(app).get('/api/listings?sort=price-high&limit=10');
  expect(high.body.listings.map(item => item.price)).toEqual(['$2,500/month', '$100', '$15/hour', 'free', 'negotiable']);
  const search = await request(app).get('/api/listings?sort=price-low&search=fixture&limit=2');
  expect(search.status).toBe(200);
  expect(search.body.listings.map(item => item.price)).toEqual(['free', '$15/hour']);
  const closest = await request(app).get('/api/listings?sort=closest&near=Boston&limit=1');
  expect(closest.body.listings[0].location).toBe('Boston, MA');
  expect((await request(app).get('/api/listings?sort=unsupported')).status).toBe(400);
});

test('deactivation invalidates an existing user session', async () => {
  const owner = await User.findOne({ email: 'user@example.com' });
  const deleted = await request(app).delete(`/api/admin/users/${owner.id}`).set('Authorization', `Bearer ${adminToken}`);
  expect(deleted.status).toBe(200);
  expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`)).status).toBe(401);
  await User.updateOne({ id: owner.id }, { deleted: false });
  expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`)).status).toBe(401);
});

test('private attachments require membership and cannot be downloaded via uploads', async () => {
  const owner = await User.findOne({ email: 'user@example.com' });
  const buyer = await registerUser({ name: 'Buyer', email: 'buyer@example.com', password: 'password123', confirmPassword: 'password123' });
  const listing = await Listing.create({ userId: owner.id, title: 'Attachment fixture', description: 'Fixture', category: 'housing' });
  const sent = await request(app).post('/api/messages').set('Authorization', `Bearer ${buyer.token}`).send({
    listingId: listing.id, recipientId: owner.id, body: 'Private document',
    attachments: [{ name: 'fixture.txt', mimeType: 'text/plain', data: `data:text/plain;base64,${Buffer.from('private fixture').toString('base64')}` }],
  });
  expect(sent.status).toBe(200);
  const conversation = await Conversation.findOne({ id: sent.body.conversationId });
  const storedPath = conversation.messages[0].attachments[0].data;
  try {
    const thread = await request(app).get(`/api/messages/${conversation.id}`).set('Authorization', `Bearer ${buyer.token}`);
    const downloadPath = thread.body.messages[0].attachments[0].data;
    expect(downloadPath).toMatch(/^\/api\/messages\//);
    expect((await request(app).get(storedPath)).status).toBe(404);
    expect((await request(app).get(storedPath.replace('/messages/', '/%6dessages/'))).status).toBe(404);
    expect((await request(app).get(downloadPath)).status).toBe(401);
    expect((await request(app).get(downloadPath).set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);
    const download = await request(app).get(downloadPath).set('Authorization', `Bearer ${userToken}`);
    expect(download.status).toBe(200);
    expect(download.text).toBe('private fixture');
    expect(download.headers['cache-control']).toBe('private, no-store');
  } finally {
    const fs = require('fs');
    const path = require('path');
    const { STATIC_ROOT } = require('../src/config/env');
    fs.unlinkSync(path.join(STATIC_ROOT, storedPath));
  }
});

test('a full thread continues idempotently and keeps earlier messages available', async () => {
  const owner = await User.findOne({ email: 'user@example.com' });
  const other = await registerUser({ name: 'Other', email: 'other@example.com', password: 'password123', confirmPassword: 'password123' });
  const participantIds = [owner.id, other.user.id].sort();
  const old = await Conversation.create({
    listingId: 'history-fixture', participantIds, participantKey: participantIds.join(':'),
    participantNames: new Map([[owner.id, owner.name], [other.user.id, 'Other']]),
    messages: Array.from({ length: 200 }, (_, index) => ({ id: `m-${index}`, senderId: owner.id, senderName: owner.name, body: '', readBy: participantIds })),
  });
  expect((await request(app).post(`/api/messages/${old.id}/continue`).set('Authorization', `Bearer ${adminToken}`)).status).toBe(404);
  const next = await request(app).post(`/api/messages/${old.id}/continue`).set('Authorization', `Bearer ${userToken}`);
  expect(next.status).toBe(200);
  expect(next.body.conversationId).not.toBe(old.id);
  const retry = await request(app).post(`/api/messages/${old.id}/continue`).set('Authorization', `Bearer ${userToken}`);
  expect(retry.body.conversationId).toBe(next.body.conversationId);
  const replied = await request(app).post(`/api/messages/${next.body.conversationId}/reply`).set('Authorization', `Bearer ${userToken}`).send({ body: 'Message 201' });
  expect(replied.status).toBe(200);
  const latest = await request(app).get(`/api/messages/${next.body.conversationId}`).set('Authorization', `Bearer ${userToken}`);
  expect(latest.body.previousConversationId).toBe(old.id);
  expect(latest.body.messages[0].body).toBe('Message 201');
  const history = await request(app).get(`/api/messages/${old.id}?limit=100`).set('Authorization', `Bearer ${userToken}`);
  expect(history.body.totalMessages).toBe(200);
  expect(history.body.messages[0].id).toBe('m-100');
  const earlier = await request(app).get(`/api/messages/${old.id}?limit=100&before=${history.body.nextBefore}`).set('Authorization', `Bearer ${userToken}`);
  expect(earlier.body.messages[0].id).toBe('m-0');
  expect(earlier.body.hasMore).toBe(false);
});
