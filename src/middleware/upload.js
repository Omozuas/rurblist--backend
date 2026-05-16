const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const AppError = require('../utils/AppError');

const uploadDir = path.join(process.cwd(), 'uploads');
const defaultMaxFileSize = 20 * 1024 * 1024;
const defaultMaxFiles = 10;

const allowedTypes = new Map([
  ['.jpg', new Set(['image/jpeg'])],
  ['.jpeg', new Set(['image/jpeg'])],
  ['.png', new Set(['image/png'])],
  ['.webp', new Set(['image/webp'])],
  ['.gif', new Set(['image/gif'])],
  ['.pdf', new Set(['application/pdf'])],
]);

function ensureDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function getUploadLimit(envKey, defaultValue) {
  const value = Number(process.env[envKey]);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedMimes = allowedTypes.get(ext);

  if (!allowedMimes || !allowedMimes.has(file.mimetype)) {
    return cb(new AppError('Only images and PDFs are allowed', 400));
  }

  return cb(null, true);
}

const uploader = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      ensureDir();
      cb(null, uploadDir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
  }),
  fileFilter,
  limits: {
    fileSize: getUploadLimit('UPLOAD_MAX_FILE_SIZE_BYTES', defaultMaxFileSize),
    files: getUploadLimit('UPLOAD_MAX_FILES', defaultMaxFiles),
  },
});

function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (error) {
        error.statusCode = error.statusCode || 400;
        return next(error);
      }

      return next();
    });
  };
}

module.exports = {
  single: (fieldName) => handleUpload(uploader.single(fieldName)),
  multiple: (fieldName) => handleUpload(uploader.array(fieldName)),
  fields: (fieldsArray) => handleUpload(uploader.fields(fieldsArray)),
};
