const User = require('../models/User');

function sanitizeUser(user) {
  const userObj = user.toObject ? user.toObject() : user;
  const { password, ...safe } = userObj;
  return safe;
}

function findUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

function findUserById(id) {
  return User.findOne({ id });
}

module.exports = {
  sanitizeUser,
  findUserByEmail,
  findUserById,
};
