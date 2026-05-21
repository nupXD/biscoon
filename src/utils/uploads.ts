import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { STATIC_ROOT, UPLOAD_DIR } from '../config/env';

const UPLOAD_ROOT = path.join(STATIC_ROOT, UPLOAD_DIR);

function ensureUploadDir(folder: string): string {
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionForMimeType(mimeType: string): string {
  const map: Record<string, string> = {
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

interface SaveBase64UploadParams {
  folder: string;
  mimeType: string;
  base64: string;
}

function saveBase64Upload({ folder, mimeType, base64 }: SaveBase64UploadParams): string {
  const dir = ensureUploadDir(folder);
  const ext = extensionForMimeType(mimeType);
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(base64, 'base64'));
  return `/${UPLOAD_DIR}/${folder}/${filename}`;
}

function isStoredUpload(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`/${UPLOAD_DIR}/`);
}

export {
  saveBase64Upload,
  isStoredUpload,
};
