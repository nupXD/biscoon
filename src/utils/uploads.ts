import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { STATIC_ROOT, UPLOAD_DIR } from '../config/env';

const UPLOAD_ROOT = path.join(STATIC_ROOT, UPLOAD_DIR);

// Uploaded photos can arrive straight off a phone camera at several MB each.
// Cap the longest edge and re-encode so pages don't ship multi-megabyte images.
const MAX_UPLOAD_IMAGE_DIMENSION = 1920;
const COMPRESSIBLE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

async function compressImageBuffer(buffer: Buffer<ArrayBufferLike>, mimeType: string): Promise<Buffer<ArrayBufferLike>> {
  const resized = sharp(buffer, { failOn: 'none' }).rotate().resize({
    width: MAX_UPLOAD_IMAGE_DIMENSION,
    height: MAX_UPLOAD_IMAGE_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });

  switch (mimeType) {
    case 'image/jpeg':
      return resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    case 'image/png':
      return resized.png({ compressionLevel: 9, palette: true }).toBuffer();
    case 'image/webp':
      return resized.webp({ quality: 82 }).toBuffer();
    default:
      return buffer;
  }
}

interface SaveBase64UploadParams {
  folder: string;
  mimeType: string;
  base64: string;
}

async function saveBase64Upload({ folder, mimeType, base64 }: SaveBase64UploadParams): Promise<string> {
  const dir = ensureUploadDir(folder);
  const ext = extensionForMimeType(mimeType);
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  let buffer: Buffer<ArrayBufferLike> = Buffer.from(base64, 'base64');

  if (COMPRESSIBLE_MIME_TYPES.has(mimeType)) {
    try {
      buffer = await compressImageBuffer(buffer, mimeType);
    } catch (err) {
      // Corrupt or unsupported image data — fall back to storing the original bytes
      // rather than failing the whole upload over a compression pass.
      console.error('✗ Image compression failed, storing original:', (err as Error).message);
    }
  }

  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/${UPLOAD_DIR}/${folder}/${filename}`;
}

function isStoredUpload(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`/${UPLOAD_DIR}/`);
}

export {
  saveBase64Upload,
  isStoredUpload,
};
