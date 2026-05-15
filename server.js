const express = require('express');
const cors = require('cors');
const { PORT, STATIC_ROOT } = require('./src/config/env');
const connectDatabase = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const listingRoutes = require('./src/routes/listings');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use(express.static(STATIC_ROOT));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

function listenWithFallback(port, attemptsLeft = 10) {
  const numericPort = Number(port);
  const server = app.listen(numericPort, () => {
    console.log(`🚀 Biscoon backend running at http://localhost:${numericPort}`);
  });

  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const nextPort = numericPort + 1;
      console.warn(`⚠️ Port ${numericPort} is busy. Trying ${nextPort}...`);
      listenWithFallback(nextPort, attemptsLeft - 1);
      return;
    }

    console.error('✗ Unable to start Biscoon backend:', error.message);
    process.exit(1);
  });
}

connectDatabase()
  .then(() => {
    console.log('✓ Connected to MongoDB');
    listenWithFallback(PORT);
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });
