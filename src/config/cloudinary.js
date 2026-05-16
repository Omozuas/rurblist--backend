const cloudinary = require('cloudinary').v2;
const path = require('path');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const rawExtensions = new Set(['.pdf']);

const assertCloudinaryConfig = () => {
  const missing = ['CLOUD_NAME', 'CLOUD_API_KEY', 'CLOUD_SECRET_API_KEY'].filter(
    (key) => !process.env[key],
  );

  if (missing.length) {
    throw new Error(`Missing Cloudinary env vars: ${missing.join(', ')}`);
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

    throw new Error(`Unsupported upload file type: ${ext || 'unknown'}`);
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
      throw new Error(`Cloudinary Upload Error: ${error.message || JSON.stringify(error)}`);
    }
  }

  static async delete(publicId, resourceType = 'image') {
    try {
      assertCloudinaryConfig();

      return await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      throw new Error(`Cloudinary Delete Error: ${error.message || JSON.stringify(error)}`);
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
