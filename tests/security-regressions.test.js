jest.mock('socket.io', () => ({ Server: jest.fn() }));

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const users = require('../src/utils/users');
const mail = require('../src/services/mail');
const { authenticateSession } = require('../src/utils/sessions');
const authMiddleware = require('../src/middleware/auth').default;
const verifiedMiddleware = require('../src/middleware/requireVerifiedEmail').default;
const { createRateLimiter } = require('../src/middleware/rateLimit');
const realtime = require('../src/services/realtime');
const authRouter = require('../src/routes/auth').default;
const messagesRouter = require('../src/routes/messages').default;
const Conversation = require('../src/models/Conversation').default;
const { Server } = require('socket.io');

const handler = (router, method, path) => router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle;
const response = () => ({
  statusCode: 200,
  status: jest.fn(function (code) { this.statusCode = code; return this; }),
  json: jest.fn(function (body) { this.body = body; return this; }),
  set: jest.fn().mockReturnThis(), attachment: jest.fn().mockReturnThis(),
  type: jest.fn().mockReturnThis(), send: jest.fn(), sendFile: jest.fn(),
});
let user;
let initialProduction;
let initialVerification;

beforeEach(() => {
  initialProduction = env.isProduction;
  initialVerification = env.EMAIL_VERIFICATION_REQUIRED;
  user = { id: 'fixture-user', email: 'fixture@example.com', name: 'Fixture', sessionVersion: 0, emailVerified: true, deleted: false, save: jest.fn().mockResolvedValue(undefined) };
  jest.spyOn(users, 'findUserById').mockImplementation(async id => id === user.id ? user : null);
  jest.spyOn(users, 'findUserByEmail').mockResolvedValue(user);
});

afterEach(() => {
  env.isProduction = initialProduction;
  env.EMAIL_VERIFICATION_REQUIRED = initialVerification;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function token(version = 0) {
  return jwt.sign({ id: user.id, sessionVersion: version }, env.JWT_SECRET, { expiresIn: '1d' });
}

test('HTTP authentication rejects deactivated accounts and revoked sessions', async () => {
  const session = token();
  await expect(authenticateSession(session)).resolves.toMatchObject({ user });
  user.deleted = true;
  const res = response();
  const next = jest.fn();
  await authMiddleware({ headers: { authorization: `Bearer ${session}` } }, res, next);
  expect(res.statusCode).toBe(401);
  expect(next).not.toHaveBeenCalled();
  user.deleted = false;
  user.sessionVersion = 1;
  await expect(authenticateSession(session)).rejects.toThrow('revoked');
  await expect(authenticateSession(token(1))).resolves.toMatchObject({ user });
});

test('legacy sessions work until their first revocation', async () => {
  const legacy = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: '1d' });
  await expect(authenticateSession(legacy)).resolves.toMatchObject({ user });
  user.sessionVersion = 1;
  await expect(authenticateSession(legacy)).rejects.toThrow('revoked');
});

test('password reset revokes existing tokens and disconnects real-time sessions', async () => {
  const oldToken = token();
  const { createAccountToken } = require('../src/utils/accountTokens');
  const reset = createAccountToken(1);
  user.passwordResetTokenHash = reset.tokenHash;
  user.passwordResetExpiresAt = reset.expiresAt;
  const disconnect = jest.spyOn(realtime, 'disconnectUserSessions').mockImplementation(() => {});
  const res = response();
  await handler(authRouter, 'post', '/reset-password')({ body: {
    email: user.email, token: reset.token, password: 'new-fixture-password', confirmPassword: 'new-fixture-password',
  } }, res);
  expect(res.body.ok).toBe(true);
  expect(await bcrypt.compare('new-fixture-password', user.password)).toBe(true);
  await expect(authenticateSession(oldToken)).rejects.toThrow('revoked');
  expect(disconnect).toHaveBeenCalledWith(user.id);
});

