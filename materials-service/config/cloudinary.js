const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const originalName = file.originalname;
    const ext = originalName.split('.').pop().toLowerCase();
    const baseName = originalName.replace(/\.[^/.]+$/, '');

    let resourceType = 'auto';
    return {
      folder: 'materials',
      resource_type: resourceType,
      use_filename: true,
      unique_filename: false,
      public_id: baseName,
      format: ext
    };
  },
});

module.exports = { cloudinary, storage };
