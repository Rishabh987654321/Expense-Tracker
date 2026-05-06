import multer from 'multer';
import { HttpError } from './errorHandler.js';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const storage = multer.memoryStorage();

export const uploadReceipt = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new HttpError(400, `Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
}).single('receipt');

const AVATAR_ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_ALLOWED.has(file.mimetype)) {
      return cb(new HttpError(400, `Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
}).single('avatar');