test('profile password changes return a fresh session and invalidate recovery links', async () => {
  user.password = await bcrypt.hash('old-fixture-password', 4);
  user.passwordResetTokenHash = 'pending-reset';
  const oldToken = token();
  jest.spyOn(realtime, 'disconnectUserSessions').mockImplementation(() => {});
  const res = response();
  await handler(authRouter, 'put', '/me')({ user, body: {
    currentPassword: 'old-fixture-password', newPassword: 'new-fixture-password', confirmPassword: 'new-fixture-password',
  } }, res);
  expect(res.body.user.sessionVersion).toBeUndefined();
  expect(user.passwordResetTokenHash).toBeUndefined();
  await expect(authenticateSession(oldToken)).rejects.toThrow('revoked');
  await expect(authenticateSession(res.body.token)).resolves.toMatchObject({ user });
});

test('real-time handshake checks account status and disconnects at token expiry', async () => {
  jest.useFakeTimers();
  const io = { use: jest.fn(), on: jest.fn(), in: jest.fn().mockReturnValue({ disconnectSockets: jest.fn() }) };
  Server.mockImplementation(() => io);
  realtime.initRealtime({});
  const authenticate = io.use.mock.calls[0][0];
  const socket = { handshake: { auth: { token: token() } }, data: {}, join: jest.fn(), emit: jest.fn(), on: jest.fn(), disconnect: jest.fn() };
  user.deleted = true;
  const rejected = jest.fn();
  await authenticate(socket, rejected);
  expect(rejected).toHaveBeenCalledWith(expect.any(Error));
  user.deleted = false;
  const accepted = jest.fn();
  await authenticate(socket, accepted);
  expect(accepted).toHaveBeenCalledWith();
  io.on.mock.calls.find(([event]) => event === 'connection')[1](socket);
  jest.advanceTimersByTime(24 * 60 * 60 * 1000);
  expect(socket.disconnect).toHaveBeenCalledWith(true);
});

test('verification enforcement runs in test mode when explicitly enabled', () => {
  env.EMAIL_VERIFICATION_REQUIRED = true;
  const res = response();
  const next = jest.fn();
  verifiedMiddleware({ user: { emailVerified: false } }, res, next);
  expect(res.statusCode).toBe(403);
  expect(next).not.toHaveBeenCalled();
  verifiedMiddleware({ user: { emailVerified: true } }, response(), next);
  expect(next).toHaveBeenCalledTimes(1);
});

test('rate limiting is exercised under NODE_ENV=test and expires correctly', () => {
  jest.useFakeTimers();
  const limit = createRateLimiter({ max: 2, windowMs: 1000, blockMs: 1000 });
  const next = jest.fn();
  const request = { ip: '127.0.0.1' };
  limit(request, response(), next);
  limit(request, response(), next);
  const blocked = response();
  limit(request, blocked, next);
  expect(blocked.statusCode).toBe(429);
  expect(next).toHaveBeenCalledTimes(2);
  jest.advanceTimersByTime(1001);
  limit(request, response(), next);
  expect(next).toHaveBeenCalledTimes(3);
});

test('successful production recovery delivery does not expose tokens', async () => {
  env.isProduction = true;
  jest.spyOn(mail, 'sendPasswordResetEmail').mockResolvedValue(true);
  const res = response();
  await handler(authRouter, 'post', '/forgot-password')({ body: { email: user.email } }, res);
  expect(res.body.emailSent).toBe(true);
  expect(res.body.resetToken).toBeUndefined();
  expect(res.body.resetUrl).toBeUndefined();
});

test('attachment downloads check membership before reading a file', async () => {
  const find = jest.spyOn(Conversation, 'findOne').mockResolvedValue(null);
  const res = response();
  await handler(messagesRouter, 'get', '/:id/attachments/:messageId/:index')({ user, params: { id: 'private-thread', messageId: 'message', index: '0' } }, res);
  expect(find).toHaveBeenCalledWith({ id: 'private-thread', participantIds: user.id });
  expect(res.statusCode).toBe(404);
  expect(res.sendFile).not.toHaveBeenCalled();
});

