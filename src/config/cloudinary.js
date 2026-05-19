const cloudinary = require('cloudinary').v2;
const path = require('path');
const AppError = require('../utils/AppError');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const rawExtensions = new Set(['.pdf']);

const assertCloudinaryConfig = () => {
  const missing = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_SECRET_API_KEY'].filter(
    (key) => !process.env[key],
  );

  if (missing.length) {
    throw new AppError(`Missing Cloudinary env vars: ${missing.join(', ')}`, 500);
  }
};

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_API_KEY,
});

class UploadCloud {
  static getResourceType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (imageExtensions.has(ext)) {
      return 'image';
    }

    if (rawExtensions.has(ext)) {
      return 'raw';
    }

    throw new AppError(`Unsupported upload file type: ${ext || 'unknown'}`, 400);
  }

  static async upload(filePath, folder = 'rurblist') {
    try {
      assertCloudinaryConfig();

      const resourceType = UploadCloud.getResourceType(filePath);

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        ...(resourceType === 'image' && {
          quality: 'auto',
          fetch_format: 'auto',
        }),
        access_mode: 'public',
        type: 'upload',
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      };
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError(`Cloudinary Upload Error: ${error.message || JSON.stringify(error)}`, 502);
    }
  }

  static async delete(publicId, resourceType = 'image') {
    try {
      assertCloudinaryConfig();

      return await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      throw error instanceof AppError
        ? error
        : new AppError(`Cloudinary Delete Error: ${error.message || JSON.stringify(error)}`, 502);
    }
  }

  static getDownloadUrl(publicId, resourceType = 'raw') {
    assertCloudinaryConfig();

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      flags: 'attachment',
      secure: true,
    });
  }
}

module.exports = UploadCloud;
