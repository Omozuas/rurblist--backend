const multer = require('multer');
const path = require('path');
const fs = require('fs');

class StoreImages {
  static uploadDir = path.join(process.cwd(), 'uploads');

  // ✅ Ensure directory exists
  static ensureDir() {
    if (!fs.existsSync(StoreImages.uploadDir)) {
      fs.mkdirSync(StoreImages.uploadDir, { recursive: true });
    }
  }

  /**
   * STORAGE ENGINE
   */
  static storage = multer.diskStorage({
    destination: function (req, file, cb) {
      StoreImages.ensureDir();
      cb(null, StoreImages.uploadDir);
    },

    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

      cb(null, uniqueName + path.extname(file.originalname));
    },
  });

  /**
   * FILE FILTER (IMAGES + PDF)
   */
  static fileFilter(req, file, cb) {
    const allowedExt = /jpg|jpeg|png|webp|gif|pdf/;
    const allowedMime = /image\/(jpeg|jpg|png|webp|gif)|application\/pdf/;

    const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());

    const mime = allowedMime.test(file.mimetype);

    if (!ext || !mime) {
      return cb(
        new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only images and PDFs are allowed'),
      );
    }

    cb(null, true);
  }

  /**
   * BASE UPLOADER
   */
  static uploader = multer({
    storage: StoreImages.storage,
    fileFilter: StoreImages.fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  /**
   * ERROR HANDLER WRAPPER (🔥 IMPORTANT)
   */
  static handleUpload(middleware) {
    return (req, res, next) => {
      middleware(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        } else if (err) {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
        next();
      });
    };
  }

  /**
   * SINGLE
   */
  static single(fieldName) {
    return StoreImages.handleUpload(StoreImages.uploader.single(fieldName));
  }

  /**
   * MULTIPLE
   */
  static multiple(fieldName) {
    return StoreImages.handleUpload(StoreImages.uploader.array(fieldName));
  }

  /**
   * MIXED FIELDS (🔥 what you need)
   */
  static fields(fieldsArray) {
    return StoreImages.handleUpload(StoreImages.uploader.fields(fieldsArray));
  }
}

module.exports = StoreImages;