test('attachment downloads reject traversal and use private caching', async () => {
  const attachment = { name: 'file.txt', mimeType: 'text/plain', data: '/uploads/messages/../../.env' };
  jest.spyOn(Conversation, 'findOne').mockResolvedValue({ messages: [{ id: 'message', attachments: [attachment] }] });
  const request = { user, params: { id: 'thread', messageId: 'message', index: '0' } };
  const rejected = response();
  await handler(messagesRouter, 'get', '/:id/attachments/:messageId/:index')(request, rejected);
  expect(rejected.statusCode).toBe(404);
  expect(rejected.sendFile).not.toHaveBeenCalled();
  attachment.data = `/${env.UPLOAD_DIR}/messages/fixture.txt`;
  const allowed = response();
  await handler(messagesRouter, 'get', '/:id/attachments/:messageId/:index')(request, allowed);
  expect(allowed.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  expect(allowed.sendFile).toHaveBeenCalledWith('fixture.txt', expect.objectContaining({ cacheControl: false }));
});

test('a full conversation can continue without deleting its history', async () => {
  const previous = { id: 'old-thread', listingId: 'listing', listingTitle: 'Room', participantIds: [user.id, 'other'], participantNames: {}, messages: Array.from({ length: 200 }, () => ({})), archived: false };
  jest.spyOn(Conversation, 'findOne').mockResolvedValueOnce(previous).mockResolvedValueOnce(null);
  const update = jest.spyOn(Conversation, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
  const create = jest.spyOn(Conversation, 'create').mockResolvedValue({ id: 'new-thread' });
  const res = response();
  await handler(messagesRouter, 'post', '/:id/continue')({ user, params: { id: previous.id } }, res);
  expect(update).toHaveBeenCalledWith({ id: previous.id, archived: { $ne: true } }, { $set: { archived: true, participantKey: 'archived:old-thread' } });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ previousConversationId: previous.id, messages: [] }));
  expect(previous.messages).toHaveLength(200);
  expect(res.body.conversationId).toBe('new-thread');
});

const productionMailCases = [
  ['/forgot-password', 'sendPasswordResetEmail'],
  ['/resend-verification', 'sendVerificationEmail'],
  ['/request-email-verification', 'sendVerificationEmail'],
  ['/register', 'sendVerificationEmail'],
].flatMap(([route, method]) => ['sent', 'unconfigured', 'failed'].map(delivery => [route, method, delivery]));

test.each(productionMailCases)('production %s never exposes action tokens when delivery is %s / %s', async (route, method, delivery) => {
  env.isProduction = true;
  user.emailVerified = false;
  const send = jest.spyOn(mail, method);
  if (delivery === 'failed') {
    send.mockRejectedValue(new Error('Synthetic SMTP failure'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
  } else send.mockResolvedValue(delivery === 'sent');
  if (route === '/register') {
    users.findUserByEmail.mockResolvedValue(null);
    const User = require('../src/models/User').default;
    jest.spyOn(User.prototype, 'save').mockImplementation(async function () { return this; });
  }
  const res = response();
  await handler(authRouter, 'post', route)({ user, body: {
    name: 'Fixture', email: user.email, password: 'fixture-password', confirmPassword: 'fixture-password',
  } }, res);
  expect(send).toHaveBeenCalled();
  expect(res.body.emailSent).toBe(delivery === 'sent');
  for (const key of ['resetToken', 'resetUrl', 'verificationToken', 'verificationUrl']) expect(res.body[key]).toBeUndefined();
});

test('development recovery keeps local test links available', async () => {
  env.isProduction = false;
  jest.spyOn(mail, 'sendPasswordResetEmail').mockResolvedValue(false);
  const res = response();
  await handler(authRouter, 'post', '/forgot-password')({ body: { email: user.email } }, res);
  expect(res.body.resetToken).toBeTruthy();
  expect(res.body.resetUrl).toContain('reset-password.html');
});

test.each(['unconfigured', 'sent', 'failed'])('production mail does not persist or log action links: %s', async delivery => {
  const fs = require('fs');
  const nodemailer = require('nodemailer');
  const originalMode = env.NODE_ENV;
  const originalHost = env.SMTP_HOST;
  env.NODE_ENV = 'production';
  env.SMTP_HOST = delivery === 'unconfigured' ? '' : 'smtp.example.invalid';
  const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  const mkdir = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  const log = jest.spyOn(console, 'info').mockImplementation(() => {});
  const sendMail = delivery === 'failed' ? jest.fn().mockRejectedValue(new Error('SMTP unavailable')) : jest.fn().mockResolvedValue({});
  jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });
  try {
    const operation = mail.sendMail({ to: user.email, subject: 'Reset', text: 'synthetic-secret-link', html: '<p>synthetic-secret-link</p>' });
    if (delivery === 'failed') await expect(operation).rejects.toThrow('SMTP unavailable');
    else await expect(operation).resolves.toBe(delivery === 'sent');
    expect(write).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  } finally {
    env.NODE_ENV = originalMode;
    env.SMTP_HOST = originalHost;
  }
});

