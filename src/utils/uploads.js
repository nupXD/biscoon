const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { STATIC_ROOT, UPLOAD_DIR } = require('../config/env');

const UPLOAD_ROOT = path.join(STATIC_ROOT, UPLOAD_DIR);

function ensureUploadDir(folder) {
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionForMimeType(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/x-rar-compressed': 'rar',
  };
  return map[mimeType] || 'bin';
}

function saveBase64Upload({ folder, mimeType, base64 }) {
  const dir = ensureUploadDir(folder);
  const ext = extensionForMimeType(mimeType);
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(base64, 'base64'));
  return `/${UPLOAD_DIR}/${folder}/${filename}`;
}

function isStoredUpload(value) {
  return typeof value === 'string' && value.startsWith(`/${UPLOAD_DIR}/`);
}

module.exports = {
  saveBase64Upload,
  isStoredUpload,
};
