const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_API_KEY,
});

class UploadCloud {

  /**
   * Upload file to cloudinary
   * @param {String} file - file path or base64
   * @param {String} folder - cloudinary folder
   */
  static async upload(file, folder = "rurblist") {
    try {
      const result = await cloudinary.uploader.upload(file, {
        resource_type: "auto",
        folder,
        quality: "auto",
        fetch_format: "auto"
      });

      return {
        url: result.secure_url,
        public_id: result.public_id,
        asset_id: result.asset_id,
        format: result.format,
        width: result.width,
        height: result.height
      };

    } catch (error) {
      throw new Error(`Cloudinary Upload Error: ${error.message}`);
    }
  }

  /**
   * Delete file from cloudinary
   * @param {String} publicId
   */
  static async delete(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      return {
        result: result.result,
        public_id: publicId
      };

    } catch (error) {
      throw new Error(`Cloudinary Delete Error: ${error.message}`);
    }
  }
}

module.exports = UploadCloud;