test('registration throttles one IP even when email addresses and forwarded headers change', () => {
  const { authRegisterLimiter } = require('../src/middleware/rateLimit');
  authRegisterLimiter.reset();
  const next = jest.fn();
  for (let index = 0; index < 10; index++) {
    authRegisterLimiter({ ip: '192.0.2.1', headers: { 'x-forwarded-for': `198.51.100.${index}` }, body: { email: `person${index}@example.com` } }, response(), next);
  }
  const blocked = response();
  authRegisterLimiter({ ip: '192.0.2.1', headers: {}, body: { email: 'another@example.com' } }, blocked, next);
  expect(blocked.statusCode).toBe(429);
  expect(next).toHaveBeenCalledTimes(10);
  authRegisterLimiter({ ip: '192.0.2.2', headers: {}, body: { email: 'another@example.com' } }, response(), next);
  expect(next).toHaveBeenCalledTimes(11);
  authRegisterLimiter.reset();
});

test('proxy settings use numeric hop counts and default to distrusting forwarded headers', async () => {
  const express = require('express');
  const { parseTrustProxy } = require('../src/config/trustProxy');
  const app = express();
  app.set('trust proxy', parseTrustProxy('1'));
  expect(app.get('trust proxy fn')('127.0.0.1', 0)).toBe(true);
  expect(app.get('trust proxy fn')('127.0.0.1', 1)).toBe(false);
  app.set('trust proxy', parseTrustProxy());
  expect(app.get('trust proxy fn')('127.0.0.1', 0)).toBe(false);
  app.set('trust proxy', parseTrustProxy('loopback,10.0.0.0/8'));
  expect(app.get('trust proxy fn')('10.1.2.3', 0)).toBe(true);
  expect(app.get('trust proxy fn')('192.0.2.1', 0)).toBe(false);
  expect(() => parseTrustProxy('true')).toThrow('trusted addresses');
});

test('production demo seed exits before attempting any database connection', () => {
  const { spawnSync } = require('child_process');
  const result = spawnSync(process.execPath, ['seed.js'], {
    cwd: require('path').join(__dirname, '..'), env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8', timeout: 3000,
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Demo seeding is disabled in production');
  expect(result.stdout).not.toContain('Connected');
});

test('patched Nodemailer supports the application message format without sending external mail', async () => {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const result = await transport.sendMail({ from: 'news@example.invalid', to: 'reader@example.invalid', subject: 'Fixture', text: 'Fixture text', html: '<p>Fixture</p>' });
  expect(result.message.toString()).toContain('Subject: Fixture');
  expect(result.envelope.to).toEqual(['reader@example.invalid']);
});

test('admin bootstrap requires explicit credentials and never elevates an existing account', async () => {
  const ts = require('typescript');
  const fs = require('fs');
  const vm = require('vm');
  const source = ts.createSourceFile('bootstrap-admin.ts', fs.readFileSync(require('path').join(__dirname, '../scripts/bootstrap-admin.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'bootstrap').getText(source);
  const connectDatabase = jest.fn();
  const User = { exists: jest.fn(async () => false), create: jest.fn() };
  const context = vm.createContext({
    z: require('zod').z, Buffer, process: { env: { BOOTSTRAP_ADMIN_EMAIL: 'fixture@example.invalid' } },
    connectDatabase, User, bcrypt: { hash: jest.fn(async () => 'hashed-fixture') }, console: { info: jest.fn() },
  });
  vm.runInContext(ts.transpileModule(fn, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  await expect(vm.runInContext('bootstrap()', context)).rejects.toThrow('at least 16');
  expect(connectDatabase).not.toHaveBeenCalled();
  context.process.env.BOOTSTRAP_ADMIN_PASSWORD = 'a-long-fixture-password';
  User.exists.mockResolvedValueOnce(true);
  await expect(vm.runInContext('bootstrap()', context)).rejects.toThrow('already exists');
  expect(User.create).not.toHaveBeenCalled();
  await vm.runInContext('bootstrap()', context);
  expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'fixture@example.invalid', password: 'hashed-fixture', role: 'super-admin', emailVerified: true }));
});
