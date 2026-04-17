const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_API_KEY,
});

class UploadCloud {
  static async upload(filePath, folder = 'rurblist') {
    try {
      const ext = path.extname(filePath).toLowerCase();

      const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: isImage ? 'image' : 'raw', // 🔥 prevents PDF → PNG issue

        ...(isImage && {
          quality: 'auto',
          fetch_format: 'auto',
        }),
        // 🔥 FIX FOR PDF ACCESS
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
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      return result;
    } catch (error) {
      throw new Error(`Cloudinary Delete Error: ${error.message || JSON.stringify(error)}`);
    }
  }
  static getDownloadUrl(publicId) {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      flags: 'attachment',
    });
  }
}

module.exports = UploadCloud;
