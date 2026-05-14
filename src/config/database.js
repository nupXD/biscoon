const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

module.exports = connectDatabase;
