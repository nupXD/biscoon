const express = require('express');
const cors = require('cors');
const { PORT, STATIC_ROOT } = require('./src/config/env');
const connectDatabase = require('./src/config/database');
const authRoutes = require('./src/routes/auth');
const listingRoutes = require('./src/routes/listings');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(STATIC_ROOT));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

connectDatabase()
  .then(() => {
    console.log('✓ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Biscoon backend running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });
