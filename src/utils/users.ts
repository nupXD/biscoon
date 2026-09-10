import User from '../models/User';
import type { IUser, SanitizedUser } from '../types';

function sanitizeUser(user: IUser): SanitizedUser {
  const userObj = user.toObject ? user.toObject() : user;
  const {
    password,
    sessionVersion,
    emailVerificationTokenHash,
    emailVerificationExpiresAt,
    passwordResetTokenHash,
    passwordResetExpiresAt,
    ...safe
  } = userObj;
  return safe as SanitizedUser;
}

function findUserByEmail(email: string) {
  return User.findOne({ email: email.toLowerCase() });
}

function findUserById(id: string) {
  return User.findOne({ id });
}

export {
  sanitizeUser,
  findUserByEmail,
  findUserById,
};
