const multer = require("multer");
const path = require("path");
const fs = require("fs");

class StoreImages {

  // Ensure upload folder exists
  static uploadDir = "./uploads";

  static ensureDir() {
    if (!fs.existsSync(StoreImages.uploadDir)) {
      fs.mkdirSync(StoreImages.uploadDir, { recursive: true });
    }
  }

  /**
   * Storage Engine
   */
  static storage = multer.diskStorage({
    destination: function (req, file, cb) {
      StoreImages.ensureDir();
      cb(null, StoreImages.uploadDir);
    },

    filename: function (req, file, cb) {
      const uniqueName =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      cb(null, uniqueName + path.extname(file.originalname));
    }
  });

  /**
   * File Filter
   */
  static fileFilter(req, file, cb) {

    const allowedTypes = /jpg|jpeg|png|webp|gif/;

    const ext = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    const mime = allowedTypes.test(file.mimetype);

    if (!ext || !mime) {
      return cb(new Error("Only image files are allowed"));
    }

    cb(null, true);
  }

  /**
   * Base uploader
   */
  static uploader = multer({
    storage: StoreImages.storage,
    fileFilter: StoreImages.fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // ✅ 5MB
    }
  });

  /**
   * Single Upload
   */
  static single(fieldName) {
    return StoreImages.uploader.single(fieldName);
  }

  /**
   * Multiple Uploads (no max count)
   */
  static multiple(fieldName) {
    return StoreImages.uploader.array(fieldName);
  }

  /**
   * Mixed Uploads
   */
  static fields(fieldsArray) {
    return StoreImages.uploader.fields(fieldsArray);
  }
}

module.exports = StoreImages;